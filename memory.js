import { playSingleNote, freqToPitchClass, NOTE_NAMES, addStars } from './common.js';
import { NoteDetector } from './noteDetector.js';

/*
 * Memory sequence exercise. A random sequence of pitch classes is
 * generated and played for the user. After listening, the user should
 * reproduce the sequence by playing or singing the notes; the
 * microphone will capture the pitches and determine whether they match
 * the sequence. The sequence length can be adjusted for difficulty.
 */

const SEQ_LENGTH = 3;

const generateBtn = document.getElementById('generate-sequence');
const recordBtn = document.getElementById('start-seq-record');
const hintsBtn = document.getElementById('show-hints');
const hintsDisplay = document.getElementById('sequence-hints');
const sequenceDisplay = document.getElementById('sequence-display');
const userDisplay = document.getElementById('user-sequence');
const statusEl = document.getElementById('sequence-status');

let expectedSequence = [];
let userSequence = [];
let detector = null;
let recordStartTime = null;
let currentHints = [];

function randomPitchClass() {
  // Exclude accidentals for simplicity in this exercise
  const naturals = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return naturals[Math.floor(Math.random() * naturals.length)];
}

async function playSequence() {
  for (let i = 0; i < expectedSequence.length; i++) {
    const pc = expectedSequence[i];
    // Always play in octave 4 for consistency
    await new Promise((resolve) => {
      playSingleNote(`${pc}4`, 0.6, 0.35);
      setTimeout(resolve, 700);
    });
  }
}

function generateSequence() {
  expectedSequence = [];
  for (let i = 0; i < SEQ_LENGTH; i++) {
    expectedSequence.push(randomPitchClass());
  }
  // Display the sequence to the user
  sequenceDisplay.innerHTML = '';
  expectedSequence.forEach((pc) => {
    const span = document.createElement('span');
    span.textContent = pc;
    sequenceDisplay.appendChild(span);
  });
  // Precompute hints (direction arrows) between consecutive notes
  currentHints = [];
  for (let i = 1; i < expectedSequence.length; i++) {
    const prevIdx = NOTE_NAMES.indexOf(expectedSequence[i - 1]);
    const currIdx = NOTE_NAMES.indexOf(expectedSequence[i]);
    if (prevIdx < 0 || currIdx < 0) {
      currentHints.push('');
    } else if (currIdx > prevIdx) {
      currentHints.push('↑');
    } else if (currIdx < prevIdx) {
      currentHints.push('↓');
    } else {
      currentHints.push('→');
    }
  }
  hintsDisplay.innerHTML = '';
  statusEl.textContent = '';
  userSequence = [];
  userDisplay.innerHTML = '';
  // Play the sequence
  playSequence();
}

function evaluateSequence() {
  if (userSequence.length !== expectedSequence.length) {
    statusEl.textContent = 'Liczba dźwięków się nie zgadza. Spróbuj ponownie.';
    statusEl.className = 'status result-failure';
    return;
  }
  let correct = true;
  for (let i = 0; i < expectedSequence.length; i++) {
    if (expectedSequence[i] !== userSequence[i]) {
      correct = false;
      break;
    }
  }
  if (correct) {
    // Determine elapsed time and award stars
    const elapsed = recordStartTime ? (performance.now() - recordStartTime) / 1000 : null;
    let stars = 1;
    if (elapsed !== null) {
      const fastThreshold = SEQ_LENGTH * 2; // 2s per note → 3 stars
      const midThreshold = SEQ_LENGTH * 4; // 4s per note → 2 stars
      if (elapsed <= fastThreshold) stars = 3;
      else if (elapsed <= midThreshold) stars = 2;
    }
    statusEl.innerHTML = `Doskonale! Powtórzyłeś sekwencję poprawnie. ${'★'.repeat(stars)}`;
    statusEl.className = 'status result-success';
    addStars(stars);
  } else {
    statusEl.textContent = 'Niestety, sekwencja była inna. Spróbuj ponownie.';
    statusEl.className = 'status result-failure';
  }
}

async function startRecording() {
  // Stop existing detector
  if (detector) {
    detector.stop();
    detector = null;
  }
  userSequence = [];
  userDisplay.innerHTML = '';
  statusEl.textContent = 'Nasłuchiwanie...';
  statusEl.className = 'status';
  detector = new NoteDetector({
    onFrequency: (freq) => {
      const pc = freqToPitchClass(freq);
      if (!pc) return;
      // Only record naturals (ignore accidentals to match our sequence)
      if (!['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(pc)) return;
      if (userSequence.length < expectedSequence.length) {
        userSequence.push(pc);
        const span = document.createElement('span');
        span.textContent = pc;
        userDisplay.appendChild(span);
        if (userSequence.length === expectedSequence.length) {
          detector.stop();
          detector = null;
          evaluateSequence();
        }
      }
    },
    clarityThreshold: 0.85,
  });
  recordStartTime = performance.now();
  await detector.start();
}

generateBtn.addEventListener('click', generateSequence);
recordBtn.addEventListener('click', startRecording);

// Show hints when the user clicks the hints button. This displays
// arrows indicating whether the next note in the sequence is higher
// (↑), lower (↓) or the same (→) compared to the previous one. The
// first note has no hint because there is no preceding note.
if (hintsBtn) {
  hintsBtn.addEventListener('click', () => {
    hintsDisplay.innerHTML = '';
    if (currentHints.length === 0) {
      const span = document.createElement('span');
      span.textContent = 'Brak wskazówek.';
      hintsDisplay.appendChild(span);
      return;
    }
    // Prepend an empty hint for the first note to align hints visually
    const hints = [''].concat(currentHints);
    hints.forEach((hint) => {
      const span = document.createElement('span');
      span.textContent = hint;
      span.style.marginRight = '8px';
      hintsDisplay.appendChild(span);
    });
  });
}

// Generate an initial sequence on page load
generateSequence();