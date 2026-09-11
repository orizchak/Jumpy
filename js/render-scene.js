const SKY_DAY   = { top: [79,172,254], mid: [127,216,247], bot: [222,247,236] };
const SKY_NIGHT = { top: [12,14,42],   mid: [45,35,95],    bot: [255,158,140] };

// The sky journeys through four distinct phases as you climb: bright day,
// golden sunset, starry night, and finally the deep purple edge of space.
const SKY_PHASES = [
  { top: [79,172,254],  mid: [127,216,247], bot: [222,247,236] }, // day
  { top: [86,90,180],   mid: [244,140,110], bot: [255,200,120] }, // sunset
  { top: [12,14,42],    mid: [45,35,95],    bot: [255,158,140] }, // night
  { top: [3,2,14],      mid: [28,10,58],    bot: [70,30,110]  }   // deep space
];
const SKY_PHASE_HEIGHT = 1300; // px of climb per phase transition

function skyColorsAt(heightClimbed) {
  const u = Math.max(0, heightClimbed) / SKY_PHASE_HEIGHT;
  const i = Math.min(SKY_PHASES.length - 2, Math.floor(u));
  const frac = clamp01(u - i);
  const a = SKY_PHASES[i], b = SKY_PHASES[i + 1];
  return {
    top: lerpColor(a.top, b.top, frac),
    mid: lerpColor(a.mid, b.mid, frac),
    bot: lerpColor(a.bot, b.bot, frac)
  };
}

let skyStars = null;
function initSkyStars() {
  skyStars = [];
  for (let i = 0; i < 40; i++) {
    skyStars.push({ x: randRange(0, W), y: randRange(0, H * 3), r: randRange(0.6, 1.8), phase: randRange(0, Math.PI*2) });
  }
}

