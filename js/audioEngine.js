let instance = null;

class AudioEngine {
    constructor() {
        // 1. Definir los presets de síntesis pura
        this.presets = {
            synth: {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.15 }
            },
            bass: {
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.08 }
            },
            pad: {
                oscillator: { type: "sine" },
                envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.8 }
            },
            retro: {
                oscillator: { type: "square" },
                envelope: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.05 }
            }
        };

        this.currentPreset = 'synth';

        // 2. Inicializar el PolySynth apuntando a Tone.Synth
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.15 }
        }).toDestination();
    }

    /**
     * Modula los osciladores en tiempo real
     */
    setInstrument(name) {
        if (this.presets[name]) {
            this.currentPreset = name;
            this.synth.set({
                oscillator: this.presets[name].oscillator,
                envelope: this.presets[name].envelope
            });
            console.log(`Modulación MIDI cambiada a preset: ${name}`);
        }
    }

    /**
     * Auxiliar para formatear notas (acepta número MIDI o texto científico como "C4")
     */
    formatNote(note) {
        if (typeof note === 'number') {
            return Tone.Frequency(note, "midi").toNote();
        }
        return note;
    }

    /**
     * MÉTODO 1: Atacar nota (Cuando se presiona la tecla - Solicitado por midiEngine.js:59)
     */
    triggerAttack(note, time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) {
                this.synth.triggerAttack(formatted, time);
            } else {
                this.synth.triggerAttack(formatted);
            }
        } catch (e) {
            console.warn("Error en triggerAttack:", e);
        }
    }

    /**
     * MÉTODO 2: Soltar nota (Cuando se levanta la tecla - Solicitado por midiEngine.js:72)
     */
    triggerRelease(note, time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) {
                this.synth.triggerRelease(formatted, time);
            } else {
                this.synth.triggerRelease(formatted);
            }
        } catch (e) {
            console.warn("Error en triggerRelease:", e);
        }
    }

    /**
     * MÉTODO 3: Disparo unificado con duración (Usado por el secuenciador automático)
     */
    triggerAttackRelease(note, duration = '16n', time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) {
                this.synth.triggerAttackRelease(formatted, duration, time);
            } else {
                this.synth.triggerAttackRelease(formatted, duration);
            }
        } catch (e) {
            console.warn("Error en triggerAttackRelease:", e);
        }
    }
}

export function initAudio() {
    if (!instance) {
        instance = new AudioEngine();
    }
    return instance;
}
