import { initAudio } from './audioEngine.js';

// Configuración de la grilla (Modificable)
const CONFIG = {
    startNote: 84,     // C6
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

    // NUEVO: Retornamos las funciones expandidas que necesita app.js
    return {
        getNotesData: () => state.notes,
        clearAllNotes: () => {
            state.notes = [];
            // Limpiar visualmente la grilla flotante de notas
            const notesLayer = document.getElementById('grid-notes-layer');
            if (notesLayer) {
                // Removemos todo excepto el playhead si existiera
                notesLayer.querySelectorAll('.piano-note-block').forEach(el => el.remove());
            }
        },
        loadNotesData: (notesArray) => {
            state.notes = notesArray;
            const notesLayer = document.getElementById('grid-notes-layer');
            if (!notesLayer) return;

            // Limpiamos notas viejas antes de renderizar
            notesLayer.querySelectorAll('.piano-note-block').forEach(el => el.remove());

            // Dibujar cada nota almacenada en LocalStorage
            notesArray.forEach(note => {
                const rowIndex = (CONFIG.startNote - note.noteNumber) + 1;
                const noteEl = document.createElement('div');
                noteEl.className = 'piano-note-block';
                noteEl.id = note.id;
                noteEl.dataset.noteId = note.id;
                noteEl.style.pointerEvents = 'auto';
                noteEl.style.gridRow = `${rowIndex}`;
                noteEl.style.gridColumn = `${note.startTime + 1} / span ${note.duration}`;
                
                notesLayer.appendChild(noteEl);
            });
        },
        addNoteFromRecording: (noteNumber, col) => {
            addNote(noteNumber, col, null);
        },
        getNoteNumberFromKey: (key) => {
            // Mapeo adaptado con tus nuevas notas integradas (Modifícalo como gustes)
            const mapping = { 
                'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66,
                'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 
                'o': 73, // C#5
                'l': 74  // D5
            };
            return mapping[key.toLowerCase()] || null;
        }
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
 * Genera la grilla de tiempo con capas separadas y alturas fijas de 24px
 */
function buildGrid(container) {
    container.innerHTML = '';
    container.style.position = 'relative';

    const totalRows = CONFIG.startNote - CONFIG.endNote + 1;
    
    const gridStyles = `
        display: grid;
        grid-template-rows: repeat(${totalRows}, 24px); 
        grid-template-columns: repeat(${state.totalColumns}, 1fr);
        width: 100%;
    `;

    // 1. CREAR CAPA DE FONDO
    const bgLayer = document.createElement('div');
    bgLayer.id = 'grid-background';
    bgLayer.style.cssText = gridStyles;

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

            bgLayer.appendChild(cell);
        }
    }

    // 2. CREAR CAPA DE NOTAS Y PLAYHEAD
    const notesLayer = document.createElement('div');
    notesLayer.id = 'grid-notes-layer';
    notesLayer.style.cssText = gridStyles + `
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        pointer-events: none;
    `;

    container.appendChild(bgLayer);
    container.appendChild(notesLayer);
}

/**
 * Configura los Event Listeners para Redimensionar y Desplazar notas
 */
