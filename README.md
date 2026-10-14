# Horario Launcher

> Generador y orquestador multi-curso de horarios escolares PWA y tableros Kanban listos para despliegue en Cloudflare Pages con Direct Upload.

---

## 1. Arquitectura y Filosofía

**Horario Launcher** desacopla la lógica del horario escolar y el tablero Kanban de los datos específicos de cualquier titulación o centro:

* **Descentralización Total:** Cada curso o ciclo formativo se genera como una aplicación independiente y autónoma. No existe un backend multi-inquilino centralizado que concentre tokens de Aules (Moodle) ni datos de alumnos.
* **Coste Cero y Cero Responsabilidad:** Los cursos generados se despliegan directamente en la capa gratuita de Cloudflare Pages mediante *Direct Upload* (arrastrar y soltar la carpeta o subir el ZIP).
* **Empaquetado 100% en el Cliente:** El asistente web (`wizard/`) se ejecuta enteramente en el navegador del usuario utilizando `JSZip`. No requiere servidores, bases de datos ni conexión a internet para generar el proyecto completo.
* **Diseño "Warm Studio":** Interfaz sobria, accesible (WCAG AA), tipografía cuidada e iconos vectoriales SVG limpios (**sin emojis**).

---

## 2. Estructura del Repositorio

```text
horario-launcher/
├── package.json                   # Scripts del launcher y dependencias de test
├── tests/                         # Tests unitarios del esquema y empaquetador
│   ├── course-schema.test.js
│   └── zip-builder.test.js
├── scripts/
│   └── build-template-bundle.js   # Genera el catálogo embebido offline
├── wizard/                        # Asistente Web interactivo (Client-side)
│   ├── index.html                 # Asistente de 5 pasos
│   ├── css/
│   │   └── wizard.css             # Tema visual Warm Studio
│   ├── js/
│   │   ├── course-schema.js       # Validación, compresión de cuadrícula y presets
│   │   ├── zip-builder.js         # Ensamblador de archivos ZIP con JSZip
│   │   ├── template-bundle.js     # Catálogo de archivos base empaquetado
│   │   └── wizard.js              # Controlador del asistente
│   └── vendor/
│       └── jszip.min.js           # Librería JSZip offline
└── template/                      # Motor base parametrizable de Horario + Kanban
    ├── course.config.json         # Configuración declarativa canónica
    ├── src/
    │   ├── data/
    │   │   ├── course.config.js   # Exportación ESM de la configuración
    │   │   └── schedule.data.js   # Derivación dinámica de horarios y festivos
    │   ├── domain/                # Cálculos temporales, sanitización y matching
    │   ├── kanban/                # Tablero Kanban y sincronización P2P
    │   └── ui/                    # Vistas tabla, timeline móvil y modales
    ├── functions/api/             # Cloudflare Pages Functions (calendar.ics, aules)
    ├── css/                       # Estilos visuales
    ├── index.html                 # Vista principal del horario
    └── kanban.html                # Vista del tablero Kanban
```

---

## 3. Uso del Asistente Web

### Opción A: Ejecución con Servidor Local
```bash
npm start
# Abre en el navegador http://localhost:8080/wizard/
```

### Opción B: Ejecución Directa en el Navegador (Offline)
Abre directamente el archivo `wizard/index.html` con cualquier navegador moderno (Edge, Chrome, Firefox). Funciona de manera inmediata sin necesidad de Node.js ni servidor web.

### Pasos del Asistente:
1. **Identificación del Curso:** Nombre completo, siglas, centro educativo y fechas lectivas.
2. **Franjas Horarias:** Selección de plantilla (Turno Tarde FP, Mañana ESO/Bachillerato, Turno Intensivo) o configuración personalizada de horas y descansos.
3. **Asignaturas y Módulos:** Alta de asignaturas con profesor/a, aula, color temático y palabras clave para detectar entregas de Aules (Moodle).
4. **Cuadrícula Semanal:** Asignación visual de asignaturas en el horario de Lunes a Viernes.
5. **Descarga y Despliegue:** Validación automática de integridad y descarga instantánea de `horario-[curso].zip`.

---

## 4. Despliegue en Cloudflare Pages (30 segundos)

1. Descomprime el archivo `.zip` descargado en una carpeta de tu equipo.
2. Inicia sesión en el panel de Cloudflare: [dash.cloudflare.com](https://dash.cloudflare.com).
3. Dirígete a **Workers & Pages** &gt; **Create Application** &gt; pestaña **Pages** &gt; selecciona **Upload assets**.
4. Asigna un nombre al proyecto (por ejemplo `horario-2daw`) y arrastra la carpeta descomprimida.
5. Haz clic en **Deploy Site**.
6. *(Opcional)* En **Settings** &gt; **Environment variables**, añade la variable secreta `AULES_ICAL_URL` con el enlace del feed iCalendar de Moodle para habilitar la sincronización automática de tareas.

---

## 5. Pruebas Automatizadas

El proyecto cuenta con **37 pruebas unitarias** que verifican el validador de esquemas, la compresión de cuadrículas horarias, la serialización de iCalendar RFC 5545, la sincronización Zero-Knowledge del Kanban y la generación de archivos ZIP:

```bash
# Ejecutar toda la suite de pruebas
npm test

# Ejecutar únicamente las pruebas del motor template
npm run test:template
```

---

## 6. Mantenimiento del Template Base

Si realizas modificaciones en los archivos de la carpeta `template/` (como mejoras en el Kanban o en el visor de horario), regenera el catálogo empaquetado para el asistente web con:

```bash
node scripts/build-template-bundle.js
```
