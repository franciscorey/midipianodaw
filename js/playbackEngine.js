import { initAudio } from './audioEngine.js';

let instance = null;

class PlaybackEngine {
    constructor() {
        this.audio = initAudio();
        this.isPlaying = false;
        this.isLooping = false; // <-- Control de Loop (Falso por defecto)
        this.scheduledEvents = [];
        this.onProgressCallback = null;
        this.totalColumns = 64;
        this.repeatEventId = null;
    }

    syncSequence(notesData, totalColumns, bpm = 120) {
        this.totalColumns = totalColumns;
        this.clearSchedule();
        Tone.Transport.bpm.value = bpm;

        // Programar notas musicales
        notesData.forEach(note => {
            const bar = Math.floor(note.startTime / 16);
            const beat = Math.floor((note.startTime % 16) / 4);
            const sixteenth = note.startTime % 4;
            const timePosition = `${bar}:${beat}:${sixteenth}`;
            const durationFormatted = `${note.duration} * 16n`;

            const eventId = Tone.Transport.schedule((time) => {
                this.audio.triggerAttackRelease(note.noteNumber, durationFormatted, time);
            }, timePosition);

            this.scheduledEvents.push(eventId);
        });

        // Definir fin de la canción (el final de la última barra ocupada)
        let lastColumn = 16;
        if (notesData.length > 0) {
            lastColumn = notesData.reduce((max, n) => (n.startTime + n.duration > max ? n.startTime + n.duration : max), 0);
        }
        const endBar = Math.ceil(lastColumn / 16);
        const endPosition = `${endBar}:0:0`;

        // Configuración estricta del Transporte de Tone.js
        Tone.Transport.loop = this.isLooping;
        Tone.Transport.loopStart = "0:0:0";
        Tone.Transport.loopEnd = endPosition;

        // Crear un ScheduleRepeat ultra-limpio para el contador visual de columnas
        let lastRenderedCol = -1;
        this.repeatEventId = Tone.Transport.scheduleRepeat((time) => {
            // Convertir la posición métrica exacta a número entero de columna
            const positionTokens = Tone.Transport.position.split(':');
            const bars = parseInt(positionTokens[0]);
            const beats = parseInt(positionTokens[1]);
            const sixteenths = Math.floor(parseFloat(positionTokens[2]));
            
            const currentColumn = (bars * 16) + (beats * 4) + sixteenths;

            // Detención automática si el Loop está apagado y llegamos al final teórico
            if (!this.isLooping && currentColumn >= lastColumn) {
                this.stop();
                return;
            }

            // Evitamos repeticiones visuales duplicadas en el mismo tick
            if (currentColumn !== lastRenderedCol && currentColumn < this.totalColumns) {
                lastRenderedCol = currentColumn;
                if (this.onProgressCallback) this.onProgressCallback(currentColumn);
            }
        }, "16n");
    }

    /**
     * Alterna o define el estado de Loop
     * @param {boolean} value 
     */
    setLoop(value) {
        this.isLooping = value;
        Tone.Transport.loop = value;
    }

    play() {
        if (this.isPlaying) return;
        if (Tone.context.state !== 'running') Tone.start();
        Tone.Transport.start();
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying) return;
        Tone.Transport.pause();
        this.isPlaying = false;
    }

    stop() {
        Tone.Transport.stop();
        this.isPlaying = false;
        if (this.onProgressCallback) this.onProgressCallback(0);
    }

    clearSchedule() {
        if (this.repeatEventId !== null) {
            Tone.Transport.clear(this.repeatEventId);
        }
        this.scheduledEvents.forEach(id => Tone.Transport.clear(id));
        this.scheduledEvents = [];
    }

    onProgress(callback) {
        this.onProgressCallback = callback;
    }
}

export function initPlayback() {
    if (!instance) {
        instance = new PlaybackEngine();
    }
    return instance;
}
