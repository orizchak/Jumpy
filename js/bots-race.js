// --- Bot racers: three AI opponents climbing the same board against you ---
// ================================================================
// RIVAL BOTS — personas, presets, altitude-neutral accounting
// ================================================================
const BOT_CONFIG = [
  { name: 'Jumpinho',    emoji: '🇧🇷', color: '#2ecc71', steer: 4.5, errPx: 22, reactFrames: 17, blunder: 0.020 },
  { name: 'Sir Offside', emoji: '🇺🇸', color: '#4aa3ff', steer: 4.7, errPx: 15, reactFrames: 13, blunder: 0.014 },
  { name: 'El Nutmeg',   emoji: '🇲🇽', color: '#ff6b6b', steer: 4.2, errPx: 28, reactFrames: 22, blunder: 0.028 }
];
// Bot skill presets per race difficulty (multipliers over each bot's base config)
const DIFF_PRESETS = {
  hard:   { steer: 1.16, err: 0.55, react: 0.60, blunder: 0.45, ahead: 2.05, rubber: 1.25 }
};
let bots = [];
let recentScroll = 0; // decaying measure of how fast the camera is climbing

// --- Game modes: CLASSIC endless survival, or RACE first-to-target against the bots ---
let gameMode = 'classic';
let raceDifficulty = 'hard'; // rivals always race at full strength


let raceTarget = 1000; // climb score to win the race; increases each time you win
let raceWins = {};     // session-wide win tally per racer, shown after every race
let raceOver = false;
let raceFinishCount = 0; // how many rivals have crossed the line before you
// ⚔️ GOLDEN DUEL: 1v1 vs a rival — goal gates in the sky, first to 3 goals
// ================================================================
// GOLDEN DUEL — 1v1 state: gates, scores
// ================================================================
const DUEL_GOALS_TO_WIN = 3;
const DUEL_GATE_STEP = 250;   // meters between goal gates
let duelScoreYou = 0;
let duelScoreRival = 0;
let duelGateM = DUEL_GATE_STEP;
let raceCountdown = 0;       // frames of pre-race countdown remaining
let prevLeaderName = '';     // for overtake notifications
let leadChangeCooldown = 0;  // throttle for lead-change popups
let finalStretchShown = false;

// race-like modes share the rival/board/endless-lives machinery
function racing() { return gameMode === 'race' || gameMode === 'duel'; }

// The race is decided by DISTANCE (meters climbed), not points
// ================================================================
// RACE CORE — distance metrics, standings, ranks
// ================================================================
function playerRaceDistM() {
  return Math.floor((cameraY + Math.max(0, (H - 100) - ball.y)) / 10);
}

// Rubber-banding: trailing bots push harder, leaders ease off (scaled by difficulty)
function rubberBandFactor(b) {
  const strength = DIFF_PRESETS[raceDifficulty].rubber;
  if (!strength || !racing()) return 1;
  const gap = playerRaceDistM() - b.bestClimb; // meters; positive = bot is behind
  if (gap > 0) return 1 + Math.min(0.38, gap / 880) * strength;
  return 1 - Math.min(0.22, -gap / 1400) * strength;
}

function initBots() {
  raceFinishCount = 0;
  duelScoreYou = 0;
  duelScoreRival = 0;
  duelGateM = DUEL_GATE_STEP;
  if (!racing()) { bots = []; return; }
  const P = DIFF_PRESETS[raceDifficulty];
  const roster = gameMode === 'duel'
    ? [BOT_CONFIG[Math.floor(Math.random() * BOT_CONFIG.length)]]
    : BOT_CONFIG;
  bots = roster.map(function(cfg, i) {
    return {
      id: i, name: cfg.name, emoji: cfg.emoji, color: cfg.color,
      steer: cfg.steer * P.steer * (1 + (W - 400) / 400 * 0.5),
      errPx: cfg.errPx * P.err,
      reactFrames: Math.round(cfg.reactFrames * P.react),
      blunder: cfg.blunder * P.blunder,
      aheadRate: P.ahead * (cfg.steer / 4.4), // px/frame climb while out of view above
      x: 60 + i * (W - 120) / 2, y: H - 100, vx: 0, vy: BOUNCE_VELOCITY,
      targetX: W / 2, targetPlatform: null, reactT: 0, curErr: 0,
      grace: 40, spin: 0, falls: 0, stuckT: 0, lastBest: 0,
      ahead: false, virtualLead: 0, behind: false, behindAlt: 0, bestClimb: 0, altOffset: 0,
      flagCounts: {}, flagPoints: 0, penaltyT: 0,
      finished: false, finishTime: 0, eliminated: false, onScreen: true
    };
  });
}


