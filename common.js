/*
 * Utility functions used across the Piano Tutor application.
 *
 * This module deliberately avoids any external dependencies so that the
 * application can work completely offline. It provides helpers to
 * convert between frequencies, MIDI note numbers and musical note names,
 * and functions to play notes, chords and intervals using the Web
 * Audio API. The pitch detection logic in noteDetector.js will call
 * freqToPitchClass() to interpret microphone input.
 */

// Global audio settings. Users can customise the instrument waveform
// (e.g. sine, square, triangle, sawtooth) and enable a slow practice
// mode. Slow mode multiplies note durations to give learners more
// time to hear and reproduce musical examples. See setWaveform() and
// setSlowMode() below.
export let currentWaveform = 'sine';
export let slowFactor = 1;

/**
 * Change the global waveform used by the Web Audio oscillators. Valid
 * values include 'sine', 'square', 'triangle' and 'sawtooth'. Any
 * unsupported value will default back to 'sine'. This function can be
 * called from UI controls to allow the learner to choose a different
 * timbre for playback. Changing the waveform affects all subsequent
 * calls to playSingleNote(), playChord() and playInterval().
 *
 * @param {string} wf New waveform type
 */
export function setWaveform(wf) {
  const allowed = ['sine', 'square', 'triangle', 'sawtooth'];
  currentWaveform = allowed.includes(wf) ? wf : 'sine';
}

/**
 * Enable or disable slow practice mode. When slow mode is enabled,
 * durations passed to the playback functions are multiplied by the
 * specified factor (default 2). This gives learners extra time to
 * process each note or chord. Passing false or 1 disables slow mode.
 *
 * @param {boolean|number} enable Either a boolean to toggle slow
 *   practice (true → factor 2, false → 1) or a numeric factor ≥1
 */
export function setSlowMode(enable) {
  if (typeof enable === 'number' && enable >= 1) {
    slowFactor = enable;
  } else if (enable) {
    slowFactor = 2;
  } else {
    slowFactor = 1;
  }
}

// List of pitch classes in order. Sharps are used instead of flats to
// simplify conversions. If you prefer flats, you can extend this array
// and adjust the mappings accordingly.
export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * Convert a frequency in Hertz to a pitch class (e.g. "C", "G#").
 *
 * Internally this converts the frequency to a MIDI note number and
 * then reduces it modulo 12 to obtain the pitch class. If the input
 * frequency is not positive, null is returned.
 *
 * @param {number} freq Frequency in Hz
 * @returns {string | null} Pitch class or null if out of range
 */
export function freqToPitchClass(freq) {
  if (!freq || freq <= 0) return null;
  // MIDI note number for a given frequency: 69 is A4 (440 Hz).
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  const index = ((midi % 12) + 12) % 12;
  return NOTE_NAMES[index] || null;
}

/**
 * Convert a pitch class and octave into a frequency in Hertz.
 *
 * The octave number follows the MIDI convention where C4 is middle C
 * (MIDI note 60). For example, pitchClassToFreq('A', 4) returns
 * approximately 440.
 *
 * @param {string} pc Pitch class (must exist in NOTE_NAMES)
 * @param {number} octave Octave number (integer)
 * @returns {number} Frequency in Hz
 */
export function pitchClassToFreq(pc, octave) {
  const semitone = NOTE_NAMES.indexOf(pc);
  if (semitone < 0) throw new Error(`Unknown pitch class: ${pc}`);
  // MIDI number: C-1 = 0, C0 = 12, C4 = 60, A4 = 69
  const midi = semitone + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Parse a note name into its pitch class and octave.
 *
 * Accepts strings like "C4", "F#3", "Ab5". Accidentals are
 * recognised as either '#' for sharp or 'b' for flat. Flats are
 * converted to their enharmonic equivalent using sharps.
 *
 * @param {string} name Note name with octave
 * @returns {{pc: string, octave: number}} Parsed components
 */
export function parseNoteName(name) {
  const match = name.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${name}`);
  }
  let [, letter, accidental, octave] = match;
  letter = letter.toUpperCase();
  let pc = letter;
  if (accidental === '#') {
    pc = `${letter}#`;
  } else if (accidental === 'b') {
    // Convert flat to its enharmonic sharp equivalent
    const idx = NOTE_NAMES.indexOf(letter);
    // Move down one semitone and wrap around
    const newIdx = (idx + 11) % 12;
    pc = NOTE_NAMES[newIdx];
  }
  return { pc, octave: parseInt(octave, 10) };
}

/**
 * Convert a note name (e.g. "C4") directly into a frequency in Hz.
 *
 * @param {string} name Note name
 * @returns {number} Frequency in Hz
 */
export function noteNameToFreq(name) {
  const { pc, octave } = parseNoteName(name);
  return pitchClassToFreq(pc, octave);
}

/**
 * Play a single note specified either by a pitch class & octave or by
 * a note name. If a note name string is provided, the octave
 * parameter is ignored.
 *
 * @param {string} pcOrName Pitch class (e.g. "C" or "F#") or full note name (e.g. "C4")
 * @param {number} [octave] Octave number if pcOrName is a pitch class
 * @param {number} [duration=1] Length of the tone in seconds
 * @param {number} [volume=0.3] Volume from 0 to 1
 */
