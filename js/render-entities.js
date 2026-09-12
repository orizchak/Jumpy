function drawFlagItem(f) {
  if (f.collected) return;
  if (!isFiniteNum(f.x) || !isFiniteNum(f.y)) return;
  const bobY = f.y + Math.sin(f.bob) * 4;
  const nation = FLAG_NATIONS[f.countryIdx] || FLAG_NATIONS[0];
  const flutter = Math.sin(f.bob * 1.6) * 0.12;
  const fw = FLAG_R * 2.2, fh = FLAG_R * 1.5;

  ctx.save();
  ctx.translate(f.x, bobY);
  ctx.rotate(flutter);
  // pole
  ctx.strokeStyle = '#8d6e4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-fw*0.5, -fh*0.6);
  ctx.lineTo(-fw*0.5, fh*0.9);
  ctx.stroke();
  ctx.fillStyle = '#c9a876';
  ctx.beginPath();
  ctx.arc(-fw*0.5, -fh*0.6, 1.8, 0, Math.PI*2);
  ctx.fill();

  // flag: each nation is rendered once at 2x and blitted thereafter
  if (!drawFlagItem.sprites) drawFlagItem.sprites = {};
  let spr = drawFlagItem.sprites[f.countryIdx];
  if (!spr) {
    spr = document.createElement('canvas');
    spr.width = Math.ceil(fw * 2) + 2; spr.height = Math.ceil(fh * 2) + 2;
    const s2 = spr.getContext('2d');
    s2.scale(2, 2);
    s2.translate(0.5, 0.5);
    s2.strokeStyle = 'rgba(0,0,0,0.2)';
    s2.lineWidth = 1;
    drawFlag(0, 0, fw, fh, nation, s2);
    s2.strokeRect(0, 0, fw, fh);
    drawFlagItem.sprites[f.countryIdx] = spr;
  }
  ctx.drawImage(spr, -fw*0.5, -fh*0.6, fw + 1, fh + 1);
  ctx.restore();
}

function drawCandyItem(c) {
  if (c.collected) return;
  if (!isFiniteNum(c.x) || !isFiniteNum(c.y)) return;
  const bobY = c.y + Math.sin(c.bob) * 4;
  ctx.save();
  drawCandy(ctx, c.x, bobY, CANDY_R, c.color, c.twist);
  ctx.restore();
}

