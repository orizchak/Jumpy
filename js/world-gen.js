function randRange(a,b){ return a + Math.random()*(b-a); }
function isFiniteNum(n){ return typeof n === 'number' && isFinite(n); }
function clamp01(n){ return Math.max(0, Math.min(1, n)); }

// Difficulty ramps up gradually with height climbed (0 = easiest, 1 = hardest)
// Progressive height scoring: each meter is worth more the higher you are —
// at 10,000px climbed a meter counts ~1.5x, rewarding deep runs
function heightPointsFromPx(px) {
  return Math.floor((px / 10) * (1 + px / 20000));
}
let scorePenalty = 0; // accumulated race fall penalties (keeps the height floor honest)

function difficultyAt(heightClimbed) {
  return clamp01(heightClimbed / 6500);
}

// A gentle second difficulty slope that keeps the very high altitudes
// challenging after the main ramp caps out at 6500
function lateDifficultyAt(heightClimbed) {
  return clamp01((heightClimbed - 6500) / 8000);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCandy(ctx, cx, cy, r, color, twist) {
  // wrapped candy: rounded body + two twisted wrapper ends
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(twist || 0);

  // wrapper ends (triangular twists)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r * 1.9, 0);
  ctx.lineTo(-r * 1.15, -r * 0.55);
  ctx.lineTo(-r * 1.15, r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 1.9, 0);
  ctx.lineTo(r * 1.15, -r * 0.55);
  ctx.lineTo(r * 1.15, r * 0.55);
  ctx.closePath();
  ctx.fill();

  // body
  roundRectPath(ctx, -r * 1.15, -r * 0.85, r * 2.3, r * 1.7, r * 0.75);
  ctx.fill();

  // diagonal candy stripes
  ctx.save();
  roundRectPath(ctx, -r * 1.15, -r * 0.85, r * 2.3, r * 1.7, r * 0.75);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = r * 0.35;
  for (let sx = -r * 2; sx < r * 2; sx += r * 0.8) {
    ctx.beginPath();
    ctx.moveTo(sx, -r);
    ctx.lineTo(sx + r, r);
    ctx.stroke();
  }
  ctx.restore();

  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.4, r * 0.18, -0.5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function initClouds() {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: randRange(0, W), y: randRange(0, H), w: randRange(50, 100), speed: randRange(0.15, 0.4) });
  }
}

function initHills() {
  hills = [];
  for (let i = 0; i < 20; i++) {
    hills.push({ y: i * 400, offset: randRange(0, W) });
  }
}

function initPlatforms() {
  platforms = [];
  flags = [];
  candies = [];
  gifts = [];
  platforms.push({ x: W/2 - PLATFORM_W/2, y: H - 50, w: PLATFORM_W, moving:false, dir:1, speed:0 });
  let y = H - 130;
  const startY = H - 130;
  while (y > -H) {
    const climbedSoFar = startY - y;
    spawnPlatform(y, difficultyAt(climbedSoFar), climbedSoFar);
    // wide pitch (tablet/desktop/16:9): extra same-row platforms keep reaches fair —
    // roughly one platform per 400px of width on every row
    let extras = (W - 400) / 380;
    while (extras > 0) {
      if (extras >= 1 || Math.random() < extras) {
        spawnPlatform(y - randRange(0, 18), difficultyAt(climbedSoFar), climbedSoFar);
      }
      extras -= 1;
    }
    y -= randRange(58, 98);
  }
}

function flagIndexForHeight(h) {
  return Math.min(FLAG_NATIONS.length - 1, Math.floor(Math.max(0, h) / HEIGHT_PER_FLAG));
}

// Flags spawn as a UNIFORM random pick among all nations unlocked so far (up to the
// current tier), so no single flag dominates a run. Climbing higher unlocks more
// prestigious nations into the pool; at the top, all 16 appear equally.
// The nation unlock ORDER is shuffled every game, so each run starts
// with a different pair of countries instead of always Canada & USA
let flagOrder = FLAG_NATIONS.map(function(_, i) { return i; });
function shuffleFlagOrder() {
  flagOrder = FLAG_NATIONS.map(function(_, i) { return i; });
  for (let i = flagOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = flagOrder[i]; flagOrder[i] = flagOrder[j]; flagOrder[j] = t;
  }
}

function randomUnlockedFlagIndex(h) {
  return flagOrder[Math.floor(Math.random() * (flagIndexForHeight(h) + 1))];
}

// ================================================================
// WORLD GENERATION — platforms, items, difficulty law
// ================================================================
// The ONE platform difficulty law — used by fresh spawns and the recycler alike
function platformStatsAt(diff, climbed) {
  const late = lateDifficultyAt(climbed);
  return {
    w: Math.max(38, PLATFORM_W - diff * 20 - late * 7),
    movingChance: 0.15 + diff * 0.32 + late * 0.15,
    speed: randRange(1 + diff * 1.0, 2 + diff * 1.8) + late * 1.0
  };
}

