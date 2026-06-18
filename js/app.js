import { initMidi } from './midiEngine.js';
import { initAudio } from './audioEngine.js';
import { initPianoRoll } from './pianoRoll.js';
import { buildInteractiveKeyboard } from './midiEngine.js';
import { initPlayback } from './playbackEngine.js';
import { exportToMidi, exportToAbc } from './exporters.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar componentes base
    const audio = initAudio();
    initMidi(audio);
    const pianoRoll = initPianoRoll();
    const playback = initPlayback();

    // Inicializar el piano interactivo inferior
    buildInteractiveKeyboard();

    // Variables de control de la sesión
    let currentBpm = 120; 
    const totalColumns = 64; // 4 compases de 16 subdivisiones

    // 2. Inicializar el motor de audio al primer click del usuario (Políticas de navegadores)
    document.body.addEventListener('click', async () => {
        await Tone.start();
        console.log('Audio Context e hilos de audio listos');
    }, { once: true });

    // 3. Vincular los controles de la Barra de Transporte (Play, Pause, Stop, Loop)
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');
    const btnLoop = document.getElementById('btn-loop');

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

    if (btnLoop) {
        btnLoop.addEventListener('click', () => {
            const nextLoopState = !playback.isLooping;
            playback.setLoop(nextLoopState);
            
            if (nextLoopState) {
                btnLoop.classList.add('transport-active');
            } else {
                btnLoop.classList.remove('transport-active');
            }

            // Si está sonando, actualizamos el comportamiento del Transport de inmediato
            if (playback.isPlaying) {
                const notesData = pianoRoll.getNotesData();
                playback.syncSequence(notesData, totalColumns, currentBpm);
            }
        });
    }

    // 4. Control de BPM dinámico
    const inputBpm = document.getElementById('input-bpm');
    if (inputBpm) {
        inputBpm.addEventListener('input', (e) => {
            currentBpm = parseInt(e.target.value) || 120;
            if (playback.isPlaying) {
                const notesData = pianoRoll.getNotesData();
                playback.syncSequence(notesData, totalColumns, currentBpm);
            } else {
                Tone.Transport.bpm.value = currentBpm;
            }
        });
    }

    // 5. OBSERVAR CAMBIOS EN LA GRILLA (Modo en vivo - CORREGIDO A ID)
    const containerTimeline = document.getElementById('grid-timeline');
    if (containerTimeline) {
        ['mouseup', 'mouseleave'].forEach(eventType => {
            containerTimeline.addEventListener(eventType, () => {
                if (playback.isPlaying) {
                    const notesData = pianoRoll.getNotesData();
                    playback.syncSequence(notesData, totalColumns, currentBpm);
                }
            });
        });
    }

    // 6. Registro Único del Tracking Visual del Playhead
    playback.onProgress((currentColumn) => {
        movePlayheadUI(currentColumn, totalColumns);
    });

    // 7. Vincular eventos de exportación
    const btnMidi = document.getElementById('btn-export-midi');
    if (btnMidi) {
        btnMidi.addEventListener('click', () => {
            const notesData = pianoRoll.getNotesData();
            exportToMidi(notesData, currentBpm);
        });
    }

    const btnAbc = document.getElementById('btn-export-abc');
    if (btnAbc) {
        btnAbc.addEventListener('click', () => {
            const notesData = pianoRoll.getNotesData();
            exportToAbc(notesData, currentBpm);
        });
    }

    // ==========================================
    // CONTROL DEL SELECTOR DE INSTRUMENTOS
    // ==========================================
    const selectInstrument = document.getElementById('select-instrument');
    if (selectInstrument) {
        selectInstrument.addEventListener('change', async (e) => {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
            audio.setInstrument(e.target.value);
            selectInstrument.blur();
        });
    }

    // ==========================================
    // CONTROLES DE LOS SLIDERS DE MODULACIÓN
    // ==========================================
    const sliderCutoff = document.getElementById('slider-cutoff');
    const sliderAttack = document.getElementById('slider-attack');
    
    if (sliderCutoff) {
        sliderCutoff.addEventListener('input', (e) => {
            const freq = parseInt(e.target.value);
            audio.setCutoff(freq);
        });
        sliderCutoff.addEventListener('change', () => {
            sliderCutoff.blur();
        });
    }
    
    if (sliderAttack) {
        sliderAttack.addEventListener('input', (e) => {
            const attackValue = parseFloat(e.target.value);
            audio.setAttack(attackValue);
        });
        sliderAttack.addEventListener('change', () => {
            sliderAttack.blur();
        });
    }
});

/**
 * Mueve la línea del playhead en la capa flotante de notas
 */
function movePlayheadUI(activeColumn, totalColumns) {
    let playhead = document.getElementById('piano-playhead');
    const notesLayer = document.getElementById('grid-notes-layer');
    
    if (!notesLayer) return;

    if (!playhead) {
        playhead = document.createElement('div');
        playhead.id = 'piano-playhead';
        notesLayer.appendChild(playhead);
    }

    playhead.style.gridColumn = `${activeColumn + 1}`;
    playhead.style.gridRow = `1 / -1`;
}