function drawGiftItem(g) {
  if (g.collected) return;
  if (!isFiniteNum(g.x) || !isFiniteNum(g.y)) return;
  const bobY = g.y + Math.sin(g.bob) * 4;
  const r = GIFT_R;
  ctx.save();
  ctx.translate(g.x, bobY);

  // box
  ctx.fillStyle = '#40c4ff';
  roundRectPath(ctx, -r, -r*0.75, r*2, r*1.5, 2.5);
  ctx.fill();
  ctx.fillStyle = '#1a8fd1';
  roundRectPath(ctx, -r, r*0.05, r*2, r*0.5, 2);
  ctx.fill();

  // ribbon
  ctx.fillStyle = '#fff176';
  ctx.fillRect(-r*0.18, -r*0.75, r*0.36, r*1.5);
  ctx.beginPath();
  ctx.moveTo(-r*0.5, -r*0.75);
  ctx.lineTo(0, -r*0.15);
  ctx.lineTo(r*0.5, -r*0.75);
  ctx.lineTo(r*0.3, -r*0.95);
  ctx.lineTo(0, -r*0.7);
  ctx.lineTo(-r*0.3, -r*0.95);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPlatform(p) {
  if (!isFiniteNum(p.x) || !isFiniteNum(p.y) || !isFiniteNum(p.w)) return;
  if (p.y < -30 || p.y > H + 30) return;
  const dip = p.dip && p.dip > 0.3 ? p.dip : 0;
  if (dip) { ctx.save(); ctx.translate(0, dip); }
  // build the two platform gradients once, in platform-local space
  if (!drawPlatform.gMoving) {
    let g = ctx.createLinearGradient(0, 0, 0, PLATFORM_H);
    g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#f7931e');
    drawPlatform.gMoving = g;
    g = ctx.createLinearGradient(0, 0, 0, PLATFORM_H);
    g.addColorStop(0, '#7ee08a'); g.addColorStop(1, '#2fa84f');
    drawPlatform.gStatic = g;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  // cheap soft shadow: a dark offset shape instead of GPU-heavy shadowBlur
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  roundRectPath(ctx, 2, 4, p.w, PLATFORM_H, 7);
  ctx.fill();
  ctx.fillStyle = p.moving ? drawPlatform.gMoving : drawPlatform.gStatic;
  roundRectPath(ctx, 0, 0, p.w, PLATFORM_H, 7);
  ctx.fill();
  ctx.restore();
  // subtle top-light sheen for a rounded, lit look
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRectPath(ctx, p.x + 3, p.y + 1.5, p.w - 6, 3, 2);
  ctx.fill();

  ctx.fillStyle = p.moving ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  roundRectPath(ctx, p.x + 3, p.y + 2, p.w - 6, 3, 2);
  ctx.fill();

  if (!p.moving) {
    ctx.fillStyle = '#1e8449';
    for (let i = 0; i < 4; i++) {
      const tx = p.x + 6 + i * (p.w - 12) / 3;
      ctx.beginPath();
      ctx.moveTo(tx, p.y);
      ctx.lineTo(tx + 3, p.y - 5);
      ctx.lineTo(tx + 6, p.y);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const cx = p.x + p.w/2;
    const cy = p.y + PLATFORM_H/2;
    const ax = p.dir * 5;
    ctx.beginPath();
    ctx.moveTo(cx + ax, cy);
    ctx.lineTo(cx - ax*0.3, cy - 3);
    ctx.lineTo(cx - ax*0.3, cy + 3);
    ctx.closePath();
    ctx.fill();
  }
  if (dip) ctx.restore();
}

function polygonPath(ctx, cx, cy, radius, sides, rotation) {
  ctx.beginPath();
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const a = rotation + i * step;
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Slim vertical progress rail on the right edge: every racer's dot climbs
// toward the trophy at the top as they approach the race target
// World-anchored distance markers: a milestone line every 1000m (all modes)
// and a checkered FINISH barrier at the race target distance
function drawDistanceLines() {
  const baseline = H - 100; // world height h px sits at screenY = baseline - (h - cameraY)
  // --- 1000m milestones ---
  const kFrom = Math.max(1, Math.floor((cameraY - 140) / 5000));
  for (let k = kFrom; k <= kFrom + 2; k++) {
    const py = baseline - (k * 5000 - cameraY);
    if (py < -30 || py > H + 30) continue;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '800 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRectPath(ctx, 6, py - 19, 64, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⛳ ' + (k * 500) + ' m', 12, py - 7);
    ctx.restore();
  }
  // --- duel: the GOAL GATE floating in the sky ---
  if (gameMode === 'duel') {
    const gy = baseline - (duelGateM * 10 - cameraY);
    if (gy > -80 && gy < H + 40) {
      ctx.save();
      const pulse = 0.55 + Math.sin(Date.now() * 0.005) * 0.25;
      const gw = Math.min(W * 0.5, 220), gx = W / 2 - gw / 2, gh = 52;
      // glow field
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(gx - 14, gy - gh - 10, gw + 28, gh + 18);
      ctx.globalAlpha = 1;
      // posts + crossbar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - 5, gy - gh, 5, gh);
      ctx.fillRect(gx + gw, gy - gh, 5, gh);
      ctx.fillRect(gx - 5, gy - gh - 5, gw + 10, 5);
      // net
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      for (let nx = gx; nx <= gx + gw; nx += 14) {
        ctx.beginPath(); ctx.moveTo(nx, gy - gh); ctx.lineTo(nx, gy); ctx.stroke();
      }
      for (let ny = gy - gh; ny <= gy; ny += 13) {
        ctx.beginPath(); ctx.moveTo(gx, ny); ctx.lineTo(gx + gw, ny); ctx.stroke();
      }
      // label
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText('🥅 GOAL GATE — ' + duelGateM + 'm', W / 2, gy - gh - 14);
      ctx.fillStyle = '#ffd54f';
      ctx.fillText('🥅 GOAL GATE — ' + duelGateM + 'm', W / 2, gy - gh - 14);
      ctx.restore();
    }
  }

  // --- race finish barrier ---
  if (gameMode !== 'race') return;
  const fy = baseline - (raceTarget * 10 - cameraY);
  if (fy < -60 || fy > H + 30) return;
  ctx.save();
  // checkered tape
  const sq = 12;
  for (let x = 0; x < W; x += sq) {
    ctx.fillStyle = (Math.floor(x / sq) % 2 === 0) ? '#111111' : '#ffffff';
    ctx.fillRect(x, fy - 6, sq, 6);
    ctx.fillStyle = (Math.floor(x / sq) % 2 === 0) ? '#ffffff' : '#111111';
    ctx.fillRect(x, fy, sq, 6);
  }
  // posts
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(2, fy - 34, 4, 34);
  ctx.fillRect(W - 6, fy - 34, 4, 34);
  // label
  ctx.font = '900 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText('🏁 FINISH — ' + raceTarget + 'm', W / 2, fy - 14);
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('🏁 FINISH — ' + raceTarget + 'm', W / 2, fy - 14);
  ctx.restore();
}

function drawRaceProgress() {
  if (!racing() || raceCountdown > 0) return;
  const x = W - 9;
  const top = 150, bottom = H - 130;
  ctx.save();
  // rail
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  // finish trophy
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', x, top - 8);
  // racer dots
  const entries = raceStandings();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.out) continue;
    const frac = Math.min(1, e.climb / raceTarget);
    const y = bottom - (bottom - top) * frac;
    ctx.beginPath();
    ctx.arc(x, y, e.you ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    if (e.you) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBotMarker(b, arrow, y) {
  // top-edge markers stay clear of the standings panel on the left
  const minX = (arrow === '▲') ? 150 : 20;
  const x = Math.max(minX, Math.min(W - 22, b.x));
  ctx.save();
  ctx.translate(x, y);
  // the bot's own ball, ghosted
  ctx.globalAlpha = 0.4;
  drawTriondaCharacter(9, 1);
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 10.4, 0, Math.PI*2);
  ctx.stroke();
  // direction arrow and name
  ctx.globalAlpha = 0.95;
  ctx.textAlign = 'center';
  ctx.fillStyle = b.color;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.font = '800 9px sans-serif';
  const arrowY = arrow === '▲' ? -15 : 21;
  ctx.strokeText(arrow, 0, arrowY);
  ctx.fillText(arrow, 0, arrowY);
  ctx.font = '800 8.5px sans-serif';
  const nameY = arrow === '▲' ? 22 : -14;
  ctx.strokeText(b.name, 0, nameY);
  ctx.fillText(b.name + ' · ' + b.bestClimb + 'm', 0, nameY);
  ctx.restore();
}

function drawPlayerRaceTag() {
  if (goalGame.active || raceOver || !running) return;
  const label = playerRaceDistM() + 'm';
  ctx.save();
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(label, ball.x, ball.y + ball.r + 16);
  ctx.fillStyle = '#ffe066';
  ctx.fillText(label, ball.x, ball.y + ball.r + 16);
  ctx.restore();
}

function drawBots() {
  for (const b of bots) {
    // rivals ahead of the view: colored arrow + name at the top edge
    if (b.ahead) {
      drawBotMarker(b, '▲', 52 + b.id * 30); // fixed slot per rival — no shuffling
      continue;
    }
    // rivals racing below the view: ▼ marker at the bottom edge
    if (b.behind) {
      drawBotMarker(b, '▼', H - 205 + b.id * 26);
      continue;
    }
    if (!isFiniteNum(b.x) || !isFiniteNum(b.y)) continue;
    if (b.y < -32 || b.y > H + 20) continue;
    const facing = b.vx < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(b.x, b.y);
    // blink during post-revive grace
    const blinking = b.grace > 0 && Math.floor(b.grace / 6) % 2 === 0;
    ctx.globalAlpha = blinking ? 0.2 : 0.52;

    // same character as the player, at bot size
    b.spin = (b.spin || 0) + b.vx * 0.05;
    drawTriondaCharacter(11, facing, b.spin);

    // single-color identity tint over the whole ball
    ctx.globalAlpha = blinking ? 0.1 : 0.24;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI*2);
    ctx.fill();

    // identity ring so the bot reads instantly at a glance
    ctx.globalAlpha = blinking ? 0.3 : 0.65;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 12.6, 0, Math.PI*2);
    ctx.stroke();

    // name tag: outlined for readability over any background
    ctx.globalAlpha = 0.8;
    ctx.font = '800 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(b.name, 0, -19);
    ctx.fillStyle = b.color;
    ctx.fillText(b.name, 0, -19);

    // live rank above the head (🏆 for the leader)
    if (raceRanks[b.name]) {
      const rl = rankLabel(raceRanks[b.name]) + ' · ' + b.bestClimb + 'm';
      ctx.font = rl === '🏆' ? '12px sans-serif' : '800 9px sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      if (rl !== '🏆') ctx.strokeText(rl, 0, -30);
      ctx.fillStyle = '#fff';
      ctx.fillText(rl, 0, -30);
    }

    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Faint trace of the best past run on this exact seed (daily/challenge only —
// see ghost.js). Reuses the player's own ball art at low alpha and no face
// direction bias so it never gets mistaken for a live opponent.
function drawGhost() {
  const pos = ghostScreenPos();
  if (!pos) return;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.translate(pos.x, pos.y);
  drawTriondaCharacter(ball.r, 1, 0);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👻', pos.x, pos.y - ball.r - 8);
  ctx.restore();
}

function drawBallTrail() {
  // fading ghost circles behind the ball; stronger when moving fast, golden during boost
  const speed = Math.abs(ball.vx) + Math.abs(ball.vy);
  if (speed < 4 && boostTimer <= 0) return;
  const boosted = boostTimer > 0;
  for (let i = 0; i < ballTrail.length - 1; i++) {
    const bt = ballTrail[i];
    const frac = (i + 1) / ballTrail.length;
    ctx.globalAlpha = frac * (boosted ? 0.34 : 0.16);
    ctx.fillStyle = boosted ? '#ffd54f' : currentSkin().trail;
    ctx.beginPath();
    ctx.arc(bt.x, bt.y, ball.r * (0.45 + frac * (boosted ? 0.62 : 0.4)), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

let vignetteCanvas = null;
function drawVignette() {
  // static effect: rasterized once, blitted every frame (mobile perf)
  if (!vignetteCanvas) {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = W; vignetteCanvas.height = H;
    const vctx = vignetteCanvas.getContext('2d');
    const vg = vctx.createRadialGradient(W/2, H/2, H*0.42, W/2, H/2, H*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,15,35,0.22)');
    vctx.fillStyle = vg;
    vctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vignetteCanvas, 0, 0);
}

// Draws the full Trionda ball character (skin + face) centered at the current
// origin. Used by the player at full size and by the bots at a smaller radius.
function drawTriondaCharacter(r, facing, spin) {
  // World Cup 2026 "Trionda"-style skin: white base with three curved
  // triangular panels in the host nations' red, blue, and green, plus gold accents
  const skin = currentSkin();
  if (!drawTriondaCharacter.gcache) drawTriondaCharacter.gcache = {};
  const gkey = skin.id + ':' + Math.round(r * 2);
  let g = drawTriondaCharacter.gcache[gkey];
  if (!g) {
    g = ctx.createRadialGradient(-r*0.35, -r*0.4, 2, 0, 0, r*1.3);
    g.addColorStop(0, skin.base[0]);
    g.addColorStop(0.75, skin.base[1]);
    g.addColorStop(1, skin.base[2]);
    drawTriondaCharacter.gcache[gkey] = g;
  }
  ctx.beginPath();
  ctx.fillStyle = g;
  ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.clip();
  if (spin) ctx.rotate(spin); // panels spin with movement; the face stays upright

  // three swooping panels rotated 120° apart, colored per the selected skin
  const panelColors = skin.panelColors;
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + Math.PI / 6;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = panelColors[i];
    ctx.beginPath();
    // curved triangle sweeping from near-center out to the rim
    ctx.moveTo(r * 0.16, 0);
    ctx.quadraticCurveTo(r * 0.55, -r * 0.5, r * 1.12, -r * 0.28);
    ctx.quadraticCurveTo(r * 1.0, r * 0.32, r * 0.5, r * 0.42);
    ctx.quadraticCurveTo(r * 0.3, r * 0.2, r * 0.16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // gold accent dots at the panel junctions
  ctx.fillStyle = '#d9a821';
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + Math.PI / 6 + Math.PI / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.09, 0, Math.PI*2);
    ctx.fill();
  }

  // subtle sheen and rim
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r*0.35, -r*0.42, r*0.45, r*0.22, -0.6, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();

  // white face patch so the eyes and smile stay readable over the colored panels
  const u = r / 14; // face features scale (designed at r=14)
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(facing * 1.5 * u, 0.5 * u, r * 0.62, r * 0.56, 0, 0, Math.PI*2);
  ctx.fill();

  const eyeOffset = facing * 3 * u;
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(-5*u + eyeOffset, -3*u, 2.4*u, 0, Math.PI*2);
  ctx.arc(5*u + eyeOffset, -3*u, 2.4*u, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5*u + eyeOffset + 0.8*u, -3.8*u, 0.8*u, 0, Math.PI*2);
  ctx.arc(5*u + eyeOffset + 0.8*u, -3.8*u, 0.8*u, 0, Math.PI*2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(eyeOffset*0.5, 4*u, 5*u, 0.15*Math.PI, 0.85*Math.PI, false);
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1.5*u;
  ctx.stroke();
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  const squash = Math.min(1.25, Math.max(0.8, 1 - ball.vy * 0.01));
  ctx.scale(1/squash, squash);

  // blink while in post-revive grace period
  if (reviveGraceTimer > 0 && Math.floor(reviveGraceTimer / 6) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  if (shieldActive) {
    const pulse = 0.5 + 0.5 * Math.sin(stormPulseT * 4);
    ctx.beginPath();
    ctx.arc(0, 0, ball.r + 5 + pulse * 2, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(64,196,255,${0.5 + pulse * 0.35})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(0, ball.r + 4, ball.r*0.8, ball.r*0.25, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();

  ball.spin = (ball.spin || 0) + ball.vx * 0.045;
  drawTriondaCharacter(ball.r, ball.facing, ball.spin);

  // live rank above the head (🏆 when leading)
  if (racing() && raceRanks['YOU']) {
    ctx.globalAlpha = 1;
    const rl = rankLabel(raceRanks['YOU']);
    ctx.font = rl === '🏆' ? '14px sans-serif' : '800 11px sans-serif';
    ctx.textAlign = 'center';
    if (rl !== '🏆') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(rl, 0, -ball.r - 10);
    }
    ctx.fillStyle = '#ffe066';
    ctx.fillText(rl, 0, -ball.r - 10);
  }
  ctx.restore();
}

function drawParticles() {
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 28);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrophy() {
  if (trophyTimer <= 0) return;
  const fade = Math.min(1, trophyTimer / 60); // fade out in last second
  const bobT = stormPulseT * 2;
  const tx = ball.x;
  const ty = ball.y - ball.r - 34 + Math.sin(bobT) * 3;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(tx, ty);
  if (!window.__trophyGlow) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    g.addColorStop(0, 'rgba(255,215,0,0.55)');
    g.addColorStop(1, 'rgba(255,215,0,0)');
    window.__trophyGlow = g;
  }
  ctx.fillStyle = window.__trophyGlow;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();

  // FIFA World Cup trophy: two figures spiraling upward, holding the globe,
  // on a base ringed with malachite-green bands
  const gold = ctx.createLinearGradient(0, -16, 0, 14);
  gold.addColorStop(0, '#ffe985');
  gold.addColorStop(0.5, '#f0bd2d');
  gold.addColorStop(1, '#b8860b');

  // base
  ctx.fillStyle = gold;
  roundRectPath(ctx, -7.5, 8, 15, 6, 2);
  ctx.fill();
  // malachite bands on the base
  ctx.fillStyle = '#0e5c3f';
  ctx.fillRect(-7.5, 9.4, 15, 1.4);
  ctx.fillRect(-7.5, 12.2, 15, 1.4);

  // the two spiraling figures: an hourglass body widening as it rises
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-5.5, 8);
  ctx.quadraticCurveTo(-2.2, 2, -3.5, -3);   // left figure leaning in
  ctx.quadraticCurveTo(-4.5, -7, -7, -9);    // left arm reaching up/out
  ctx.quadraticCurveTo(-3, -8.5, -1, -6.5);  // hand toward globe
  ctx.lineTo(1, -6.5);
  ctx.quadraticCurveTo(3, -8.5, 7, -9);      // right arm
  ctx.quadraticCurveTo(4.5, -7, 3.5, -3);    // right figure
  ctx.quadraticCurveTo(2.2, 2, 5.5, 8);
  ctx.closePath();
  ctx.fill();

  // the globe on top
  const globe = ctx.createRadialGradient(-2, -13, 1, 0, -11.5, 6.5);
  globe.addColorStop(0, '#fff3b0');
  globe.addColorStop(0.6, '#f0bd2d');
  globe.addColorStop(1, '#c08a12');
  ctx.fillStyle = globe;
  ctx.beginPath();
  ctx.arc(0, -11.5, 6, 0, Math.PI*2);
  ctx.fill();

  // faint continents/latitude etching on the globe
  ctx.strokeStyle = 'rgba(140,95,15,0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, -11.5, 6, 2.2, 0, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -11.5, 3, 6, 0, 0, Math.PI*2);
  ctx.stroke();

  // shine on the globe
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-2, -13.5, 1.8, 1.1, -0.5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawConfetti() {
  for (const cf of confetti) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, cf.life / cf.maxLife);
    ctx.translate(cf.x, cf.y);
    ctx.rotate(cf.rot);
    ctx.fillStyle = cf.color;
    ctx.fillRect(-cf.w/2, -cf.h/2, cf.w, cf.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawPopups() {
  for (const pu of popups) {
    ctx.globalAlpha = Math.min(1, Math.max(0, pu.life / 45)); // hold, then fade out
    ctx.font = '800 21px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(pu.text, pu.x, pu.y);
    ctx.fillStyle = pu.color;
    ctx.fillText(pu.text, pu.x, pu.y);
  }
  ctx.globalAlpha = 1;
}

