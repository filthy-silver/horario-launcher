import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import COURSE_CONFIG from '../src/data/course.config.js';
import {
  TIME_BOUNDARIES,
  BREAK_SLOT_INDEXES,
  SUBJECTS,
  WEEKLY_SCHEDULE_RAW,
  buildNormalizedEvents
} from '../src/data/schedule.data.js';
import { matchSubject, AULES_SUBJECT_PATTERNS } from '../src/domain/subject-matcher.js';

describe('course.config.js y Parametrización Multicurso', () => {

  it('el archivo course.config.js define las propiedades requeridas del esquema', () => {
    assert.ok(COURSE_CONFIG.course, 'Falta la sección course');
    assert.ok(COURSE_CONFIG.course.id, 'Falta course.id');
    assert.ok(COURSE_CONFIG.course.name, 'Falta course.name');
    assert.ok(Array.isArray(COURSE_CONFIG.timeSlots), 'timeSlots debe ser un array');
    assert.ok(COURSE_CONFIG.timeSlots.length >= 3, 'Debe haber al menos 3 franjas horarias');
    assert.ok(COURSE_CONFIG.subjects, 'Falta subjects');
    assert.ok(COURSE_CONFIG.weeklyGrid || COURSE_CONFIG.weeklyRaw, 'Falta weeklyGrid o weeklyRaw');
  });

  it('TIME_BOUNDARIES se deriva correctamente a partir de timeSlots', () => {
    assert.equal(TIME_BOUNDARIES[0], COURSE_CONFIG.timeSlots[0].start);
    const lastBoundary = TIME_BOUNDARIES[TIME_BOUNDARIES.length - 1];
    const lastSlot = COURSE_CONFIG.timeSlots[COURSE_CONFIG.timeSlots.length - 1];
    assert.equal(lastBoundary, lastSlot.end);
    assert.equal(TIME_BOUNDARIES.length, COURSE_CONFIG.timeSlots.length + 1);
  });

  it('BREAK_SLOT_INDEXES detecta correctamente las franjas marcadas como descanso', () => {
    assert.ok(Array.isArray(BREAK_SLOT_INDEXES));
    BREAK_SLOT_INDEXES.forEach(idx => {
      const slot = COURSE_CONFIG.timeSlots[idx];
      assert.ok(slot.isBreak || slot.id === 'recreo', `Slot ${idx} no está marcado como descanso`);
    });
  });

  it('AULES_SUBJECT_PATTERNS se genera dinámicamente según aulesKeywords', () => {
    assert.ok(Array.isArray(AULES_SUBJECT_PATTERNS));
    assert.ok(AULES_SUBJECT_PATTERNS.length > 0);

    const proyePattern = AULES_SUBJECT_PATTERNS.find(p => p.mod === 'proye');
    assert.ok(proyePattern);
    assert.ok(proyePattern.keywords.includes('pts 06'));

    // Comprobar coincidencia heurística
    const matched = matchSubject({
      category: 'Realització de projectes multimèdia interactius (PTS 06)',
      title: 'Entrega de propuesta'
    });
    assert.equal(matched.mod, 'proye');
  });

  it('buildNormalizedEvents respeta la configuración de asignaturas y recreos', () => {
    const events = buildNormalizedEvents();
    assert.ok(events[1].length > 0);
    const firstEvent = events[1][0];
    assert.ok(SUBJECTS[firstEvent.mod]);
    assert.ok(firstEvent.start);
    assert.ok(firstEvent.end);
  });

});
