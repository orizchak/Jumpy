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
function applyDailySeedIfNeeded() {
  Math.random = (gameMode === 'daily') ? mulberry32(hashSeed(todayKey())) : _nativeRandom;
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
