// ============ GOLDEN GOAL: sky-stadium penalty kick bonus stage ============
// ================================================================
// GOLDEN GOAL — penalty mini-game (player & rival shots)
// ================================================================
function startGoalGame(shooter) {
  goalGame = {
    active: true, phase: 'aim', t: 0,
    shooter: shooter || 'you',
    lockT: shooter === 'rival' ? 90 : 120, // build-up: taps can't kick yet
    autoKickAt: 50 + Math.random() * 130,  // rival picks his own moment
    aimX: 0, keeperX: 0, kickAim: 0, shotT: 0,
    result: '', resT: 0, netRipple: 0
  };
  goalPausedAt = Date.now();
  keys.left = false; keys.right = false;
  playWhistle(true);
  playCrowdRoar(0.9, 0.07);
}

function kickGoalBall(auto) {
  if (!goalGame.active || goalGame.phase !== 'aim' || goalGame.lockT > 0) return;
  if (goalGame.shooter === 'rival' && !auto) return; // you can only watch the rival's shot
  goalGame.kickAim = goalGame.aimX;
  goalGame.keeperAtKick = goalGame.keeperX;
  goalGame.phase = 'shot';
  goalGame.shotT = 0;
  beep({ freq: 130, duration: 0.12, type: 'triangle', volume: 0.2 }); // kick thump
}

function finishGoalGame() {
  goalGame.active = false;
  matchStartTime += Date.now() - goalPausedAt; // bonus stage doesn't eat the clock
  if (gameMode === 'duel') {
    const rival = bots[0];
    if (goalGame.shooter === 'rival') {
      if (goalGame.result === 'goal') {
        duelScoreRival++;
        showReward('😱 ' + rival.name + ' SCORES!', '#ff6b6b', '255,107,107', '🥅', 'YOU ' + duelScoreYou + ' — ' + duelScoreRival + ' ' + rival.name);
        if (duelScoreRival >= DUEL_GOALS_TO_WIN) {
          raceOver = true;
          running = false;
          showDuelResult(false, rival);
          return;
        }
      } else {
        showReward('🧤 WHAT A SAVE!', '#7ce8ff', '124,232,255', '🧤', rival.name + ' denied — race on!');
        playCrowdRoar(0.9, 0.06);
      }
      duelGateM += DUEL_GATE_STEP;
      return;
    }
    if (goalGame.result === 'goal') {
      duelScoreYou++;
      addConfetti(ball.x, ball.y, 50);
      showReward('⚽ GOOOAL!', '#ffd54f', '255,213,79', '🏆', 'YOU ' + duelScoreYou + ' — ' + duelScoreRival + ' ' + (rival ? rival.name : ''));
      playAirHorn(true);
      if (duelScoreYou >= DUEL_GOALS_TO_WIN) {
        raceOver = true;
        running = false;
        showDuelResult(true, rival);
        return;
      }
    } else {
      showReward('🧤 SAVED!', '#cfd8e3', '207,216,227', '😤', 'shake it off — next gate awaits');
    }
    return;
  }
  if (goalGame.result === 'goal') {
    boostsQueued = 2;             // two more launches queued...
    boostTimer = 450;             // ...and the first fires right now
    boostDistLeft = 3000;         // 3 boosts x 300m = 900m prize
    ball.vy = -24;
    reviveGraceTimer = Math.max(reviveGraceTimer, 280);
    addConfetti(ball.x, ball.y, 50);
    showReward('🚀 TRIPLE MEGA BOOST!', '#ffd54f', '255,213,79', '⚽', 'golden goal reward');
    playAirHorn(true);
  }
}

