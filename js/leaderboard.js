// ================================================================
// GLOBAL LEADERBOARD — Firebase Firestore, anonymous read/create only
// (see js/firebase-config.js for setup, firestore.rules for the rules
// to paste into the Firebase console). Degrades silently to "coming
// soon" messaging when unconfigured or offline, never throws.
// ================================================================
const LEADERBOARD_NAME_KEY = 'jumpyPlayerName';
const LEADERBOARD_CONFIGURED = typeof FIREBASE_CONFIG !== 'undefined'
  && typeof firebase !== 'undefined'
  && !!FIREBASE_CONFIG.apiKey
  && FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0;

let lbDb = null;
if (LEADERBOARD_CONFIGURED) {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    lbDb = firebase.firestore();
  } catch (e) { lbDb = null; }
}

function leaderboardDayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return '' + d.getFullYear() + mm + dd;
}

function leaderboardCollectionFor(mode) {
  return mode === 'daily' ? 'scores_daily_' + leaderboardDayKey() : 'scores_classic';
}

// A top-10 read doesn't need to be second-fresh, and the modal can get opened
// and tab-switched several times a minute — caching keeps that snappy and
// keeps read volume off the Firestore free-tier quota. Kept in localStorage
// (not just memory) so it also survives a full page reload.
const LEADERBOARD_CACHE_TTL_MS = 60 * 1000;
const LEADERBOARD_CACHE_KEY = 'jumpyLbCache';
let lbCache = (function() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || '{}');
    return (raw && typeof raw === 'object') ? raw : {};
  } catch (e) { return {}; }
})();
function saveLbCache() {
  try { localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(lbCache)); } catch (e) { /* ignore */ }
}
function invalidateLbCache(mode) {
  delete lbCache[leaderboardCollectionFor(mode)];
  saveLbCache();
}

function loadSavedPlayerName() {
  try { return (localStorage.getItem(LEADERBOARD_NAME_KEY) || '').slice(0, 16); } catch (e) { return ''; }
}
function savePlayerName(name) {
  try { localStorage.setItem(LEADERBOARD_NAME_KEY, name); } catch (e) { /* ignore */ }
}

