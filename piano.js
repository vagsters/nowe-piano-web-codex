import { playSingleNote, NOTE_NAMES } from './common.js';

/*
 * This script builds a simple virtual keyboard and attaches event listeners
 * to each key. Only the seven natural (white) notes of one octave are
 * displayed to keep the layout straightforward. Users can click the
 * keys or press corresponding letters on the keyboard (Q–U) to play
 * sounds.
 */

/*
 * This script constructs a simple yet more realistic virtual keyboard. It
 * renders both white and black keys for one octave and positions the
 * black keys over the white keys. Users can play notes by clicking
 * on the keys or using keyboard shortcuts (Q–U for white keys and
 * 2–3–5–6–7 for sharps). The key labels omit the octave number.
 */

// Mapping of keyboard letters to note names. Natural notes map to Q–U,
// sharps map to number keys on the top row.
const KEY_MAP = {
  q: 'C4',
  w: 'D4',
  e: 'E4',
  r: 'F4',
  t: 'G4',
  y: 'A4',
  u: 'B4',
  '2': 'C#4',
  '3': 'D#4',
  '5': 'F#4',
  '6': 'G#4',
  '7': 'A#4',
};

// Define white and black notes for one octave
const WHITE_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
// Map black note to its position between white notes (index starting at 0).
const BLACK_POSITIONS = {
  'C#4': 0,
  'D#4': 1,
  'F#4': 3,
  'G#4': 4,
  'A#4': 5,
};

const pianoEl = document.getElementById('piano');

function createWhiteKey(note) {
  const key = document.createElement('div');
  key.className = 'white-key';
  key.dataset.note = note;
  key.textContent = note.replace(/\d+$/, '');
  key.addEventListener('click', () => playSingleNote(note, 0.8, 0.35));
  return key;
}

function createBlackKey(note) {
  const key = document.createElement('div');
  key.className = 'black-key';
  key.dataset.note = note;
  // Show sharp sign (#) instead of the full note name on the key label
  key.textContent = '♯';
  key.addEventListener('click', (e) => {
    // Prevent triggering underlying white key
    e.stopPropagation();
    playSingleNote(note, 0.8, 0.35);
  });
  return key;
}

function buildPiano() {
  // First, create all white keys and append them to the piano element
  WHITE_NOTES.forEach((note) => {
    pianoEl.appendChild(createWhiteKey(note));
  });
  // Then, create black keys and append to the piano element. They will
  // be positioned absolutely via JS after the DOM has laid out the white keys.
  Object.keys(BLACK_POSITIONS).forEach((note) => {
    const key = createBlackKey(note);
    pianoEl.appendChild(key);
  });
  // After DOM update, compute sizes to position black keys correctly
  positionBlackKeys();
}

function positionBlackKeys() {
  const pianoWidth = pianoEl.clientWidth;
  const whiteKeyWidth = pianoWidth / WHITE_NOTES.length;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  // Set width and position for each black key
  Array.from(pianoEl.querySelectorAll('.black-key')).forEach((key) => {
    const note = key.dataset.note;
    const posIndex = BLACK_POSITIONS[note];
    const leftPx = (posIndex + 1) * whiteKeyWidth - blackKeyWidth / 2;
    key.style.width = `${blackKeyWidth}px`;
    key.style.left = `${leftPx}px`;
  });
}

function handleKeydown(event) {
  const note = KEY_MAP[event.key.toLowerCase()];
  if (note) {
    playSingleNote(note, 0.8, 0.35);
    // Visual feedback: briefly add an active class
    const el = pianoEl.querySelector(`[data-note="${note}"]`);
    if (el) {
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 150);
    }
  }
}

// Ensure black keys reposition correctly on resize
window.addEventListener('resize', () => {
  positionBlackKeys();
});

buildPiano();
window.addEventListener('keydown', handleKeydown);