function botGoBehind(b) {
  // the bot drops out of the bottom: it keeps racing BELOW the view at its own
  // pace and only re-enters when it genuinely catches back up. Altitude-continuous.
  b.behind = true;
  b.behindAlt = cameraY + (H - Math.min(b.y, H + 30)) - 100;
  b.targetPlatform = null;
}

function updateBots() {
  if (!racing() || !bots.length || raceOver) return;
  // your rocket is YOUR moment: rivals gain nothing while you boost
  const gainsFrozen = boostTimer > 0;
  for (const b of bots) {
    // --- penalty kick resolution (works in view and ahead) ---
    if (b.penaltyT > 0 && !gainsFrozen && !b.finished) {
      b.penaltyT--;
      if (b.penaltyT === 0) {
        if (Math.random() < 0.7 - b.blunder * 5) {
          addPopup('⚽ ' + b.name + ' GOOOAL! +900m 🚀', W / 2, 110, '#ffd54f');
          playCrowdRoar(0.9, 0.06);
          if (b.behind) b.behindAlt += 9000;  // rockets it back toward the pack
          else b.altOffset -= 9000;           // triple mega boost, same 900m prize as yours
        } else {
          addPopup('🧤 ' + b.name + ' — SAVED!', W / 2, 110, '#cfd8e3');
        }
      }
    }

    // --- behind-the-view mode: racing below the screen, catching up at its own pace ---
    if (b.behind) {
      if (!gainsFrozen && !b.finished) {
        b.behindAlt += b.aheadRate * rubberBandFactor(b);
        b.bestClimb = Math.max(b.bestClimb, Math.floor(Math.max(0, b.behindAlt - b.altOffset) / 10));
      }
      // caught up to the bottom of the view: physically re-enter on a low platform
      if (b.behindAlt >= cameraY - 90) {
        let spots = platforms.filter(function(p) { return p.y > H * 0.6 && p.y < H * 0.88; });
        const spot = spots.length
          ? spots[Math.floor(Math.random() * spots.length)]
          : platforms.reduce(function(a, c) { return a.y > c.y ? a : c; });
        b.behind = false;
        b.x = spot.x + spot.w / 2;
        b.y = spot.y - 13;
        b.vy = BOUNCE_VELOCITY;
        b.grace = 40;
        b.reactT = 0;
        b.altOffset += (cameraY + (H - b.y) - 100) - b.behindAlt; // altitude-neutral handover
      }
      continue;
    }

    // --- ahead-of-view mode: abstract climbing at aheadRate ---
    if (b.ahead) {
      if (!gainsFrozen && !b.finished) {
        b.virtualLead += b.aheadRate * rubberBandFactor(b);
        b.bestClimb = Math.max(b.bestClimb, Math.floor(Math.max(0, cameraY + (H + 14) + b.virtualLead - 100 - b.altOffset) / 10));
      }
      continue;
    }

    if (b.grace > 0) b.grace--;

    const effSteer = b.steer * Math.max(0.92, Math.min(1.14, rubberBandFactor(b)));

    // --- target selection: pick a reachable platform above, human-imperfect ---
    b.reactT--;
    if (b.reactT <= 0 || !b.targetPlatform || b.targetPlatform.y > b.y + 10) {
      b.reactT = b.reactFrames + Math.floor(Math.random() * 6);
      const stormNear = (stormY - b.y) < 240;
      const candidates = [];
      for (const p of platforms) {
        const dh = b.y - p.y;
        if (dh < 12 || dh > 185) continue;
        const center = p.x + p.w / 2;
        const dx = Math.abs(center - b.x);
        const t = 40 + dh * 0.35;
        if (dx > effSteer * (t + 16)) continue; // honest reachability
        candidates.push({ p: p, center: center, score: dh + p.w * 0.4 - dx * 0.2 });
      }
      if (candidates.length) {
        candidates.sort(function(a, c) { return c.score - a.score; });
        let pick = candidates[0];
        if (Math.random() < b.blunder && candidates.length > 1) {
          pick = candidates[Math.floor(Math.random() * candidates.length)]; // blunder: suboptimal choice
        }
        b.targetPlatform = pick.p;
        // aim error, clamped so the bot never targets past the platform's edge
        const maxErr = Math.max(4, pick.p.w / 2 - 4);
        b.curErr = Math.max(-maxErr, Math.min(maxErr, randRange(-b.errPx, b.errPx))) * (stormNear ? 0.5 : 1);
        b.targetX = pick.center + b.curErr;
      }
    }
    // track moving targets continuously
    if (b.targetPlatform && b.targetPlatform.moving) {
      b.targetX = b.targetPlatform.x + b.targetPlatform.w / 2 + b.curErr;
    }

    // --- steering + physics ---
    // smooth steering: ease toward full speed, settle softly onto the target
    let wantVx;
    if (b.x < b.targetX - 4) wantVx = effSteer;
    else if (b.x > b.targetX + 4) wantVx = -effSteer;
    else wantVx = (b.targetX - b.x) * 0.3;
    b.vx += (wantVx - b.vx) * 0.22;
    b.x += b.vx;
    b.x = Math.max(10, Math.min(W - 10, b.x));
    b.vy += GRAVITY;
    b.y += b.vy;

    // land on platforms (forgiving ±9 like the player)
    if (b.vy > 0) {
      for (const p of platforms) {
        if (
          b.x + 9 > p.x && b.x - 9 < p.x + p.w &&
          b.y + 11 > p.y && b.y + 11 < p.y + PLATFORM_H + 10
        ) {
          b.vy = BOUNCE_VELOCITY;
          b.reactT = 0; // reassess from the bounce
          break;
        }
      }
    }

    // --- ghost flags: bots collect too (flags remain for YOU) ---
    if (!gainsFrozen && !b.finished) {
      for (const f of flags) {
        if (f.collected) continue;
        if (!f.takenBy) f.takenBy = {};
        if (f.takenBy[b.id]) continue;
        if (Math.abs(f.x - b.x) < 26 && Math.abs(f.y - b.y) < 30) {
          f.takenBy[b.id] = true;
          b.flagPoints += 10;
          b.flagCounts[f.countryIdx] = (b.flagCounts[f.countryIdx] || 0) + 1;
          const c = b.flagCounts[f.countryIdx];
          if (c % 5 === 0 && (c % 10 !== 0 || gameMode === 'duel')) {
            // same 5-of-a-kind MEGA BOOST as yours: a real 300m
            b.altOffset -= 3000;
            b.vy = -20; // visual launch
            b.grace = Math.max(b.grace, 60);
            addPopup('🚀 ' + b.name + ' MEGA BOOST +300m!', W / 2, 110, b.color);
            playAirHorn(false);
          }
          if (c % 10 === 0 && b.penaltyT <= 0 && gameMode !== 'duel') {
            b.penaltyT = 85;
            addPopup('🥅 ' + b.name + ' steps up…', W / 2, 110, b.color);
            playWhistle(false);
          }
        }
      }
    }

    // --- dropping out of the bottom: keep racing BEHIND the view ---
    if (b.y > H + 30) {
      if (recentScroll <= 40) {
        // genuine misjump (not just the player racing away): a fall costs time
        b.falls++;
        addPopup('💨 ' + b.name, W / 2, 90, b.color);
      }
      botGoBehind(b);
      continue;
    }
    if (b.grace <= 0 && b.y + 11 > stormY) {
      b.falls++;
      addPopup('🌩 ' + b.name, W / 2, 90, b.color);
      botGoBehind(b);
      continue;
    }

    // --- climb metric (meters), with the boost scroll-debt deducted ---
    if (!gainsFrozen && !b.finished) {
      b.bestClimb = Math.max(b.bestClimb, Math.floor(Math.max(0, cameraY + (H - b.y) - 100 - b.altOffset) / 10));
    }

    // --- anti-stall: a bot making no progress finds its rhythm with one big hop ---
    // (escaping a static screen upward demands precision; sloppier bots can
    //  wander the band for ages — this guarantees everyone keeps racing)
    if (b.bestClimb > b.lastBest) {
      b.lastBest = b.bestClimb;
      b.stuckT = 0;
    } else if (!gainsFrozen && b.grace <= 0 && !b.finished) {
      b.stuckT++;
      if (b.stuckT > 300) { // ~5s without gaining a meter
        b.stuckT = 0;
        b.vy = -20;
        b.grace = Math.max(b.grace, 50);
      }
    }

    // --- passing above the view: switch to abstract ahead-mode (altitude-neutral) ---
    if (b.y < -28) {
      const oldRaw = cameraY + (H - b.y) - 100;
      b.ahead = true;
      b.virtualLead = -b.y;
      b.altOffset += (cameraY + (H + 14) + b.virtualLead - 100) - oldRaw;
    }
    b.spin += b.vx * 0.05;
  }
}

