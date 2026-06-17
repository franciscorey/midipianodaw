import { initAudio } from './audioEngine.js';

let instance = null;

class PlaybackEngine {
    constructor() {
        this.audio = initAudio();
        this.isPlaying = false;
        this.scheduledEvents = []; // Guarda las IDs de los eventos programados en Tone.Transport
        this.onProgressCallback = null; // Callback para avisar a la UI por dónde va el playhead
        this.totalColumns = 64; // Valor por defecto (4 compases x 16 subdivisiones), se sincroniza al arrancar

        // Configurar el bucle del Transport
        Tone.Transport.loop = false;
        
        // Evento nativo de Tone.js que se ejecuta en cada tick de subdivisión (cada semicorchea)
        Tone.Transport.scheduleRepeat((time) => {
            if (this.onProgressCallback) {
                // Obtenemos la posición actual traducida a columnas de la grilla (0, 1, 2, 3...)
                const currentColumn = Math.floor(Tone.Transport.position.split(':')[1] * 4 + 
                                                 parseFloat(Tone.Transport.position.split(':')[2]) * 4);
                
                // Asegurar que no se pase del límite visual
                if (currentColumn < this.totalColumns) {
                    this.onProgressCallback(currentColumn);
                }
            }
        }, "16n"); // "16n" equivale a una semicorchea
    }

    /**
     * Mapea y programa el array de notas actuales del Piano Roll en el Transport de Tone.js
     * @param {Array} notesData - El array state.notes proveniente del Piano Roll
     * @param {number} totalColumns - Cantidad de columnas totales de la grilla
     * @param {number} bpm - Pulsos por minuto de la sesión
     */
    syncSequence(notesData, totalColumns, bpm = 120) {
        this.totalColumns = totalColumns;
        this.clearSchedule();

        // Actualizar el tempo global
        Tone.Transport.bpm.value = bpm;

        // Programar cada nota en la línea de tiempo de alta precisión
        notesData.forEach(note => {
            // Convertimos la columna de inicio (subdivisión 16th) a formato de tiempo Tone (Bars:Beats:Sixteenths)
            const bar = Math.floor(note.startTime / 16);
            const beat = Math.floor((note.startTime % 16) / 4);
            const sixteenth = note.startTime % 4;
            const timePosition = `${bar}:${beat}:${sixteenth}`;

            // Traducimos la duración en celdas a formato de nota musical (ej: duration 1 = "16n", 4 = "4n")
            const durationFormatted = `${note.duration} * 16n`;

            // Agendamos el disparo del sintetizador
            const eventId = Tone.Transport.schedule((time) => {
                this.audio.triggerAttackRelease(note.noteNumber, durationFormatted, time);
            }, timePosition);

            this.scheduledEvents.push(eventId);
        });

        // Configurar el final del loop o detención automática basado en la última columna activa
        if (notesData.length > 0) {
            const lastNote = notesData.reduce((max, n) => (n.startTime + n.duration > max ? n.startTime + n.duration : max), 0);
            const endBar = Math.ceil(lastNote / 16);
            Tone.Transport.loopEnd = `${endBar}:0:0`;
        } else {
            Tone.Transport.loopEnd = `${Math.ceil(totalColumns / 16)}:0:0`;
        }
    }

    /**
     * Inicia o reanuda la reproducción
     */
    play() {
        if (this.isPlaying) return;
        
        // Seguridad: Verificar que el contexto de audio no esté suspendido por el navegador
        if (Tone.context.state !== 'running') {
            Tone.start();
        }

        Tone.Transport.start();
        this.isPlaying = true;
    }

    /**
     * Pausa la reproducción en la posición actual
     */
    pause() {
        if (!this.isPlaying) return;
        Tone.Transport.pause();
        this.isPlaying = false;
    }

    /**
     * Detiene la reproducción por completo y resetea el reloj a 0
     */
    stop() {
        Tone.Transport.stop();
        this.isPlaying = false;
        if (this.onProgressCallback) {
            this.onProgressCallback(0); // Devolver el playhead visual al inicio
        }
    }

    /**
     * Limpia la agenda del reloj para evitar duplicados al actualizar notas
     */
    clearSchedule() {
        this.scheduledEvents.forEach(id => Tone.Transport.clear(id));
        this.scheduledEvents = [];
    }

    /**
     * Vincula una función externa para actualizar la UI (Playhead)
     */
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
