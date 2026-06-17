import { initAudio } from './audioEngine.js';

// Configuración de la grilla (Modificable)
const CONFIG = {
    startNote: 72,     // C5 (Nota más alta visible por defecto)
    endNote: 48,       // C3 (Nota más baja visible por defecto)
    totalBars: 4,      // Cantidad de compases
    subdivisions: 4,   // 4 subdivisiones por pulso (Semicorcheas / 16th notes)
    beatsPerBar: 4     // Compás de 4/4
};

// Estado interno del Piano Roll
const state = {
    notes: [],         // Estructura: { id, noteNumber, startTime, duration }
    isDrawing: false,
    totalColumns: CONFIG.totalBars * CONFIG.beatsPerBar * CONFIG.subdivisions,
    audio: null
};

/**
 * Inicializa el módulo del Piano Roll
 */
export function initPianoRoll() {
    state.audio = initAudio(); // Conectamos con el motor de audio para previsualizar

    const gridTimeline = document.getElementById('grid-timeline');
    const verticalPiano = document.getElementById('vertical-piano');

    if (!gridTimeline || !verticalPiano) {
        console.error("No se encontraron los contenedores de la UI en el HTML.");
        return;
    }

    buildVerticalPiano(verticalPiano);
    buildGrid(gridTimeline);
    setupInteractions(gridTimeline);

    return {
        getNotesData: () => state.notes,
        clearGrid: () => clearGridData(gridTimeline)
    };
}

/**
 * Genera las teclas verticales del lado izquierdo del Piano Roll
 */
function buildVerticalPiano(container) {
    container.innerHTML = '';
    for (let n = CONFIG.startNote; n >= CONFIG.endNote; n--) {
        const key = document.createElement('div');
        const isBlack = isNoteBlack(n);
        
        key.className = `v-key ${isBlack ? 'black' : 'white'}`;
        key.dataset.note = n;
        key.innerText = getNoteName(n);
        
        container.appendChild(key);
    }
}

/**
 * Genera la grilla de tiempo (Filas x Columnas)
 */
function buildGrid(container) {
    container.innerHTML = '';
    
    // Configuramos las columnas y filas dinámicamente usando CSS Grid nativo
    const totalRows = CONFIG.startNote - CONFIG.endNote + 1;
    container.style.gridTemplateRows = `repeat(${totalRows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${state.totalColumns}, 1fr)`;

    // Creamos las celdas vacías
    for (let r = 0; r < totalRows; r++) {
        const noteNumber = CONFIG.startNote - r;
        const isBlack = isNoteBlack(noteNumber);

        for (let c = 0; c < state.totalColumns; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (isBlack) cell.classList.add('bg-black-row');
            
            // Estilos visuales para marcar el inicio de cada compás (Bar)
            if (c % (CONFIG.beatsPerBar * CONFIG.subdivisions) === 0) {
                cell.classList.add('bar-start');
            } else if (c % CONFIG.subdivisions === 0) {
                cell.classList.add('beat-start');
            }

            // Guardamos las coordenadas en el dataset de HTML5
            cell.dataset.note = noteNumber;
            cell.dataset.col = c;

            container.appendChild(cell);
        }
    }
}

/**
 * Configura los Event Listeners para interactuar con la grilla (Dibujar y Borrar)
 */
function setupInteractions(grid) {
    // Evitar el menú contextual del click derecho dentro de la grilla
    grid.addEventListener('contextmenu', e => e.preventDefault());

    grid.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;

        const note = parseInt(cell.dataset.note);
        const col = parseInt(cell.dataset.col);

        if (e.button === 0) { // Click izquierdo: Añadir nota
            addNote(note, col, cell);
        } else if (e.button === 2) { // Click derecho: Eliminar nota
            removeNote(note, col, cell);
        }
    });
}

/**
 * Lógica para añadir una nota al estado y pintarla
 */
function addNote(noteNumber, col, cell) {
    // Validar si ya existe una nota en esa posición exacta
    const exists = state.notes.some(n => n.noteNumber === noteNumber && n.startTime === col);
    if (exists) return;

    const noteId = `note-${noteNumber}-${col}`;
    
    const newNote = {
        id: noteId,
        noteNumber: noteNumber,
        startTime: col,      // Columna de inicio
        duration: 1          // Duración por defecto: 1 celda (semicorchea)
    };

    state.notes.push(newNote);
    
    // Feedback visual: Marcamos la celda como activa
    cell.classList.add('note-active');
    cell.dataset.noteId = noteId;

    // Feedback auditivo rápido al pintar
    if (state.audio) {
        state.audio.triggerAttackRelease(noteNumber, '16n');
    }
}

/**
 * Lógica para remover una nota del estado y limpiar la UI
 */
function removeNote(noteNumber, col, cell) {
    if (!cell.classList.contains('note-active')) return;

    state.notes = state.notes.filter(n => !(n.noteNumber === noteNumber && n.startTime === col));
    cell.classList.remove('note-active');
    cell.removeAttribute('data-note-id');
}

function clearGridData(grid) {
    state.notes = [];
    grid.querySelectorAll('.note-active').forEach(cell => {
        cell.classList.remove('note-active');
        cell.removeAttribute('data-note-id');
    });
}

/**
 * Helpers Utilitarios para Notas Musicales
 */
function isNoteBlack(noteNumber) {
    const pitch = noteNumber % 12;
    return [1, 3, 6, 8, 10].includes(pitch); // C#, D#, F#, G#, A#
}

function getNoteName(noteNumber) {
    const notesArr = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octava = Math.floor(noteNumber / 12) - 1;
    const nombre = notesArr[noteNumber % 12];
    return `${nombre}${octava}`;
}
