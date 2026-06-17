import { initAudio } from './audioEngine.js';

// Configuración de la grilla (Modificable)
const CONFIG = {
    startNote: 72,     // C5
    endNote: 48,       // C3
    totalBars: 4,      // Cantidad de compases
    subdivisions: 4,   // 4 subdivisiones por pulso (Semicorcheas)
    beatsPerBar: 4     // Compás de 4/4
};

// Estado interno del Piano Roll
const state = {
    notes: [],         // Estructura: { id, noteNumber, startTime, duration }
    isDrawing: false,
    isResizing: null,  // Almacena el objeto de la nota que se está redimensionando: { noteId, startX, startDuration }
    totalColumns: CONFIG.totalBars * CONFIG.beatsPerBar * CONFIG.subdivisions,
    audio: null
};

/**
 * Inicializa el módulo del Piano Roll
 */
export function initPianoRoll() {
    state.audio = initAudio();

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
 * Genera las teclas verticales del lado izquierdo
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
    
    const totalRows = CONFIG.startNote - CONFIG.endNote + 1;
    container.style.gridTemplateRows = `repeat(${totalRows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${state.totalColumns}, 1fr)`;

    for (let r = 0; r < totalRows; r++) {
        const noteNumber = CONFIG.startNote - r;
        const isBlack = isNoteBlack(noteNumber);

        for (let c = 0; c < state.totalColumns; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (isBlack) cell.classList.add('bg-black-row');
            
            if (c % (CONFIG.beatsPerBar * CONFIG.subdivisions) === 0) {
                cell.classList.add('bar-start');
            } else if (c % CONFIG.subdivisions === 0) {
                cell.classList.add('beat-start');
            }

            cell.dataset.note = noteNumber;
            cell.dataset.col = c;

            container.appendChild(cell);
        }
    }
}

// Actualiza también el setupInteractions para capturar clicks en los nuevos bloques flotantes
function setupInteractions(grid) {
    grid.addEventListener('contextmenu', e => e.preventDefault());

    grid.addEventListener('mousedown', (e) => {
        // Detectar si clickearon la grilla de fondo o un bloque de nota activo
        const targetBlock = e.target.closest('.piano-note-block');
        const cell = e.target.closest('.grid-cell');
        
        if (!targetBlock && !cell) return;

        // Si es click derecho, borramos (ya sea clickeando el bloque o la celda)
        if (e.button === 2) {
            const idToId = targetBlock ? targetBlock.id : cell.dataset.noteId;
            if (idToId) {
                state.notes = state.notes.filter(n => n.id !== idToId);
                document.getElementById(idToId)?.remove();
            }
            return;
        }

        // CHEQUEAR RESIZE en el bloque flotante
        if (e.button === 0 && targetBlock) {
            const rect = targetBlock.getBoundingClientRect();
            const clickXFromRight = rect.right - e.clientX;

            if (clickXFromRight < 12) {
                const noteId = targetBlock.id;
                const foundNote = state.notes.find(n => n.id === noteId);
                
                if (foundNote) {
                    state.isResizing = {
                        noteId: noteId,
                        cell: targetBlock, // pasamos el bloque flotante
                        startX: e.clientX,
                        startDuration: foundNote.duration,
                        cellWidth: rect.width / foundNote.duration
                    };
                    grid.classList.add('grid-resizing');
                    return;
                }
            }
            return; // Evita duplicar notas si clickeas encima de una existente
        }

        // Click izquierdo en celda vacía: añadir nota normal
        if (e.button === 0 && cell && !targetBlock) {
            const note = parseInt(cell.dataset.note);
            const col = parseInt(cell.dataset.col);
            addNote(note, col, cell);
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.isResizing) return;

        const resizeData = state.isResizing;
        const deltaX = e.clientX - resizeData.startX;
        const cellsDelta = Math.round(deltaX / resizeData.cellWidth);
        
        const foundNote = state.notes.find(n => n.id === resizeData.noteId);
        if (foundNote) {
            let newDuration = Math.max(1, resizeData.startDuration + cellsDelta);
            if (foundNote.startTime + newDuration > state.totalColumns) {
                newDuration = state.totalColumns - foundNote.startTime;
            }
            foundNote.duration = newDuration;
            updateNoteUI(resizeData.cell, foundNote);
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isResizing) {
            state.isResizing = null;
            grid.classList.remove('grid-resizing');
        }
    });
}

/**
 * Lógica para añadir una nota al estado y pintarla como elemento flotante
 */
function addNote(noteNumber, col, cell) {
    // Validar si ya existe una nota que empiece en esa misma coordenada
    const exists = state.notes.some(n => n.noteNumber === noteNumber && n.startTime === col);
    if (exists) return;

    const noteId = `note-${noteNumber}-${col}`;
    const totalRows = CONFIG.startNote - CONFIG.endNote + 1;
    // Calculamos en qué fila de CSS Grid debe caer (la nota más alta es la fila 1)
    const rowIndex = (CONFIG.startNote - noteNumber) + 1; 

    const newNote = {
        id: noteId,
        noteNumber: noteNumber,
        startTime: col,      
        duration: 1          
    };

    state.notes.push(newNote);
    
    // Crear el elemento visual flotante de la nota
    const noteEl = document.createElement('div');
    noteEl.className = 'piano-note-block';
    noteEl.id = noteId;
    noteEl.dataset.noteId = noteId;
    
    // Posicionamiento absoluto dentro de la grilla usando las líneas de CSS Grid
    noteEl.style.gridRow = `${rowIndex}`;
    noteEl.style.gridColumn = `${col + 1} / span 1`;

    // Inyectamos el bloque nota DENTRO de la grilla timeline
    const gridTimeline = document.getElementById('grid-timeline');
    gridTimeline.appendChild(noteEl);

    if (state.audio) {
        state.audio.triggerAttackRelease(noteNumber, '16n');
    }
}

/**
 * Actualiza el tamaño visual de la nota sin empujar la grilla
 */
function updateNoteUI(cellOrId, noteObj) {
    // Buscamos el elemento visual por su ID único
    const noteEl = document.getElementById(noteObj.id);
    if (!noteEl) return;

    const startLine = noteObj.startTime + 1;
    noteEl.style.gridColumn = `${startLine} / span ${noteObj.duration}`;
}

/**
 * Remueve una nota usando el click derecho sobre el bloque flotante
 */
function removeNote(noteNumber, col, cell) {
    // Si hicieron click derecho sobre el bloque de la nota o sobre el fondo
    const noteId = cell.dataset.noteId || cell.id;
    if (!noteId) return;

    state.notes = state.notes.filter(n => n.id !== noteId);
    
    const noteEl = document.getElementById(noteId);
    if (noteEl) noteEl.remove();
}

function clearGridData(grid) {
    state.notes = [];
    grid.querySelectorAll('.note-active').forEach(cell => {
        cell.classList.remove('note-active', 'is-extended');
        cell.removeAttribute('data-note-id');
        cell.style.gridColumn = '';
    });
}

function isNoteBlack(noteNumber) {
    const pitch = noteNumber % 12;
    return [1, 3, 6, 8, 10].includes(pitch);
}

function getNoteName(noteNumber) {
    const notesArr = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octava = Math.floor(noteNumber / 12) - 1;
    const nombre = notesArr[noteNumber % 12];
    return `${nombre}${octava}`;
}
