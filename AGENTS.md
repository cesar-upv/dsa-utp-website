# AGENTS.md

## Contexto del proyecto

Este repositorio implementa una solución al **University Course Timetabling Problem (UTP)** para la carrera de **Ingeniería en Tecnologías de la Información e Innovación Digital (ITI)**.

El objetivo es construir una **aplicación web** que genere horarios universitarios automáticos a partir de:

- Plan de estudios (materias, cuatrimestres, horas por semana).
- Grupos y turnos (matutino/vespertino).
- Profesores, materias que pueden impartir y su disponibilidad horaria (matriz día/hora con estados Blanco/Verde/Rojo).

La aplicación debe:

- Respetar **restricciones duras** (disponibilidad, unicidad de profesor/grupo, carga máxima, competencias, contigüidad de bloques, cumplimiento de horas).
- Optimizar **restricciones suaves** (principalmente compacidad de horarios, minimizando huecos).
- Presentar la solución de forma **visual, clara y moderna**, tipo “tetris de horarios”.

El sistema NO gestionará aulas físicas en esta versión: solo tiempo y profesores.

---

## Tech Stack (CONSTRAINTS DUROS)

Estos lineamientos son OBLIGATORIOS. No se debe cambiar el stack sin indicación explícita.

### Frontend / UI

- **Lenguaje:** TypeScript estricto.
- **Framework:** React 18.
- **Build Tool:** Vite (React + TypeScript template).
- **Estilos base:** Tailwind CSS.
- **Componentes UI:**
  - `shadcn/ui` sobre Radix UI para componentes accesibles y modernos (buttons, dialogs, dropdowns, data table, tabs, etc.).
  - `lucide-react` para iconografía.
- **Estado y datos:**
  - `Zustand` para estado global ligero (filtros, selección de grupo, preferencias de visualización).
  - Opcional: `TanStack Query` si se requiere manejar tareas asíncronas (por ejemplo, ejecución del solver Python como proceso separado) aunque no haya backend clásico.
- **Forms y validación:**
  - `react-hook-form` + `zod` para formularios tipados (profesores, materias, grupos, importación de CSV).
- **Tablas y listas:**
  - `@tanstack/react-table` para tablas avanzadas (lista de profesores, materias, grupos).
- **Visualización:**
  - `recharts` para estadísticas simples (distribución de carga docente, etc.).
- **Routing:**
  - React Router (si la app no es single-screen) o estructura tipo SPA con vistas internas controladas por estado.
- **Persistencia en cliente:**
  - LocalStorage/IndexedDB según sea necesario para guardar borradores de configuración.
- **Calidad de código:**
  - ESLint + Prettier + configuración para TypeScript/React.
  - Vitest + React Testing Library para pruebas de componentes críticos (por ejemplo, matriz de disponibilidad).

### Lógica de negocio (solver del UTP)

- **Lenguaje:** Python 3.x.
- **Optimización:** Uso intensivo de **Cython** para acelerar las partes críticas del algoritmo (búsquedas locales, heurísticas, evaluaciones de fitness).
- **Paquetes sugeridos:**
  - `numpy` para estructuras matriciales y operaciones vectorizadas.
  - Opcionalmente metaheurísticas (implementadas a mano) tipo simulated annealing, tabu search, genetic algorithms, etc.
- **Interfaz con la UI:**
  - No habrá backend web tradicional (sin Node/Express, sin FastAPI, sin Django).
  - El solver se debe diseñar de forma que:
    - Consuma un archivo/entrada JSON con la configuración (plan de estudios, profesores, disponibilidad).
    - Produzca un archivo/salida JSON con los horarios generados.
  - La UI actuará como “orquestador” de archivos o llamadas locales (según el entorno donde se integre), pero el contrato es **JSON in / JSON out**.
- **Esquemas fuertes:**
  - Definir y documentar esquemas JSON para:
    - Entrada: `PlanDeEstudios`, `Profesor`, `Disponibilidad`, `Grupo`, `Turno`.
    - Salida: `HorarioPorGrupo`, `BloqueMateria`, métricas de calidad (número de violaciones, huecos, etc.).
- **Restricciones modeladas explícitamente:**
  - Disponibilidad del profesor.
  - Unicidad del profesor por franja.
  - Unicidad del grupo por franja.
  - Contigüidad de bloques de una misma materia.
  - Carga máxima del profesor (≤ 15 horas/semana).
  - Competencia del profesor por materia.
  - Cumplimiento exacto de horas/semana por materia.
  - Métricas de compacidad para grupos (y opcionalmente profesores).

---

## Módulos funcionales (UI)

Los agentes deben alinear el diseño de la UI con estos 3 módulos principales:

