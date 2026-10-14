/**
 * @file course-schema.js
 * @description Validador de esquema, generador de presets y serializador para course.config.
 * Compatible tanto con navegadores modernos (ESM) como con Node.js para testing.
 */

export const PRESETS = {
  afternoonFp: {
    name: "Turno Vespertino (FP Tarde)",
    timeSlots: [
      { start: "15:45", end: "16:40", isBreak: false, name: "Franja 1" },
      { start: "16:40", end: "17:35", isBreak: false, name: "Franja 2" },
      { start: "17:35", end: "18:30", isBreak: false, name: "Franja 3" },
      { start: "18:30", end: "18:50", isBreak: true, name: "Recreo" },
      { start: "18:50", end: "19:45", isBreak: false, name: "Franja 4" },
      { start: "19:45", end: "20:40", isBreak: false, name: "Franja 5" },
      { start: "20:40", end: "21:35", isBreak: false, name: "Franja 6" }
    ]
  },
  morningStandard: {
    name: "Turno Matutino (ESO / Bach / FP Mañana)",
    timeSlots: [
      { start: "08:00", end: "08:55", isBreak: false, name: "Franja 1" },
      { start: "08:55", end: "09:50", isBreak: false, name: "Franja 2" },
      { start: "09:50", end: "10:45", isBreak: false, name: "Franja 3" },
      { start: "10:45", end: "11:15", isBreak: true, name: "Recreo" },
      { start: "11:15", end: "12:10", isBreak: false, name: "Franja 4" },
      { start: "12:10", end: "13:05", isBreak: false, name: "Franja 5" },
      { start: "13:05", end: "14:00", isBreak: false, name: "Franja 6" }
    ]
  },
  morningContinuous: {
    name: "Turno Intensivo (8 Franjas)",
    timeSlots: [
      { start: "08:00", end: "08:50", isBreak: false, name: "Franja 1" },
      { start: "08:50", end: "09:40", isBreak: false, name: "Franja 2" },
      { start: "09:40", end: "10:30", isBreak: false, name: "Franja 3" },
      { start: "10:30", end: "11:00", isBreak: true, name: "Recreo 1" },
      { start: "11:00", end: "11:50", isBreak: false, name: "Franja 4" },
      { start: "11:50", end: "12:40", isBreak: false, name: "Franja 5" },
      { start: "12:40", end: "13:00", isBreak: true, name: "Recreo 2" },
      { start: "13:00", end: "13:50", isBreak: false, name: "Franja 6" }
    ]
  }
};

export const DEFAULT_HOLIDAYS_CV = {
  "2026-10-09": "Día de la Comunitat Valenciana",
  "2026-10-12": "Fiesta Nacional de España",
  "2026-11-01": "Todos los Santos",
  "2026-11-02": "Día no lectivo (Todos los Santos)",
  "2026-12-06": "Día de la Constitución",
  "2026-12-07": "Puente de la Constitución",
  "2026-12-08": "Inmaculada Concepción",
  "2026-12-23": "Vacaciones de Navidad",
  "2026-12-24": "Nochebuena",
  "2026-12-25": "Navidad",
  "2026-12-28": "Vacaciones de Navidad",
  "2026-12-29": "Vacaciones de Navidad",
  "2026-12-30": "Vacaciones de Navidad",
  "2026-12-31": "Nochevieja",
  "2027-01-01": "Año Nuevo",
  "2027-01-04": "Vacaciones de Navidad",
  "2027-01-05": "Vacaciones de Navidad",
  "2027-01-06": "Epifanía del Señor (Reyes)",
  "2027-01-22": "San Vicente Mártir",
  "2027-03-15": "Semana Fallera",
  "2027-03-16": "Semana Fallera",
  "2027-03-17": "Semana Fallera",
  "2027-03-18": "Semana Fallera",
  "2027-03-19": "San José (Fallas)",
  "2027-04-01": "Jueves Santo",
  "2027-04-02": "Viernes Santo",
  "2027-04-05": "Lunes de Pascua",
  "2027-04-06": "Vacaciones de Pascua",
  "2027-04-07": "Vacaciones de Pascua",
  "2027-04-08": "Vacaciones de Pascua",
  "2027-04-09": "Vacaciones de Pascua",
  "2027-04-12": "San Vicente Ferrer",
  "2027-05-01": "Fiesta del Trabajo"
};

