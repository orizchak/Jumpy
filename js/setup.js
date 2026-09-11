const canvas = document.getElementById('game');
// The world's logical size adapts to the screen's aspect ratio (once, at load):
// tall phones get a taller playfield, wide tablets get a WIDER one — no bands
// ================================================================
// DISPLAY & CANVAS — logical sizing, HiDPI, viewport fit
// ================================================================
(function fitLogicalSize() {
  const vw = Math.max(300, window.innerWidth);
  const vh = Math.max(480, window.innerHeight);
  const aspect = vw / vh;
  let w = 400, h = Math.round(400 / aspect);
  if (h < 700) {
    // squarish/wide screen (iPad, desktop): keep the tuned 700 height, widen the pitch.
    // Full 16:9 support: a 1920x1080 screen gets a true 1244x700 world.
    h = 700;
    w = Math.min(1280, Math.round(700 * aspect));
  } else if (h > 960) {
    h = 960; // ultra-tall phones cap out
  }
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
})();
const ctx = canvas.getContext('2d');
const mainCtx = ctx;
const W = canvas.width, H = canvas.height;

// ---- HiDPI: render at device resolution (capped 2x) so retina phones and
// scaled desktops get pixel-crisp output instead of CSS-upscaled blur ----
const DPR = Math.min(window.devicePixelRatio || 1, 2);
if (DPR !== 1) {
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Scale the whole game (canvas + HUD overlays together) to fill the viewport
const wrapEl = document.getElementById('wrap');
function fitWrapToScreen() {
  wrapEl.style.width = W + 'px';
  wrapEl.style.height = H + 'px';
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  wrapEl.style.transform = 'scale(' + s + ')';
  wrapEl.style.transformOrigin = '50% 50%';
}
fitWrapToScreen();
window.addEventListener('resize', fitWrapToScreen);
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

let keys = { left: false, right: false };
let running = false;
let rafId = null;

const ball = {
  x: W/2, y: H - 100, r: 15,
  vx: 0, vy: 0,
  facing: 1
};

const GRAVITY = 0.28;
const BOUNCE_VELOCITY = -10.5;
// wider pitch = proportionally faster travel, so crossing never feels sluggish
const MOVE_SPEED = 4.5 * (1 + (W - 400) / 400 * 0.5); // 400w: 4.5 -> 1244w: ~9.2
const PLATFORM_W = 62, PLATFORM_H = 14;
const FLAG_R = 10;
const CANDY_R = 9;
const GIFT_R = 11;
const CANDY_COLORS = ['#ff6b9d', '#7c4dff', '#40c4ff', '#69f0ae', '#ff8a65'];
// World Cup 2026 (USA/Canada/Mexico) host-nation colors for confetti and celebration effects
const WC_COLORS = ['#B22234', '#3C3B6E', '#ffffff', '#006341', '#FF0000'];

// Nations ordered by World Cup achievement (lowest to highest): the 2026 hosts and
// rising sides first, then semifinalists, finalists, and champions by title count.
const FLAG_NATIONS = [
  { name: 'Canada',      emoji: '🇨🇦', pattern: 'vertical',   colors: ['#FF0000', '#f0f0f0', '#FF0000'] },
  { name: 'USA',         emoji: '🇺🇸', pattern: 'usa' },
  { name: 'Mexico',      emoji: '🇲🇽', pattern: 'mexico' },
  { name: 'Japan',       emoji: '🇯🇵', pattern: 'japan' },
  { name: 'Morocco',     emoji: '🇲🇦', pattern: 'morocco' },
  { name: 'Portugal',    emoji: '🇵🇹', pattern: 'vertical',   colors: ['#006600', '#FF0000', '#FF0000'] },
  { name: 'Croatia',     emoji: '🇭🇷', pattern: 'horizontal', colors: ['#FF0000', '#f0f0f0', '#171796'] },
  { name: 'Netherlands', emoji: '🇳🇱', pattern: 'horizontal', colors: ['#AE1C28', '#f0f0f0', '#21468B'] },
  { name: 'England',     emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', pattern: 'cross',      bg: '#f0f0f0', accent: '#CE1124' },
  { name: 'Spain',       emoji: '🇪🇸', pattern: 'horizontal', colors: ['#AA151B', '#F1BF00', '#AA151B'], weights: [1, 2, 1] },
  { name: 'Uruguay',     emoji: '🇺🇾', pattern: 'stripes4',   colors: ['#f0f0f0', '#0038A8'] },
  { name: 'France',      emoji: '🇫🇷', pattern: 'vertical',   colors: ['#0055A4', '#f0f0f0', '#EF4135'] },
  { name: 'Argentina',   emoji: '🇦🇷', pattern: 'horizontal', colors: ['#74ACDF', '#f0f0f0', '#74ACDF'] },
  { name: 'Germany',     emoji: '🇩🇪', pattern: 'horizontal', colors: ['#1a1a1a', '#DD0000', '#FFCE00'] },
  { name: 'Italy',       emoji: '🇮🇹', pattern: 'vertical',   colors: ['#009246', '#f0f0f0', '#CE2B37'] },
  { name: 'Brazil',      emoji: '🇧🇷', pattern: 'brazil' }
];

let platforms = [];
let flags = [];
let candies = [];
let gifts = [];
let particles = [];
let confetti = [];
let popups = [];
let clouds = [];
let hills = [];
let score = 0;
let best = 0;
let cameraY = 0;
let wasMoving = false;
let deathReason = 'fall';
let celebratedNewBest = false;
let bestAtRunStart = 0;
let shieldActive = false;
let shieldTimer = 0;
const SHIELD_DURATION = 420; // frames (~7s at 60fps)
const BARRIER_OFFSET = 10;
let matchStartTime = 0;
let bestTimeMs = 0;
let bestHeight = 0;
let paused = false;
let pausedAt = 0;
const pauseOverlayEl = document.getElementById('pauseOverlay');
const pauseStatsEl = document.getElementById('pauseStats');

function togglePause() {
  if (!running) return; // only pausable mid-match
  paused = !paused;
  if (paused) {
    pausedAt = Date.now();
    const distM = Math.round(cameraY / 10);
    let rows =
      '<div class="psRow"><b>Score</b><span>' + score + ' · best ' + Math.max(best, score) + '</span></div>' +
      '<div class="psRow"><b>Distance</b><span>' + distM + 'm · best ' + Math.max(bestHeight, distM) + 'm</span></div>' +
      '<div class="psRow"><b>Time</b><span>' + formatMatchTime(pausedAt - matchStartTime) + ' · best ' + formatMatchTime(Math.max(bestTimeMs, pausedAt - matchStartTime)) + '</span></div>' +
      '<div class="psRow"><b>Flags</b><span>🚩 ' + flagsCollectedCount + '</span></div>' +
      '<div class="psRow"><b>Lives</b><span>' + (racing() ? '⚽ ∞' : '⚽'.repeat(lives)) + '</span></div>';
    if (racing()) {
      const st = raceStandings();
      const place = st.findIndex(function(e) { return e.you; }) + 1;
      rows += '<div class="psRow"><b>Race</b><span>' + place + ' of ' + st.length + ' · 🎯 ' + raceTarget + '</span></div>';
    }
    pauseStatsEl.innerHTML = rows;
    pauseOverlayEl.classList.add('show');
    document.getElementById('muteBtn').classList.add('show');
    keys.left = false; keys.right = false;
    playWhistle(false);
  } else {
    // exclude paused time from the match clock
    matchStartTime += Date.now() - pausedAt;
    // if paused during a GOLDEN GOAL, shift its anchor too so the span isn't counted twice
    if (goalGame.active) goalPausedAt += Date.now() - pausedAt;
    pauseOverlayEl.classList.remove('show');
    if (running) document.getElementById('muteBtn').classList.remove('show');
    playWhistle(false);
  }
}
let celebratedChampion = false;
let trophyTimer = 0; // frames remaining to show the floating trophy

// --- Lives & flag collection tracking ---
const MAX_LIVES = 5;
let lives = 3;
let flagsCollectedCount = 0;
let flagCountsByCountry = {}; // countryIdx -> count; every 3 of the same country = +1 life
let reviveGraceTimer = 0;     // brief invulnerable window after a revive
let ballTrail = [];           // recent ball positions for the motion trail
let boostTimer = 0;           // safety-cap frames of mega-boost flight remaining
let boostDistLeft = 0;        // px of climb this boost still grants (100m per boost)
let boostsQueued = 0;         // GOLDEN GOAL prize: chained mega boosts
let goalPendingCount = 0;     // GOLDEN GOALs earned (10 same flags each)
let goalGame = { active: false };
let goalPausedAt = 0;

