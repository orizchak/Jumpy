// ================================================================
// LIVES & DEATH — unified penalties, revive
// ================================================================
function handleDeath(reason) {
  if (racing()) {
    // race/duel rules: endless lives — a fall costs TIME plus the unified points penalty
    playerFalls++;
    vibrate(25);
    if (score > 0) {
      const penalty = Math.min(score, LIFE_LOSS_PENALTY);
      score -= penalty;
      scorePenalty += penalty;
      scoreEl.textContent = score;
      addPopup('💔 -' + penalty + ' pts', W / 2, 110, '#ff6b6b');
    } else {
      addPopup('💨 back in!', W / 2, 110, '#ff6b6b');
    }
    revivePlayer();
    return;
  }
  playerFalls++;
  lives--;
  renderLives();
  // unified penalty: losing a life costs the same points no matter the cause
  if (score > 0) {
    const penalty = Math.min(score, LIFE_LOSS_PENALTY);
    score -= penalty;
    scorePenalty += penalty;
    addPopup('💔 -' + penalty + ' pts', W / 2, 110, '#ff6b6b');
    scoreEl.textContent = score;
  }
  if (lives > 0) {
    vibrate(25);
    revivePlayer();
  } else {
    vibrate([70, 40, 70]);
    deathReason = reason;
    running = false;
    showGameOver();
  }
}

function triggerMegaBoost(nation, count) {
  boostTimer = 450;     // safety cap
  boostDistLeft = 3000; // a mega boost carries you exactly 300m
  reviveGraceTimer = Math.max(reviveGraceTimer, 280); // immune to the storm during and just after
  ball.vy = -24; // rocket launch
  addConfetti(ball.x, ball.y, 40);
  addPopup('MEGA BOOST! (5x ' + nation.name + ')', ball.x, ball.y - 40, '#ffd54f');
  showReward('🚀 MEGA BOOST!', '#ffd54f', '255,213,79',
    nation.emoji, nation.emoji + ' × ' + count);
  playAirHorn(true);
  vibrate([25, 25, 25]);
  playCrowdRoar(1.5, 0.12);
}

function revivePlayer() {
  // Respawn on the platform nearest mid-screen, with a short grace period
  playWhistle(false);
  const visible = platforms.filter(p => p.y > 60 && p.y < H - 60);
  const target = visible.length
    ? visible.reduce((a,b) => Math.abs(a.y - H*0.45) < Math.abs(b.y - H*0.45) ? a : b)
    : platforms.reduce((a,b) => a.y > b.y ? a : b);
  ball.x = target.x + target.w / 2;
  ball.y = target.y - ball.r - 2;
  ball.vx = 0;
  ball.vy = BOUNCE_VELOCITY;
  stormY = Math.max(stormY, H + 200); // push the storm back down
  stormWarned = false;
  stormWarning.classList.remove('show');
  reviveGraceTimer = 90; // ~1.5s of storm immunity
  ballTrail = [];
  addConfetti(ball.x, ball.y, 12);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  return 'rgb(' +
    Math.round(lerp(c1[0], c2[0], t)) + ',' +
    Math.round(lerp(c1[1], c2[1], t)) + ',' +
    Math.round(lerp(c1[2], c2[2], t)) + ')';
}