function playerClimbScore() {
  return Math.round((cameraY + (H - ball.y)) / 10);
}

function raceStandings() {
  // the race is decided by SCORE: height points + pickups (bots earn ghost-flag points)
  const entries = bots.map(function(b) {
    return { name: b.name, emoji: b.emoji, color: b.color, climb: b.bestClimb, you: false, falls: b.falls, out: false };
  });
  entries.push({ name: 'YOU', emoji: '⚽', color: '#ffe066', climb: playerRaceDistM(), you: true, falls: playerFalls, out: false });
  entries.sort(function(a, c) {
    if (c.climb !== a.climb) return c.climb - a.climb;
    return a.you ? -1 : (c.you ? 1 : 0); // ties (e.g. 0–0 at kickoff) favor the player
  });
  return entries;
}

let raceBoardT = 0;
let raceLeaderName = '';
let raceRanks = {};
function rankLabel(rank) {
  return rank === 1 ? '🏆' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : rank + 'th';
}
function updateRaceLeader() {
  if (!racing() || !bots.length) { raceLeaderName = ''; raceRanks = {}; return; }
  const st = raceStandings();
  raceLeaderName = st[0].name;
  raceRanks = {};
  st.forEach(function(e, i) { raceRanks[e.name] = i + 1; });
  if (leadChangeCooldown > 0) leadChangeCooldown--;
  // overtake notification when the lead changes hands
  if (prevLeaderName && raceLeaderName !== prevLeaderName && leadChangeCooldown <= 0 && !raceOver) {
    leadChangeCooldown = 150; // ~2.5s throttle
    if (raceLeaderName === 'YOU') {
      addPopup('🏆 YOU TAKE THE LEAD!', W / 2, H * 0.3, '#ffe066');
      playAirHorn(false);
    } else {
      const bot = bots.find(function(b) { return b.name === raceLeaderName; });
      addPopup(raceLeaderName + ' takes the lead', W / 2, H * 0.3, bot ? bot.color : '#fff');
      beep({ freq: 220, duration: 0.18, type: 'sawtooth', volume: 0.1, filterFreq: 900 });
    }
  }
  prevLeaderName = raceLeaderName;
}
function renderRaceBoard() {
  raceBoardT++;
  if (raceBoardT % 15 !== 0) return; // update ~4x per second
  const boardEl = document.getElementById('raceBoard');
  if (!racing()) { if (boardEl.innerHTML) boardEl.innerHTML = ''; return; }
  const entries = raceStandings();
  let html = '';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const status = e.falls > 0 ? ' ↓' + e.falls : '';
    const rank = i === 0 ? '🏆' : (i + 1) + '.';
    html += '<div class="raceRow' + (e.you ? ' you' : '') + '">' +
      rank + ' <span class="dot" style="background:' + e.color + '"></span>' +
      e.name + ' ' + e.climb + 'm' + status + '</div>';
  }
  document.getElementById('raceBoard').innerHTML = html;
}

