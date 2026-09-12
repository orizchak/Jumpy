// --- Sound engine (procedural, no audio files needed) ---
// ================================================================
// AUDIO — WebAudio synth: beeps, roars, whistles, fanfares
// ================================================================
let audioCtx = null;
let soundMuted = false;
try { soundMuted = localStorage.getItem('jumpyMuted') === '1'; } catch (e) {}

// Short buzz on jump/boost/death for touch devices; a no-op where unsupported.
function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}
function ensureAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function(){});
    }
  } catch (e) { /* audio unsupported, fail silently */ }
}

// Core tone generator with a gentle lowpass filter for a softer, less harsh timbre.
function beep(opts) {
  if (!audioCtx || soundMuted) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.filterFreq || 4000;
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, now + opts.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(opts.volume || 0.15, now + (opts.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + opts.duration + 0.02);
  } catch (e) { /* fail silently */ }
}

// Schedule a short melodic sequence of notes (frequencies in Hz) with a fixed gap.
function chime(freqs, opts) {
  opts = opts || {};
  freqs.forEach(function(f, i) {
    setTimeout(function() {
      beep({
        freq: f, freqEnd: opts.freqEnd ? f * opts.freqEnd : null,
        duration: opts.duration || 0.14, type: opts.type || 'sine',
        volume: opts.volume || 0.15, filterFreq: opts.filterFreq
      });
    }, i * (opts.gap || 55));
  });
}

function playJumpSound() {
  playKickThud();
}

// Realistic football "kick" sound: a short burst of lowpassed noise (the leather
// impact) layered over a quick low-frequency punch (the thump you feel)
function playKickThud() {
  if (soundMuted) return;
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    // noise burst for the leather contact
    const dur = 0.08;
    const bufferLen = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferLen, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferLen);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    src.start(now); src.stop(now + dur);
    // low thump underneath
    beep({ freq: 85, freqEnd: 45, duration: 0.1, type: 'sine', volume: 0.22, attack: 0.002 });
  } catch (e) { /* fail silently */ }
}

// Stadium air horn for the big moments
function playAirHorn(long) {
  const dur = long ? 0.7 : 0.35;
  beep({ freq: 233, freqEnd: 246, duration: dur, type: 'sawtooth', volume: 0.14, filterFreq: 1400, attack: 0.02 });
  beep({ freq: 466, freqEnd: 492, duration: dur, type: 'sawtooth', volume: 0.07, filterFreq: 2200, attack: 0.02 });
}
function playMoveSound(dir) {
  const base = dir === 'left' ? 210 : 240;
  beep({ freq: base, freqEnd: base * 0.75, duration: 0.045, type: 'triangle', volume: 0.055 });
}
function playStarSound() {
  chime([880, 1108, 1318], { duration: 0.16, gap: 50, type: 'sine', volume: 0.15, filterFreq: 5000 });
  playCrowdRoar(0.5, 0.04);
}
function playCandySound() {
  chime([660, 990], { duration: 0.14, gap: 70, type: 'sine', volume: 0.14, filterFreq: 4500 });
}
function playGameOverSound() {
  chime([440, 349, 262], { duration: 0.24, gap: 130, type: 'sawtooth', volume: 0.14, filterFreq: 1800 });
}
function playStormAlertSound() {
  beep({ freq: 90, freqEnd: 55, duration: 0.5, type: 'sawtooth', volume: 0.13, filterFreq: 700 });
}
function playGoalFanfare() {
  // triumphant ascending fanfare for beating your best score, World-Cup-goal style
  chime([523, 659, 784, 1047], { duration: 0.22, gap: 90, type: 'triangle', volume: 0.18, filterFreq: 5500 });
  setTimeout(function(){ beep({ freq: 784, duration: 0.35, type: 'sawtooth', volume: 0.08, filterFreq: 2000 }); }, 380);
  playCrowdRoar(1.2, 0.1);
}
function playGiftSound() {
  chime([392, 523, 659, 880], { duration: 0.15, gap: 45, type: 'sine', volume: 0.16, filterFreq: 6000 });
}
function playShieldExpireSound() {
  beep({ freq: 500, freqEnd: 220, duration: 0.25, type: 'triangle', volume: 0.1, filterFreq: 3000 });
}
function playWhistle(long) {
  // referee whistle: bright, narrow-band tone with a slight warble
  const dur = long ? 0.5 : 0.22;
  beep({ freq: 2200, freqEnd: 2350, duration: dur, type: 'square', volume: 0.1, filterFreq: 3200, attack: 0.01 });
  if (long) {
    setTimeout(function(){
      beep({ freq: 2200, freqEnd: 2350, duration: 0.22, type: 'square', volume: 0.1, filterFreq: 3200, attack: 0.01 });
    }, 260);
    setTimeout(function(){
      beep({ freq: 2200, freqEnd: 2350, duration: 0.6, type: 'square', volume: 0.11, filterFreq: 3200, attack: 0.01 });
    }, 520);
  }
}
function playChampionFanfare() {
  // biggest celebration in the game: reaching the most decorated nation's tier
  chime([523, 659, 784, 988, 1175], { duration: 0.26, gap: 100, type: 'triangle', volume: 0.2, filterFreq: 6000 });
  setTimeout(function(){ chime([784, 988, 1175], { duration: 0.35, gap: 120, type: 'sawtooth', volume: 0.12, filterFreq: 2500 }); }, 560);
  playCrowdRoar(1.8, 0.14);
}

// Crowd roar: filtered white noise that swells and fades, like a stadium erupting
function playCrowdRoar(duration, volume) {
  if (soundMuted) return;
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const bufferLen = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferLen, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + duration * 0.25); // swell
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);        // fade
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(now);
    src.stop(now + duration);
  } catch (e) { /* fail silently */ }
}

