/**
 * @file subject-matcher.js
 * @description Mapeo y reconocimiento heurístico de asignaturas escolares (soporte multilingüe derivado de course.config.js).
 */

import COURSE_CONFIG from '../data/course.config.js';
import { SUBJECTS } from '../data/schedule.data.js';

/**
 * Tabla de equivalencias para mapear cursos y entregas de Aules (Moodle),
 * generada dinámicamente a partir de las keywords declaradas en cada asignatura.
 */
export const AULES_SUBJECT_PATTERNS = Object.entries(COURSE_CONFIG.subjects || {})
  .filter(([_, data]) => Array.isArray(data.aulesKeywords) && data.aulesKeywords.length > 0)
  .map(([mod, data]) => ({
    mod,
    keywords: data.aulesKeywords
  }));

/**
 * Determina qué módulo corresponde a una entrega analizando prioritariamente su categoría (nombre del curso en Aules)
 * y posteriormente el título o descripción.
 * @param {Object} assignment
 * @returns {{ mod: string|null, colorVar: string, name: string }}
 */
export function matchSubject(assignment) {
  if (!assignment) {
    return { mod: null, colorVar: "--muted", name: "General" };
  }

  const categoryText = (assignment.category || '').toLowerCase();

  // 1. Prioridad: Coincidencia con la categoría del curso en Aules
  for (const item of AULES_SUBJECT_PATTERNS) {
    if (item.keywords.some(kw => categoryText.includes(kw.toLowerCase()))) {
      const subject = SUBJECTS[item.mod];
      if (subject) {
        return {
          mod: item.mod,
          colorVar: subject.colorVar,
          name: subject.legend || subject.name
        };
      }
    }
  }

  // 2. Coincidencia secundaria con el título y descripción
  const fullText = `${assignment.title || ''} ${assignment.description || ''}`.toLowerCase();
  for (const item of AULES_SUBJECT_PATTERNS) {
    if (item.keywords.some(kw => fullText.includes(kw.toLowerCase()))) {
      const subject = SUBJECTS[item.mod];
      if (subject) {
        return {
          mod: item.mod,
          colorVar: subject.colorVar,
          name: subject.legend || subject.name
        };
      }
    }
  }

  // 3. Si el elemento ya define su módulo directamente (exámenes manuales)
  if (assignment.mod && SUBJECTS[assignment.mod]) {
    const subject = SUBJECTS[assignment.mod];
    return {
      mod: assignment.mod,
      colorVar: subject.colorVar,
      name: subject.legend || subject.name
    };
  }

  // Asignatura no identificada / Entrega general
  return {
    mod: null,
    colorVar: "--muted",
    name: "General"
  };
}