export function playSingleNote(pcOrName, octave, duration = 1, volume = 0.3) {
  let freq;
  if (typeof octave === 'number') {
    // Provided a pitch class and octave
    freq = pitchClassToFreq(pcOrName, octave);
  } else {
    // Provided a full note name
    freq = noteNameToFreq(pcOrName);
    // Shift arguments: duration becomes the third parameter
    duration = octave ?? 1;
    volume = arguments[2] ?? 0.3;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = currentWaveform;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  osc.connect(gain).connect(ctx.destination);
  const dur = duration * slowFactor;
  osc.start();
  osc.stop(ctx.currentTime + dur);
  setTimeout(() => ctx.close(), dur * 1000 + 100);
}

/**
 * Play multiple notes simultaneously as a chord. The input may be an array
 * of note names (e.g. ["C4", "E4", "G4"]) or objects with pc and octave.
 *
 * @param {(string | {pc: string, octave: number})[]} notes Array of notes
 * @param {number} [duration=1] Duration in seconds
 * @param {number} [volume=0.25] Volume per oscillator
 */
export function playChord(notes, duration = 1, volume = 0.25) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  notes.forEach((n) => {
    let freq;
    if (typeof n === 'string') {
      freq = noteNameToFreq(n);
    } else {
      freq = pitchClassToFreq(n.pc, n.octave);
    }
    const osc = ctx.createOscillator();
    osc.type = currentWaveform;
    osc.frequency.setValueAtTime(freq, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    osc.connect(gain).connect(ctx.destination);
    const dur = duration * slowFactor;
    osc.start(now);
    osc.stop(now + dur);
  });
  const durAll = duration * slowFactor;
  setTimeout(() => ctx.close(), durAll * 1000 + 200);
}

/**
 * Play two notes in succession to illustrate an interval.
 * The notes may be specified as strings or as objects with pc and octave.
 *
 * @param {(string | {pc: string, octave: number})[]} notes Two-note array
 * @param {number} [duration=0.8] Duration of each note in seconds
 * @param {number} [volume=0.3] Volume level
 */
export function playInterval(notes, duration = 0.8, volume = 0.3) {
  if (!Array.isArray(notes) || notes.length !== 2) {
    throw new Error('playInterval expects an array of two notes');
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  const dur = duration * slowFactor;
  notes.forEach((note, idx) => {
    let freq;
    if (typeof note === 'string') {
      freq = noteNameToFreq(note);
    } else {
      freq = pitchClassToFreq(note.pc, note.octave);
    }
    const osc = ctx.createOscillator();
    osc.type = currentWaveform;
    osc.frequency.setValueAtTime(freq, now + idx * dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now + idx * dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + idx * dur);
    osc.stop(now + (idx + 1) * dur);
  });
  setTimeout(() => ctx.close(), dur * notes.length * 1000 + 200);
}

/**
 * Compute the semitone distance between two frequencies. This is
 * useful for interval recognition. The returned number is modulo 12,
 * meaning that octaves do not affect the result.
 *
 * @param {number} freq1
 * @param {number} freq2
 * @returns {number} Semitone distance in the range 0–11
 */
export function semitoneDistance(freq1, freq2) {
  // Convert frequencies to MIDI note numbers
  const m1 = 12 * Math.log2(freq1 / 440) + 69;
  const m2 = 12 * Math.log2(freq2 / 440) + 69;
  const diff = Math.round(m2) - Math.round(m1);
  return ((diff % 12) + 12) % 12;
}

/**
 * Map a semitone difference to a human‑readable interval name in Polish.
 * This table covers simple intervals up to an octave. Larger leaps are
 * reduced modulo 12 (e.g. 14 semitones → sekunda wielka).
 *
 * @param {number} semitones Semitone difference 0–11
 * @returns {string} Interval name (Polish)
 */
export function intervalNameFromSemitone(semitones) {
  const names = {
    0: 'pryma czysta',
    1: 'sekunda mała',
    2: 'sekunda wielka',
    3: 'tercja mała',
    4: 'tercja wielka',
    5: 'kwarta czysta',
    6: 'tryton',
    7: 'kwinta czysta',
    8: 'seksta mała',
    9: 'seksta wielka',
    10: 'septyma mała',
    11: 'septyma wielka',
  };
  return names[semitones] || `${semitones} półtonów`;
}

/**
 * Award a certain number of stars to the user and persist them in localStorage.
 * Stars are a simple scoring mechanism used in the application to track
 * progress across exercises. Calling this function increments the total
 * count stored under the key "pianoStars". If localStorage is not
 * available (e.g. in private browsing modes), it fails silently.
 *
 * @param {number} n Number of stars to add (default 1)
 */
export function addStars(n = 1) {
  try {
    const current = parseInt(localStorage.getItem('pianoStars') || '0', 10);
    localStorage.setItem('pianoStars', current + n);
  } catch (e) {
    // localStorage might be unavailable; ignore errors
  }
}

/**
 * Retrieve the total number of stars awarded so far from localStorage. If
 * no stars are recorded yet or localStorage is unavailable, returns 0.
 *
 * @returns {number} Total stars
 */
export function getStarCount() {
  try {
    return parseInt(localStorage.getItem('pianoStars') || '0', 10);
  } catch (e) {
    return 0;
  }
}