function updateGoalGame() {
  const g = goalGame;
  if (g.lockT > 0) { g.lockT--; }
  else g.t++;
  if (g.phase === 'aim') {
    g.aimX = Math.sin(g.t * 0.052);                 // sweeping aim
    g.keeperX = Math.sin(g.t * 0.033 + 1.7) * 0.55; // patrolling keeper
    if (g.shooter === 'rival' && g.t >= g.autoKickAt) kickGoalBall(true); // he strikes!
    if (g.t > 420) kickGoalBall(true);              // hesitate too long and it auto-fires
  } else if (g.phase === 'shot') {
    g.shotT++;
    // the keeper DIVES toward the shot — beat his reach from where he stood
    const willSave = Math.abs(g.kickAim - g.keeperAtKick) < 0.34 && Math.abs(g.kickAim) <= 0.94;
    const diveTarget = willSave ? g.kickAim : g.keeperAtKick + (g.kickAim - g.keeperAtKick) * 0.35;
    g.keeperX = g.keeperAtKick + (diveTarget - g.keeperAtKick) * Math.min(1, g.shotT / 26);
    if (g.shotT >= 30) {
      if (Math.abs(g.kickAim) > 0.94) {
        g.result = 'post';
        beep({ freq: 900, duration: 0.09, type: 'square', volume: 0.18 }); // clank
      } else if (willSave) {
        g.result = 'save';
        playCrowdRoar(0.7, 0.05);
      } else {
        g.result = 'goal';
        g.netRipple = 14;
        playCrowdRoar(g.shooter === 'rival' ? 1.0 : 1.6, g.shooter === 'rival' ? 0.06 : 0.14);
        if (g.shooter !== 'rival') playChampionFanfare();
      }
      g.phase = 'result';
      g.resT = 0;
    }
  } else if (g.phase === 'result') {
    g.resT++;
    if (g.netRipple > 0) g.netRipple--;
    if (g.resT >= 95) finishGoalGame();
  }
}