function spawnPlatform(y, diff, climbed) {
  diff = diff || 0;
  climbed = climbed || 0;
  const st = platformStatsAt(diff, climbed);
  const w = st.w;
  const x = randRange(10, W - w - 10);
  const moving = Math.random() < st.movingChance && y < H - 200;
  platforms.push({
    x, y, w,
    moving,
    dir: Math.random() < 0.5 ? 1 : -1,
    speed: st.speed
  });
  const roll = Math.random();
  if (roll < 0.56) {
    flags.push({
      x: x + w/2, y: y - 32, collected: false, bob: Math.random()*Math.PI*2,
      countryIdx: randomUnlockedFlagIndex(climbed)
    });
  } else if (roll < 0.70) {
    candies.push({
      x: x + w/2, y: y - 32, collected: false, bob: Math.random()*Math.PI*2,
      color: CANDY_COLORS[Math.floor(Math.random()*CANDY_COLORS.length)],
      twist: randRange(-0.3, 0.3)
    });
  } else if (roll < 0.75) {
    gifts.push({ x: x + w/2, y: y - 32, collected: false, bob: Math.random()*Math.PI*2 });
  }
}

function resetGame() {
  applyDailySeedIfNeeded();
  loadActiveGhost();
  startGhostRecording();
  totalRuns++;
  shieldUsedThisRun = false;
  saveStats();
  ball.x = W/2; ball.y = H - 100; ball.vx = 0; ball.vy = BOUNCE_VELOCITY; ball.facing = 1;
  cameraY = 0;
  score = 0;
  wasMoving = false;
  deathReason = 'fall';
  celebratedNewBest = false;
  bestAtRunStart = best;
  celebratedChampion = false;
  trophyTimer = 0;
  paused = false;
  raceOver = false;
  scorePenalty = 0;
  playerFalls = 0;
  hudDistM = 0;
  lastMilestone = 0;
  distCounterEl.textContent = '📏 0m';
  shuffleFlagOrder();
  goalPendingCount = 0;
  goalGame = { active: false };
  boostsQueued = 0;
  boostDistLeft = 0;
  simLast = 0; // fresh clock for the loop
  raceCountdown = racing() ? 230 : 0; // goal message, then 3…2…1…GO!
  document.getElementById('raceGoal').style.display = (racing() || gameMode === 'daily' || gameMode === 'challenge') ? 'block' : 'none';
  document.getElementById('raceGoal').textContent = gameMode === 'duel'
    ? '⚔️ FIRST TO ' + DUEL_GOALS_TO_WIN + ' GOALS'
    : gameMode === 'daily'
    ? '📅 DAILY — today\'s best ' + getDailyBest()
    : gameMode === 'challenge'
    ? '🔗 CHALLENGE — beat ' + challenge.targetScore
    : '🎯 FIRST TO ' + raceTarget + 'm';
  prevLeaderName = '';
  leadChangeCooldown = 0;
  finalStretchShown = false;
  document.getElementById('countdown').classList.remove('pop');
  pauseOverlayEl.classList.remove('show');
  matchStartTime = Date.now();
  lives = 3;
  peakLives = 3;
  flagsCollectedCount = 0;
  flagCountsByCountry = {};
  reviveGraceTimer = 0;
  renderedLivesKey = null; // force the reset above to actually repaint, even if it matches the last run's final state
  renderLives();
  renderFlagCounter();
  matchClockEl.textContent = '0:00';
  stormY = H + 260;
  stormWarned = false;
  stormWarning.classList.remove('show');
  shieldActive = false;
  shieldTimer = 0;
  shieldTag.classList.remove('show');
  scoreEl.textContent = score;
  bestEl.textContent = best;
  particles = [];
  confetti = [];
  ballTrail = [];
  boostTimer = 0;
  flashTimer = 0;
  recentPickupTimes = [];
  scoreMultiplier = 1;
  multiplierTimer = 0;
  comboTier = 0;
  multTagEl.classList.remove('show');
  rewardBannerEl.classList.remove('show');
  popups = [];
  initPlatforms();
  initClouds();
  initHills();
  initCrowd();
  initBirds();
  initBots();
  document.getElementById('raceBoard').innerHTML = '';
  raceBoardT = 0;
  initSkyStars();
  running = true;
}

function addPopup(text, x, y, color) {
  popups.push({ text, x, y, life: 105, color: color || '#ffcc33' });
}

function addSparkle(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = randRange(1.5, 4);
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 28,
      color: Math.random() < 0.5 ? '#ffe066' : '#ffffff'
    });
  }
}

function addConfetti(x, y, count) {
  for (let i = 0; i < (count || 26); i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = randRange(2, 7);
    confetti.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 2,
      rot: Math.random() * Math.PI * 2,
      vrot: randRange(-0.35, 0.35),
      w: randRange(4, 7),
      h: randRange(6, 10),
      life: 70,
      maxLife: 70,
      color: WC_COLORS[Math.floor(Math.random() * WC_COLORS.length)]
    });
  }
}

