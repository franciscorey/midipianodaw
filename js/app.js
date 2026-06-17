import { initMidi } from './midiEngine.js';
import { initAudio } from './audioEngine.js';
import { initPianoRoll } from './pianoRoll.js';
import { exportToMidi, exportToAbc } from './exporters.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar el motor de audio (Tone.js) al primer clic del usuario (Regla de navegadores)
    document.body.addEventListener('click', async () => {
        await Tone.start();
        console.log('Audio Context listo');
    }, { once: true });

    // 2. Inicializar componentes
    const audio = initAudio();
    initMidi(audio);
    const pianoRoll = initPianoRoll();

    // 3. Vincular eventos de exportación
    document.getElementById('btn-export-midi').addEventListener('click', () => {
        const notesData = pianoRoll.getNotesData();
        exportToMidi(notesData);
    });

    document.getElementById('btn-export-abc').addEventListener('click', () => {
        const notesData = pianoRoll.getNotesData();
        exportToAbc(notesData);
    });
});
