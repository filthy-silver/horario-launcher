/**
 * @file wizard.js
 * @description Orquestador interactivo del Asistente Web Horario Launcher.
 */

import {
  PRESETS,
  DEFAULT_HOLIDAYS_CV,
  validateCourseConfig
} from './course-schema.js';
import { buildCourseZip, downloadConfigJson } from './zip-builder.js';

// Estado global en memoria del Asistente
const state = {
  currentStep: 1,
  course: {
    id: "cfgs-3d",
    name: "Animaciones 3D, Juegos y Entornos Interactivos",
    shortName: "CFGS 3D",
    institution: "IES IESFP",
    academicYear: "2026/2027",
    termStart: "2026-09-08",
    termEnd: "2027-06-22"
  },
  timeSlots: JSON.parse(JSON.stringify(PRESETS.afternoonFp.timeSlots)),
  subjects: {
    proye: {
      id: "proye",
      name: "Realización de proyectos",
      legend: "Proyectos",
      teacher: "PTS 06",
      classroom: "Aula 3D · INF-1",
      colorVar: "--mod-proye",
      color: "#0284c7",
      aulesKeywords: ["realització de projectes", "projectes", "pts 06"]
    },
    dibujo: {
      id: "dibujo",
      name: "Diseño, dibujo y modelado",
      legend: "Diseño y dibujo",
      teacher: "PS SO 01",
      classroom: "Taller Dibujo",
      colorVar: "--mod-dibujo",
      color: "#6d28d9",
      aulesKeywords: ["disseny, dibuix i modelatge", "dibujo", "modelado"]
    },
    anim: {
      id: "anim",
      name: "Animación de elementos",
      legend: "Animación 2D/3D",
      teacher: "PS SO 02",
      classroom: "Lab Animación",
      colorVar: "--mod-anim",
      color: "#1d4ed8",
      aulesKeywords: ["animació d'elements", "animación", "elementos 2d"]
    },
    color: {
      id: "color",
      name: "Color, iluminación y acabados",
      legend: "Color e iluminación",
      teacher: "PTS 01",
      classroom: "Aula Color",
      colorVar: "--mod-color",
      color: "#b45309",
      aulesKeywords: ["color, il·luminació", "iluminación", "color"]
    },
    fol: {
      id: "fol",
      name: "Itinerario personal (FOL)",
      legend: "Itinerario / FOL",
      teacher: "FOL 04",
      classroom: "Aula Teórica",
      colorVar: "--mod-fol",
      color: "#047857",
      aulesKeywords: ["itinerari personal", "fol", "ocupabilitat"]
    },
    inter: {
      id: "inter",
      name: "Proyecto intermodular",
      legend: "Intermodular",
      teacher: "Coordinación Intermodular",
      classroom: "Aula 3D",
      colorVar: "--mod-inter",
      color: "#be185d",
      aulesKeywords: ["projecte intermodular", "intermodular"]
    },
    ingles: {
      id: "ingles",
      name: "Inglés profesional",
      legend: "Inglés",
      teacher: "ANG 02",
      classroom: "Aula Idiomas",
      colorVar: "--mod-ingles",
      color: "#334155",
      aulesKeywords: ["anglés professional", "inglés", "ang 02"]
    },
    recreo: {
      id: "recreo",
      name: "Recreo",
      legend: "Recreo",
      teacher: "",
      classroom: "Patio / Cafetería",
      colorVar: "--mod-recreo",
      color: "#b45309",
      isBreak: true,
      aulesKeywords: []
    }
  },
  weeklyGrid: {
    1: ["proye", "color", "color", "recreo", "dibujo", "dibujo", "dibujo"],
    2: ["fol", "inter", "proye", "recreo", "proye", "proye", "ingles"],
    3: ["color", "color", "color", "recreo", "fol", "proye", "proye"],
    4: ["anim", "anim", "anim", "recreo", "anim", "ingles", "fol"],
    5: ["anim", "anim", "anim", "recreo", "anim", "dibujo", "dibujo"]
  },
  holidays: { ...DEFAULT_HOLIDAYS_CV }
};

