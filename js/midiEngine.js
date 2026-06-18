import { initAudio } from './audioEngine.js';

// Mapeo de teclas de la PC (Keyboard) a notas MIDI (Octava 4 - Do Central es 60)
const KEYBOARD_MAP = {
    'a': 60, // C4 (Do)
    'w': 61, // C#4
    's': 62, // D4 (Re)
    'e': 63, // D#4
    'd': 64, // E4 (Mi)
    'f': 65, // F4 (Fa)
    't': 66, // F#4
    'g': 67, // G4 (Sol)
    'y': 68, // G#4
    'h': 69, // A4 (La)
    'u': 70, // A#4
    'j': 71, // B4 (Si)
    'k': 72, // C5 (Do siguiente)
    'o': 73, // C#5
    'l': 74  // D5
};

// Rango para el renderizado del piano interactivo inferior
const START_KEY = 48; // C3
const END_KEY = 72;   // C5

// Registro para evitar que el evento 'keydown' de la PC repita la nota en bucle
const activePcKeys = new Set();

/**
 * Inicializa el motor MIDI (Hardware y Teclado PC)
 * @param {Object} audioEngine - Instancia activa del módulo de audio
 */
export function initMidi(audioEngine) {
    if (!audioEngine) {
        console.error("MidiEngine requiere una instancia válida de AudioEngine.");
        return;
    }

    // 1. Inicializar el teclado de la PC
    setupPcKeyboard(audioEngine);

    // 2. Inicializar el acceso a dispositivos MIDI físicos
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then((midiAccess) => onMidiSuccess(midiAccess, audioEngine), onMidiFailure);
    } else {
        console.warn("La Web MIDI API no es soportada por este navegador. Usa Chrome, Edge o Opera.");
    }
}

/**
 * Configura los Event Listeners para el teclado alfanumérico de la PC
 */
function setupPcKeyboard(audio) {
    document.addEventListener('keydown', (e) => {
        // Ignorar si el usuario está escribiendo en un input (ej: cambiando el BPM o texto)
        if (e.target.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        const midiNote = KEYBOARD_MAP[key];

        // Si la tecla mapea a una nota y no se está presionando ya (evita tartamudeo del SO)
        if (midiNote && !activePcKeys.has(key)) {
            activePcKeys.add(key);
            
            // Disparar audio y feedback visual
            audio.triggerAttack(midiNote);
            highlightPianoKey(midiNote, true);
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        const midiNote = KEYBOARD_MAP[key];

        if (midiNote && activePcKeys.has(key)) {
            activePcKeys.delete(key);
            
            // Detener audio y feedback visual
            audio.triggerRelease(midiNote);
            highlightPianoKey(midiNote, false);
        }
    });
}

/**
 * Callback de éxito al conectar con el subsistema MIDI del Sistema Operativo
 */
function onMidiSuccess(midiAccess, audio) {
    midiAccess.onstatechange = (e) => {
        console.log(`Dispositivo MIDI modificado: ${e.port.name} (${e.port.state})`);
    };

    const inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = (message) => handleMidiMessage(message, audio);
    }
}

function onMidiFailure() {
    console.error("No se pudo acceder a tus dispositivos MIDI.");
}

/**
 * Decodificador de mensajes MIDI Binarios estándar
 */
function handleMidiMessage(message, audio) {
    const [status, note, velocity] = message.data;
    const command = status & 0xf0; 

    switch (command) {
        case 0x90: // Note On
            if (velocity > 0) {
                audio.triggerAttack(note);
                highlightPianoKey(note, true);
            } else {
                audio.triggerRelease(note);
                highlightPianoKey(note, false);
            }
            break;
            
        case 0x80: // Note Off
            audio.triggerRelease(note);
            highlightPianoKey(note, false);
            break;
    }
}

/**
 * Modifica las clases CSS del piano interactivo inferior y lateral para feedback visual
 */
function highlightPianoKey(midiNote, isPressed) {
    // CORRECCIÓN: Buscamos todos los elementos con este dataset nota (ambos pianos)
    const keys = document.querySelectorAll(`[data-note="${midiNote}"]`);
    keys.forEach(key => {
        if (isPressed) {
            // Unificamos usando la clase .active que ya configuramos en tu CSS
            key.classList.add('active');
        } else {
            key.classList.remove('active');
        }
    });
}

/**
 * Dibuja el piano interactivo inferior en el HTML
 */
export function buildInteractiveKeyboard() {
    const container = document.getElementById('keyboard-vkey-container');
    if (!container) return;

    container.innerHTML = '';
    const audio = initAudio();

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    for (let n = START_KEY; n <= END_KEY; n++) {
        const keyEl = document.createElement('div');
        const pitch = n % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(pitch);
        
        keyEl.className = isBlack ? 'vkey-black' : 'vkey-white';
        keyEl.id = `vkey-${n}`;
        keyEl.dataset.note = n; // Crucial para que highlightPianoKey lo encuentre

        if (noteNames[pitch] === "C") {
            const octave = Math.floor(n / 12) - 1;
            keyEl.innerText = `C${octave}`;
        }

        // Eventos de interacción directa con Mouse
        keyEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            audio.triggerAttack(n);
            keyEl.classList.add('active');
        });

        const stopNote = () => {
            audio.triggerRelease(n);
            keyEl.classList.remove('active');
        };

        keyEl.addEventListener('mouseup', stopNote);
        keyEl.addEventListener('mouseleave', stopNote);

        container.appendChild(keyEl);
    }
}