function drawFlag(x, y, w, h, flag, targetCtx) {
  const ctx = targetCtx || mainCtx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (flag.pattern === 'horizontal') {
    const weights = flag.weights || flag.colors.map(function(){ return 1; });
    const total = weights.reduce(function(a,b){ return a+b; }, 0);
    let curY = y;
    for (let i = 0; i < flag.colors.length; i++) {
      const sh = (weights[i] / total) * h;
      ctx.fillStyle = flag.colors[i];
      ctx.fillRect(x, curY, w, sh);
      curY += sh;
    }
  } else if (flag.pattern === 'vertical') {
    const sw = w / flag.colors.length;
    for (let i = 0; i < flag.colors.length; i++) {
      ctx.fillStyle = flag.colors[i];
      ctx.fillRect(x + i * sw, y, sw + 1, h);
    }
  } else if (flag.pattern === 'stripes4') {
    const n = 5;
    const sh = h / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = flag.colors[i % 2];
      ctx.fillRect(x, y + i * sh, w, sh + 1);
    }
  } else if (flag.pattern === 'cross') {
    ctx.fillStyle = flag.bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = flag.accent;
    ctx.fillRect(x, y + h/2 - h*0.09, w, h*0.18);
    ctx.fillRect(x + w/2 - w*0.09, y, w*0.18, h);
  } else if (flag.pattern === 'mexico') {
    const sw = w / 3;
    const cols = ['#006847', '#f0f0f0', '#CE1126'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.fillRect(x + i * sw, y, sw + 1, h);
    }
    // eagle emblem simplified as a small brown/gold mark on the center band
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h/2, w*0.055, h*0.16, 0, 0, Math.PI*2);
    ctx.fill();
  } else if (flag.pattern === 'usa') {
    const n = 7;
    const sh = h / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#f0f0f0';
      ctx.fillRect(x, y + i * sh, w, sh + 1);
    }
    ctx.fillStyle = '#3C3B6E';
    ctx.fillRect(x, y, w * 0.42, h * 0.5);
    ctx.fillStyle = '#f0f0f0';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.arc(x + w*0.06 + c * w*0.1, y + h*0.1 + r * h*0.15, Math.max(0.8, w*0.016), 0, Math.PI*2);
        ctx.fill();
      }
    }
  } else if (flag.pattern === 'japan') {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#BC002D';
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, h * 0.3, 0, Math.PI*2);
    ctx.fill();
  } else if (flag.pattern === 'morocco') {
    ctx.fillStyle = '#C1272D';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#006233';
    ctx.lineWidth = Math.max(1, w * 0.03);
    polygonPath(ctx, x + w/2, y + h/2, h * 0.3, 5, -Math.PI/2);
    ctx.stroke();
  } else if (flag.pattern === 'brazil') {
    ctx.fillStyle = '#009739';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FEDD00';
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + h*0.12);
    ctx.lineTo(x + w*0.88, y + h/2);
    ctx.lineTo(x + w/2, y + h*0.88);
    ctx.lineTo(x + w*0.12, y + h/2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#002776';
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, h*0.22, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// The higher you climb, the more decorated the country tier — with 16 nations,
// a shorter tier height keeps the top (Brazil) reachable in a strong run.
const HEIGHT_PER_FLAG = 380;

// Birds glide across the daytime sky; shooting stars streak across the night
let birds = [];
function initBirds() {
  birds = [];
  for (let i = 0; i < 3; i++) {
    birds.push({ x: randRange(0, W), y: randRange(40, 200), speed: randRange(0.25, 0.5), phase: randRange(0, Math.PI*2) });
  }
}
let shootingStar = null;

function drawBirds(t) {
  const a = clamp01(1 - t * 2.2);
  if (a < 0.05) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(50,60,80,' + (0.5 * a) + ')';
  ctx.lineWidth = 1.6;
  for (const b of birds) {
    b.x += b.speed;
    if (b.x > W + 20) { b.x = -20; b.y = randRange(40, 200); }
    b.phase += 0.12;
    const flap = Math.sin(b.phase) * 3;
    ctx.beginPath();
    ctx.moveTo(b.x - 5, b.y - flap);
    ctx.quadraticCurveTo(b.x, b.y + 2, b.x, b.y);
    ctx.quadraticCurveTo(b.x, b.y + 2, b.x + 5, b.y - flap);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShootingStar(t) {
  if (t < 0.5) { shootingStar = null; return; }
  if (!shootingStar && Math.random() < 0.004) {
    shootingStar = { x: randRange(W*0.2, W*0.9), y: randRange(20, 140), vx: -randRange(4, 7), vy: randRange(1.5, 3), life: 26 };
  }
  if (shootingStar) {
    const s = shootingStar;
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.life / 12);
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
    ctx.stroke();
    ctx.restore();
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0) shootingStar = null;
  }
}

// Distant mountain silhouettes: two ridge layers with a slow horizontal
// parallax drift as you climb, tinted to match the current sky phase
// Ridge heights precomputed into lookup tables — per frame it's just an
// indexed path fill with a scroll offset (no trig on the hot path)
const MTN_STEP = 12;
const MTN_LAYERS = [
  { base: H * 0.80, amp: 26, freq: 0.012, alpha: 0.16, speed: 0.5, table: null },
  { base: H * 0.86, amp: 38, freq: 0.008, alpha: 0.22, speed: 1.0, table: null }
];
(function buildMountainTables() {
  for (const L of MTN_LAYERS) {
    const span = 8192; // px of precomputed ridge; drift wraps around it
    const n = Math.ceil(span / MTN_STEP);
    L.table = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const wx = i * MTN_STEP;
      L.table[i] = L.base
        - Math.abs(Math.sin(wx * L.freq)) * L.amp
        - Math.sin(wx * L.freq * 2.7 + 1.3) * L.amp * 0.35;
    }
    L.span = span;
  }
})();
let mtnCache = { key: '', sprite: null };
function drawMountains(t) {
  const drift = cameraY * 0.03;
  const shade = t < 0.5 ? '43,68,102' : '10,14,30';
  // big-canvas perf: repaint the layered ridges only when they visibly shift
  const key = Math.round(drift / 14) + '|' + shade;
  if (mtnCache.key !== key) {
    if (!mtnCache.sprite) {
      mtnCache.sprite = document.createElement('canvas');
      mtnCache.sprite.width = W; mtnCache.sprite.height = H;
    }
    const mx = mtnCache.sprite.getContext('2d');
    mx.clearRect(0, 0, W, H);
    for (const L of MTN_LAYERS) {
      mx.fillStyle = 'rgba(' + shade + ',' + L.alpha + ')';
      mx.beginPath();
      mx.moveTo(0, H);
      const off = (drift * L.speed) % L.span;
      for (let x = 0; x <= W; x += MTN_STEP) {
        const idx = Math.floor(((x + off) % L.span) / MTN_STEP);
        mx.lineTo(x, L.table[idx]);
      }
      mx.lineTo(W, H);
      mx.closePath();
      mx.fill();
    }
    mtnCache.key = key;
  }
  ctx.drawImage(mtnCache.sprite, 0, 0);
}

