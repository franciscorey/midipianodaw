// Accedemos a las librerías globales cargadas por CDN en el HTML
const { Midi } = window;

// Mapeo de números MIDI a notas de texto para el formato ABC
const ABC_NOTE_MAP = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];

/**
 * Exporta las notas actuales a un archivo .mid descargable
 * @param {Array} notesData - Array de objetos { noteNumber, startTime, duration }
 * @param {number} bpm - Pulsos por minuto actuales de la app
 */
export function exportToMidi(notesData, bpm = 120) {
    if (!notesData || notesData.length === 0) {
        alert("La grilla está vacía. Añade algunas notas antes de exportar.");
        return;
    }

    // 1. Crear una nueva instancia de archivo MIDI usando @tonejs/midi
    const midi = new Midi();
    midi.header.setTempo(bpm);

    // 2. Añadir una pista (track) dedicada a nuestro instrumento
    const track = midi.addTrack();
    track.name = "Piano Virtual";

    // 3. Convertir las columnas de la grilla a segundos/ticks reales
    // En nuestro piano roll, cada columna es 1/16 de nota (semicorchea).
    // Un pulso (beat) tiene 4 semicorcheas.
    const beatDurationInSeconds = 60 / bpm;
    const sixteenthDurationInSeconds = beatDurationInSeconds / 4;

    notesData.forEach(note => {
        const timeInSeconds = note.startTime * sixteenthDurationInSeconds;
        const durationInSeconds = note.duration * sixteenthDurationInSeconds;

        track.addNote({
            midi: note.noteNumber,
            time: timeInSeconds,
            duration: durationInSeconds,
            velocity: 0.7 // Volumen estándar por defecto
        });
    });

    // 4. Generar el archivo binario y forzar la descarga en el navegador
    const midiArray = midi.toArray();
    const blob = new Blob([midiArray], { type: "audio/midi" });
    triggerDownload(blob, "composicion_piano.mid");
}

/**
 * Convierte y exporta las notas a formato de texto ABC (Score/Partitura)
 * @param {Array} notesData - Array de objetos { noteNumber, startTime, duration }
 * @param {number} bpm - Pulsos por minuto actuales
 */
export function exportToAbc(notesData, bpm = 120) {
    if (!notesData || notesData.length === 0) {
        alert("La grilla está vacía. Añade algunas notas antes de exportar.");
        return;
    }

    // Ordenar las notas cronológicamente (por startTime) es vital para el flujo lineal de la partitura
    const sortedNotes = [...notesData].sort((a, b) => a.startTime - b.startTime);

    // 1. Construir la cabecera estándar del formato ABC
    let abcString = `X:1\nT:Composición Piano Corta\nM:4/4\nL:1/16\nQ:1/4=${bpm}\nK:C\n`;

    // 2. Lógica de cuantización y parsing a texto ABC
    // Nota simplificada: Agruparemos en bloques de semicorcheas. 
    // Para una app profesional, convertimos las posiciones a pulsos musicales.
    let currentColumn = 0;
    let measureCounter = 0;

    sortedNotes.forEach(note => {
        // Añadir silencios (rests) si hay espacio vacío entre la última nota y la actual
        if (note.startTime > currentColumn) {
            const restLength = note.startTime - currentColumn;
            abcString += `z${restLength > 1 ? restLength : ''}`;
            currentColumn = note.startTime;
        }

        // Convertir el número MIDI a notación de texto ABC string
        abcString += midiToAbcNote(note.noteNumber);
        
        // Multiplicador de duración en ABC (Si dura más de 1 unidad base L:1/16)
        if (note.duration > 1) {
            abcString += note.duration;
        }

        currentColumn += note.duration;

        // Añadir barras de compás decorativas / estructurales cada 16 subdivisiones (4/4)
        if (Math.floor(currentColumn / 16) > measureCounter) {
            abcString += " | ";
            measureCounter++;
        }
    });

    abcString += " ||"; // Cierre de partitura

    // 3. Ofrecer el texto plano o forzar la descarga en un .abc
    const blob = new Blob([abcString], { type: "text/plain" });
    triggerDownload(blob, "partitura_piano.abc");

    // OPCIONAL: Retornamos el string por si la UI quiere usar ABCJS.renderAbc("div-id", abcString)
    return abcString;
}

/**
 * Helper para forzar la descarga de un archivo desde el navegador
 */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Convierte un número de nota MIDI (ej: 60) a la sintaxis exacta de ABC String
 * ABC usa mayúsculas para la octava central, minúsculas para octavas superiores
 * y comas/apóstrofes para alteraciones.
 */
function midiToAbcNote(midiNumber) {
    const pitchIndex = midiNumber % 12;
    const abcPitch = ABC_NOTE_MAP[pitchIndex];
    const octave = Math.floor(midiNumber / 12) - 1;

    // Ajustar según la octava base de ABC (Octava 4 es la intermedia)
    if (octave === 4) {
        return abcPitch; // C, D, E...
    } else if (octave > 4) {
        const tildes = "'".repeat(octave - 4);
        return `${abcPitch.toLowerCase()}${tildes}`; // c', d''...
    } else {
        const comas = ",".repeat(4 - octave);
        return `${abcPitch}${comas}`; // C,, G,...
    }
}
