// ================================================================
// ACHIEVEMENTS — one-time career milestones, banner on unlock
// ================================================================
const ACHIEVEMENTS = [
  { id: 'climb_1000',  name: 'Getting Started', desc: 'Climb 1,000m lifetime',  emoji: '🥾', check: function() { return totalDistanceClimbed >= 1000; } },
  { id: 'climb_5000',  name: 'Mountaineer',     desc: 'Climb 5,000m lifetime',  emoji: '⛰️', check: function() { return totalDistanceClimbed >= 5000; } },
  { id: 'climb_10000', name: 'Summit Legend',   desc: 'Climb 10,000m lifetime', emoji: '🏔️', check: function() { return totalDistanceClimbed >= 10000; } },
  { id: 'flags_100',   name: 'Flag Collector',  desc: 'Collect 100 flags',      emoji: '🚩', check: function() { return totalFlagsCollected >= 100; } },
  { id: 'flags_500',   name: 'Flag Fanatic',    desc: 'Collect 500 flags',      emoji: '🏳️', check: function() { return totalFlagsCollected >= 500; } },
  { id: 'duels_10',    name: 'Duel Master',     desc: 'Win 10 duels',           emoji: '⚔️', check: function() { return totalDuelWins >= 10; } },
  { id: 'races_10',    name: 'Race Champion',   desc: 'Win 10 races',           emoji: '🏁', check: function() { return totalRaceWins >= 10; } },
  { id: 'no_shield',   name: 'Fearless',        desc: 'Finish a run without a shield', emoji: '😤', check: null }
];

let unlockedAchievements = {};
function loadAchievements() {
  try { unlockedAchievements = JSON.parse(localStorage.getItem('jumpyAchievements') || '{}'); }
  catch (e) { unlockedAchievements = {}; }
}
function saveAchievements() {
  try { localStorage.setItem('jumpyAchievements', JSON.stringify(unlockedAchievements)); } catch (e) {}
}
function unlockAchievement(id) {
  if (unlockedAchievements[id]) return;
  const a = ACHIEVEMENTS.find(function(x) { return x.id === id; });
  if (!a) return;
  unlockedAchievements[id] = true;
  saveAchievements();
  showReward('🏅 ACHIEVEMENT UNLOCKED', '#ffd54f', '255,213,79', a.emoji, a.name);
  playAirHorn(false);
}
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (a.check && !unlockedAchievements[a.id] && a.check()) unlockAchievement(a.id);
  }
}
loadAchievements();

// Tracks whether the *current* run has picked up a shield, for the "Fearless" achievement.
let shieldUsedThisRun = false;

// --- Menu summary: best stats, streak, achievement/skin progress ---
function renderMenuStats() {
  const el = document.getElementById('menuStats');
  if (!el) return;
  const unlockedCount = ACHIEVEMENTS.filter(function(a) { return unlockedAchievements[a.id]; }).length;
  el.innerHTML =
    '🏆 Best ' + best + ' &nbsp;·&nbsp; 📏 ' + bestHeight + 'm &nbsp;·&nbsp; ⏱ ' + formatMatchTime(bestTimeMs) + '<br>' +
    '🔥 ' + dailyStreak + ' day streak &nbsp;·&nbsp; 🏅 ' + unlockedCount + '/' + ACHIEVEMENTS.length + ' achievements';
  const dailyLabel = document.getElementById('dailyStreakLabel');
  if (dailyLabel) dailyLabel.textContent = "today's best " + getDailyBest();
}