// ───────── Navegación por Pasos ─────────

function setStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > 5) return;
  state.currentStep = stepNumber;

  // Actualizar stepper visual
  document.querySelectorAll('.step-item').forEach(btn => {
    const s = parseInt(btn.dataset.step, 10);
    btn.classList.toggle('active', s === stepNumber);
    btn.classList.toggle('completed', s < stepNumber);
  });

  // Ocultar todos los paneles y mostrar el activo
  for (let i = 1; i <= 5; i++) {
    const pane = document.getElementById(`step-pane-${i}`);
    if (pane) {
      pane.style.display = i === stepNumber ? 'block' : 'none';
    }
  }

  // Botones de navegación inferior
  const btnPrev = document.getElementById('btn-prev-step');
  const btnNext = document.getElementById('btn-next-step');
  const indicator = document.getElementById('current-step-indicator');

  if (btnPrev) btnPrev.style.visibility = stepNumber === 1 ? 'hidden' : 'visible';
  if (indicator) indicator.textContent = stepNumber;

  if (btnNext) {
    if (stepNumber === 5) {
      btnNext.style.display = 'none';
    } else {
      btnNext.style.display = 'inline-flex';
    }
  }

  // Acciones específicas al entrar a un paso
  if (stepNumber === 2) {
    renderTimeSlots();
  } else if (stepNumber === 3) {
    renderSubjectsList();
  } else if (stepNumber === 4) {
    renderScheduleGrid();
  } else if (stepNumber === 5) {
    renderSummaryAndValidation();
  }
}

// ───────── Paso 1: Datos del Curso ─────────

function bindStep1Inputs() {
  const map = {
    'input-course-name': (val) => { state.course.name = val; },
    'input-course-short': (val) => { state.course.shortName = val; },
    'input-course-id': (val) => { state.course.id = val.toLowerCase().replace(/[^a-z0-9_-]/g, ''); },
    'input-institution': (val) => { state.course.institution = val; },
    'input-academic-year': (val) => { state.course.academicYear = val; },
    'input-term-start': (val) => { state.course.termStart = val; },
    'input-term-end': (val) => { state.course.termEnd = val; }
  };

  for (const [id, setter] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => setter(e.target.value.trim()));
    }
  }

  syncStep1Form();
}

function syncStep1Form() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('input-course-name', state.course.name);
  setVal('input-course-short', state.course.shortName);
  setVal('input-course-id', state.course.id);
  setVal('input-institution', state.course.institution);
  setVal('input-academic-year', state.course.academicYear);
  setVal('input-term-start', state.course.termStart);
  setVal('input-term-end', state.course.termEnd);
}

// ───────── Paso 2: Franjas Horarias ─────────

function renderTimeSlots() {
  const container = document.getElementById('time-slots-container');
  if (!container) return;

  container.innerHTML = '';

  state.timeSlots.forEach((slot, idx) => {
    const row = document.createElement('div');
    row.className = 'time-slot-row';

    row.innerHTML = `
      <span class="time-slot-index">${idx + 1}</span>
      <input type="time" class="form-input slot-start" value="${slot.start}" style="width: 130px;" aria-label="Inicio franja ${idx + 1}" />
      <span>–</span>
      <input type="time" class="form-input slot-end" value="${slot.end}" style="width: 130px;" aria-label="Fin franja ${idx + 1}" />
      <label class="time-slot-break-label">
        <input type="checkbox" class="slot-is-break" ${slot.isBreak ? 'checked' : ''} />
        <span>Es Recreo / Descanso</span>
      </label>
      <button type="button" class="btn btn-danger btn-remove-slot" style="margin-left: auto; padding: 0.35rem 0.65rem;" title="Eliminar franja" aria-label="Eliminar franja ${idx + 1}">
        <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    `;

    // Eventos
    const startInput = row.querySelector('.slot-start');
    const endInput = row.querySelector('.slot-end');
    const breakInput = row.querySelector('.slot-is-break');
    const removeBtn = row.querySelector('.btn-remove-slot');

    startInput.addEventListener('change', (e) => {
      slot.start = e.target.value;
    });
    endInput.addEventListener('change', (e) => {
      slot.end = e.target.value;
    });
    breakInput.addEventListener('change', (e) => {
      slot.isBreak = e.target.checked;
      if (slot.isBreak) slot.name = 'Recreo';
      adjustWeeklyGridForTimeSlots();
    });
    removeBtn.addEventListener('click', () => {
      if (state.timeSlots.length <= 2) {
        alert('Debe haber al menos 2 franjas horarias.');
        return;
      }
      state.timeSlots.splice(idx, 1);
      adjustWeeklyGridForTimeSlots();
      renderTimeSlots();
    });

    container.appendChild(row);
  });
}

