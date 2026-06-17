import { initMidi } from './midiEngine.js';
import { initAudio } from './audioEngine.js';
import { initPianoRoll } from './pianoRoll.js';
import { initPlayback } from './playbackEngine.js';
import { exportToMidi, exportToAbc } from './exporters.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar componentes base
    const audio = initAudio();
    initMidi(audio);
    const pianoRoll = initPianoRoll();
    const playback = initPlayback();

    // Variable para controlar el BPM actual (puedes enlazarla a un input en tu HTML)
    let currentBpm = 120; 
    const totalColumns = 64; // Sincronizado con las columnas de tu pianoRoll (4 compases)

    // 2. Inicializar el motor de audio al primer click del usuario
    document.body.addEventListener('click', async () => {
        await Tone.start();
        console.log('Audio Context e hilos de audio listos');
    }, { once: true });

    // 3. Vincular los controles de la Barra de Transporte (Play, Pause, Stop)
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            // Sincronizamos las notas actuales del Piano Roll justo antes de darle Play
            const notesData = pianoRoll.getNotesData();
            playback.syncSequence(notesData, totalColumns, currentBpm);
            playback.play();
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', () => {
            playback.pause();
        });
    }

    if (btnStop) {
        btnStop.addEventListener('click', () => {
            playback.stop();
        });
    }

    // Opcional: Escuchar cambios de BPM si tienes un input con id="input-bpm"
    const inputBpm = document.getElementById('input-bpm');
    if (inputBpm) {
        inputBpm.addEventListener('input', (e) => {
            currentBpm = parseInt(e.target.value) || 120;
            const notesData = pianoRoll.getNotesData();
            playback.syncSequence(notesData, totalColumns, currentBpm);
        });
    }

    // 4. Mover la línea visual del Playhead en la grilla
    playback.onProgress((currentColumn) => {
        movePlayheadUI(currentColumn, totalColumns);
    });

    // 5. Vincular eventos de exportación existentes
    document.getElementById('btn-export-midi').addEventListener('click', () => {
        const notesData = pianoRoll.getNotesData();
        exportToMidi(notesData, currentBpm);
    });

    document.getElementById('btn-export-abc').addEventListener('click', () => {
        const notesData = pianoRoll.getNotesData();
        exportToAbc(notesData, currentBpm);
    });
});

/**
 * Pinta visualmente qué columna se está reproduciendo en tiempo real
 */
function movePlayheadUI(activeColumn, totalColumns) {
    // Buscamos todas las celdas de la grilla
    const allCells = document.querySelectorAll('.grid-cell');
    
    allCells.forEach(cell => {
        const cellCol = parseInt(cell.dataset.col);
        
        // Si la celda pertenece a la columna actual, le añadimos una clase de iluminación de tracking
        if (cellCol === activeColumn) {
            cell.classList.add('playhead-active');
        } else {
            cell.classList.remove('playhead-active');
        }
    });
}