// --- Reward indication effects: banner pop + brief screen flash ---
let flashTimer = 0;
let flashColor = '255,255,255';
const rewardBannerEl = document.getElementById('rewardBanner');
const rewardFlagEl = document.getElementById('rewardFlag');
const rewardTextEl = document.getElementById('rewardText');
const rewardReasonEl = document.getElementById('rewardReason');
let bannerBusyUntil = 0;
function showReward(text, cssColor, flashRgb, flagEmoji, reason) {
  const now = Date.now();
  const delay = Math.max(0, bannerBusyUntil - now);
  bannerBusyUntil = now + delay + 2200;
  setTimeout(function() {
    rewardTextEl.textContent = text;
    rewardTextEl.style.color = cssColor;
    rewardFlagEl.textContent = flagEmoji || '';
    rewardReasonEl.textContent = reason || '';
    rewardBannerEl.classList.remove('show');
    void rewardBannerEl.offsetWidth; // restart the CSS animation
    rewardBannerEl.classList.add('show');
    flashColor = flashRgb;
    flashTimer = 16;
  }, delay);
}

// --- HAT-TRICK reward: collect 3 items within 3 seconds -> escalating multiplier ---
// Chaining another hat-trick before the timer expires steps up a tier instead of
// resetting to 2x, so a sustained pickup streak keeps escalating in reward and juice.
const HAT_TRICK_WINDOW_MS = 3000;
const MULTIPLIER_DURATION = 600; // frames (~10s), refreshed on every tier-up
const COMBO_TIERS = [
  { mult: 2, label: 'HAT-TRICK! 2× SCORE',  sub: '⚽ × 3 in 3s' },
  { mult: 3, label: 'ON FIRE! 3× SCORE',    sub: 'keep the streak alive' },
  { mult: 4, label: 'UNSTOPPABLE! 4× SCORE', sub: 'nothing can stop you now' },
  { mult: 5, label: 'LEGENDARY! 5× SCORE',  sub: 'the crowd is chanting your name' }
];
let recentPickupTimes = [];
let scoreMultiplier = 1;
let multiplierTimer = 0;
let comboTier = 0; // 0 = no combo active; index+1 into COMBO_TIERS otherwise
const multTagEl = document.getElementById('multTag');

