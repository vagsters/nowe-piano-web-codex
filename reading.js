import { playSingleNote, freqToPitchClass, parseNoteName, addStars } from './common.js';
import { NoteDetector } from './noteDetector.js';

/*
 * This module implements a simple note reading exercise on a five‑line staff.
 * A random natural note within a comfortable range is selected and drawn
 * on the canvas. The user can listen to the pitch, generate a new note,
 * and attempt to reproduce it on their instrument. Microphone input is
 * analysed to verify whether the user played the correct note (pitch class).
 */

// Define a set of natural notes to choose from. We limit the range to
// notes that fit neatly within the staff (E4 at the bottom line up to
// F5 at the top line) to avoid excessive ledger lines.
const NATURAL_NOTES = [
  'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'
];

// Canvas and context
const canvas = document.getElementById('staff-canvas');
const ctx = canvas.getContext('2d');

// Buttons and status element
const newNoteBtn = document.getElementById('new-note');
const playBtn = document.getElementById('play-note');
const recordBtn = document.getElementById('start-reading-record');
const statusEl = document.getElementById('reading-status');

let currentNote = null;
let detector = null;
let recordStartTime = null;

// Settings for staff drawing
const LINE_SPACING = 14; // distance between staff lines in pixels
const BASE_Y = 130; // y‑coordinate for the bottom line (E4)
const STAFF_START_X = 40;
const STAFF_END_X = canvas.width - 40;

/**
 * Compute the diatonic distance (in steps) between the given note and E4.
 * Each diatonic step corresponds to a move from a line to a space or
 * vice versa. A distance of 0 represents E4 on the bottom line. A
 * positive distance moves up the staff, and a negative distance moves
 * down below the staff. Accidentals are ignored for positioning.
 *
 * @param {string} name Note name (e.g. "C4")
 * @returns {number} Diatonic steps relative to E4
 */
function diatonicDistanceFromE4(name) {
  // Parse the note name into pitch class and octave
  const { pc, octave } = parseNoteName(name);
  // Use only the letter part (ignore sharps/flats for positioning)
  const letter = pc.replace(/[#b]/, '');
  const DIATONIC_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const idx = DIATONIC_ORDER.indexOf(letter);
  const e4Idx = DIATONIC_ORDER.indexOf('E');
  // Compute the difference in diatonic steps (octave difference * 7 + index diff)
  const diff = (octave - 4) * 7 + (idx - e4Idx);
  return diff;
}

/**
 * Draw the staff lines on the canvas.
 */
function drawStaff() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = BASE_Y - i * LINE_SPACING;
    ctx.beginPath();
    ctx.moveTo(STAFF_START_X, y);
    ctx.lineTo(STAFF_END_X, y);
    ctx.stroke();
  }
}

/**
 * Draw a note head on the staff. Ledger lines are drawn automatically
 * if the note lies outside the five‑line staff. Only natural notes are
 * expected; accidentals are not rendered differently.
 *
 * @param {string} noteName The note to draw (e.g. "A4")
 */
function drawNote(noteName) {
  drawStaff();
  const dist = diatonicDistanceFromE4(noteName);
  // Compute vertical position: each diatonic step moves half the line spacing
  const y = BASE_Y - dist * (LINE_SPACING / 2);
  // Draw ledger lines if necessary
  // Below the staff (dist < 0): ledger lines for every even negative dist <= -2
  if (dist < 0) {
    for (let d = dist; d <= -2; d += 2) {
      const ly = BASE_Y - d * (LINE_SPACING / 2);
      ctx.beginPath();
      ctx.moveTo(STAFF_START_X + 20, ly);
      ctx.lineTo(STAFF_END_X - 20, ly);
      ctx.stroke();
    }
  }
  // Above the staff (dist > 8): ledger lines for every even dist >= 10
  if (dist > 8) {
    for (let d = 10; d <= dist; d += 2) {
      const ly = BASE_Y - d * (LINE_SPACING / 2);
      ctx.beginPath();
      ctx.moveTo(STAFF_START_X + 20, ly);
      ctx.lineTo(STAFF_END_X - 20, ly);
      ctx.stroke();
    }
  }
  // Draw the note head (filled oval)
  const x = (STAFF_START_X + STAFF_END_X) / 2;
  ctx.beginPath();
  const radiusX = 8;
  const radiusY = 6;
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();
}

/**
 * Select a new random note and draw it on the staff. Update the current
 * exercise state and clear any status messages.
 */
function generateNewNote() {
  currentNote = NATURAL_NOTES[Math.floor(Math.random() * NATURAL_NOTES.length)];
  drawNote(currentNote);
  statusEl.textContent = '';
  statusEl.className = 'status';
  // Stop any ongoing detection
  if (detector) {
    detector.stop();
    detector = null;
  }
}

/**
 * Play the current note through the audio context.
 */
function playCurrentNote() {
  if (!currentNote) return;
  playSingleNote(currentNote, 0.8, 0.35);
}

/**
 * Start microphone listening to capture a single note from the user. Once a
 * pitch class is detected, compare it to the current note's pitch class and
 * display feedback. The exercise expects only natural pitch classes.
 */
async function startRecording() {
  if (!currentNote) return;
  // Stop previous detector if any
  if (detector) {
    detector.stop();
    detector = null;
  }
  statusEl.textContent = 'Nasłuchiwanie...';
  statusEl.className = 'status';
  detector = new NoteDetector({
    onFrequency: (freq) => {
      const pc = freqToPitchClass(freq);
      if (!pc) return;
      // Only consider natural pitch classes for this exercise
      const naturalPc = pc.replace(/#/, '');
      const expectedPc = parseNoteName(currentNote).pc.replace(/#/, '');
      if (naturalPc === expectedPc) {
        // Compute elapsed time and award stars
        const elapsed = recordStartTime ? (performance.now() - recordStartTime) / 1000 : null;
        let stars = 1;
        if (elapsed !== null) {
          if (elapsed <= 3) stars = 3;
          else if (elapsed <= 6) stars = 2;
        }
        statusEl.innerHTML = `Brawo! Poprawna nuta. ${'★'.repeat(stars)}`;
        statusEl.className = 'status result-success';
        // Award stars only when correct
        addStars(stars);
      } else {
        statusEl.textContent = `To był dźwięk ${naturalPc}. Spróbuj ponownie.`;
        statusEl.className = 'status result-failure';
      }
      detector.stop();
      detector = null;
    },
    clarityThreshold: 0.85,
  });
  recordStartTime = performance.now();
  await detector.start();
}

// Event listeners
newNoteBtn.addEventListener('click', generateNewNote);
playBtn.addEventListener('click', playCurrentNote);
recordBtn.addEventListener('click', startRecording);

// Initial drawing when the page loads
generateNewNote();