function adjustWeeklyGridForTimeSlots() {
  const targetCount = state.timeSlots.length;
  [1, 2, 3, 4, 5].forEach(day => {
    const list = state.weeklyGrid[day] || [];
    while (list.length < targetCount) {
      list.push('recreo');
    }
    if (list.length > targetCount) {
      state.weeklyGrid[day] = list.slice(0, targetCount);
    }
  });
}

// ───────── Paso 3: Asignaturas y Módulos ─────────

function renderSubjectsList() {
  const container = document.getElementById('subjects-list-container');
  const countEl = document.getElementById('subject-count');
  if (!container) return;

  const subjectEntries = Object.entries(state.subjects).filter(([key]) => key !== 'recreo');
  if (countEl) countEl.textContent = subjectEntries.length;

  container.innerHTML = '';

  subjectEntries.forEach(([key, sub]) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--subject-color', sub.color || '#0284c7');

    card.innerHTML = `
      <div class="subject-card-header">
        <div>
          <div class="subject-card-title">${escapeHtml(sub.name)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">ID: ${escapeHtml(key)} · Leyenda: ${escapeHtml(sub.legend || sub.name)}</div>
        </div>
        <button type="button" class="btn btn-danger btn-delete-sub" style="padding: 0.35rem 0.5rem;" title="Eliminar asignatura" aria-label="Eliminar asignatura ${escapeHtml(sub.name)}">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
      <div class="subject-card-meta">
        ${sub.teacher ? `<span>Prof: ${escapeHtml(sub.teacher)}</span>` : ''}
        ${sub.classroom ? `<span> · Aula: ${escapeHtml(sub.classroom)}</span>` : ''}
      </div>
      ${Array.isArray(sub.aulesKeywords) && sub.aulesKeywords.length > 0 ? `
        <div class="subject-card-keywords">
          <strong>Aules:</strong> ${escapeHtml(sub.aulesKeywords.join(', '))}
        </div>
      ` : ''}
    `;

    card.querySelector('.btn-delete-sub').addEventListener('click', () => {
      delete state.subjects[key];
      // Limpiar de la cuadrícula
      [1, 2, 3, 4, 5].forEach(day => {
        state.weeklyGrid[day] = state.weeklyGrid[day].map(s => s === key ? 'recreo' : s);
      });
      renderSubjectsList();
    });

    container.appendChild(card);
  });
}

