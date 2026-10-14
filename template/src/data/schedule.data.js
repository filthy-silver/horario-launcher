/**
 * @file schedule.data.js
 * @description Esquema de datos estructurado y lógica de horarios derivado dinámicamente de course.config.js.
 */

import COURSE_CONFIG from './course.config.js';

// Derivar TIME_BOUNDARIES a partir de timeSlots si existe
export const TIME_BOUNDARIES = (COURSE_CONFIG.timeSlots && COURSE_CONFIG.timeSlots.length > 0)
  ? [COURSE_CONFIG.timeSlots[0].start, ...COURSE_CONFIG.timeSlots.map(s => s.end)]
  : [
      "15:45", "16:40", "17:35", "18:30", "18:50", "19:45", "20:40", "21:35"
    ];

export const BREAK_SLOT_INDEXES = (COURSE_CONFIG.timeSlots && COURSE_CONFIG.timeSlots.length > 0)
  ? COURSE_CONFIG.timeSlots
      .map((slot, idx) => (slot.isBreak || slot.id === 'recreo' || slot.mod === 'recreo') ? idx : -1)
      .filter(idx => idx !== -1)
  : [3];

export const BREAK_SLOT_INDEX = BREAK_SLOT_INDEXES.length > 0 ? BREAK_SLOT_INDEXES[0] : 3;

function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export const SCHOOL_DAY_START_MINUTES = timeToMinutes(TIME_BOUNDARIES[0]);
export const SCHOOL_DAY_END_MINUTES = timeToMinutes(TIME_BOUNDARIES[TIME_BOUNDARIES.length - 1]);

export const DAYS_CONFIG = [
  { id: 1, name: "Lunes", shortName: "Lun" },
  { id: 2, name: "Martes", shortName: "Mar" },
  { id: 3, name: "Miércoles", shortName: "Mié" },
  { id: 4, name: "Jueves", shortName: "Jue" },
  { id: 5, name: "Viernes", shortName: "Vie" }
];

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

// Festivos
export const SCHOOL_HOLIDAYS = Array.isArray(COURSE_CONFIG.holidays)
  ? Object.fromEntries(COURSE_CONFIG.holidays.map(h => [h.date, h.name]))
  : (COURSE_CONFIG.holidays || {});

/**
 * Consulta si una fecha determinada es festivo escolar.
 * @param {Date} [dateObj=new Date()]
 * @returns {{ isHoliday: boolean, name: string|null, dateStr: string }}
 */
export function getHolidayInfo(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const name = SCHOOL_HOLIDAYS[dateStr] || null;

  return {
    isHoliday: Boolean(name),
    name,
    dateStr
  };
}

// Normalizar SUBJECTS a partir de COURSE_CONFIG.subjects
export const SUBJECTS = {};
for (const [key, sub] of Object.entries(COURSE_CONFIG.subjects || {})) {
  SUBJECTS[key] = {
    id: key,
    name: sub.name || key,
    fullName: sub.fullName || sub.name || key,
    meta: sub.meta || (sub.classroom ? `${sub.teacher || ''} · ${sub.classroom}`.replace(/^ · | · $/g, '') : (sub.teacher || '')),
    legend: sub.legend || sub.name || key,
    colorVar: sub.colorVar || `--mod-${key}`,
    color: sub.color,
    isBreak: Boolean(sub.isBreak)
  };
}

// Asegurar existencia de recreo como fallback
if (!SUBJECTS.recreo) {
  SUBJECTS.recreo = {
    id: "recreo",
    name: "Recreo",
    fullName: "Descanso común",
    meta: "Descanso",
    legend: "Recreo",
    colorVar: "--mod-recreo",
    color: "#b45309",
    isBreak: true
  };
}

/**
 * Genera bloques lectivos semanales a partir de la cuadrícula de slots
 * @param {Record<number, string[]>} grid
 * @param {number[]} breakIndexes
 * @returns {Record<number, Array<{mod: string, from: number, to: number}>>}
 */
function buildWeeklyRawFromGrid(grid, breakIndexes = []) {
  const result = {};
  for (const [dayKey, slotMods] of Object.entries(grid || {})) {
    const day = Number(dayKey);
    const blocks = [];
    let currentMod = null;
    let startIdx = 0;

    for (let i = 0; i < slotMods.length; i++) {
      const mod = slotMods[i];
      const isBreak = breakIndexes.includes(i) || mod === 'recreo' || (SUBJECTS[mod] && SUBJECTS[mod].isBreak);

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

export const WEEKLY_SCHEDULE_RAW = COURSE_CONFIG.weeklyRaw || buildWeeklyRawFromGrid(COURSE_CONFIG.weeklyGrid, BREAK_SLOT_INDEXES);

/**
 * Genera la lista normalizada de eventos agrupados por día (1 a 5).
 * @returns {Record<number, Array<Object>>}
 */
export function buildNormalizedEvents() {
  const eventsByDay = {};

  DAYS_CONFIG.forEach(({ id: day }) => {
    const rawList = WEEKLY_SCHEDULE_RAW[day] || [];
    const dayEvents = rawList.map(item => {
      const subject = SUBJECTS[item.mod] || { name: item.mod, meta: "", colorVar: "--line" };
      return {
        id: `ev-${day}-${item.from}-${item.to}-${item.mod}`,
        mod: item.mod,
        from: item.from,
        to: item.to,
        start: TIME_BOUNDARIES[item.from],
        end: TIME_BOUNDARIES[item.to],
        name: subject.name,
        meta: item.meta || subject.meta || "",
        colorVar: subject.colorVar
      };
    });

    // Inyectar descansos / recreos comunes para este día
    BREAK_SLOT_INDEXES.forEach((breakIdx, count) => {
      const breakSub = SUBJECTS.recreo;
      dayEvents.push({
        id: `ev-${day}-recreo${count > 0 ? `-${count}` : ''}`,
        mod: "recreo",
        from: breakIdx,
        to: breakIdx + 1,
        start: TIME_BOUNDARIES[breakIdx],
        end: TIME_BOUNDARIES[breakIdx + 1],
        name: breakSub.name,
        meta: breakSub.meta,
        colorVar: breakSub.colorVar
      });
    });

    dayEvents.sort((a, b) => a.from - b.from);
    eventsByDay[day] = dayEvents;
  });

  return eventsByDay;
}
