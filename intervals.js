import { NoteDetector } from './noteDetector.js';
import {
  playInterval,
  freqToPitchClass,
  parseNoteName,
  NOTE_NAMES,
  intervalNameFromSemitone,
  addStars,
} from './common.js';

// Define the set of intervals used in this lesson as semitone distances.
// Each entry contains the number of semitones and the corresponding
// descriptive name in Polish. Compound intervals are reduced modulo 12.
const INTERVAL_OPTIONS = [
  { semitone: 1, name: 'sekunda mała' },
  { semitone: 2, name: 'sekunda wielka' },
  { semitone: 3, name: 'tercja mała' },
  { semitone: 4, name: 'tercja wielka' },
  { semitone: 5, name: 'kwarta czysta' },
  { semitone: 6, name: 'tryton' },
  { semitone: 7, name: 'kwinta czysta' },
  { semitone: 8, name: 'seksta mała' },
  { semitone: 9, name: 'seksta wielka' },
  { semitone: 10, name: 'septyma mała' },
  { semitone: 11, name: 'septyma wielka' },
];

// Possible starting notes for interval generation. We keep to a reasonable
// range to avoid very high or very low frequencies during playback.
const BASE_NOTES = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'];

let currentIntervalSemitone = null;
let currentIntervalDescription = '';
let expectedIntervalNotes = [];
let userPitchClasses = [];
let detector = null;
let recordStartTime = null;

// DOM references
const intervalNameEl = document.getElementById('interval-name');
const intervalDescEl = document.getElementById('interval-description');
const expectedListEl = document.getElementById('expected-interval-notes');
const userListEl = document.getElementById('interval-user-notes');
const statusEl = document.getElementById('interval-status');
const intervalInfoEl = document.getElementById('interval-info');

// Buttons
const nextBtn = document.getElementById('next-interval');
const playBtn = document.getElementById('play-interval');
const recordBtn = document.getElementById('start-record');

/**
 * Generate a new random interval exercise. Select a semitone difference
 * and generate two notes demonstrating that interval. The base note is
 * chosen from BASE_NOTES and the second note is computed by adding
 * semitones.
 */
function pickRandomInterval() {
  // Pick an interval option at random
  const option = INTERVAL_OPTIONS[Math.floor(Math.random() * INTERVAL_OPTIONS.length)];
  currentIntervalSemitone = option.semitone;
  currentIntervalDescription = option.name;
  // Pick a starting note from the base notes array
  const baseName = BASE_NOTES[Math.floor(Math.random() * BASE_NOTES.length)];
  // Parse the base into pitch class and octave
  const { pc: basePc, octave: baseOct } = parseNoteName(baseName);
  // Compute MIDI numbers. C-1 = 0, so add (octave+1)*12
  const midiBase = NOTE_NAMES.indexOf(basePc) + (baseOct + 1) * 12;
  const midiSecond = midiBase + currentIntervalSemitone;
  // Derive the second note's pitch class and octave
  const secondPc = NOTE_NAMES[((midiSecond % 12) + 12) % 12];
  const secondOct = Math.floor(midiSecond / 12) - 1;
  const secondName = `${secondPc}${secondOct}`;
  expectedIntervalNotes = [baseName, secondName];
  // Update DOM
  intervalNameEl.textContent = option.name;
  intervalDescEl.textContent = option.name;
  expectedListEl.innerHTML = '';
  // Show the pitch classes of the two notes (without octaves) as reference
  expectedIntervalNotes.forEach((n) => {
    const { pc } = parseNoteName(n);
    const span = document.createElement('span');
    span.textContent = pc;
    span.dataset.pc = pc;
    expectedListEl.appendChild(span);
  });
  intervalInfoEl.classList.remove('hidden');
  // Reset user state
  userPitchClasses = [];
  userListEl.innerHTML = '';
  statusEl.textContent = '';
  statusEl.className = 'status';
}

/**
 * Start capturing two notes from the user via microphone. After two
 * distinct pitch classes are detected, determine the interval and
 * compare it to the expected one.
 */
async function startRecording() {
  // Stop any existing detector
  if (detector) {
    detector.stop();
    detector = null;
  }
  userPitchClasses = [];
  userListEl.innerHTML = '';
  statusEl.textContent = 'Nasłuchiwanie...';
  statusEl.className = 'status';
  detector = new NoteDetector({
    onFrequency: (freq) => {
      const pc = freqToPitchClass(freq);
      if (!pc) return;
      // Only record unique pitch classes until we have two.
      if (!userPitchClasses.includes(pc)) {
        userPitchClasses.push(pc);
        const span = document.createElement('span');
        span.textContent = pc;
        userListEl.appendChild(span);
        if (userPitchClasses.length === 2) {
          // Highlight expected notes that match
          const spans = expectedListEl.querySelectorAll('span');
          spans.forEach((s) => {
            if (userPitchClasses.includes(s.dataset.pc)) {
              s.classList.add('correct-note');
            }
          });
          // We have two notes; stop detection and evaluate
          detector.stop();
          detector = null;
          evaluateInterval();
        }
      }
    },
    clarityThreshold: 0.85,
  });
  recordStartTime = performance.now();
  await detector.start();
}

/**
 * Evaluate the user‑played interval against the expected interval. We
 * calculate the distance between the two pitch classes and simplify it
 * to its basic form before comparing.
 */
function evaluateInterval() {
  if (userPitchClasses.length < 2) return;
  const [n1, n2] = userPitchClasses;
  const idx1 = NOTE_NAMES.indexOf(n1);
  const idx2 = NOTE_NAMES.indexOf(n2);
  if (idx1 === -1 || idx2 === -1) return;
  const diff = ((idx2 - idx1) % 12 + 12) % 12;
  if (diff === currentIntervalSemitone) {
    // Determine elapsed time and award stars
    const elapsed = recordStartTime ? (performance.now() - recordStartTime) / 1000 : null;
    let stars = 1;
    if (elapsed !== null) {
      if (elapsed <= 4) stars = 3;
      else if (elapsed <= 8) stars = 2;
    }
    statusEl.innerHTML = `Świetnie! Poprawnie rozpoznałeś interwał. ${'★'.repeat(stars)}`;
    statusEl.className = 'status result-success';
    addStars(stars);
  } else {
    const actual = intervalNameFromSemitone(diff);
    statusEl.textContent = `Niestety, to ${actual}. Spróbuj ponownie.`;
    statusEl.className = 'status result-failure';
  }
}

// Event listeners
nextBtn.addEventListener('click', pickRandomInterval);
playBtn.addEventListener('click', () => {
  if (!expectedIntervalNotes || expectedIntervalNotes.length !== 2) return;
  playInterval(expectedIntervalNotes, 0.8);
});
recordBtn.addEventListener('click', startRecording);

// Initialise first interval on page load
pickRandomInterval();