function drawSunMoon(t) {
  // sun in the day, crossfading into a crescent moon as difficulty darkens the sky
  const cx = W * 0.78, cy = 74;
  ctx.save();

  // sun (fades out as t rises)
  const sunA = clamp01(1 - t * 1.8);
  if (sunA > 0.02) {
    ctx.globalAlpha = sunA;
    ctx.save();
    ctx.translate(cx, cy);
    if (!drawSunMoon.glow) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      g.addColorStop(0, 'rgba(255,252,220,1)');
      g.addColorStop(0.5, 'rgba(255,225,120,0.9)');
      g.addColorStop(1, 'rgba(255,215,90,0)');
      drawSunMoon.glow = g;
    }
    ctx.fillStyle = drawSunMoon.glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff4c2';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI*2);
    ctx.fill();
  }

  // moon (fades in as t rises)
  const moonA = clamp01((t - 0.35) * 2.2);
  if (moonA > 0.02) {
    ctx.globalAlpha = moonA;
    if (!drawSunMoon.moonGlow) {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
      g.addColorStop(0, 'rgba(220,230,255,0.75)');
      g.addColorStop(1, 'rgba(220,230,255,0)');
      drawSunMoon.moonGlow = g;
    }
    ctx.fillStyle = drawSunMoon.moonGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#e8edf7';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI*2);
    ctx.fill();
    // crescent bite (sample sky color at that height)
    ctx.fillStyle = skyColorsAt(cameraY).top;
    ctx.beginPath();
    ctx.arc(cx + 5, cy - 3, 10, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloodlightPylon(x, leansRight) {
  ctx.save();
  const leanX = leansRight ? 6 : -6;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 46);
  ctx.lineTo(x + leanX, -6);
  ctx.stroke();
  // lattice crossbeams
  for (let i = 1; i <= 3; i++) {
    const yy = 46 - i * 12;
    const xx = x + (leanX * i) / 4;
    ctx.beginPath();
    ctx.moveTo(xx - 5, yy);
    ctx.lineTo(xx + 5, yy);
    ctx.stroke();
  }
  // light fixture cluster
  ctx.fillStyle = 'rgba(255,250,220,0.55)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + leanX + (i - 1) * 6, -8, 2.4, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

let skyGradCache = { key: -1, grad: null };
// ================================================================
// RENDERING — background, world, entities, HUD overlays
// ================================================================
function drawBackground(diff) {
  const t = diff;
  // gradient rebuilt only when the sky has visibly shifted (mobile perf)
  const key = Math.round(cameraY / 40);
  if (skyGradCache.key !== key) {
    const sky = skyColorsAt(cameraY);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(0.55, sky.mid);
    grad.addColorStop(1, sky.bot);
    skyGradCache = { key: key, grad: grad };
  }
  ctx.fillStyle = skyGradCache.grad;
  ctx.fillRect(0, 0, W, H);

  drawSunMoon(t);
  drawMountains(t);
  drawBirds(t);
  drawShootingStar(t);
  drawFloodlightPylon(18, true);
  drawFloodlightPylon(W - 18, false);

  // stadium floodlight beams, more visible as the sky darkens (World Cup night-match vibe)
  if (t > 0.1) {
    ctx.save();
    ctx.globalAlpha = clamp01((t - 0.1) / 0.6) * 0.35;
    if (!drawBackground.beamSprite) {
      const bs = document.createElement('canvas');
      bs.width = W; bs.height = H;
      const b2x = bs.getContext('2d');
      const b1 = b2x.createLinearGradient(0, 0, W*0.4, H*0.7);
      b1.addColorStop(0, 'rgba(255,250,220,0.9)');
      b1.addColorStop(1, 'rgba(255,250,220,0)');
      b2x.fillStyle = b1;
      b2x.beginPath();
      b2x.moveTo(-10, -10); b2x.lineTo(W*0.55, -10); b2x.lineTo(W*0.1, H*0.75);
      b2x.closePath(); b2x.fill();
      const b2 = b2x.createLinearGradient(W, 0, W*0.6, H*0.7);
      b2.addColorStop(0, 'rgba(255,250,220,0.9)');
      b2.addColorStop(1, 'rgba(255,250,220,0)');
      b2x.fillStyle = b2;
      b2x.beginPath();
      b2x.moveTo(W+10, -10); b2x.lineTo(W*0.45, -10); b2x.lineTo(W*0.9, H*0.75);
      b2x.closePath(); b2x.fill();
      drawBackground.beamSprite = bs;
    }
    ctx.drawImage(drawBackground.beamSprite, 0, 0);
    ctx.restore();
  }

  // twinkling stars fade in as it gets darker/harder
  if (t > 0.15 && skyStars) {
    ctx.save();
    ctx.globalAlpha = clamp01((t - 0.15) / 0.5);
    for (const st of skyStars) {
      const sy = ((st.y + cameraY * 0.08) % (H + 40)) - 20;
      const tw = 0.6 + 0.4 * Math.sin(st.phase + cameraY * 0.01);
      ctx.globalAlpha = clamp01((t - 0.15) / 0.5) * tw;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(st.x, sy, st.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // distant parallax hills for depth
  ctx.fillStyle = lerpColor([120,190,170], [30,25,60], t);
  ctx.globalAlpha = 0.55;
  drawHillLayer(cameraY * 0.12, 46, 90);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = lerpColor([90,170,140], [20,18,48], t);
  drawHillLayer(cameraY * 0.22, 30, 70);
  ctx.globalAlpha = 1;
  drawCrowd(cameraY * 0.22, 70);

  if (!drawBackground.cloudSprite) {
    const cw = 200, ch = 120, ref = 100; // reference cloud width
    const cs = document.createElement('canvas');
    cs.width = cw; cs.height = ch;
    const c2 = cs.getContext('2d');
    c2.fillStyle = 'rgba(255,255,255,0.85)';
    c2.beginPath();
    c2.ellipse(cw/2, ch/2, ref*0.5, ref*0.28, 0, 0, Math.PI*2);
    c2.ellipse(cw/2 - ref*0.3, ch/2 + 6, ref*0.32, 0.2*ref, 0, 0, Math.PI*2);
    c2.ellipse(cw/2 + ref*0.3, ch/2 + 6, ref*0.32, 0.2*ref, 0, 0, Math.PI*2);
    c2.fill();
    drawBackground.cloudSprite = cs;
  }
  const cs = drawBackground.cloudSprite;
  for (const c of clouds) {
    const cy = ((c.y + cameraY * c.speed * 0.3) % (H + 120)) - 60;
    const s = c.w / 100;
    ctx.drawImage(cs, c.x - 100*s, cy - 60*s, 200*s, 120*s);
  }
}

const HILL_STEP = 20, HILL_SPAN = 4400; // one full wave period is 880px
const hillTables = {};
function hillTable(amplitude, baseline) {
  const key = amplitude + '_' + baseline;
  if (!hillTables[key]) {
    const n = Math.ceil(HILL_SPAN / HILL_STEP);
    const t = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const wx = i * HILL_STEP;
      t[i] = H - baseline + Math.sin(wx / 70) * amplitude * 0.5
             + Math.sin(wx * 0.5 / 70) * amplitude * 0.3;
    }
    hillTables[key] = t;
  }
  return hillTables[key];
}
function drawHillLayer(scrollY, amplitude, baseline) {
  const table = hillTable(amplitude, baseline);
  const off = scrollY % HILL_SPAN;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += HILL_STEP) {
    const idx = Math.floor(((x + off + HILL_SPAN) % HILL_SPAN) / HILL_STEP);
    ctx.lineTo(x, table[idx]);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

let crowdDots = null;
const CROWD_COLORS = ['#ffffff', '#ffe066', '#40c4ff', '#ff6b6b', '#69f0ae'];
function initCrowd() {
  crowdDots = [];
  for (let i = 0; i < 90; i++) {
    crowdDots.push({
      x: randRange(0, W + 20),
      jitter: randRange(-3, 3),
      color: CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)]
    });
  }
}
let crowdStrip = null;
function drawCrowd(scrollY, baseline) {
  if (!crowdDots) return;
  const stripW = W + 20;
  if (!crowdStrip) {
    crowdStrip = document.createElement('canvas');
    crowdStrip.width = stripW; crowdStrip.height = 12;
    const c2 = crowdStrip.getContext('2d');
    for (const d of crowdDots) {
      c2.fillStyle = d.color;
      c2.fillRect(d.x % stripW, 5 + d.jitter, 2.2, 2.2);
    }
  }
  const rowY = H - baseline - 8;
  const off = scrollY % stripW;
  ctx.globalAlpha = 0.5;
  ctx.drawImage(crowdStrip, -off, rowY);
  ctx.drawImage(crowdStrip, stripW - off, rowY);
  ctx.globalAlpha = 1;
}

function drawStorm() {
  if (stormY > H + 40) return; // not visible yet, skip
  stormPulseT += 0.05;
  const topY = stormY;
  if (topY > H + 40) return;

  ctx.save();
  // jagged, roiling top edge
  ctx.beginPath();
  ctx.moveTo(0, H + 10);
  const wave = 26;
  for (let x = 0; x <= W; x += 10) {
    const y = topY + Math.sin((x + stormPulseT * 40) / wave) * 8
              + Math.sin((x * 0.6 - stormPulseT * 25)) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H + 10);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, topY - 10, 0, H + 10);
  grad.addColorStop(0, 'rgba(40,15,55,0.05)');
  grad.addColorStop(0.25, 'rgba(35,12,50,0.75)');
  grad.addColorStop(1, 'rgba(15,5,25,0.97)');
  ctx.fillStyle = grad;
  ctx.fill();

  // occasional flicker of lightning near the edge
  if (Math.random() < 0.02) {
    ctx.fillStyle = 'rgba(220,200,255,0.5)';
    ctx.fillRect(0, topY - 4, W, 10);
  }

  // drifting wisps
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 5; i++) {
    const wx = (i * 83 + stormPulseT * 18) % (W + 40) - 20;
    const wy = topY + 14 + Math.sin(stormPulseT + i) * 6;
    ctx.beginPath();
    ctx.ellipse(wx, wy, 16, 5, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBarrier() {
  if (!shieldActive) return;
  const y = H - BARRIER_OFFSET;
  const pulse = 0.5 + 0.5 * Math.sin(stormPulseT * 3);
  ctx.save();
  const grad = ctx.createLinearGradient(0, y - 10, 0, y + 10);
  grad.addColorStop(0, 'rgba(64,196,255,0)');
  grad.addColorStop(0.5, `rgba(120,220,255,${0.55 + pulse * 0.25})`);
  grad.addColorStop(1, 'rgba(64,196,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - 10, W, 20);

  ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const wave = 22;
  for (let x = 0; x <= W; x += 8) {
    const wy = y + Math.sin((x + stormPulseT * 60) / wave) * 2.5;
    if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
  }
  ctx.stroke();
  ctx.restore();
}

