import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { TEMPLATE_BUNDLE } from '../wizard/js/template-bundle.js';
import { generateCourseConfigJson, generateCourseConfigFileContent, PRESETS } from '../wizard/js/course-schema.js';

describe('template-bundle.js y zip-builder · Empaquetado Autónomo', () => {

  it('TEMPLATE_BUNDLE contiene todos los archivos estáticos necesarios para un curso completo', () => {
    assert.ok(TEMPLATE_BUNDLE['index.html'], 'Falta index.html');
    assert.ok(TEMPLATE_BUNDLE['kanban.html'], 'Falta kanban.html');
    assert.ok(TEMPLATE_BUNDLE['manifest.json'], 'Falta manifest.json');
    assert.ok(TEMPLATE_BUNDLE['css/styles.css'], 'Falta css/styles.css');
    assert.ok(TEMPLATE_BUNDLE['css/kanban.css'], 'Falta css/kanban.css');
    assert.ok(TEMPLATE_BUNDLE['src/main.js'], 'Falta src/main.js');
    assert.ok(TEMPLATE_BUNDLE['src/kanban/kanban.js'], 'Falta src/kanban/kanban.js');
    assert.ok(TEMPLATE_BUNDLE['functions/api/calendar.ics.js'], 'Falta functions/api/calendar.ics.js');
    assert.ok(TEMPLATE_BUNDLE['functions/api/aules.js'], 'Falta functions/api/aules.js');
    assert.ok(TEMPLATE_BUNDLE['icon-192.png'], 'Falta icon-192.png');
    assert.equal(TEMPLATE_BUNDLE['icon-192.png'].binary, true);
  });

  it('permite construir un archivo ZIP en memoria con JSZip sustituyendo la configuración', async () => {
    const zip = new JSZip();

    const mockState = {
      course: {
        id: "2smr",
        name: "Sistemas Microinformáticos y Redes",
        shortName: "2º SMR"
      },
      timeSlots: PRESETS.morningStandard.timeSlots,
      subjects: {
        redes: { name: "Redes Locales", color: "#0284c7" }
      },
      weeklyGrid: {
        1: ["redes", "redes", "redes", "recreo", "redes", "redes", "redes"],
        2: ["redes", "redes", "redes", "recreo", "redes", "redes", "redes"],
        3: ["redes", "redes", "redes", "recreo", "redes", "redes", "redes"],
        4: ["redes", "redes", "redes", "recreo", "redes", "redes", "redes"],
        5: ["redes", "redes", "redes", "recreo", "redes", "redes", "redes"]
      }
    };

    const newJson = generateCourseConfigJson(mockState);
    const newJs = generateCourseConfigFileContent(mockState);

    // Inyectar en ZIP
    for (const [filePath, fileData] of Object.entries(TEMPLATE_BUNDLE)) {
      if (filePath === 'course.config.json') {
        zip.file(filePath, newJson);
      } else if (filePath === 'src/data/course.config.js') {
        zip.file(filePath, newJs);
      } else if (fileData.binary) {
        zip.file(filePath, fileData.content, { base64: true });
      } else {
        zip.file(filePath, fileData.content);
      }
    }

    // Generar buffer ZIP
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    assert.ok(buffer.length > 50000, `El ZIP generado es sospechosamente pequeño (${buffer.length} bytes)`);

    // Leer el ZIP generado y verificar contenido
    const loadedZip = await JSZip.loadAsync(buffer);
    const readConfigJson = await loadedZip.file('course.config.json').async('string');
    const parsed = JSON.parse(readConfigJson);

    assert.equal(parsed.course.id, '2smr');
    assert.equal(parsed.course.shortName, '2º SMR');
    assert.ok(loadedZip.file('index.html'));
    assert.ok(loadedZip.file('src/main.js'));
    assert.ok(loadedZip.file('icon-192.png'));
  });

});
