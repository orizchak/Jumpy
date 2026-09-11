// ================================================================
// RESULT SCREENS & MENUS — duel/race/classic endings
// ================================================================
function showDuelResult(youWon, rival) {
  goalGame.active = false;   // cancel any kick still pending behind the result
  goalPendingCount = 0;
  document.getElementById('muteBtn').classList.add('show');
  const rname = rival ? rival.name : 'Rival';
  raceWins[youWon ? 'YOU' : rname] = (raceWins[youWon ? 'YOU' : rname] || 0) + 1;
  const elapsedMs = Date.now() - matchStartTime;
  const winsRows = Object.keys(raceWins).sort(function(a, c) { return raceWins[c] - raceWins[a]; })
    .map(function(n, i) {
      return '<div class="wtRow' + (n === 'YOU' ? ' you' : '') + '"><span>' + (i + 1) + '. ' + n + '</span><span>' + raceWins[n] + '</span></div>';
    }).join('');
  overlay.innerHTML = `
    <h1 style="color:${youWon ? '#ffd54f' : '#ff8a8a'}">${youWon ? '🏆 DUEL CHAMPION!' : '💔 DUEL LOST'}</h1>
    <div style="font-size:34px;font-weight:900;letter-spacing:1px;margin:6px 0 2px;">
      YOU ${duelScoreYou} — ${duelScoreRival} ${rname}
    </div>
    <p style="opacity:0.85">${youWon ? rname + ' never stood a chance' : rname + ' takes the golden duel'}</p>
    <div class="winsTable"><div class="wtHead"><span>📊 MATCH</span><span></span></div>
      <div class="wtRow"><span>⏱ Time</span><span>${formatMatchTime(elapsedMs)}</span></div>
      <div class="wtRow"><span>📏 Distance</span><span>${Math.round(cameraY / 10)}m</span></div>
      <div class="wtRow"><span>⚽ Score</span><span>${score}</span></div>
    </div>
    <div class="winsTable"><div class="wtHead"><span>🏆 SESSION WINS</span><span></span></div>${winsRows}</div>
    <button id="playAgainBtn">⚔️ Rematch</button>
    <button id="menuBtn2" class="secondaryBtn">Menu</button>
  `;
  overlay.classList.remove('hidden');
  const btn = document.getElementById('playAgainBtn');
  btn.addEventListener('click', function() { startGame(); });
  document.getElementById('menuBtn2').addEventListener('click', function() { backToMenu(); });
  if (youWon) {
    playChampionFanfare();
    for (let i = 0; i < 4; i++) addConfetti(W * (0.2 + 0.2 * i), H * 0.3, 40);
  } else { playWhistle(true); }
}