function handleAddSubject() {
  const codeInput = document.getElementById('input-sub-code');
  const nameInput = document.getElementById('input-sub-name');
  const legendInput = document.getElementById('input-sub-legend');
  const teacherInput = document.getElementById('input-sub-teacher');
  const classInput = document.getElementById('input-sub-classroom');
  const colorInput = document.getElementById('input-sub-color');
  const kwInput = document.getElementById('input-sub-keywords');

  const code = codeInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const name = nameInput.value.trim();
  const legend = legendInput.value.trim() || name;
  const teacher = teacherInput.value.trim();
  const classroom = classInput.value.trim();
  const color = colorInput.value.trim() || '#0284c7';
  const keywords = kwInput.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  if (!code || !name) {
    alert('Introduce el código identificador y el nombre de la asignatura.');
    return;
  }

  state.subjects[code] = {
    id: code,
    name,
    legend,
    teacher,
    classroom,
    colorVar: `--mod-${code}`,
    color,
    aulesKeywords: keywords
  };

  // Limpiar campos del formulario
  codeInput.value = '';
  nameInput.value = '';
  legendInput.value = '';
  teacherInput.value = '';
  classInput.value = '';
  kwInput.value = '';

  renderSubjectsList();
}

// ───────── Paso 4: Cuadrícula Semanal ─────────

function renderScheduleGrid() {
  const tbody = document.getElementById('grid-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  adjustWeeklyGridForTimeSlots();

  const totalSlots = state.timeSlots.length;
  const subjectOptions = Object.entries(state.subjects).map(([k, s]) => ({
    key: k,
    name: s.legend || s.name
  }));

  for (let sIdx = 0; sIdx < totalSlots; sIdx++) {
    const slot = state.timeSlots[sIdx];
    const tr = document.createElement('tr');

    const timeTd = document.createElement('td');
    timeTd.className = 'time-col';
    timeTd.textContent = `${slot.start}–${slot.end}`;
    tr.appendChild(timeTd);

    if (slot.isBreak) {
      const breakTd = document.createElement('td');
      breakTd.className = 'break-row';
      breakTd.colSpan = 5;
      breakTd.textContent = slot.name || 'Descanso común / Recreo';
      tr.appendChild(breakTd);
    } else {
      [1, 2, 3, 4, 5].forEach(day => {
        const td = document.createElement('td');
        const select = document.createElement('select');
        select.className = 'grid-select';
        select.setAttribute('aria-label', `Día ${day}, franja ${sIdx + 1}`);

        const currentVal = state.weeklyGrid[day]?.[sIdx] || 'recreo';

        subjectOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.key;
          option.textContent = opt.name;
          if (opt.key === currentVal) option.selected = true;
          select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
          if (!state.weeklyGrid[day]) state.weeklyGrid[day] = [];
          state.weeklyGrid[day][sIdx] = e.target.value;
        });

        td.appendChild(select);
        tr.appendChild(td);
      });
    }

    tbody.appendChild(tr);
  }
}

// ───────── Paso 5: Resumen, Validación y Descarga ─────────

