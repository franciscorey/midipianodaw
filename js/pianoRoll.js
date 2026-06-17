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

/**
 * Configura los Event Listeners globales y de la grilla
 */
function setupInteractions(grid) {
    grid.addEventListener('contextmenu', e => e.preventDefault());

    grid.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;

        const note = parseInt(cell.dataset.note);
        const col = parseInt(cell.dataset.col);

        // CHEQUEAR RESIZE: Detectamos si el usuario hizo click en el borde derecho de una nota activa
        if (e.button === 0 && cell.classList.contains('note-active')) {
            const rect = cell.getBoundingClientRect();
            const clickXFromRight = rect.right - e.clientX;

            // Si hace click a menos de 10 píxeles del borde derecho, activamos el redimensionamiento
            if (clickXFromRight < 10) {
                const noteId = cell.dataset.noteId;
                const foundNote = state.notes.find(n => n.id === noteId);
                
                if (foundNote) {
                    state.isResizing = {
                        noteId: noteId,
                        cell: cell,
                        startX: e.clientX,
                        startDuration: foundNote.duration,
                        cellWidth: rect.width / foundNote.duration // Ancho aproximado de 1 sola subcelda
                    };
                    grid.classList.add('grid-resizing');
                    return; // Interceptamos el flujo para que no intente volver a añadir la nota
                }
            }
        }

        // Flujo normal de inserción/borrado
        if (e.button === 0) { 
            addNote(note, col, cell);
        } else if (e.button === 2) { 
            removeNote(note, col, cell);
        }
    });

    // Evento de arrastre del mouse (Moverse por la pantalla)
    window.addEventListener('mousemove', (e) => {
        if (!state.isResizing) return;

        const resizeData = state.isResizing;
        const deltaX = e.clientX - resizeData.startX;
        
        // Calculamos cuántas celdas de diferencia hay basadas en el ancho horizontal arrastrado
        const cellsDelta = Math.round(deltaX / resizeData.cellWidth);
        
        // Nueva duración (mínimo 1 celda para que no desaparezca, y límite derecho de la grilla)
        const foundNote = state.notes.find(n => n.id === resizeData.noteId);
        if (foundNote) {
            let newDuration = Math.max(1, resizeData.startDuration + cellsDelta);
            
            // Evitar que la nota se pase del límite total de columnas de la canción
            if (foundNote.startTime + newDuration > state.totalColumns) {
                newDuration = state.totalColumns - foundNote.startTime;
            }

            foundNote.duration = newDuration;
            
            // Actualizar visualmente la celda usando CSS Grid Spans
            updateNoteUI(resizeData.cell, foundNote);
        }
    });

    // Soltar el mouse termina la acción de resize
    window.addEventListener('mouseup', () => {
        if (state.isResizing) {
            state.isResizing = null;
            grid.classList.remove('grid-resizing');
        }
    });
}

/**
 * Añade una nota al estado y la pinta
 */
function addNote(noteNumber, col, cell) {
    const exists = state.notes.some(n => n.noteNumber === noteNumber && n.startTime === col);
    if (exists) return;

    const noteId = `note-${noteNumber}-${col}`;
    
    const newNote = {
        id: noteId,
        noteNumber: noteNumber,
        startTime: col,      
        duration: 1          
    };

    state.notes.push(newNote);
    
    cell.classList.add('note-active');
    cell.dataset.noteId = noteId;
    
    // Forzamos el reset de estilos por si acaso
    updateNoteUI(cell, newNote);

    if (state.audio) {
        state.audio.triggerAttackRelease(noteNumber, '16n');
    }
}

/**
 * Actualiza el comportamiento y tamaño de la celda usando CSS Grid
 */
function updateNoteUI(cell, noteObj) {
    if (noteObj.duration > 1) {
        // En CSS Grid podemos decirle a un elemento que empiece en su columna nativa 
        // y se estire (span) tantas columnas hacia adelante como configure la duración.
        // Sumamos +1 en el inicio porque CSS grid es index-1 para las líneas divisorias.
        const startLine = noteObj.startTime + 1;
        cell.style.gridColumn = `${startLine} / span ${noteObj.duration}`;
        cell.classList.add('is-extended');
    } else {
        // Resetear al estado de una sola celda regular
        cell.style.gridColumn = '';
        cell.classList.remove('is-extended');
    }
}

/**
 * Remueve una nota del estado y limpia la UI
 */
function removeNote(noteNumber, col, cell) {
    // Si el usuario hace click derecho en una celda estirada, buscamos su ID real
    const noteId = cell.dataset.noteId;
    if (!noteId) return;

    state.notes = state.notes.filter(n => n.id !== noteId);
    
    cell.classList.remove('note-active', 'is-extended');
    cell.removeAttribute('data-note-id');
    cell.style.gridColumn = '';
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
