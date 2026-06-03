// Shared image helpers for the asset pipeline.

/**
 * Remove a solid light/white background by flood-filling inward from the image
 * borders, so white *inside* the artwork (e.g. logo highlights) is preserved.
 * Edges are softly feathered to avoid a light halo. Mutates png.data in place.
 *
 * @param {{width:number,height:number,data:Buffer|Uint8Array}} png
 * @param {{thresh?:number, neutral?:number, feather?:boolean}} [opts]
 */
export function floodRemoveBackground(png, opts = {}) {
  const thresh = opts.thresh ?? 230; // min channel value to count as "light"
  const neutral = opts.neutral ?? 26; // max-min channel spread to count as neutral (not a colour)
  const feather = opts.feather ?? true;
  const { width: w, height: h, data } = png;

  const isLight = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[i + 3] === 0) return false;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mn >= thresh && mx - mn <= neutral;
  };

  const visited = new Uint8Array(w * h);
  const stack = [];
  const pushIfLight = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    if (isLight(p * 4)) {
      visited[p] = 1;
      stack.push(p);
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfLight(x, 0);
    pushIfLight(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfLight(0, y);
    pushIfLight(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0; // make transparent
    const x = p % w;
    const y = (p / w) | 0;
    pushIfLight(x - 1, y);
    pushIfLight(x + 1, y);
    pushIfLight(x, y - 1);
    pushIfLight(x, y + 1);
  }

  if (feather) {
    // One-ring soft edge: kept light-ish pixels touching a transparent pixel
    // fade out by brightness, killing the anti-aliased fringe.
    const out = Uint8Array.from(data);
    const transparent = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] === 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] === 0) continue;
        const mn = Math.min(data[i], data[i + 1], data[i + 2]);
        if (mn < 196) continue;
        if (transparent(x - 1, y) || transparent(x + 1, y) || transparent(x, y - 1) || transparent(x, y + 1)) {
          const f = Math.max(0, Math.min(1, (236 - mn) / 40)); // mn 196 -> 1, 236 -> 0
          out[i + 3] = Math.round(data[i + 3] * f);
        }
      }
    }
    data.set(out);
  }
}
