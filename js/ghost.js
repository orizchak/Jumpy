// ================================================================
// GHOST REPLAY — a translucent trace of your own best run on this course
// ================================================================
// Only meaningful when the current run's platform layout is GUARANTEED
// identical to a past one: DAILY (same seed for everyone, every calendar
// day) and CHALLENGE (seed pinned to the shared link). CLASSIC re-randomizes
// its seed every run (see daily.js), so there's nothing consistent to trace.
const GHOST_RECORD_INTERVAL = 3; // sim frames between samples (~20/sec at 60fps)

function ghostStorageKey() {
  if (gameMode === 'daily') return 'jumpyGhost_daily_' + todayKey();
  if (gameMode === 'challenge') return 'jumpyGhost_challenge_' + challenge.seed;
  return null;
}

let ghostRecording = null; // { xs: [...], cs: [...] } being built this run
let activeGhost = null;    // the saved best-run recording being raced against
let ghostFrame = 0;        // sim frames elapsed this run — drives both record & playback

function loadActiveGhost() {
  activeGhost = null;
  const key = ghostStorageKey();
  if (!key) return;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (raw && raw.xs && raw.xs.length) activeGhost = raw;
  } catch (e) { /* corrupt entry — race without a ghost this run */ }
}

function startGhostRecording() {
  ghostRecording = ghostStorageKey() ? { xs: [], cs: [] } : null;
  ghostFrame = 0;
}

// Called once per update() tick with the ball's absolute climbed height in
// px (cameraY + on-screen offset — the same metric heightPointsFromPx uses),
// so the recorded track stays valid across camera scroll resets.
function tickGhost(climbPx) {
  ghostFrame++;
  if (!ghostRecording || ghostFrame % GHOST_RECORD_INTERVAL !== 0) return;
  ghostRecording.xs.push(Math.round(ball.x));
  ghostRecording.cs.push(Math.round(climbPx));
}

// Only overwrites the saved ghost if this run's score beats it — keeps the
// ghost as a rolling "best so far" instead of just "most recent attempt".
function saveGhostIfBest(finalScore) {
  const key = ghostStorageKey();
  if (!key || !ghostRecording || !ghostRecording.xs.length) return;
  try {
    const scoreKey = key + '_score';
    const prevBest = parseInt(localStorage.getItem(scoreKey) || '0', 10) || 0;
    if (finalScore <= prevBest) return;
    localStorage.setItem(key, JSON.stringify(ghostRecording));
    localStorage.setItem(scoreKey, String(finalScore));
  } catch (e) { /* storage full or blocked — ghost just won't persist */ }
}

// Ghost's screen position under the CURRENT camera, or null when it has
// nothing to show (finished already, hasn't started, or scrolled off-screen).
function ghostScreenPos() {
  if (!activeGhost) return null;
  const idx = Math.floor(ghostFrame / GHOST_RECORD_INTERVAL);
  if (idx >= activeGhost.xs.length) return null;
  const y = (H - 100) - (activeGhost.cs[idx] - cameraY);
  if (y < -60 || y > H + 60) return null;
  return { x: activeGhost.xs[idx], y: y };
}
