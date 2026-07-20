/* ══════════════════════════════════════════════
   SHARE CARD — generates a branded 1200×630 PNG on a
   2D canvas (name, title, stats, and the visitor's
   Career Quest progress) and lets the visitor
   download / copy it. Fully client-side.
   ══════════════════════════════════════════════ */
const CREAM = '#FFF4DC', INK = '#23233B', RED = '#FF5D5D', YELLOW = '#FFC93C', BLUE = '#5BA8FF';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function drawCoin(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = YELLOW; ctx.fill();
  ctx.lineWidth = r * 0.16; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFE08A'; ctx.lineWidth = r * 0.12; ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `400 ${Math.round(r * 1.1)}px "Lilita One", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('A', x, y + r * 0.08);
  ctx.restore();
}

async function draw(game) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  try { await document.fonts.ready; } catch {}

  // background + border
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK; ctx.lineWidth = 14;
  roundRect(ctx, 24, 24, W - 48, H - 48, 34); ctx.stroke();

  // portrait (fallback: initials disc)
  const img = await loadImage('static/profile.png');
  const px = 150, py = 200, pr = 120;
  ctx.save();
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = BLUE; ctx.fill(); ctx.clip();
  if (img) ctx.drawImage(img, px - pr, py - pr, pr * 2, pr * 2);
  else { ctx.fillStyle = CREAM; ctx.font = '700 96px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AA', px, py + 6); }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke();

  // name + title
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = '400 74px "Lilita One", sans-serif';
  ctx.fillText('ANNAS ADHARUQUDNI', 310, 150);
  ctx.fillStyle = RED;
  ctx.font = '600 30px "Baloo 2", sans-serif';
  ctx.fillText('Platform Software Engineer · Samsung R&D Indonesia', 312, 196);

  // stat pills
  const pills = [['5+', 'years'], ['20+', 'led'], ['18+', 'certs'], ['🥇', 'CIP gold']];
  let sx = 310;
  pills.forEach(([n, l]) => {
    const w = 150;
    ctx.fillStyle = YELLOW; roundRect(ctx, sx, 240, w, 96, 20); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.font = '400 40px "Lilita One", sans-serif'; ctx.fillText(n, sx + w / 2, 288);
    ctx.font = '500 22px "Baloo 2", sans-serif'; ctx.fillText(l, sx + w / 2, 318);
    sx += w + 16;
  });

  // visitor's Career Quest progress
  ctx.textAlign = 'left';
  ctx.fillStyle = INK; ctx.font = '700 30px "Space Mono", monospace';
  if (game) {
    const lv = game.level();
    const coins = game.count('coin') + game.count('worldCoin');
    drawCoin(ctx, 106, 460, 22);
    ctx.fillText(`×${coins} · Lv.${lv.index} ${lv.title} · quest ${Math.round(game.completion() * 100)}%`, 142, 470);
  } else {
    ctx.fillText('🎮 play the career map on my site', 90, 470);
  }
  ctx.fillStyle = RED;
  ctx.font = '700 34px "Space Mono", monospace';
  ctx.fillText('adharuqudni.github.io', 90, 540);
  ctx.fillStyle = INK; ctx.font = '400 26px "Baloo 2", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('cross-platform · data pipelines · AI dev tooling', W - 90, 540);

  return c;
}

export function initShareCard(game) {
  const btn = document.getElementById('share-card-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = '📸 Rendering…';
    try {
      const canvas = await draw(game);
      canvas.toBlob(async blob => {
        if (!blob) return;
        // best-effort copy to clipboard
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        } catch {}
        // download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'annas-adharuqudni-card.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        btn.textContent = '✅ Saved!';
        game && game.award('share');
        setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1800);
      }, 'image/png');
    } catch (e) {
      console.warn('share card failed', e);
      btn.textContent = prev; btn.disabled = false;
    }
  });
}
