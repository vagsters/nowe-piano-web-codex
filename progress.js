import { getStarCount, addStars } from './common.js';

/*
 * Script for the progress tracking page. It reads the total number of
 * stars accumulated across all exercises from localStorage and displays
 * them. A reset button allows the learner to start over at any time.
 */

const starCountEl = document.getElementById('star-count');
const resetBtn = document.getElementById('reset-stars');
const badgeContainer = document.getElementById('badge-container');

// Define achievement badges. Each badge unlocks at a certain
// threshold of stars and is represented by an emoji and a name. The
// user earns badges cumulatively as they collect more stars. Feel
// free to adjust the thresholds and icons to make the rewards more
// engaging.
const BADGES = [
  { threshold: 0, name: 'Nowicjusz', icon: '🥉' },
  { threshold: 10, name: 'Uczeń', icon: '🥈' },
  { threshold: 25, name: 'Zaawansowany', icon: '🥇' },
  { threshold: 50, name: 'Mistrz', icon: '🏆' },
];

/**
 * Render the current star count. A simple star icon (★) is repeated
 * according to the number of stars, with a maximum display of 10 stars
 * at a time. For larger counts, the total number is shown in
 * parentheses.
 */
function renderStars() {
  const count = getStarCount();
  let stars = '';
  const maxDisplay = 10;
  const displayCount = Math.min(count, maxDisplay);
  for (let i = 0; i < displayCount; i++) {
    stars += '★';
  }
  if (count > maxDisplay) {
    stars += ` (${count})`;
  } else if (count === 0) {
    stars = '–';
  }
  starCountEl.textContent = stars;

  // Render badges based on current count
  if (badgeContainer) {
    badgeContainer.innerHTML = '';
    BADGES.forEach((badge) => {
      const span = document.createElement('span');
      span.textContent = `${badge.icon} ${badge.name}`;
      span.style.padding = '0.25rem 0.5rem';
      span.style.borderRadius = '0.25rem';
      span.style.border = '1px solid var(--primary)';
      span.style.margin = '0.25rem';
      // Highlight earned badges
      if (count >= badge.threshold) {
        span.style.backgroundColor = 'var(--primary)';
        span.style.color = 'white';
      } else {
        span.style.backgroundColor = '#e5e7eb';
        span.style.color = '#6b7280';
      }
      badgeContainer.appendChild(span);
    });
  }
}

resetBtn.addEventListener('click', () => {
  try {
    localStorage.setItem('pianoStars', '0');
  } catch (e) {
    // ignore
  }
  renderStars();
});

// Initial rendering when the page loads
renderStars();