function setupInteractions(grid) {
    grid.addEventListener('contextmenu', e => e.preventDefault());

    let isDragging = null; 

    grid.addEventListener('mousedown', (e) => {
        const targetBlock = e.target.closest('.piano-note-block');
        const cell = e.target.closest('.grid-cell');
        
        if (!targetBlock && !cell) return;

        // Click derecho: Eliminar nota
        if (e.button === 2) {
            const idToId = targetBlock ? targetBlock.id : cell.dataset.noteId;
            if (idToId) {
                state.notes = state.notes.filter(n => n.id !== idToId);
                document.getElementById(idToId)?.remove();
            }
            return;
        }

        // Click izquierdo sobre una nota existente
        if (e.button === 0 && targetBlock) {
            const rect = targetBlock.getBoundingClientRect();
            const clickXFromRight = rect.right - e.clientX;
            const noteId = targetBlock.id;
            const foundNote = state.notes.find(n => n.id === noteId);

            if (!foundNote) return;

            // CASO A: RESIZE
            if (clickXFromRight < 12) {
                state.isResizing = {
                    noteId: noteId,
                    cell: targetBlock,
                    startX: e.clientX,
                    startDuration: foundNote.duration,
                    cellWidth: rect.width / foundNote.duration
                };
                grid.classList.add('grid-resizing');
                return;
            } 
            
            // CASO B: DRAG / MOVER
            else {
                isDragging = {
                    noteId: noteId,
                    element: targetBlock,
                    startCol: foundNote.startTime,
                    startNoteNum: foundNote.noteNumber,
                    startX: e.clientX,
                    startY: e.clientY,
                    cellWidth: rect.width / foundNote.duration,
                    cellHeight: 24 
                };
                targetBlock.style.opacity = '0.7';
                grid.style.cursor = 'move';
                return;
            }
        }

        // Click izquierdo en el fondo: Añadir nueva nota
        if (e.button === 0 && cell && !targetBlock) {
            const note = parseInt(cell.dataset.note);
            const col = parseInt(cell.dataset.col);
            addNote(note, col, cell);
        }
    });

    window.addEventListener('mousemove', (e) => {
        // 1. LÓGICA DE RESIZE
        if (state.isResizing) {
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
                updateNoteUI(null, foundNote);
            }
            return;
        }

        // 2. LÓGICA DE DRAG / DESPLAZAMIENTO
        if (isDragging) {
            const dragData = isDragging;
            const foundNote = state.notes.find(n => n.id === dragData.noteId);

            if (foundNote) {
                const deltaX = e.clientX - dragData.startX;
                const colsDelta = Math.round(deltaX / dragData.cellWidth);
                let newCol = dragData.startCol + colsDelta;
                newCol = Math.max(0, Math.min(newCol, state.totalColumns - foundNote.duration));

                const deltaY = e.clientY - dragData.startY;
                const rowsDelta = Math.round(deltaY / dragData.cellHeight);
                let newNoteNum = dragData.startNoteNum - rowsDelta; 
                newNoteNum = Math.max(CONFIG.endNote, Math.min(newNoteNum, CONFIG.startNote));

                if (foundNote.startTime !== newCol || foundNote.noteNumber !== newNoteNum) {
                    foundNote.startTime = newCol;
                    foundNote.noteNumber = newNoteNum;
                    
                    const rowIndex = (CONFIG.startNote - newNoteNum) + 1;
                    dragData.element.style.gridRow = `${rowIndex}`;
                    
                    const startLine = newCol + 1;
                    dragData.element.style.gridColumn = `${startLine} / span ${foundNote.duration}`;
                    
                    if (dragData.currentNoteNum !== newNoteNum && state.audio) {
                        state.audio.triggerAttackRelease(newNoteNum, '16n');
                        dragData.currentNoteNum = newNoteNum;
                    }
                }
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isResizing) {
            state.isResizing = null;
            grid.classList.remove('grid-resizing');
        }
        if (isDragging) {
            isDragging.element.style.opacity = '1';
            grid.style.cursor = '';
            isDragging = null;
        }
    });
}

/**
 * Lógica para añadir una nota al estado y pintarla como elemento flotante
 */
function addNote(noteNumber, col, cell) {
    const exists = state.notes.some(n => n.noteNumber === noteNumber && n.startTime === col);
    if (exists) return;

    const noteId = `note-${noteNumber}-${col}`;
    const rowIndex = (CONFIG.startNote - noteNumber) + 1; 

    const newNote = {
        id: noteId,
        noteNumber: noteNumber,
        startTime: col,      
        duration: 1          
    };

    state.notes.push(newNote);
    
    const noteEl = document.createElement('div');
    noteEl.className = 'piano-note-block';
    noteEl.id = noteId;
    noteEl.dataset.noteId = noteId;
    
    noteEl.style.pointerEvents = 'auto'; 
    noteEl.style.gridRow = `${rowIndex}`;
    noteEl.style.gridColumn = `${col + 1} / span 1`;

    const notesLayer = document.getElementById('grid-notes-layer');
    if (notesLayer) {
        notesLayer.appendChild(noteEl);
    }

    if (state.audio) {
        state.audio.triggerAttackRelease(noteNumber, '16n');
    }
}

/**
 * Actualiza el tamaño visual de la nota sin empujar la grilla
 */
function updateNoteUI(cellOrId, noteObj) {
    const noteEl = document.getElementById(noteObj.id);
    if (!noteEl) return;

    const startLine = noteObj.startTime + 1;
    noteEl.style.gridColumn = `${startLine} / span ${noteObj.duration}`;
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