function sanitizeName(raw) {
  const cleaned = (raw || '').replace(/[<>]/g, '').trim().slice(0, 16);
  return cleaned || 'Player';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Resolves { ok: true } on success, or { ok: false, reason } where reason is
// 'not_configured' | 'invalid_score' | 'network' — callers use this to pick
// user-facing copy without needing to know Firestore's own error shapes.
async function submitScoreToLeaderboard(mode, name, score) {
  if (!lbDb) return { ok: false, reason: 'not_configured' };
  if (typeof score !== 'number' || !isFinite(score) || score <= 0 || score >= 200000) {
    return { ok: false, reason: 'invalid_score' };
  }
  const cleanName = sanitizeName(name);
  try {
    await lbDb.collection(leaderboardCollectionFor(mode)).add({
      name: cleanName,
      score: Math.round(score),
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    savePlayerName(cleanName);
    invalidateLbCache(mode); // so the next view reflects this submission right away
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}

// Returns an array of {name, score} (possibly empty), or null on fetch error
// so callers can tell "no scores yet" apart from "couldn't load".
async function fetchTopScores(mode, limit) {
  if (!lbDb) return null;
  const key = leaderboardCollectionFor(mode);
  const cached = lbCache[key];
  if (cached && (Date.now() - cached.ts) < LEADERBOARD_CACHE_TTL_MS) return cached.rows;
  try {
    const snap = await lbDb.collection(key)
      .orderBy('score', 'desc')
      .limit(limit || 10)
      .get();
    const rows = snap.docs.map(function(doc) { return doc.data(); });
    lbCache[key] = { rows: rows, ts: Date.now() };
    saveLbCache();
    return rows;
  } catch (e) {
    return cached ? cached.rows : null; // serve stale data over nothing if we have it
  }
}

// ---- Modal UI ----
const lbModal = document.getElementById('leaderboardModal');
const lbListEl = document.getElementById('lbList');
const lbTabsEl = document.getElementById('lbTabs');
let lbActiveTab = 'classic';

function renderLbTabs() {
  lbTabsEl.querySelectorAll('.lbTab').forEach(function(t) {
    t.classList.toggle('selected', t.dataset.tab === lbActiveTab);
  });
}

async function renderLbList() {
  const requestedTab = lbActiveTab;
  lbListEl.innerHTML = '<div class="lbStatus">Loading…</div>';
  if (!LEADERBOARD_CONFIGURED) {
    lbListEl.innerHTML = '<div class="lbStatus">Leaderboard coming soon!</div>';
    return;
  }
  const rows = await fetchTopScores(requestedTab, 10);
  if (requestedTab !== lbActiveTab) return; // user switched tabs while this was in flight
  if (rows === null) {
    lbListEl.innerHTML = '<div class="lbStatus">Couldn\'t load — check your connection.</div>';
    return;
  }
  if (rows.length === 0) {
    lbListEl.innerHTML = '<div class="lbStatus">No scores yet — be the first!</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  lbListEl.innerHTML = rows.map(function(r, i) {
    return '<div class="wtRow"><span class="nameCol">' + (medals[i] || (i + 1) + '.') + ' ' +
      escapeHtml(r.name || 'Player') + '</span><span class="valCol">' + (r.score || 0) + '</span></div>';
  }).join('');
}

function openLeaderboard(preferredTab) {
  lbActiveTab = preferredTab || 'classic';
  renderLbTabs();
  renderLbList();
  lbModal.classList.add('show');
}
function closeLeaderboard() { lbModal.classList.remove('show'); }

document.getElementById('lbCloseBtn').addEventListener('click', closeLeaderboard);
lbModal.addEventListener('click', function(e) { if (e.target === lbModal) closeLeaderboard(); });
lbTabsEl.querySelectorAll('.lbTab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    if (tab.dataset.tab === lbActiveTab) return;
    lbActiveTab = tab.dataset.tab;
    renderLbTabs();
    renderLbList();
  });
});

// Builds the "submit your score" row markup for a result screen — HTML only,
// call wireLeaderboardSubmit() after inserting it into the DOM to attach behavior.
function buildLeaderboardSubmitHtml(mode, score) {
  if (!LEADERBOARD_CONFIGURED || (mode !== 'classic' && mode !== 'daily') || !(score > 0)) return '';
  return '<div id="lbSubmitRow">' +
    '<input id="lbNameInput" maxlength="16" placeholder="Your name" value="' + escapeHtml(loadSavedPlayerName()) + '">' +
    '<button id="lbSubmitBtn" class="secondaryBtn" type="button">🏆 Submit Score</button>' +
    '</div>' +
    '<div id="lbSubmitStatus"></div>' +
    '<button id="viewLbBtn" class="secondaryBtn" type="button">🏆 View Leaderboard</button>';
}

function wireLeaderboardSubmit(mode, score) {
  const submitBtn = document.getElementById('lbSubmitBtn');
  const statusEl = document.getElementById('lbSubmitStatus');
  if (submitBtn) {
    submitBtn.addEventListener('click', async function() {
      submitBtn.disabled = true;
      statusEl.textContent = 'Submitting…';
      const nameVal = document.getElementById('lbNameInput').value;
      const res = await submitScoreToLeaderboard(mode, nameVal, score);
      if (res.ok) {
        statusEl.textContent = '✅ Submitted!';
        document.getElementById('lbSubmitRow').style.display = 'none';
      } else if (res.reason === 'not_configured') {
        statusEl.textContent = 'Leaderboard coming soon!';
        document.getElementById('lbSubmitRow').style.display = 'none';
      } else {
        statusEl.textContent = '⚠️ Couldn\'t submit — try again.';
        submitBtn.disabled = false;
      }
    });
  }
  const viewBtn = document.getElementById('viewLbBtn');
  if (viewBtn) viewBtn.addEventListener('click', function() { openLeaderboard(mode); });
}