function drawGoalGame() {
  const g = goalGame;
  const cx = W / 2;
  const goalY = 150, goalHalf = 105, mouthY = goalY + 58;

  // night-match dim + stadium spotlight
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,26,0.6)';
  ctx.fillRect(0, 0, W, H);
  const spot = ctx.createRadialGradient(cx, goalY + 30, 20, cx, goalY + 30, 320);
  spot.addColorStop(0, 'rgba(255,250,220,0.20)');
  spot.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);

  // crowd: two arcs of flickering dots
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.15 + 0.7 * i / 25);
      const rr = 175 + row * 22;
      const x = cx + Math.cos(a) * rr;
      const y = goalY + 40 - Math.sin(a) * (rr * 0.55);
      if (y < 6) continue;
      ctx.fillStyle = 'rgba(255,235,180,' + (0.25 + 0.35 * Math.abs(Math.sin(g.t * 0.1 + i * 1.7 + row))) + ')';
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }

  // cloud the goal floats on
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [ox, or_] of [[-60, 26], [0, 34], [60, 26], [-30, 30], [30, 30]]) {
    ctx.beginPath();
    ctx.arc(cx + ox, goalY + 78, or_, 0, Math.PI * 2);
    ctx.fill();
  }

  // goal frame + net (net ripples on a goal)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - goalHalf, goalY + 62);
  ctx.lineTo(cx - goalHalf, goalY);
  ctx.lineTo(cx + goalHalf, goalY);
  ctx.lineTo(cx + goalHalf, goalY + 62);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  const rip = g.netRipple > 0 ? Math.sin(g.t * 0.9) * g.netRipple * 0.4 : 0;
  for (let i = 1; i < 8; i++) {
    const nx = cx - goalHalf + (goalHalf * 2 / 8) * i;
    ctx.beginPath();
    ctx.moveTo(nx, goalY + 2);
    ctx.quadraticCurveTo(nx + rip, goalY + 30, nx, goalY + 60);
    ctx.stroke();
  }
  for (let j = 1; j < 5; j++) {
    const ny = goalY + (62 / 5) * j;
    ctx.beginPath();
    ctx.moveTo(cx - goalHalf + 3, ny);
    ctx.quadraticCurveTo(cx, ny + rip, cx + goalHalf - 3, ny);
    ctx.stroke();
  }

  // keeper: jersey, head, gloves — dives toward the ball on a save
  let kx = cx + g.keeperX * (goalHalf - 22);
  let kLean = 0;
  if (g.phase === 'result' && g.result === 'save') {
    kx = cx + g.kickAim * (goalHalf - 22);
    kLean = g.kickAim * 0.5;
  }
  ctx.save();
  ctx.translate(kx, goalY + 42);
  ctx.rotate(kLean);
  ctx.fillStyle = '#ff8c42';
  roundRectPath(ctx, -9, -10, 18, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#ffd9b0';
  ctx.beginPath(); ctx.arc(0, -16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eeeeee';
  ctx.beginPath(); ctx.arc(-13, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(13, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // the ball: waiting at the spot, or flying its arc to the target
  let bx = cx, by = H - 130, br = 14;
  if (g.phase === 'aim') {
    by += Math.sin(g.t * 0.15) * 3; // eager little hop
  } else {
    const p = Math.min(1, g.shotT / 30);
    const tx = cx + g.kickAim * (goalHalf - 12);
    bx = cx + (tx - cx) * p;
    by = (H - 130) + (mouthY - (H - 130)) * p - Math.sin(p * Math.PI) * 60;
    br = 14 - 6 * p; // shrinks with distance
    if (g.phase === 'result' && g.result === 'post') {
      bx = tx + (g.resT * 2.5) * (g.kickAim > 0 ? 1 : -1); // ricochet away
      by = mouthY + g.resT * 3;
      br = 8;
    }
    if (g.phase === 'result' && g.result === 'save') { bx = cx + g.kickAim * (goalHalf - 22); by = goalY + 46; br = 8; }
    if (g.phase === 'result' && g.result === 'goal') { bx = cx + g.kickAim * (goalHalf - 12); by = mouthY - 4; br = 8; }
  }
  ctx.save();
  ctx.translate(bx, by);
  if (g.shooter === 'rival' && bots[0]) {
    // the rival's ball: his color, his badge
    const rv = bots[0];
    ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f5f5'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = rv.color; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, br * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = rv.color; ctx.fill();
  } else {
    drawTriondaCharacter(br, 1, g.t * 0.12);
  }
  ctx.restore();
  if (g.shooter === 'rival' && bots[0] && g.phase === 'aim') {
    ctx.font = '800 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(bots[0].name, bx, by + br + 16);
    ctx.fillStyle = bots[0].color;
    ctx.fillText(bots[0].name, bx, by + br + 16);
  }

  // aim indicator: dashed sight-line + target ring
  if (g.phase === 'aim') {
    const tx = cx + g.aimX * (goalHalf - 12);
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(255,224,102,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by - 16);
    ctx.quadraticCurveTo((bx + tx) / 2, (by + mouthY) / 2 - 70, tx, mouthY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(tx, mouthY, 9 + Math.sin(g.t * 0.2) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // headline + prompt / verdict
  ctx.textAlign = 'center';
  ctx.font = '800 13px sans-serif';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText(g.shooter === 'rival' ? '🥅 RIVAL SHOT' : '🥅 GOLDEN GOAL', cx, 92);
  ctx.font = '700 10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(g.shooter === 'rival' ? (bots[0] ? bots[0].name : 'rival') + ' shoots — pray your keeper saves!'
    : gameMode === 'duel' ? 'beat the keeper — SCORE FOR THE DUEL!' : 'beat the keeper — win 3 MEGA BOOSTS', cx, 108);
  if (g.phase === 'aim') {
    ctx.font = '800 17px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * Math.abs(Math.sin(g.t * 0.09))) + ')';
    if (goalGame.shooter === 'rival') {
      ctx.fillText(goalGame.lockT > 0 ? (bots[0] ? bots[0].name.toUpperCase() : 'RIVAL') + ' STEPS UP…' : 'HE SHOOTS…', cx, H - 70);
    } else if (goalGame.lockT > 0) {
      // player's shot: GET READY + big pulsing digits
      ctx.fillText('GET READY…', cx, H - 70);
      // big 3-2-1 in the middle, pulsing as each second lands
      const n = Math.ceil(goalGame.lockT / 60);
      const frac = (goalGame.lockT % 60) / 60;
      const scale = 1 + frac * 0.55;
      ctx.save();
      ctx.translate(cx, H * 0.5);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.35 + frac * 0.65;
      ctx.font = '900 84px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(String(n), 0, 0);
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
    } else {
      ctx.fillText('TAP TO SHOOT!', cx, H - 70);
    }
  }
  if (g.phase === 'result') {
    const popIn = Math.min(1, g.resT / 8);
    ctx.save();
    ctx.translate(cx, H * 0.45);
    ctx.scale(0.6 + popIn * 0.4, 0.6 + popIn * 0.4);
    ctx.font = '900 40px sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const msg = g.result === 'goal' ? '⚽ GOOOOAL!' : g.result === 'save' ? '🧤 SAVED!' : 'OFF THE POST!';
    ctx.strokeText(msg, 0, 0);
    ctx.fillStyle = g.result === 'goal' ? '#ffd54f' : '#cfd8e3';
    ctx.fillText(msg, 0, 0);
    ctx.restore();
    if (g.result === 'goal' && g.resT === 2) addConfetti(cx, goalY + 40, 60);
  }
  ctx.restore();
}

