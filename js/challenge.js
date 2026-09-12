// ================================================================
// CHALLENGE LINKS — shareable seeded runs to beat a friend's score
// ================================================================
// A challenge link encodes the exact seed that generated a finished run's
// platforms/flags (?c=<seed>) plus the score to beat (?s=<score>). Opening
// one drops the player into a CHALLENGE run built from that identical seed
// (see applyDailySeedIfNeeded in daily.js), so sharing a score becomes a
// real head-to-head on the same course instead of a static screenshot.
function readChallengeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('c');
    if (!seed) return null;
    const targetScore = parseInt(params.get('s') || '0', 10) || 0;
    return { seed: seed.slice(0, 40), targetScore };
  } catch (e) { return null; }
}
const challenge = readChallengeFromUrl();

function buildChallengeUrl(seed, targetScore) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('c', seed);
  url.searchParams.set('s', String(targetScore));
  return url.toString();
}

// Injects the CHALLENGE mode chip into the (possibly just-reset) menu and,
// only the first time, auto-selects it — later visits to the menu respect
// whatever mode the player has since chosen instead of fighting them.
let challengeAutoSelected = false;
function renderChallengeChip() {
  if (!challenge) return;
  const modeSelect = document.getElementById('modeSelect');
  if (!modeSelect) return;
  const chip = document.createElement('button');
  chip.className = 'modeChip';
  chip.dataset.mode = 'challenge';
  chip.innerHTML = '🔗 CHALLENGE<span>beat ' + challenge.targetScore + '</span>';
  modeSelect.prepend(chip);
  if (!challengeAutoSelected) {
    challengeAutoSelected = true;
    gameMode = 'challenge';
  }
}
