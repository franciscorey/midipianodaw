// Variable privada para almacenar la instancia del motor de audio
let instance = null;

/**
 * Clase interna que gestiona el sintetizador y la salida de audio
 */
class AudioEngine {
    constructor() {
        // 1. Creamos un sintetizador polifónico estándar.
        // Usamos PolySynth para que el usuario pueda tocar varias notas a la vez (acordes).
        // Por defecto utiliza un Tone.Synth básico con onda senoidal.
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: "triangle" // "triangle" da un sonido suave tipo piano eléctrico/flauta, ideal para monitorear
            },
            envelope: {
                attack: 0.005,  // Ataque rápido para respuesta inmediata al presionar la tecla
                decay: 0.1,
                sustain: 0.3,
                release: 1      // El sonido decae suavemente al soltar la tecla
            }
        }).toDestination();    // .toDestination() equivale al "Master Output" o altavoces

        // 2. Limitador de volumen para proteger los oídos del usuario (Ganancia a -6dB)
        this.synth.volume.value = -6; 
    }

    /**
     * Activa el sonido de una nota (Note On)
     * @param {string|number} note - Nota en formato texto (ej: "C4") o número MIDI (ej: 60)
     */
    triggerAttack(note) {
        // Si viene en formato número MIDI, Tone.js lo traduce automáticamente a frecuencia
        const formattedNote = typeof note === 'number' ? Tone.Frequency(note, "midi").toNote() : note;
        
        // Validamos que el contexto de audio esté activo (regla de seguridad de los navegadores)
        if (Tone.context.state === 'running') {
            this.synth.triggerAttack(formattedNote);
        }
    }

    /**
     * Libera el sonido de una nota (Note Off)
     * @param {string|number} note - Nota que se deja de presionar
     */
    triggerRelease(note) {
        const formattedNote = typeof note === 'number' ? Tone.Frequency(note, "midi").toNote() : note;
        
        if (Tone.context.state === 'running') {
            this.synth.triggerRelease(formattedNote);
        }
    }

    /**
     * Toca una nota con una duración fija determinada (Ideal para el Piano Roll)
     * @param {string|number} note - Nota musical
     * @param {string} duration - Duración en formato Tone (ej: "16n" para semicorchea, "4n" para negra)
     */
    triggerAttackRelease(note, duration = "16n") {
        const formattedNote = typeof note === 'number' ? Tone.Frequency(note, "midi").toNote() : note;
        
        if (Tone.context.state === 'running') {
            this.synth.triggerAttackRelease(formattedNote, duration);
        }
    }

    /**
     * Permite cambiar el tipo de onda del oscilador dinámicamente desde la UI
     * @param {string} type - "sine", "square", "sawtooth", "triangle"
     */
    setOscillatorType(type) {
        this.synth.set({
            oscillator: { type: type }
        });
    }
}

/**
 * Inicializador del módulo (Exporta una única instancia controlada)
 */
export function initAudio() {
    if (!instance) {
        instance = new AudioEngine();
    }
    return instance;
}
