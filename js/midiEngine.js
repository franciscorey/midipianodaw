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
    'k': 72,  // C5 (Do siguiente)
    'o': 73, // C#5
    'l': 74  // D5
};

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
        // Ignorar si el usuario está escribiendo en un input (ej: cambiando el BPM)
        if (e.target.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        const midiNote = KEYBOARD_MAP[key];

        // Si el usuario está escribiendo en un input de texto común (como el input-bpm), no disparamos notas
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

        // Si la tecla mapea a una nota y no se está presionando ya (evita repetición por delay del SO)
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
    // Escuchar cambios de conexión (conectar/desconectar dispositivos en caliente)
    midiAccess.onstatechange = (e) => {
        console.log(`Dispositivo MIDI modificado: ${e.port.name} (${e.port.state})`);
    };

    // Enlazar las entradas existentes
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
    // El formato MIDI nativo nos da un array de 3 bytes: [Status, NoteNumber, Velocity]
    const [status, note, velocity] = message.data;
    
    // Extraer el tipo de comando (los primeros 4 bits del Status Byte)
    const command = status & 0xf0; 

    switch (command) {
        case 0x90: // Note On (Tecla presionada)
            if (velocity > 0) {
                audio.triggerAttack(note);
                highlightPianoKey(note, true);
            } else {
                // Algunos teclados envían Note On con velocidad 0 en lugar de Note Off
                audio.triggerRelease(note);
                highlightPianoKey(note, false);
            }
            break;
            
        case 0x80: // Note Off (Tecla soltada)
            audio.triggerRelease(note);
            highlightPianoKey(note, false);
            break;
    }
}

/**
 * Modifica las clases CSS del piano interactivo inferior para dar feedback visual instantáneo
 * @param {number} midiNote - Número de la nota
 * @param {boolean} isPressed - Si la tecla está activa o no
 */
function highlightPianoKey(midiNote, isPressed) {
    // Busca la tecla tanto en la grilla vertical como en el piano inferior (si comparten el dataset)
    const keys = document.querySelectorAll(`[data-note="${midiNote}"]`);
    keys.forEach(key => {
        if (isPressed) {
            key.classList.add('key-playing');
        } else {
            key.classList.remove('key-playing');
        }
    });
}
