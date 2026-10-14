/**
 * @file scripts/build-template-bundle.js
 * @description Empaqueta los archivos de template/ en wizard/js/template-bundle.js para permitir
 * que el generador web funcione 100% offline y en cliente (incluso bajo protocolo file:///).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template');
const OUTPUT_FILE = path.join(ROOT_DIR, 'wizard', 'js', 'template-bundle.js');

const EXCLUDED_DIRS = new Set(['node_modules', 'tests', '.wrangler']);
const EXCLUDED_FILES = new Set(['.dev.vars']);

const BINARY_EXTENSIONS = new Set(['.png', '.ico', '.jpg', '.jpeg', '.webp', '.woff2']);

function scanDirectory(dir, relPath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...scanDirectory(fullPath, entryRel));
      }
    } else {
      if (!EXCLUDED_FILES.has(entry.name)) {
        files.push({ fullPath, relPath: entryRel });
      }
    }
  }

  return files;
}

export function buildTemplateBundle() {
  const fileList = scanDirectory(TEMPLATE_DIR);
  const bundle = {};

  for (const { fullPath, relPath } of fileList) {
    const ext = path.extname(relPath).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.has(ext);

    if (isBinary) {
      const data = fs.readFileSync(fullPath);
      bundle[relPath] = {
        binary: true,
        content: data.toString('base64')
      };
    } else {
      const text = fs.readFileSync(fullPath, 'utf8');
      bundle[relPath] = {
        binary: false,
        content: text
      };
    }
  }

  const outputJs = `/**
 * @file template-bundle.js
 * @description Catálogo empaquetado de archivos base para el generador ZIP autónomo.
 * Generado automáticamente por scripts/build-template-bundle.js
 */

export const TEMPLATE_BUNDLE = ${JSON.stringify(bundle, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, outputJs, 'utf8');
  console.log(`[build-template-bundle] Empaquetados ${fileList.length} archivos en ${OUTPUT_FILE}`);
}

// Ejecutar si se invoca directamente desde CLI
if (process.argv[1]?.endsWith('build-template-bundle.js')) {
  buildTemplateBundle();
}
