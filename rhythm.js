import { playSingleNote, addStars } from './common.js';

/*
 * Rhythm training exercise. A random rhythm pattern is selected and
 * played back as a series of short tones. The user then taps a button
 * to reproduce the rhythm. Timing differences are measured and a
 * tolerance is applied to determine success.
 */

const patterns = [
  { durations: [1, 0.5, 0.5, 1], name: 'Rytm 1' },
  { durations: [0.5, 0.5, 1, 0.5, 1.5], name: 'Rytm 2' },
  { durations: [0.75, 0.75, 0.75, 0.75], name: 'Rytm prosty' },
  { durations: [1.5, 0.5, 0.5, 0.5, 1], name: 'Rytm asymetryczny' },
];
const tolerance = 0.3; // allowable deviation in seconds per beat

const playBtn = document.getElementById('play-pattern');
const tapBtn = document.getElementById('tap-btn');
const displayEl = document.getElementById('rhythm-display');
const statusEl = document.getElementById('rhythm-status');

let currentPattern = null;
let userTaps = [];
let listening = false;

function renderPattern(durations) {
  displayEl.innerHTML = '';
  durations.forEach((dur, idx) => {
    const span = document.createElement('span');
    // Represent duration by width proportional to length
    span.style.display = 'inline-block';
    span.style.width = `${dur * 40}px`;
    span.style.height = '10px';
    span.style.marginRight = '4px';
    span.style.backgroundColor = 'var(--primary)';
    displayEl.appendChild(span);
  });
}

async function playPattern() {
  // Choose a random pattern
  currentPattern = patterns[Math.floor(Math.random() * patterns.length)];
  renderPattern(currentPattern.durations);
  statusEl.textContent = 'Słuchaj rytmu...';
  statusEl.className = 'status';
  tapBtn.disabled = true;
  // Play the pattern: beep at each beat; the first tone starts at t=0
  let time = 0;
  for (let i = 0; i < currentPattern.durations.length; i++) {
    setTimeout(() => {
      // play a short beep (C5) for 0.2s
      playSingleNote('C5', 0.2, 0.35);
    }, time * 1000);
    time += currentPattern.durations[i];
  }
  // After playback ends, enable tapping
  setTimeout(() => {
    statusEl.textContent = 'Teraz Twój ruch! Klikaj w rytmie.';
    tapBtn.disabled = false;
    userTaps = [];
    listening = true;
  }, time * 1000 + 500);
}

function evaluateRhythm() {
  if (!currentPattern) return;
  const expected = currentPattern.durations;
  if (userTaps.length !== expected.length) {
    statusEl.textContent = 'Nie nacisnąłeś odpowiedniej liczby razy.';
    statusEl.className = 'status result-failure';
    return;
  }
  let ok = true;
  let totalDeviation = 0;
  for (let i = 0; i < expected.length; i++) {
    const diff = Math.abs(userTaps[i] - expected[i]);
    totalDeviation += diff;
    if (diff > tolerance) {
      ok = false;
    }
  }
  if (ok) {
    // Compute average deviation and award stars: small deviations earn more stars
    const avgDev = totalDeviation / expected.length;
    let stars = 1;
    if (avgDev <= 0.1) stars = 3;
    else if (avgDev <= 0.2) stars = 2;
    statusEl.innerHTML = `Świetnie! Prawidłowo powtórzyłeś rytm. ${'★'.repeat(stars)}`;
    statusEl.className = 'status result-success';
    addStars(stars);
  } else {
    statusEl.textContent = 'Rytm nie był dokładny. Spróbuj ponownie.';
    statusEl.className = 'status result-failure';
  }
  listening = false;
}

let lastTapTime = null;

function handleTap() {
  if (!listening) return;
  const now = performance.now();
  if (lastTapTime === null) {
    lastTapTime = now;
    // first tap marks start; don't measure interval yet
    return;
  }
  const interval = (now - lastTapTime) / 1000;
  lastTapTime = now;
  userTaps.push(interval);
  if (userTaps.length === currentPattern.durations.length) {
    evaluateRhythm();
    lastTapTime = null;
  }
}

playBtn.addEventListener('click', playPattern);
tapBtn.addEventListener('click', handleTap);