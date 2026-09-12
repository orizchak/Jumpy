// ================================================================
// PERSISTENCE — best scores and career totals survive a reload
// ================================================================
const STATS_KEY = 'jumpyStats_v1';

// Career totals (lifetime, across every session)
let totalRuns = 0;
let totalFlagsCollected = 0;
let totalDistanceClimbed = 0; // meters, summed across every run's end distance
let totalDuelWins = 0;
let totalRaceWins = 0;

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.best === 'number') best = s.best;
    if (typeof s.bestHeight === 'number') bestHeight = s.bestHeight;
    if (typeof s.bestTimeMs === 'number') bestTimeMs = s.bestTimeMs;
    if (s.raceWins && typeof s.raceWins === 'object') raceWins = s.raceWins;
    totalRuns = s.totalRuns || 0;
    totalFlagsCollected = s.totalFlagsCollected || 0;
    totalDistanceClimbed = s.totalDistanceClimbed || 0;
    totalDuelWins = s.totalDuelWins || 0;
    totalRaceWins = s.totalRaceWins || 0;
  } catch (e) { /* corrupt or blocked storage — start fresh */ }
  bestEl.textContent = best;
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({
      best, bestHeight, bestTimeMs, raceWins,
      totalRuns, totalFlagsCollected, totalDistanceClimbed, totalDuelWins, totalRaceWins
    }));
  } catch (e) { /* storage full or blocked — stats just won't persist */ }
}

loadStats();

// Belt-and-suspenders: catch stat updates that happen without an explicit
// saveStats() call (e.g. a mid-run tab close) so progress is never lost.
window.addEventListener('beforeunload', saveStats);
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') saveStats();
});
