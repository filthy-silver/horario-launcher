import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS,
  DEFAULT_HOLIDAYS_CV,
  validateCourseConfig,
  compressWeeklyGrid,
  generateCourseConfigJson,
  generateCourseConfigFileContent
} from '../wizard/js/course-schema.js';

describe('course-schema.js · Validación y Generador del Asistente', () => {

  it('valida correctamente un curso completo y bien estructurado', () => {
    const validState = {
      course: {
        id: "1asir",
        name: "Administración de Sistemas Informáticos en Red",
        shortName: "1º ASIR",
        academicYear: "2026/2027"
      },
      timeSlots: PRESETS.afternoonFp.timeSlots,
      subjects: {
        iso: { name: "Implantación de Sistemas Operativos", color: "#0284c7" },
        redes: { name: "Planificación y Administración de Redes", color: "#6d28d9" }
      },
      weeklyGrid: {
        1: ["iso", "iso", "iso", "recreo", "redes", "redes", "redes"],
        2: ["redes", "redes", "redes", "recreo", "iso", "iso", "iso"],
        3: ["iso", "iso", "iso", "recreo", "redes", "redes", "redes"],
        4: ["redes", "redes", "redes", "recreo", "iso", "iso", "iso"],
        5: ["iso", "iso", "iso", "recreo", "redes", "redes", "redes"]
      }
    };

    const result = validateCourseConfig(validState);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rechaza cursos con identificador inválido o franjas horarias erróneas', () => {
    const invalidState = {
      course: {
        id: "curso con espacios!!",
        name: "No",
        shortName: ""
      },
      timeSlots: [
        { start: "18:00", end: "17:00" } // fin anterior a inicio
      ],
      subjects: {}
    };

    const result = validateCourseConfig(invalidState);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });

  it('compressWeeklyGrid agrupa franjas consecutivas y excluye recreos en weeklyRaw', () => {
    const timeSlots = PRESETS.afternoonFp.timeSlots; // slot 3 (18:30-18:50) es recreo
    const grid = {
      1: ["iso", "iso", "iso", "recreo", "redes", "redes", "redes"]
    };
    const subjects = {
      iso: { name: "Sistemas" },
      redes: { name: "Redes" },
      recreo: { name: "Recreo", isBreak: true }
    };

    const raw = compressWeeklyGrid(grid, timeSlots, subjects);
    assert.ok(raw[1]);
    assert.equal(raw[1].length, 2);
    // Primer bloque: iso de 0 a 3
    assert.deepEqual(raw[1][0], { mod: "iso", from: 0, to: 3 });
    // Segundo bloque: redes de 4 a 7
    assert.deepEqual(raw[1][1], { mod: "redes", from: 4, to: 7 });
  });

  it('generateCourseConfigJson y generateCourseConfigFileContent producen salidas válidas', () => {
    const state = {
      course: {
        id: "2dam",
        name: "Desarrollo de Aplicaciones Multiplataforma",
        shortName: "2º DAM"
      },
      timeSlots: PRESETS.afternoonFp.timeSlots,
      subjects: {
        pmdm: { name: "Programación Multimedia", color: "#1d4ed8" }
      },
      weeklyGrid: {
        1: ["pmdm", "pmdm", "pmdm", "recreo", "pmdm", "pmdm", "pmdm"],
        2: ["pmdm", "pmdm", "pmdm", "recreo", "pmdm", "pmdm", "pmdm"],
        3: ["pmdm", "pmdm", "pmdm", "recreo", "pmdm", "pmdm", "pmdm"],
        4: ["pmdm", "pmdm", "pmdm", "recreo", "pmdm", "pmdm", "pmdm"],
        5: ["pmdm", "pmdm", "pmdm", "recreo", "pmdm", "pmdm", "pmdm"]
      }
    };

    const jsonStr = generateCourseConfigJson(state);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.course.id, "2dam");
    assert.ok(parsed.weeklyRaw[1].length > 0);

    const jsStr = generateCourseConfigFileContent(state);
    assert.ok(jsStr.startsWith('/**\n * @file course.config.js'));
    assert.ok(jsStr.includes('export default {'));
  });

});
