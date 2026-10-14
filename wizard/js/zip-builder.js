/**
 * @file zip-builder.js
 * @description Generador client-side de paquetes .ZIP listos para Cloudflare Pages Direct Upload.
 * Funciona de manera autónoma en el navegador utilizando JSZip y el catálogo TEMPLATE_BUNDLE.
 */

import { TEMPLATE_BUNDLE } from './template-bundle.js';
import { generateCourseConfigJson, generateCourseConfigFileContent } from './course-schema.js';

/**
 * Dispara la descarga de un Blob en el navegador.
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Descarga directamente el archivo course.config.json generado
 * @param {Object} state
 */
export function downloadConfigJson(state) {
  const jsonContent = generateCourseConfigJson(state);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const filename = `${state.course?.id || 'course'}.config.json`;
  triggerFileDownload(blob, filename);
}

/**
 * Construye el archivo .ZIP completo del proyecto con todos los assets y la configuración inyectada.
 * @param {Object} state - Estado validado del curso.
 * @param {Function} [onProgress] - Callback opcional para reportar porcentaje de empaquetado.
 * @returns {Promise<Blob>}
 */
export async function buildCourseZip(state, onProgress = null) {
  if (typeof window.JSZip === 'undefined') {
    throw new Error('JSZip no está cargado en el entorno global');
  }

  const zip = new window.JSZip();

  // 1. Generar configuraciones canónicas
  const generatedConfigJson = generateCourseConfigJson(state);
  const generatedConfigJs = generateCourseConfigFileContent(state);

  // 2. Metadatos de reemplazo dinámico
  const courseName = state.course?.name || 'Horario Escolar';
  const shortName = state.course?.shortName || 'Horario';

  const fileKeys = Object.keys(TEMPLATE_BUNDLE);
  let processed = 0;

  for (const filePath of fileKeys) {
    const fileData = TEMPLATE_BUNDLE[filePath];

    // Sustitución de course.config.json
    if (filePath === 'course.config.json') {
      zip.file(filePath, generatedConfigJson);
    }
    // Sustitución de src/data/course.config.js
    else if (filePath === 'src/data/course.config.js') {
      zip.file(filePath, generatedConfigJs);
    }
    // Personalización de manifest.json
    else if (filePath === 'manifest.json') {
      try {
        const manifestObj = JSON.parse(fileData.content);
        manifestObj.name = `Horario ${courseName}`;
        manifestObj.short_name = shortName;
        zip.file(filePath, JSON.stringify(manifestObj, null, 2));
      } catch {
        zip.file(filePath, fileData.content);
      }
    }
    // Personalización del título en index.html
    else if (filePath === 'index.html') {
      let html = fileData.content;
      html = html.replace(/<title>.*?<\/title>/i, `<title>Horario Semanal - ${shortName}</title>`);
      zip.file(filePath, html);
    }
    // Personalización del título en kanban.html
    else if (filePath === 'kanban.html') {
      let html = fileData.content;
      html = html.replace(/<title>.*?<\/title>/i, `<title>Tablero Kanban - ${shortName}</title>`);
      zip.file(filePath, html);
    }
    // Archivos binarios (imágenes, iconos, etc.)
    else if (fileData.binary) {
      zip.file(filePath, fileData.content, { base64: true });
    }
    // Archivos de texto regulares
    else {
      zip.file(filePath, fileData.content);
    }

    processed++;
    if (typeof onProgress === 'function') {
      onProgress(Math.round((processed / fileKeys.length) * 50));
    }
  }

  // 3. Comprimir y generar Blob
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (typeof onProgress === 'function') {
        onProgress(50 + Math.round(metadata.percent * 0.5));
      }
    }
  );

  return blob;
}
