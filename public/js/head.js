// Head tracking from the camera, by the position of a marker on the
// forehead: a bright sticker of one colour. Each frame, the pixels of that
// colour are found and their centre is the marker. The marker's movement
// from a centre the person set becomes a cursor position from -1 to 1 on
// each axis, scaled by a sensitivity and smoothed.
//
// No model and no download: colour matching in a small canvas, about thirty
// times a second. Select the sticker in the preview to tell it the colour.
// The camera picture never leaves the browser.
const W = 160, H = 120; // the size frames are analysed at

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

export function createHeadTracker({ video, preview, onMove = () => {}, onStatus = () => {} }) {
  const cfg = { gain: 2.5, smoothing: 0.6, tolerance: 18, mirror: true, minSat: 0.45, minVal: 0.35, minPixels: 12 };
  let color = { h: 120, s: 0.8, v: 0.8 }; // a bright green sticker, until one is picked
  let stream = null, raf = 0, running = false;
  let center = null;        // marker position (0..1) that means "cursor in the middle"
  let marker = null;        // last marker position (0..1), or null when not seen
  let sx = 0, sy = 0;       // the smoothed cursor
  const work = document.createElement('canvas'); work.width = W; work.height = H;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  const pctx = preview.getContext('2d');

  async function start() {
    if (running) return;
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    running = true;
    onStatus('Camera on. Select the sticker in the picture, then Center.', false);
    loop();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null; marker = null;
    pctx.clearRect(0, 0, preview.width, preview.height);
    onStatus('Camera is off.', false);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (video.readyState < 2) return;
    wctx.drawImage(video, 0, 0, W, H);
    const { data } = wctx.getImageData(0, 0, W, H);
    let n = 0, sumX = 0, sumY = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      if (s < cfg.minSat || v < cfg.minVal) continue;
      let dh = Math.abs(h - color.h); if (dh > 180) dh = 360 - dh;
      if (dh > cfg.tolerance) continue;
      n++; sumX += p % W; sumY += (p / W) | 0;
    }
    const found = n >= cfg.minPixels;
    marker = found ? { x: sumX / n / W, y: sumY / n / H, n } : null;
    drawPreview();
    if (!found) { onStatus('Sticker not seen. Select it in the picture, or bring it into view.', false); return; }
    if (!center) { onStatus(`Sticker seen (${n} pixels). Hold still and choose Center.`, true); return; }
    // Movement from the centre, scaled; mirrored so leaning left moves left.
    let nx = (marker.x - center.x) * cfg.gain * 2, ny = (marker.y - center.y) * cfg.gain * 2;
    if (cfg.mirror) nx = -nx;
    nx = Math.max(-1, Math.min(1, nx)); ny = Math.max(-1, Math.min(1, ny));
    const a = 1 - cfg.smoothing;
    sx += (nx - sx) * a; sy += (ny - sy) * a;
    onMove(sx, sy);
    onStatus(`Tracking (${n} pixels).`, true);
  }

  // The camera picture, mirrored, with the marker ringed and the centre crossed.
  function drawPreview() {
    const w = preview.width, h = preview.height;
    pctx.save();
    if (cfg.mirror) { pctx.translate(w, 0); pctx.scale(-1, 1); }
    pctx.drawImage(video, 0, 0, w, h);
    if (center) { pctx.strokeStyle = '#7cc4ff'; pctx.lineWidth = 2; pctx.beginPath(); pctx.moveTo(center.x * w - 10, center.y * h); pctx.lineTo(center.x * w + 10, center.y * h); pctx.moveTo(center.x * w, center.y * h - 10); pctx.lineTo(center.x * w, center.y * h + 10); pctx.stroke(); }
    if (marker) { pctx.strokeStyle = '#ffd166'; pctx.lineWidth = 3; pctx.beginPath(); pctx.arc(marker.x * w, marker.y * h, 8 + Math.sqrt(marker.n), 0, Math.PI * 2); pctx.stroke(); }
    pctx.restore();
  }

  // The colour of the sticker: the average around a point in the preview (0..1, as shown, so un-mirrored here).
  function pickColor(u, v) {
    if (!running) return;
    const px = Math.round((cfg.mirror ? 1 - u : u) * (W - 1)), py = Math.round(v * (H - 1));
    const { data } = wctx.getImageData(Math.max(0, px - 2), Math.max(0, py - 2), 5, 5);
    let r = 0, g = 0, b = 0, k = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; k++; }
    const [h, s, val] = rgbToHsv(r / k, g / k, b / k);
    color = { h, s, v: val };
    cfg.minSat = Math.max(0.25, s * 0.6); cfg.minVal = Math.max(0.2, val * 0.5);
    center = null;
    onStatus(`Colour set (hue ${Math.round(h)}). Hold still and choose Center.`, !!marker);
  }
  function setCenter() { if (marker) { center = { x: marker.x, y: marker.y }; sx = sy = 0; } }
  function set(changes) { Object.assign(cfg, changes); }

  return { start, stop, center: setCenter, pickColor, set, get running() { return running; }, get marker() { return marker; }, get color() { return color; } };
}