function renderSummaryAndValidation() {
  const validation = validateCourseConfig(state);
  const valBox = document.getElementById('validation-box');

  if (valBox) {
    if (validation.valid) {
      valBox.className = 'alert-box alert-success';
      valBox.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <div>
          <strong>¡Configuración válida y completa!</strong>
          <p style="font-size: 0.85rem; margin-top: 0.2rem;">Tu curso está listo para ser empaquetado y desplegado directamente en Cloudflare Pages.</p>
        </div>
      `;
    } else {
      valBox.className = 'alert-box alert-danger';
      valBox.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <div>
          <strong>Se detectaron problemas en la configuración:</strong>
          <ul style="padding-left: 1.25rem; font-size: 0.85rem; margin-top: 0.25rem;">
            ${validation.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }

  // Resumen
  const nameEl = document.getElementById('summary-course-name');
  const subEl = document.getElementById('summary-course-sub');
  const slotsEl = document.getElementById('summary-slots-count');
  const subsEl = document.getElementById('summary-subjects-count');

  if (nameEl) nameEl.textContent = state.course.name || '-';
  if (subEl) subEl.textContent = `${state.course.shortName || ''} · ${state.course.institution || ''} (${state.course.academicYear || ''})`;
  if (slotsEl) slotsEl.textContent = `${state.timeSlots.length} Franjas horarias`;
  if (subsEl) subsEl.textContent = `${Object.keys(state.subjects).filter(k => k !== 'recreo').length} Asignaturas configuradas`;
}

// ───────── Manejadores de Descarga ─────────

async function handleDownloadZip() {
  const validation = validateCourseConfig(state);
  if (!validation.valid) {
    alert('Corrige los errores de configuración antes de descargar el proyecto.');
    return;
  }

  const btn = document.getElementById('btn-download-zip');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Empaquetando en cliente...</span>`;

  try {
    const blob = await buildCourseZip(state, (pct) => {
      btn.innerHTML = `<span>Empaquetando (${pct}%)...</span>`;
    });

    const filename = `horario-${state.course.id || 'curso'}.zip`;
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
  } catch (err) {
    console.error('Error generando ZIP:', err);
    alert(`Error al generar el archivo .ZIP: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function handleDownloadJson() {
  downloadConfigJson(state);
}

// ───────── Utilidades y Temas ─────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initThemeToggle() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('wizard_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  toggleBtn?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('wizard_theme', next);
  });
}

// ───────── Inicialización ─────────

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  bindStep1Inputs();

  // Botón Siguiente / Anterior
  document.getElementById('btn-prev-step')?.addEventListener('click', () => {
    setStep(state.currentStep - 1);
  });

  document.getElementById('btn-next-step')?.addEventListener('click', () => {
    setStep(state.currentStep + 1);
  });

  // Botones de stepper
  document.querySelectorAll('.step-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.dataset.step, 10);
      setStep(targetStep);
    });
  });

  // Selector de preset en Paso 2
  const presetSelect = document.getElementById('select-slot-preset');
  presetSelect?.addEventListener('change', (e) => {
    const preset = PRESETS[e.target.value];
    if (preset) {
      state.timeSlots = JSON.parse(JSON.stringify(preset.timeSlots));
      adjustWeeklyGridForTimeSlots();
      renderTimeSlots();
    }
  });

  // Botón Añadir Franja en Paso 2
  document.getElementById('btn-add-slot')?.addEventListener('click', () => {
    const lastSlot = state.timeSlots[state.timeSlots.length - 1];
    let start = "08:00";
    let end = "08:55";
    if (lastSlot) {
      start = lastSlot.end;
      const [h, m] = start.split(':').map(Number);
      const nextMin = (h * 60 + m + 55) % (24 * 60);
      end = `${String(Math.floor(nextMin / 60)).padStart(2, '0')}:${String(nextMin % 60).padStart(2, '0')}`;
    }
    state.timeSlots.push({
      start,
      end,
      isBreak: false,
      name: `Franja ${state.timeSlots.length + 1}`
    });
    adjustWeeklyGridForTimeSlots();
    renderTimeSlots();
  });

  // Color picker sync en Paso 3
  const colorPicker = document.getElementById('input-sub-color');
  const colorText = document.getElementById('input-sub-color-text');
  colorPicker?.addEventListener('input', (e) => {
    if (colorText) colorText.value = e.target.value;
  });
  colorText?.addEventListener('input', (e) => {
    if (colorPicker && /^#[0-9a-f]{6}$/i.test(e.target.value)) {
      colorPicker.value = e.target.value;
    }
  });

  // Botón Añadir Asignatura en Paso 3
  document.getElementById('btn-add-subject')?.addEventListener('click', handleAddSubject);

  // Botones de descarga en Paso 5
  document.getElementById('btn-download-zip')?.addEventListener('click', handleDownloadZip);
  document.getElementById('btn-download-json')?.addEventListener('click', handleDownloadJson);

  // Botón "Cargar Ejemplo"
  document.getElementById('btn-load-demo')?.addEventListener('click', () => {
    syncStep1Form();
    renderTimeSlots();
    renderSubjectsList();
    renderScheduleGrid();
    alert('Plantilla de ejemplo cargada con éxito.');
  });

  // Iniciar en Paso 1
  setStep(1);
});
