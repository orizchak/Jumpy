function update() {
  // GOLDEN GOAL bonus stage: the world holds its breath
  if (goalGame.active) { updateGoalGame(); return; }

  // Pre-race countdown: everything holds while 3…2…1…GO! plays
  if (raceCountdown > 0) {
    raceCountdown--;
    matchStartTime = Date.now(); // clock starts at GO
    const el = document.getElementById('countdown');
    const inGoalPhase = raceCountdown > 165;
    let label;
    if (inGoalPhase) {
      label = gameMode === 'duel'
        ? '⚔️ FIRST TO ' + DUEL_GOALS_TO_WIN + ' GOALS — beat ' + (bots[0] ? bots[0].name : 'your rival') + '!'
        : '🎯 FIRST TO ' + raceTarget + 'm';
    } else {
      const step = Math.ceil(raceCountdown / 55); // 3, 2, 1, then 0 = GO
      label = step >= 1 ? String(step) : 'GO!';
    }
    if (el.textContent !== label) {
      el.textContent = label;
      el.classList.toggle('goalMsg', inGoalPhase);
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      if (inGoalPhase) playWhistle(false);
      else if (label !== 'GO!') beep({ freq: 440, duration: 0.12, type: 'square', volume: 0.14 });
      else { beep({ freq: 880, duration: 0.4, type: 'square', volume: 0.16 }); playCrowdRoar(0.8, 0.08); }
    }
    if (raceCountdown <= 0) {
      setTimeout(function() { el.classList.remove('pop'); }, 900);
    }
    return;
  }

  const isMoving = keys.left || keys.right;
  if (isMoving && !wasMoving) playMoveSound(keys.left ? 'left' : 'right');
  wasMoving = isMoving;

  if (keys.left) ball.facing = -1;
  else if (keys.right) ball.facing = 1;
  const targetVx = keys.left ? -MOVE_SPEED : keys.right ? MOVE_SPEED : 0;
  ball.vx += (targetVx - ball.vx) * STEER_EASE;

  ball.x += ball.vx;
  if (ball.x < ball.r) ball.x = ball.r;
  if (ball.x > W - ball.r) ball.x = W - ball.r;

  if (boostTimer <= 0 && boostsQueued > 0) {
    boostsQueued--;
    boostTimer = 450;      // safety cap
    boostDistLeft = 3000;  // each boost carries you exactly 300m
    ball.vy = -24;
    reviveGraceTimer = Math.max(reviveGraceTimer, 280);
    addConfetti(ball.x, ball.y, 25);
    addPopup('MEGA BOOST! (' + (2 - boostsQueued + 1) + '/3)', ball.x, ball.y - 40, '#ffd54f');
    playAirHorn(true);
    vibrate([25, 25, 25]);
  }
  if (boostTimer > 0) {
    boostTimer--;
    ball.vy = Math.min(ball.vy, -14); // sustained rocket flight
    boostDistLeft -= Math.max(0, -ball.vy);
    // hand over to momentum early: the coast after cut-off covers the remainder,
    // so boost + coast together deliver the promised 100m
    if (boostDistLeft <= (ball.vy * ball.vy) / (2 * GRAVITY)) boostTimer = 0;
    if (boostTimer % 3 === 0) addSparkle(ball.x, ball.y + ball.r);
  } else {
    ball.vy += GRAVITY;
  }
  ball.y += ball.vy;

  // motion trail: keep the last few positions
  ballTrail.push({ x: ball.x, y: ball.y });
  if (ballTrail.length > 8) ballTrail.shift();

  for (const p of platforms) {
    if (p.moving) {
      p.x += p.dir * p.speed;
      if (p.x < 5 || p.x + p.w > W - 5) p.dir *= -1;
    }
  }

  recentScroll *= 0.95;
  updateRaceLeader();
  updateBots();

  // Storm creeps upward on its own; climbing fast pushes it back down (via the camera-shift below).
  // Stalling lets it catch up — adds real time pressure on top of "don't fall".
  const stormDiff = difficultyAt(cameraY);
  const stormSpeed = 0.25 + stormDiff * 1.1 + lateDifficultyAt(cameraY) * 0.5;
  stormY -= stormSpeed;

  const stormGap = stormY - ball.y;
  if (stormGap < 220 && stormGap > -40) {
    if (!stormWarned) { stormWarned = true; stormWarning.classList.add('show'); playStormAlertSound(); }
  } else if (stormGap >= 220 && stormWarned) {
    stormWarned = false;
    stormWarning.classList.remove('show');
  }

  if (ball.vy > 0) {
    for (const p of platforms) {
      if (
        ball.x + ball.r*0.6 > p.x &&
        ball.x - ball.r*0.6 < p.x + p.w &&
        ball.y + ball.r > p.y &&
        ball.y + ball.r < p.y + PLATFORM_H + 10
      ) {
        ball.vy = BOUNCE_VELOCITY;
        p.dip = 5; // squash animation on impact
        addSparkle(ball.x, ball.y + ball.r);
        playJumpSound();
        vibrate(6);
        break; // only ever bounce off one platform per frame
      }
    }
  }
  for (const p of platforms) {
    if (p.dip) p.dip *= 0.82;
  }

  for (const f of flags) {
    if (f.collected) continue;
    f.bob += 0.08;
    const dx = ball.x - f.x, dy = ball.y - (f.y + Math.sin(f.bob)*4);
    if (Math.sqrt(dx*dx + dy*dy) < ball.r + FLAG_R) {
      f.collected = true;
      const flagPts = 10 * scoreMultiplier;
      score += flagPts;
      flagsCollectedCount++;
      totalFlagsCollected++;
      renderFlagCounter();
      flagCountsByCountry[f.countryIdx] = (flagCountsByCountry[f.countryIdx] || 0) + 1;
      addSparkle(f.x, f.y);
      addPopup('+' + flagPts, f.x, f.y, '#ffe066');
      playStarSound();
      registerPickup();
      // Collecting 3 flags of the same country earns an extra life
      if (flagCountsByCountry[f.countryIdx] % 3 === 0 && lives < MAX_LIVES) {
        lives++;
        peakLives = Math.max(peakLives, lives);
        renderLives();
        const nation = FLAG_NATIONS[f.countryIdx] || FLAG_NATIONS[0];
        addConfetti(f.x, f.y, 20);
        addPopup('+1 LIFE! (3x ' + nation.name + ')', f.x, f.y - 22, '#69f0ae');
        showReward('+1 LIFE!', '#69f0ae', '105,240,174',
          nation.emoji, nation.emoji + ' × ' + flagCountsByCountry[f.countryIdx]);
        playAirHorn(false);
      }
      // Collecting 5 flags of the same country launches a MEGA BOOST
      if (flagCountsByCountry[f.countryIdx] % 5 === 0 && (flagCountsByCountry[f.countryIdx] % 10 !== 0 || gameMode === 'duel')) {
        const nation = FLAG_NATIONS[f.countryIdx] || FLAG_NATIONS[0];
        triggerMegaBoost(nation, flagCountsByCountry[f.countryIdx]);
      }
      // Collecting 10 flags of the same country earns a GOLDEN GOAL penalty kick!
      if (flagCountsByCountry[f.countryIdx] % 10 === 0 && gameMode !== 'duel') {
        const nation = FLAG_NATIONS[f.countryIdx] || FLAG_NATIONS[0];
        goalPendingCount = 1; // one attempt per golden goal — never stacks
        addConfetti(f.x, f.y, 25);
        showReward('🥅 GOLDEN GOAL EARNED!', '#ffd54f', '255,213,79',
          nation.emoji, nation.emoji + ' × ' + flagCountsByCountry[f.countryIdx]);
        playWhistle(true);
      }
    }
  }

  for (const c of candies) {
    if (c.collected) continue;
    c.bob += 0.08;
    const dx = ball.x - c.x, dy = ball.y - (c.y + Math.sin(c.bob)*4);
    if (Math.sqrt(dx*dx + dy*dy) < ball.r + CANDY_R) {
      c.collected = true;
      const candyPts = 15 * scoreMultiplier;
      score += candyPts;
      addSparkle(c.x, c.y);
      addConfetti(c.x, c.y, 10);
      addPopup('+' + candyPts, c.x, c.y, c.color);
      playCandySound();
      registerPickup();
    }
  }

  for (const g of gifts) {
    if (g.collected) continue;
    g.bob += 0.08;
    const dx = ball.x - g.x, dy = ball.y - (g.y + Math.sin(g.bob)*4);
    if (Math.sqrt(dx*dx + dy*dy) < ball.r + GIFT_R) {
      g.collected = true;
      shieldActive = true;
      shieldUsedThisRun = true;
      shieldTimer = SHIELD_DURATION;
      addSparkle(g.x, g.y);
      addConfetti(g.x, g.y, 16);
      addPopup('SHIELD!', g.x, g.y, '#40c4ff');
      playGiftSound();
      registerPickup();
    }
  }

  if (shieldActive) {
    shieldTimer--;
    shieldTag.classList.add('show');
    if (shieldTimer <= 0) {
      shieldActive = false;
      shieldTag.classList.remove('show');
      playShieldExpireSound();
    }
  } else {
    shieldTag.classList.remove('show');
  }

  if (trophyTimer > 0) trophyTimer--;

  // GOLDEN GOAL trigger: earned via 10 same flags, fired when safe (not mid-rocket)
  if (running && !paused && goalPendingCount > 0 && boostTimer <= 0 && boostsQueued <= 0) {
    goalPendingCount--;
    startGoalGame();
    return;
  }

  // ⚔️ DUEL: whoever reaches the goal gate first earns the shot; first to 3 goals wins
  if (gameMode === 'duel' && !raceOver && !goalGame.active) {
    const rival = bots[0];
    // gate contest: first to the gate takes the shot
    if (playerRaceDistM() >= duelGateM) {
      addPopup('🥅 YOU reach the gate!', W / 2, 110, '#ffd54f');
      duelGateM += DUEL_GATE_STEP;
      boostTimer = 0; boostDistLeft = 0; boostsQueued = 0; // the gate stops play NOW
      startGoalGame();
      return;
    } else if (rival && rival.bestClimb >= duelGateM) {
      // watch him take it — full penalty scene, real keeper physics
      addPopup('🥅 ' + rival.name + ' reaches the gate…', W / 2, 110, rival.color);
      startGoalGame('rival');
    }
  }

  // RACE mode: straight racing — first to the target distance wins
  if (gameMode === 'race' && !raceOver) {
    const playerScore = playerRaceDistM();
    // final stretch: someone is closing on the finish line
    if (!finalStretchShown) {
      const bestBot = bots.reduce(function(m, b) { return Math.max(m, b.bestClimb); }, 0);
      if (Math.max(playerScore, bestBot) >= raceTarget - 150) {
        finalStretchShown = true;
        showReward('🏁 FINAL STRETCH!', '#ffd54f', '255,213,79', '🏁', 'first to ' + raceTarget + 'm wins');
        playCrowdRoar(1.2, 0.1);
      }
    }
    // rivals crossing the line log their time and keep the race alive —
    // the race only ends when YOU finish, so every finisher's stats make the table
    for (const b of bots) {
      if (!b.finished && b.bestClimb >= raceTarget) {
        b.finished = true;
        b.finishTime = (Date.now() - matchStartTime) / 1000;
        raceFinishCount++;
        b.finishOrder = raceFinishCount;
        b.bestClimb = raceTarget;
        addPopup('🏁 ' + b.name + ' finishes! ' + formatMatchTime(b.finishTime * 1000), W / 2, 110, b.color);
        playWhistle(false);
      }
    }
    if (playerScore >= raceTarget) {
      raceOver = true;
      running = false;
      if (raceFinishCount === 0) {
        showRaceResult(true, 'YOU', 'You reached ' + raceTarget + 'm first!');
      } else {
        const first = bots.find(function(b) { return b.finishOrder === 1; });
        showRaceResult(false, first.name, first.name + ' reached ' + raceTarget + 'm first — you finished #' + (raceFinishCount + 1));
      }
      return;
    }
  }
  if (flashTimer > 0) flashTimer--;
  if (multiplierTimer > 0) {
    multiplierTimer--;
    if (multiplierTimer <= 0) {
      scoreMultiplier = 1;
      comboTier = 0;
      multTagEl.classList.remove('show');
      playShieldExpireSound();
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.1; pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const cf = confetti[i];
    cf.x += cf.vx; cf.y += cf.vy; cf.vy += 0.15; cf.rot += cf.vrot; cf.life--;
    if (cf.life <= 0) confetti.splice(i, 1);
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].y -= 0.6; popups[i].life--;
    if (popups[i].life <= 0) popups.splice(i, 1);
  }

  if (ball.y < H/2) {
    const dy = H/2 - ball.y;
    ball.y = H/2;
    cameraY += dy;
    stormY += dy;
    for (const p of platforms) p.y += dy;
    for (const f of flags) f.y += dy;
    for (const c of candies) c.y += dy;
    for (const g of gifts) g.y += dy;
    for (const pt of particles) pt.y += dy;
    for (const cf of confetti) cf.y += dy;
    for (const bt of ballTrail) bt.y += dy;
    for (const b of bots) {
      if (b.ahead) {
        // the camera catching up eats into the bot's off-screen lead
        b.virtualLead -= dy;
        if (b.virtualLead <= 0) {
          // altitude-neutral handover: absorb the overshoot so a big scroll
          // frame can never gift the bot free distance at the boundary
          const oldRaw = cameraY + (H + 14) + b.virtualLead - 100;
          b.ahead = false;
          b.virtualLead = 0;
          b.y = -13;
          b.vy = 2.5; // descend into view
          b.reactT = 0;
          b.targetPlatform = null;
          b.altOffset += (cameraY + (H - b.y) - 100) - oldRaw;
        }
      } else if (!b.behind) {
        b.y += dy;
      }
    }
    recentScroll += dy;
    for (const pu of popups) pu.y += dy;
    if (!celebratedNewBest && score > bestAtRunStart && bestAtRunStart > 0) {
      celebratedNewBest = true;
      addConfetti(ball.x, ball.y - 20, 40);
      addPopup('GOAL! NEW BEST', ball.x, ball.y - 40, '#ffe066');
      playGoalFanfare();
    }
    if (!celebratedChampion && Math.floor(cameraY / HEIGHT_PER_FLAG) >= FLAG_NATIONS.length - 1) {
      celebratedChampion = true;
      trophyTimer = 300; // ~5 seconds
      addConfetti(ball.x, ball.y - 20, 70);
      addPopup('WORLD CHAMPIONS!', ball.x, ball.y - 50, '#FEDD00');
      playChampionFanfare();
    }

    const diff = difficultyAt(cameraY);
    // Max jump height is ~197px (v²/2g with BOUNCE_VELOCITY and GRAVITY), so every
    // vertical gap must stay comfortably below that. Instead of dumping recycled
    // platforms into a fixed band (which clumps them and can leave unjumpable voids),
    // chain each one a bounded distance above the current highest platform.
    const MAX_SAFE_GAP = 160;
    for (const p of platforms) {
      if (p.y > H) {
        let topY = Infinity;
        for (const q of platforms) {
          if (q !== p && q.y < topY) topY = q.y;
        }
        const perRow = 1 + (W - 400) / 380; // target platforms per row for this width
        const sameRow = W >= 520 && topY !== Infinity && Math.random() < (perRow - 1) / perRow;
        const gap = sameRow ? randRange(0, 16)
          : randRange(62, Math.min(MAX_SAFE_GAP, 96 + diff * 48 + lateDifficultyAt(cameraY) * 14));
        p.y = (topY === Infinity) ? -gap : topY - gap;
        const st = platformStatsAt(diff, cameraY);
        p.w = st.w;
        p.x = randRange(10, W - p.w - 10);
        p.moving = Math.random() < st.movingChance;
        p.dir = Math.random() < 0.5 ? 1 : -1;
        p.speed = st.speed;
      }
    }
    for (const f of flags) {
      if (f.y > H) {
        // Always attach to a platform that's still ahead (above the view), never one behind the player
        const ahead = platforms.filter(p => p.y < 0);
        const near = ahead.length
          ? ahead[Math.floor(Math.random() * ahead.length)]
          : platforms.reduce((a,b) => a.y < b.y ? a : b);
        f.x = near.x + near.w/2;
        f.y = near.y - 32;
        f.collected = Math.random() < 0.12;
        f.takenBy = {};
        f.countryIdx = randomUnlockedFlagIndex(cameraY);
      }
    }
    for (const c of candies) {
      if (c.y > H) {
        const ahead = platforms.filter(p => p.y < 0);
        const near = ahead.length
          ? ahead[Math.floor(Math.random() * ahead.length)]
          : platforms.reduce((a,b) => a.y < b.y ? a : b);
        c.x = near.x + near.w/2;
        c.y = near.y - 32;
        c.collected = Math.random() < 0.5;
        c.color = CANDY_COLORS[Math.floor(Math.random()*CANDY_COLORS.length)];
      }
    }
    for (const g of gifts) {
      if (g.y > H) {
        const ahead = platforms.filter(p => p.y < 0);
        const near = ahead.length
          ? ahead[Math.floor(Math.random() * ahead.length)]
          : platforms.reduce((a,b) => a.y < b.y ? a : b);
        g.x = near.x + near.w/2;
        g.y = near.y - 32;
        g.collected = Math.random() < 0.85; // gifts stay rare
      }
    }
  }

  const barrierY = H - BARRIER_OFFSET;
  if (shieldActive && ball.vy > 0 && ball.y + ball.r >= barrierY) {
    ball.y = barrierY - ball.r;
    ball.vy = BOUNCE_VELOCITY * 0.85;
    addSparkle(ball.x, barrierY);
    playJumpSound();
    vibrate(6);
  }

  if (reviveGraceTimer > 0) reviveGraceTimer--;

  // height-based score floor, evaluated every frame (same baseline as the bots)
  const inScreenClimb = Math.max(0, (H - 100) - ball.y);
  tickGhost(cameraY + inScreenClimb);
  score = Math.max(score, heightPointsFromPx(cameraY + inScreenClimb) - scorePenalty);
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
  checkAchievements();
  // Re-synced every frame (like scoreEl above) rather than only from the
  // handful of call sites that change `lives` — belt-and-suspenders so the
  // HUD can never drift from the real life count no matter what touches it.
  renderLives();

  if (ball.y - ball.r > H + 40) {
    handleDeath('fall');
  } else if (reviveGraceTimer <= 0 && ball.y + ball.r > stormY) {
    handleDeath('storm');
  }
}

let playerFalls = 0;
const LIFE_LOSS_PENALTY = 50; // classic: every lost life costs this, fall or storm alike

