// ================================================================
// COSMETICS — unlockable ball skins tied to career milestones
// ================================================================
const SKINS = [
  { id: 'classic',  name: 'Trionda',         emoji: '⚽',
    panelColors: ['#d5281b', '#0a7a3d', '#1f4e9c'], base: ['#ffffff', '#f4f4f4', '#dcdcdc'], trail: '#ffffff',
    unlock: function() { return true; }, hint: function() { return 'Unlocked from the start'; } },
  { id: 'gold',     name: 'Golden Champion', emoji: '🏆',
    panelColors: ['#caa000', '#8a6d00', '#e8c34a'], base: ['#fff7d6', '#ffe9a8', '#e6c866'], trail: '#ffd54f',
    unlock: function() { return totalDistanceClimbed >= 5000; },
    hint: function() { return 'Climb 5,000m lifetime (' + Math.min(totalDistanceClimbed, 5000) + '/5,000m)'; } },
  { id: 'neon',     name: 'Neon Rush',       emoji: '💠',
    panelColors: ['#ff2fb0', '#00e5ff', '#7c4dff'], base: ['#ffffff', '#eafcff', '#d8f6ff'], trail: '#40c4ff',
    unlock: function() { return totalFlagsCollected >= 100; },
    hint: function() { return 'Collect 100 flags lifetime (' + Math.min(totalFlagsCollected, 100) + '/100)'; } },
  { id: 'midnight', name: 'Midnight Star',   emoji: '🌙',
    panelColors: ['#1a1a2e', '#16213e', '#0f3460'], base: ['#dfe6ff', '#b8c2e8', '#8f9bd1'], trail: '#7c4dff',
    unlock: function() { return (totalDuelWins + totalRaceWins) >= 10; },
    hint: function() { return 'Win 10 races or duels (' + Math.min(totalDuelWins + totalRaceWins, 10) + '/10)'; } }
];

let currentSkinId = 'classic';
function loadSkin() {
  try { currentSkinId = localStorage.getItem('jumpySkin') || 'classic'; } catch (e) { currentSkinId = 'classic'; }
  const s = SKINS.find(function(x) { return x.id === currentSkinId; });
  if (!s || !s.unlock()) currentSkinId = 'classic';
}
function currentSkin() {
  return SKINS.find(function(x) { return x.id === currentSkinId; }) || SKINS[0];
}
function selectSkin(id) {
  const s = SKINS.find(function(x) { return x.id === id; });
  if (!s || !s.unlock()) return;
  currentSkinId = id;
  try { localStorage.setItem('jumpySkin', id); } catch (e) {}
  renderSkinPicker();
}
function renderSkinPicker() {
  const el = document.getElementById('skinSelect');
  if (!el) return;
  el.innerHTML = SKINS.map(function(s) {
    const unlocked = s.unlock();
    const cls = 'skinChip' + (s.id === currentSkinId ? ' selected' : '') + (unlocked ? '' : ' locked');
    // Locked chips stay clickable (no [disabled]) so tapping one can explain how to unlock it.
    return '<button class="' + cls + '" data-skin="' + s.id + '">' +
      s.emoji + '<span>' + (unlocked ? s.name : '🔒 ' + s.name) + '</span></button>';
  }).join('');
  const hintEl = document.getElementById('skinHint');
  if (hintEl) { hintEl.textContent = ''; hintEl.classList.remove('show'); }
  el.querySelectorAll('.skinChip').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const skin = SKINS.find(function(x) { return x.id === btn.dataset.skin; });
      if (!skin) return;
      if (skin.unlock()) { selectSkin(skin.id); return; }
      if (hintEl) {
        hintEl.textContent = '🔒 ' + skin.name + ' — ' + skin.hint();
        hintEl.classList.remove('show');
        void hintEl.offsetWidth; // restart the fade-in animation on repeated taps
        hintEl.classList.add('show');
      }
    });
  });
}
loadSkin();
