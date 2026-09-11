function draw() {
  const diff = difficultyAt(cameraY);
  drawBackground(diff);
  for (const p of platforms) drawPlatform(p);
  for (const f of flags) drawFlagItem(f);
  for (const c of candies) drawCandyItem(c);
  for (const g of gifts) drawGiftItem(g);
  drawParticles();
  drawDistanceLines();
  drawStorm();
  drawBarrier();
  drawBots();
  drawPlayerRaceTag();
  drawRaceProgress();
  drawBallTrail();
  drawBall();
  drawTrophy();
  drawConfetti();
  drawPopups();
  drawVignette();
  if (goalGame.active) drawGoalGame();
  if (flashTimer > 0) {
    ctx.fillStyle = 'rgba(' + flashColor + ',' + (flashTimer / 16 * 0.26).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function showRealError(err) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:white;padding:10px;font-family:monospace;font-size:12px;z-index:99999;white-space:pre-wrap;max-height:50%;overflow:auto;';
  box.textContent = 'Error: ' + (err && err.stack ? err.stack : err);
  document.body.appendChild(box);
  running = false;
}

// ================================================================
// MAIN LOOP — fixed-timestep simulation, render pass
// ================================================================
// All game constants (GRAVITY, MOVE_SPEED, BOUNCE_VELOCITY, storm speed, ...)
// are tuned per PHYSICS STEP, not per display frame. So physics must always
// advance at a fixed 60 steps/second no matter the screen's refresh rate —
// an accumulator banks real elapsed time and drains it in fixed SIM_STEP
// chunks. Without this, the game would visibly run faster on 90/120/144Hz
// displays (2x speed on a 120Hz screen) since requestAnimationFrame fires
// once per display refresh, not once per 60Hz tick.
const SIM_STEP = 1000 / 60;
let simLast = 0;
let simAccumulator = 0;

function loop(ts) {
  if (!running) return;
  if (paused) {
    simLast = 0; // don't count paused time
    simAccumulator = 0;
    rafId = requestAnimationFrame(loop);
    return;
  }
  if (!ts) ts = performance.now();
  const dt = simLast ? Math.min(250, ts - simLast) : SIM_STEP;
  simLast = ts;
  simAccumulator += dt;
  try {
    // drain banked time in fixed 60Hz steps; cap so a stalled tab can't
    // spiral into a huge catch-up burst once it regains focus
    let steps = 0;
    while (simAccumulator >= SIM_STEP && steps < 5) {
      update();
      simAccumulator -= SIM_STEP;
      steps++;
      if (!running || paused) break;
    }
    if (!running) return;
    draw();
    renderRaceBoard();
    matchClockEl.textContent = formatMatchTime(Date.now() - matchStartTime);
    hudDistM = Math.max(hudDistM, Math.floor((cameraY + Math.max(0, (H - 100) - ball.y)) / 10));
    distCounterEl.textContent = '📏 ' + hudDistM + 'm';
    if (gameMode === 'duel' && bots[0]) {
      document.getElementById('raceGoal').textContent = '⚔️ YOU ' + duelScoreYou + ' — ' + duelScoreRival + ' ' + bots[0].name;
    }
    // crossing a 500m barrier: celebrate!
    const mile = Math.floor(hudDistM / 500);
    if (mile > lastMilestone) {
      lastMilestone = mile;
      addConfetti(ball.x, ball.y - 30, 45);
      // near a race finish the FINAL STRETCH moment owns the screen
      const nearFinish = gameMode === 'race' && hudDistM > raceTarget - 170;
      if (!nearFinish) {
        showReward('⛳ ' + (mile * 500) + 'm!', '#7ce8ff', '124,232,255', '⛳', 'barrier crossed — keep climbing!');
        playCrowdRoar(0.8, 0.07);
      }
    }
  } catch (err) {
    showRealError(err);
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function startGame() {
  document.getElementById('muteBtn').classList.remove('show');
  try {
    ensureAudio();
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    overlay.classList.add('hidden');
    resetGame();
    playWhistle(false);
    loop();
  } catch (err) {
    showRealError(err);
  }
}