function showRaceResult(playerWon, winnerName, reason) {
  document.getElementById('muteBtn').classList.add('show');
  raceWins[winnerName] = (raceWins[winnerName] || 0) + 1;
  playWhistle(true);
  stormWarning.classList.remove('show');
  const playerElapsedSec = (Date.now() - matchStartTime) / 1000;
  const playerFinished = playerRaceDistM() >= raceTarget;
  // rank by true finish ORDER (bot pace-clocks pause during your boosts, so raw
  // times aren't directly comparable to the wall clock); times shown per racer
  const resultEntries = bots.map(function(b) {
    return { name: b.name, color: b.color, you: false, pts: b.flagPoints,
             order: b.finished ? b.finishOrder : null,
             time: b.finished ? b.finishTime : null, climb: b.bestClimb };
  });
  resultEntries.push({ name: 'YOU', color: '#ffe066', you: true,
                       order: playerFinished ? raceFinishCount + 1 : null,
                       time: playerFinished ? playerElapsedSec : null, climb: playerRaceDistM() });
  resultEntries.sort(function(a, c) {
    if ((a.order !== null) !== (c.order !== null)) return a.order !== null ? -1 : 1; // finishers first
    if (a.order !== null) return a.order - c.order;  // true crossing order
    return c.climb - a.climb;                        // then furthest distance
  });
  const medals = ['🥇', '🥈', '🥉'];
  const rows = '<div class="winsTable">' +
    '<div class="wtHead"><span class="nameCol">🏁 STANDINGS</span>' +
      '<span class="valCol">⏱ TIME</span><span class="valCol">📏 DIST</span><span class="valCol">⚽ PTS</span></div>' +
    resultEntries.map(function(e, i) {
      const medal = medals[i] || (i + 1) + '.';
      const tCol = e.time !== null ? formatMatchTime(e.time * 1000) : '—';
      const dCol = e.climb + 'm';
      const sCol = e.you ? String(score) : String(e.pts || 0);
      return '<div class="wtRow' + (e.you ? ' you' : '') + '">' +
        '<span class="nameCol">' + medal + ' <span class="dot" style="background:' + e.color + '"></span> ' + e.name + '</span>' +
        '<span class="valCol">' + tCol + '</span>' +
        '<span class="valCol">' + dCol + '</span>' +
        '<span class="valCol">' + sCol + '</span></div>';
    }).join('') + '</div>';
  if (playerWon) {
    playChampionFanfare();
    addConfetti(ball.x, ball.y - 20, 70);
    raceTarget += 250; // each win raises the bar for the next race
  }
  const nextGoalLine = playerWon
    ? '<p style="opacity:1;font-weight:800;color:#7ce8ff;">🎯 Next race: first to ' + raceTarget + 'm</p>'
    : '';
  // session-wide championship tally, rendered as a small table
  const tallyColors = { 'YOU': '#ffe066' };
  BOT_CONFIG.forEach(function(c) { tallyColors[c.name] = c.color; });
  const tallyRows = ['YOU'].concat(BOT_CONFIG.map(function(c) { return c.name; }))
    .map(function(n) { return { n: n, w: raceWins[n] || 0 }; })
    .sort(function(a, b) { return b.w - a.w; })
    .map(function(e, i) {
      return '<div class="wtRow' + (e.n === 'YOU' ? ' you' : '') + '">' +
        '<span>' + (i + 1) + '. <span class="dot" style="background:' + tallyColors[e.n] + '"></span> ' + e.n + '</span>' +
        '<span>' + e.w + '</span></div>';
    }).join('');
  const tallyLine = '<div class="winsTable"><div class="wtHead"><span>🏆 SESSION WINS</span><span></span></div>' + tallyRows + '</div>';
  const elapsedMs = Date.now() - matchStartTime;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <h1>${playerWon ? '🏆 CHAMPION!' : 'RACE OVER'}</h1>
    <p style="opacity:1;font-weight:700;">${reason}</p>
    ${rows}
    ${tallyLine}
    ${nextGoalLine}

    <button id="playAgainBtn">Race Again</button>
    <button id="menuBtn">Menu</button>
  `;
  const btn = document.getElementById('playAgainBtn');
  btn.addEventListener('click', function() {
    btn.disabled = true;
    startGame();
  });
  document.getElementById('menuBtn').addEventListener('click', function() {
    try { backToMenu(); } catch (err) { showRealError(err); }
  });
}

function showGameOver() {
  document.getElementById('muteBtn').classList.add('show');
  playWhistle(true);
  stormWarning.classList.remove('show');
  overlay.classList.remove('hidden');
  const msg = deathReason === 'storm' ? 'Caught by the storm!' : 'You fell!';
  const elapsedMs = Date.now() - matchStartTime;
  const newTimeRecord = elapsedMs > bestTimeMs;
  if (newTimeRecord) bestTimeMs = elapsedMs;
  const elapsed = formatMatchTime(elapsedMs);
  const distM = Math.round(cameraY / 10);
  const newHeightRecord = distM > bestHeight;
  if (newHeightRecord) bestHeight = distM;
  const standings = raceStandings();
  const place = standings.findIndex(function(e) { return e.you; }) + 1;
  const placeLabel = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'][place - 1] || place + 'th';
  const placementLine = gameMode === 'race'
    ? '<p style="opacity:1;font-weight:800;font-size:16px;">Finished ' + placeLabel + ' of ' + standings.length + '</p>'
    : '';
  overlay.innerHTML = `
    <h1>FULL TIME</h1>
    <p style="opacity:1;font-weight:700;">${msg}</p>
    ${placementLine}
    <p>Score: <b>${score}</b> &nbsp;(best ${Math.max(best, score)})${score >= best && score > 0 ? ' 🏆' : ''}</p>
    <p>Distance: <b>${distM}m</b> &nbsp;(best ${bestHeight}m)${newHeightRecord ? ' 🏆' : ''}</p>
    <p>Time: <b>${elapsed}</b> &nbsp;(best ${formatMatchTime(bestTimeMs)})${newTimeRecord ? ' 🏆' : ''}</p>
    <p>🚩 ${flagsCollectedCount} flags collected</p>
    <button id="playAgainBtn">Play Again</button>
    <button id="menuBtn">Menu</button>
  `;
  const btn = document.getElementById('playAgainBtn');
  btn.addEventListener('click', function() {
    btn.disabled = true;
    startGame();
  });
  document.getElementById('menuBtn').addEventListener('click', function() {
    try { backToMenu(); } catch (err) { showRealError(err); }
  });
}

// The menu HTML is saved so end screens can return to it (mode selection included).
// innerHTML replacement destroys listeners, so wiring must be re-attachable.
const MENU_HTML = overlay.innerHTML;

function wireMenu() {
  const sBtn = document.getElementById('startBtn');
  sBtn.addEventListener('click', function() {
    try { sBtn.disabled = true; startGame(); } catch (err) { showRealError(err); }
  });
  const goalEl = document.getElementById('raceChipGoal');
  if (goalEl) goalEl.textContent = 'first to ' + raceTarget + 'm';
  document.querySelectorAll('.diffChip').forEach(function(chip) {
    chip.classList.toggle('selected', chip.dataset.diff === raceDifficulty);
    chip.addEventListener('click', function() {
      try {
        raceDifficulty = chip.dataset.diff;
        document.querySelectorAll('.diffChip').forEach(function(c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
      } catch (err) { showRealError(err); }
    });
  });
  const muteBtn = document.getElementById('muteBtn');
  function renderMute() { muteBtn.textContent = soundMuted ? '🔇' : '🔊'; }
  renderMute();
  muteBtn.classList.add('show'); // visible on the opening menu
  muteBtn.addEventListener('click', function() {
    soundMuted = !soundMuted;
    try { localStorage.setItem('jumpyMuted', soundMuted ? '1' : '0'); } catch (e) {}
    renderMute();
    if (!soundMuted) beep({ freq: 660, duration: 0.08, type: 'sine', volume: 0.15 });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== 'r' && e.key !== 'R') return;
    const ov = document.getElementById('overlay');
    if (ov.classList.contains('hidden')) return;
    const btn = document.getElementById('startBtn') || document.getElementById('playAgainBtn');
    if (btn) { e.preventDefault(); btn.click(); }
  });
  document.querySelectorAll('.modeChip').forEach(function(chip) {
    // reflect the current mode selection
    chip.classList.toggle('selected', chip.dataset.mode === gameMode);
    chip.addEventListener('click', function() {
      try {
        gameMode = chip.dataset.mode;
        document.querySelectorAll('.modeChip').forEach(function(c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
      } catch (err) { showRealError(err); }
    });
  });
}
wireMenu();

function backToMenu() {
  document.getElementById('muteBtn').classList.add('show');
  overlay.innerHTML = MENU_HTML;
  overlay.classList.remove('hidden');
  wireMenu();
}

document.getElementById('pauseBtn').addEventListener('click', function() {
  try { togglePause(); } catch (err) { showRealError(err); }
});
document.getElementById('resumeBtn').addEventListener('click', function() {
  try { if (paused) togglePause(); } catch (err) { showRealError(err); }
});
document.getElementById('pauseMenuBtn').addEventListener('click', function() {
  try {
    paused = false;
    running = false;
    pauseOverlayEl.classList.remove('show');
    stormWarning.classList.remove('show');
    backToMenu();
  } catch (err) { showRealError(err); }
});

document.addEventListener('keydown', function(e) {
  try {
    if (goalGame.active) {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); return; }
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') { kickGoalBall(); }
      return;
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); return; }
    if (paused) return; // ignore steering while paused
    if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; leftZone.classList.add('active'); }
    if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; rightZone.classList.add('active'); }
  } catch (err) { showRealError(err); }
});
document.addEventListener('keyup', function(e) {
  try {
    if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = false; leftZone.classList.remove('active'); }
    if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = false; rightZone.classList.remove('active'); }
  } catch (err) { showRealError(err); }
});

const leftZone = document.getElementById('leftZone');
const rightZone = document.getElementById('rightZone');

function spawnRipple(zone, x, y) {
  const r = document.createElement('span');
  r.className = 'ripple';
  r.style.left = x + 'px';
  r.style.top = y + 'px';
  zone.appendChild(r);
  setTimeout(function(){ r.remove(); }, 600);
}

function pressZone(zone, side, clientX, clientY) {
  if (goalGame.active) { kickGoalBall(); return; }
  zone.classList.add('active');
  if (side === 'left') { keys.left = true; keys.right = false; }
  else { keys.right = true; keys.left = false; }
  const rect = zone.getBoundingClientRect();
  spawnRipple(zone, clientX - rect.left, clientY - rect.top);
  ensureAudio();
}

function releaseZone(zone, side) {
  zone.classList.remove('active');
  if (side === 'left') keys.left = false;
  else keys.right = false;
}

[[leftZone, 'left'], [rightZone, 'right']].forEach(function(pair) {
  const zone = pair[0], side = pair[1];

  zone.addEventListener('touchstart', function(e) {
    try {
      e.preventDefault();
      const t = e.touches[0];
      pressZone(zone, side, t ? t.clientX : 0, t ? t.clientY : 0);
    } catch (err) { showRealError(err); }
  }, { passive: false });

  zone.addEventListener('touchend', function(e) {
    try { e.preventDefault(); releaseZone(zone, side); } catch (err) { showRealError(err); }
  }, { passive: false });

  zone.addEventListener('touchcancel', function(e) {
    try { releaseZone(zone, side); } catch (err) { showRealError(err); }
  });

  zone.addEventListener('mousedown', function(e) {
    try { pressZone(zone, side, e.clientX, e.clientY); } catch (err) { showRealError(err); }
  });
  zone.addEventListener('mouseup', function() {
    try { releaseZone(zone, side); } catch (err) { showRealError(err); }
  });
  zone.addEventListener('mouseleave', function() {
    try { releaseZone(zone, side); } catch (err) { showRealError(err); }
  });
});

// --- Staged boot: run each init step in its own animation frame so the loading
// screen paints and animates instantly, with the bar tracking real progress ---
(function bootSequence() {
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const steps = [
    initClouds,
    initCrowd,
    initBirds,
    initSkyStars,
    initHills,
    function warmCanvas() { drawBackground(0); }, // pre-render so Start is instant
  ];
  let i = 0;
  function runStep() {
    try {
      if (i < steps.length) {
        steps[i]();
        i++;
        loaderBar.style.width = Math.round((i / steps.length) * 100) + '%';
        requestAnimationFrame(runStep);
      } else {
        // brief beat at 100% so the bar visibly completes, then fade out
        setTimeout(function() {
          loader.classList.add('fadeOut');
          setTimeout(function() { loader.remove(); }, 450);
        }, 180);
      }
    } catch (err) {
      loader.remove(); // never let the loader block the game
      showRealError(err);
    }
  }
  requestAnimationFrame(runStep);
})();

