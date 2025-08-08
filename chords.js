import { NoteDetector } from './noteDetector.js';
import { playChord, freqToPitchClass, parseNoteName, addStars } from './common.js';

/*
 * This module defines a simple chord recognition exercise. To avoid
 * external dependencies, chord definitions are hard‑coded as arrays of
 * note names (including octave numbers). Each chord entry contains a
 * display name and an array of note names. The expected pitch classes
 * (without octave) are derived from these notes using parseNoteName().
 */

// Define a list of chords with Polish names and explicit note lists.
// Each chord array contains the note names in octave 4 (or 3 for B dim).
// Users can modify or extend this list as desired.
const CHORDS = [
  { name: 'C dur', notes: ['C4', 'E4', 'G4'] },
  { name: 'G dur', notes: ['G3', 'B3', 'D4'] },
  { name: 'F dur', notes: ['F3', 'A3', 'C4'] },
  { name: 'D mol', notes: ['D4', 'F4', 'A4'] },
  { name: 'A mol', notes: ['A3', 'C4', 'E4'] },
  { name: 'E mol', notes: ['E3', 'G3', 'B3'] },
  { name: 'B zmniejszony', notes: ['B3', 'D4', 'F4'] },
];

let currentChord = null;
let expectedPitchClasses = [];
let userPitchClasses = [];
let detector = null;
let recordStartTime = null;

// DOM references
const chordNameEl = document.getElementById('chord-name');
const expectedListEl = document.getElementById('expected-notes');
const userListEl = document.getElementById('user-notes');
const statusEl = document.getElementById('status');
const chordInfoEl = document.getElementById('chord-info');

// Buttons
const nextBtn = document.getElementById('next-chord');
const playBtn = document.getElementById('play-chord');
const recordBtn = document.getElementById('start-record');

/**
 * Pick a random chord from the list and update the view.
 */
function pickRandomChord() {
  // Choose a random chord different from the current one.
  let next;
  do {
    next = CHORDS[Math.floor(Math.random() * CHORDS.length)];
  } while (currentChord && next.name === currentChord.name);
  currentChord = next;
  // Expected pitch classes are derived from note names, discarding octaves.
  expectedPitchClasses = currentChord.notes.map((n) => parseNoteName(n).pc);
  // Update DOM
  chordNameEl.textContent = currentChord.name;
  expectedListEl.innerHTML = '';
  expectedPitchClasses.forEach((pc) => {
    const span = document.createElement('span');
    span.textContent = pc;
    span.dataset.pc = pc;
    expectedListEl.appendChild(span);
  });
  chordInfoEl.classList.remove('hidden');
  // Reset user state
  userPitchClasses = [];
  userListEl.innerHTML = '';
  statusEl.textContent = '';
}

/**
 * Start listening for notes from the microphone. Each detected
 * pitch class is added to userPitchClasses. When the user has played
 * all expected notes (order doesn’t matter) the detector stops and a
 * success message is shown.
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
  detector = new NoteDetector({
    onFrequency: (freq) => {
      const pitchClass = freqToPitchClass(freq);
      if (!pitchClass) return;
      // If this pitch class hasn't been recorded yet, add it
      if (!userPitchClasses.includes(pitchClass)) {
        userPitchClasses.push(pitchClass);
        const span = document.createElement('span');
        span.textContent = pitchClass;
        userListEl.appendChild(span);
        // Check if user has played all expected notes
        // Highlight matched expected notes
        const spans = expectedListEl.querySelectorAll('span');
        spans.forEach((s) => {
          if (userPitchClasses.includes(s.dataset.pc)) {
            s.classList.add('correct-note');
          }
        });
        const allMatch = expectedPitchClasses.every((pc) =>
          userPitchClasses.includes(pc)
        );
        if (allMatch) {
          // Determine elapsed time and award stars accordingly
          const elapsed = recordStartTime ? (performance.now() - recordStartTime) / 1000 : null;
          let stars = 1;
          if (elapsed !== null) {
            if (elapsed <= 5) stars = 3;
            else if (elapsed <= 10) stars = 2;
          }
          statusEl.innerHTML = `Brawo! Zagrałeś poprawny akord. ${'★'.repeat(stars)}`;
          statusEl.className = 'status result-success';
          addStars(stars);
          detector.stop();
          detector = null;
        }
        // If user plays more than expected notes, inform them
        if (userPitchClasses.length > expectedPitchClasses.length) {
          statusEl.textContent = 'Zagrałeś za dużo nut. Spróbuj ponownie.';
          statusEl.className = 'status result-failure';
          detector.stop();
          detector = null;
        }
      }
    },
    clarityThreshold: 0.85,
  });
  recordStartTime = performance.now();
  await detector.start();
}

// Event listeners
nextBtn.addEventListener('click', pickRandomChord);
playBtn.addEventListener('click', () => {
  if (!currentChord) return;
  playChord(currentChord.notes, 1.5);
});
recordBtn.addEventListener('click', startRecording);

// Initialise with the first chord when the page loads
pickRandomChord();