function registerPickup() {
  const now = Date.now();
  recentPickupTimes.push(now);
  recentPickupTimes = recentPickupTimes.filter(function(t) { return now - t <= HAT_TRICK_WINDOW_MS; });
  if (recentPickupTimes.length >= 3) {
    recentPickupTimes = [];
    comboTier = Math.min(comboTier + 1, COMBO_TIERS.length);
    const tier = COMBO_TIERS[comboTier - 1];
    scoreMultiplier = tier.mult;
    multiplierTimer = MULTIPLIER_DURATION;
    multTagEl.textContent = tier.mult + '×';
    multTagEl.classList.add('show');
    multTagEl.classList.remove('tierPop');
    void multTagEl.offsetWidth; // restart the pop animation on every tier-up
    multTagEl.classList.add('tierPop');
    showReward(tier.label, '#7ce8ff', '64,196,255', '⚽', tier.sub);
    addConfetti(ball.x, ball.y - 20, 20 + comboTier * 10);
    vibrate(comboTier >= 3 ? [20, 20, 20] : 20);
    playAirHorn(false);
    playCrowdRoar(1.0 + comboTier * 0.15, 0.09);
  }
}
const matchClockEl = document.getElementById('matchClock');
const distCounterEl = document.getElementById('distCounter');
let hudDistM = 0;
let lastMilestone = 0;
const livesDisplayEl = document.getElementById('livesDisplay');
const flagCounterEl = document.getElementById('flagCounter');
function renderLives() {
  if (racing()) {
    livesDisplayEl.innerHTML = '⚽ ∞';
    return;
  }
  // Slot count tracks the highest life total reached this run (not just the
  // current one), so losing a bonus life earned above the starting 3 fades a
  // ball out instead of just silently shrinking the row.
  let html = '';
  for (let i = 0; i < Math.max(peakLives, 3); i++) {
    html += i < lives ? '⚽' : '<span class="lostLife">⚽</span>';
  }
  livesDisplayEl.innerHTML = html;
}
function renderFlagCounter() {
  flagCounterEl.textContent = '🚩 ' + flagsCollectedCount;
  const breakdownEl = document.getElementById('flagBreakdown');
  // show only the top 6 nations (by count) to keep the play area clear
  const entries = [];
  for (let i = 0; i < FLAG_NATIONS.length; i++) {
    const count = flagCountsByCountry[i] || 0;
    if (count > 0) entries.push({ emoji: FLAG_NATIONS[i].emoji, count: count });
  }
  entries.sort(function(a, b) { return b.count - a.count; });
  let html = '';
  for (let i = 0; i < Math.min(6, entries.length); i++) {
    html += '<div class="flagRow">' + entries[i].emoji + ' ' + entries[i].count + '</div>';
  }
  if (entries.length > 6) {
    html += '<div class="flagRow" style="opacity:0.6">+' + (entries.length - 6) + ' more</div>';
  }
  breakdownEl.innerHTML = html;
}
function formatMatchTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// --- Rising storm: a chasing hazard that punishes stalling and ramps up the challenge ---
let stormY = 0;
let stormWarned = false;
let stormPulseT = 0;
const stormWarning = document.getElementById('stormWarning');
const shieldTag = document.getElementById('shieldTag');