/**
 * Valida un objeto de configuración del curso.
 * @param {Object} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCourseConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['La configuración debe ser un objeto válido'] };
  }

  // 1. Validar curso
  if (!config.course) {
    errors.push('Falta el objeto "course"');
  } else {
    if (!config.course.id || !/^[a-z0-9_-]+$/i.test(config.course.id)) {
      errors.push('course.id es obligatorio y debe contener solo letras, números, guiones y guiones bajos');
    }
    if (!config.course.name || config.course.name.trim().length < 3) {
      errors.push('course.name debe tener al menos 3 caracteres');
    }
    if (!config.course.shortName || config.course.shortName.trim().length < 2) {
      errors.push('course.shortName debe tener al menos 2 caracteres');
    }
  }

  // 2. Validar franjas horarias
  if (!Array.isArray(config.timeSlots) || config.timeSlots.length < 2) {
    errors.push('timeSlots debe ser un array con al menos 2 franjas');
  } else {
    config.timeSlots.forEach((slot, idx) => {
      if (!slot.start || !slot.end) {
        errors.push(`La franja ${idx + 1} debe tener inicio y fin (HH:mm)`);
      } else {
        const [sh, sm] = slot.start.split(':').map(Number);
        const [eh, em] = slot.end.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (isNaN(startMin) || isNaN(endMin) || startMin >= endMin) {
          errors.push(`La franja ${idx + 1} (${slot.start} - ${slot.end}) no tiene un rango horario válido`);
        }
      }
    });
  }

  // 3. Validar asignaturas
  if (!config.subjects || typeof config.subjects !== 'object' || Object.keys(config.subjects).length === 0) {
    errors.push('Debe definirse al menos una asignatura en "subjects"');
  } else {
    for (const [key, sub] of Object.entries(config.subjects)) {
      if (!sub.name || sub.name.trim().length < 2) {
        errors.push(`La asignatura "${key}" debe tener un nombre válido`);
      }
    }
  }

  // 4. Validar cuadrícula semanal
  if (!config.weeklyGrid && !config.weeklyRaw) {
    errors.push('Debe configurarse la cuadrícula semanal (weeklyGrid o weeklyRaw)');
  }

  if (config.weeklyGrid) {
    [1, 2, 3, 4, 5].forEach(day => {
      const daySlots = config.weeklyGrid[day];
      if (!Array.isArray(daySlots)) {
        errors.push(`El día ${day} en weeklyGrid debe ser un array`);
      } else if (config.timeSlots && daySlots.length !== config.timeSlots.length) {
        errors.push(`El día ${day} tiene ${daySlots.length} módulos, pero hay ${config.timeSlots.length} franjas`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convierte un weeklyGrid (array de asignaturas por franja para días 1..5) en weeklyRaw comprimido
 * @param {Record<number, string[]>} grid
 * @param {Array<Object>} timeSlots
 * @param {Record<string, Object>} subjects
 * @returns {Record<number, Array<{mod: string, from: number, to: number}>>}
 */
export function compressWeeklyGrid(grid, timeSlots = [], subjects = {}) {
  const result = {};
  const breakIndexes = timeSlots
    .map((slot, idx) => (slot.isBreak || slot.id === 'recreo' || slot.name?.toLowerCase().includes('recreo')) ? idx : -1)
    .filter(idx => idx !== -1);

  for (const [dayKey, slotMods] of Object.entries(grid || {})) {
    const day = Number(dayKey);
    const blocks = [];
    let currentMod = null;
    let startIdx = 0;

    for (let i = 0; i < slotMods.length; i++) {
      const mod = slotMods[i];
      const isBreak = breakIndexes.includes(i) || mod === 'recreo' || (subjects[mod] && subjects[mod].isBreak);

      if (isBreak) {
        if (currentMod !== null) {
          blocks.push({ mod: currentMod, from: startIdx, to: i });
          currentMod = null;
        }
        continue;
      }

      if (mod !== currentMod) {
        if (currentMod !== null) {
          blocks.push({ mod: currentMod, from: startIdx, to: i });
        }
        currentMod = mod;
        startIdx = i;
      }
    }

    if (currentMod !== null) {
      blocks.push({ mod: currentMod, from: startIdx, to: slotMods.length });
    }

    result[day] = blocks;
  }

  return result;
}

/**
 * Genera la representación canónica en JSON del curso
 * @param {Object} state
 * @returns {string}
 */
export function generateCourseConfigJson(state) {
  const weeklyRaw = state.weeklyRaw || compressWeeklyGrid(state.weeklyGrid, state.timeSlots, state.subjects);
  
  const payload = {
    version: "1.0.0",
    course: {
      id: state.course?.id || "curso-escolar",
      name: state.course?.name || "Curso Escolar",
      shortName: state.course?.shortName || "CURSO",
      institution: state.course?.institution || "Centro Educativo",
      academicYear: state.course?.academicYear || "2026/2027",
      termStart: state.course?.termStart || "2026-09-08",
      termEnd: state.course?.termEnd || "2027-06-22",
      calendarFeedName: state.course?.calendarFeedName || `Horario ${state.course?.shortName || ''}`.trim(),
      calendarFeedDesc: state.course?.calendarFeedDesc || `Horario oficial de ${state.course?.name || ''}`.trim()
    },
    timeSlots: (state.timeSlots || []).map((s, idx) => ({
      index: idx + 1,
      start: s.start,
      end: s.end,
      ...(s.isBreak ? { isBreak: true, name: s.name || "Recreo" } : {})
    })),
    subjects: state.subjects || {},
    weeklyGrid: state.weeklyGrid || {},
    weeklyRaw,
    holidays: state.holidays || DEFAULT_HOLIDAYS_CV
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Genera el archivo JavaScript (ES Module) exportando la configuración
 * @param {Object} state
 * @returns {string}
 */
export function generateCourseConfigFileContent(state) {
  const jsonContent = generateCourseConfigJson(state);
  return `/**
 * @file course.config.js
 * @description Configuración declarativa generada por Horario Launcher.
 */

export default ${jsonContent};
`;
}
