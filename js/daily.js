// ================================================================
// DAILY CHALLENGE — seeded run-of-the-day + login streak
// ================================================================

// Deterministic PRNG (mulberry32) so a "daily" run generates the same
// platforms/flags/bots for every player on the same calendar day.
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

// Everything in the world (platforms, flags, particles, bot AI) draws from
// Math.random, so swapping it wholesale gives a fully reproducible run
// without touching any of the generation code.
const _nativeRandom = Math.random.bind(Math);

// The seed actually driving the CURRENT run: fixed per calendar day for
// DAILY, fixed to the shared link's seed for CHALLENGE (so retries face the
// identical course), and freshly randomized for every CLASSIC run — kept
// around so a share afterwards can snapshot exactly that layout into a
// challenge link (see challenge.js) without making ordinary runs
// deterministic to begin with. Race/duel play against live bots and stay
// unseeded.
let currentRunSeed = null;
function applyDailySeedIfNeeded() {
  if (gameMode === 'daily') currentRunSeed = todayKey();
  else if (gameMode === 'challenge' && challenge) currentRunSeed = challenge.seed;
  else if (gameMode === 'classic') currentRunSeed = Date.now().toString(36) + Math.floor(_nativeRandom() * 1e9).toString(36);
  else currentRunSeed = null;
  Math.random = currentRunSeed ? mulberry32(hashSeed(currentRunSeed)) : _nativeRandom;
}

// --- Daily login streak: counts consecutive calendar days the game was opened ---
let dailyStreak = 0;
function loadDailyStreak() {
  try {
    const raw = JSON.parse(localStorage.getItem('jumpyDaily') || '{}');
    const today = todayKey();
    if (raw.lastDate === today) { dailyStreak = raw.streak || 1; return; }
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    dailyStreak = (raw.lastDate === yesterday) ? (raw.streak || 0) + 1 : 1;
    localStorage.setItem('jumpyDaily', JSON.stringify({ lastDate: today, streak: dailyStreak }));
  } catch (e) { dailyStreak = 1; }
}
loadDailyStreak();

// --- Today's best score for the seeded daily run ---
function getDailyBest() {
  try {
    const raw = JSON.parse(localStorage.getItem('jumpyDailyBest') || '{}');
    return raw.date === todayKey() ? (raw.score || 0) : 0;
  } catch (e) { return 0; }
}
function recordDailyResult(finalScore) {
  try {
    const today = todayKey();
    const prev = getDailyBest();
    if (finalScore > prev) localStorage.setItem('jumpyDailyBest', JSON.stringify({ date: today, score: finalScore }));
  } catch (e) { /* ignore */ }
}
