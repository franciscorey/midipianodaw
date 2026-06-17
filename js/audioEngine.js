let instance = null;

class AudioEngine {
    constructor() {
        // 1. Crear Efectos Globales para enriquecer la síntesis
        this.delay = new Tone.FeedbackDelay("8n.", 0.3).toDestination();
        this.delay.wet.value = 0.2; // 20% de efecto de eco por defecto

        this.filter = new Tone.Filter(1200, "lowpass").toDestination();

        // 2. Definir los "Instrumentos" como configuraciones de síntesis puras (Presets)
        this.presets = {
            // Preset 1: El clásico Synth que ya tenías
            synth: {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.15 }
            },
            // Preset 2: Un bajo gordo y percusivo (Onda de sierra, release corto)
            bass: {
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.08 }
            },
            // Preset 3: Un Pad suave y atmosférico (Ataque y release muy largos, onda de domo/cuadrada)
            pad: {
                oscillator: { type: "sine" },
                envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.8 }
            },
            // Preset 4: Un sonido Chiptune/Retro de 8 bits
            retro: {
                oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.05 }
            }
        };

        this.currentPreset = 'synth';

        // 3. Inicializar el PolySynth principal
        this.synth = new Tone.PolySynth(Tone.Synth, this.presets[this.currentPreset]);
        
        // Ruteamos el sintetizador a través del filtro y del delay antes de la salida general
        this.synth.connect(this.filter);
        this.synth.connect(this.delay);
    }

    /**
     * Modula el sintetizador aplicando un preset de diseño sonoro diferente
     * @param {string} name - 'synth', 'bass', 'pad', 'retro'
     */
    setInstrument(name) {
        if (this.presets[name]) {
            this.currentPreset = name;
            // Tone.js permite actualizar los parámetros del sintetizador en caliente con set()
            this.synth.set(this.presets[name]);
            console.log(`Frecuencias y modulación cambiadas al preset: ${name}`);
        }
    }

    /**
     * Permite cambiar perillas o parámetros individuales en tiempo real desde inputs
     * @param {string} property - ej: "oscillator.type" o "envelope.attack"
     * @param {any} value 
     */
    updateParameter(property, value) {
        this.synth.set({ [property]: value });
    }

    /**
     * Ejecuta el sonido de una nota
     */
    triggerAttackRelease(note, duration, time) {
        // Aseguramos que la nota esté en formato científico (ej: "C4")
        const formattedNote = typeof note === 'number' ? Tone.Frequency(note, "midi").toNote() : note;
        
        if (time) {
            this.synth.triggerAttackRelease(formattedNote, duration, time);
        } else {
            this.synth.triggerAttackRelease(formattedNote, duration);
        }
    }
}

export function initAudio() {
    if (!instance) {
        instance = new AudioEngine();
    }
    return instance;
}