1. **Módulo 1: Gestión de datos (matriz del algoritmo)**
   - CRUD del plan de estudios: cuatrimestres, materias, horas/semana.
   - Gestión de grupos y turnos.
   - Importación opcional desde `.csv` (drag-and-drop + vista previa + validaciones).
   - Validaciones con feedback visual claro (toasts, inline errors usando `react-hook-form` + `zod`).

2. **Módulo 2: Gestión de profesores**
   - CRUD de profesores (nombre, ID, etc.).
   - Asignación de materias que puede impartir cada profesor.
   - Matriz de disponibilidad día/hora con 3 estados:
     - Blanco: no disponible (default).
     - Verde: disponible.
     - Rojo: no disponible explícito (ocupado).
   - UI tipo “grid interactivo” con hover, tooltips y toggles clicables.

3. **Módulo 3: Generador de horarios (“tetris de horarios”)**
   - Botón de “Generar horarios” que dispara la ejecución del solver (via JSON).
   - Vista por grupo: calendario semanal (columnas: días, filas: bloques de hora).
   - Bloques de materias coloreados por materia, mostrando nombre de materia y profesor.
   - Tooltips al pasar el mouse y/o panel lateral con detalle del bloque.
   - Mensajes claros en caso de:
     - Horario no factible.
     - Errores al ejecutar el solver.
     - Advertencias por restricciones suaves no optimizadas.

---

## Agentes y responsabilidades

### Agente: `frontend-architect`

**Rol:** Diseñar y mantener la arquitectura de la aplicación React + TypeScript con el stack descrito.

**Responsabilidades:**

- Definir estructura de carpetas (`src/features`, `src/components`, `src/entities`, etc.).
- Configurar Vite, Tailwind, shadcn/ui y ESLint/Prettier.
- Establecer patrones de diseño (custom hooks, store de Zustand, tipado de esquemas JSON).
- Garantizar una UI consistente y accesible.

### Agente: `ui-implementer`

**Rol:** Construir las pantallas y componentes de los 3 módulos principales.

**Responsabilidades:**

- Implementar formularios tipados (plan de estudios, profesores, grupos) con `react-hook-form` + `zod`.
- Diseñar la matriz de disponibilidad como componente reutilizable.
- Crear la vista de horarios tipo calendario/tetris con interacciones fluidas.
- Añadir feedback visual: toasts, loaders, estados vacíos, manejo de errores.

### Agente: `solver-architect` (Python + Cython)

**Rol:** Diseñar la representación interna del problema y el motor de optimización para el UTP.

**Responsabilidades:**

- Modelar las entidades (materias, grupos, profesores, slots de tiempo) en Python.
- Implementar mecanismos para evaluar factibilidad y calidad de un horario.
- Diseñar e implementar el algoritmo de búsqueda/optimización (heurístico/metaheurístico) con partes críticas aceleradas en Cython.
- Exponer una interfaz limpia `solve_timetable(input_json_path, output_json_path)` (o equivalente) documentada.

### Agente: `glue-and-docs`

**Rol:** Mantener documentación y contratos claros entre UI y solver.

**Responsabilidades:**

- Documentar los esquemas JSON y contratos de intercambio.
- Mantener archivos como `README.md`, `AGENTS.md` y ejemplos de inputs/outputs.
- Asegurar que las decisiones de diseño del solver sean reflejadas en la UI (y viceversa).

---

## Estilo y lineamientos generales

- Priorizar **claridad**, **modularidad** y **legibilidad** sobre “hacks rápidos”.
- Mantener siempre el Tech Stack especificado (React + TS + Tailwind + shadcn/ui en frontend; Python + Cython en lógica).
- Cualquier funcionalidad de red o backend está **fuera de alcance**: no crear APIs, ni servidores REST, ni bases de datos.
- Todas las interacciones se modelan como:
  - UI ↔ JSON (entrada)
  - JSON ↔ solver Python/Cython
  - Solver ↔ JSON (salida)
- Al proponer cambios, respetar las restricciones del problema y las secciones descritas en el documento original (Intro, Restricciones, Definición de disponibilidad, Componentes del sistema, Diagrama de componentes).
- **Estructura de Archivos:** Mantener un directorio de archivos organizado, intuitivo y estéticamente agradable ("bonito").
- **Referencias de Diseño:** Se utilizará la carpeta `design-examples` como referencia visual obligatoria.
- **Estructura de Navegación:** La aplicación debe constar de **3 páginas principales**, correspondiendo cada una a uno de los módulos funcionales (Gestión de Datos, Profesores, Generador).
- **Entorno Local:** Todo el sistema se ejecutará localmente en **Linux Ubuntu**.
- **Dependencias:** Se deben especificar y ajustar claramente todas las dependencias y paquetes necesarios para el funcionamiento en este entorno.

---
