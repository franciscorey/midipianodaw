let instance = null;

class AudioEngine {
    constructor() {
        // 1. Filtro maestro conectado a la salida de audio
        this.filter = new Tone.Filter(1200, "lowpass").toDestination();

        // 2. Inicializar el PolySynth apuntando directamente al filtro
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.15 }
        }).connect(this.filter);

        // Banco de osciladores para el selector
        this.waveforms = {
            synth: "triangle",
            bass: "sawtooth",
            pad: "sine",
            retro: "square"
        };
    }

    /**
     * Cambia la forma de onda base (Oscilador) mapeando las voces internas
     */
    setInstrument(name) {
        const wave = this.waveforms[name] || "triangle";
        // Modifica directamente la estructura de todas las voces del pool
        this.synth.set({
            oscillator: { type: wave }
        });
        console.log(`Onda del oscilador cambiada a: ${wave}`);
    }

    /**
     * Modula el filtro de corte (Cutoff Freq) en tiempo real
     */
    setCutoff(frequency) {
        // Usamos .rampTo para que la transición de frecuencia sea suave y musical
        this.filter.frequency.rampTo(frequency, 0.05);
    }

    /**
     * Modula el tiempo de ataque de la envolvente de volumen
     */
    setAttack(seconds) {
        this.synth.set({
            envelope: { attack: parseFloat(seconds) }
        });
    }

    formatNote(note) {
        if (typeof note === 'number') {
            return Tone.Frequency(note, "midi").toNote();
        }
        return note;
    }

    triggerAttack(note, time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) this.synth.triggerAttack(formatted, time);
            else this.synth.triggerAttack(formatted);
        } catch (e) {}
    }

    triggerRelease(note, time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) this.synth.triggerRelease(formatted, time);
            else this.synth.triggerRelease(formatted);
        } catch (e) {}
    }

    triggerAttackRelease(note, duration = '16n', time = null) {
        if (!note) return;
        const formatted = this.formatNote(note);
        try {
            if (time) this.synth.triggerAttackRelease(formatted, duration, time);
            else this.synth.triggerAttackRelease(formatted, duration);
        } catch (e) {}
    }
}

export function initAudio() {
    if (!instance) instance = new AudioEngine();
    return instance;
}
