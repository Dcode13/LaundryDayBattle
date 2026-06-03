// Asset preprocessor for Laundry Day Battle.
//
// The source art in /Assets is AI-generated: sprites sit on a solid magenta
// chroma-key background and the images are very large (400-512px per frame).
// This script:
//   1. Chroma-keys the magenta away (-> transparent alpha), with a soft feather
//      so anti-aliased edges don't leave a hard pink halo.
//   2. Downscales with premultiplied-alpha box filtering so the (now transparent)
//      magenta never bleeds colour into the sprite edges.
//   3. Writes results to /public/assets with spaces stripped from filenames
//      ("P1 - A1.png" -> "P1-A1.png").
//   4. Emits src/generated/assetSizes.ts with the final pixel dimensions so the
//      asset manifest can compute spritesheet frame sizes automatically.
//
// Run with:  npm run preprocess
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { floodRemoveBackground } from './lib/imagekit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'Assets');
const OUT_DIR = path.join(ROOT, 'public', 'assets');
const GEN_DIR = path.join(ROOT, 'src', 'generated');

// Full-scene backgrounds / seamless tiles: keep opaque, do NOT chroma-key.
const COPY_ASIS = new Set(['D1.png', 'D3.png', 'D4.png']);
// Chroma-key but keep full resolution (seamless horizontal tiling needs the size).
const KEY_NO_DOWNSCALE = new Set(['D2.png']);
// Logo art sits on a solid WHITE background (not magenta): flood-fill it away.
const FLOOD_WHITE = new Set(['F1.png']);

const TARGET_MAX_DIM = 384; // everything else is downscaled to roughly this.

/** Soft magenta key: returns the alpha a pixel should keep (0 = fully removed). */
function keyAlpha(r, g, b, a) {
  if (a === 0) return 0;
  // Only bright-ish, magenta-leaning pixels are candidates for removal.
  if (!(r >= 110 && b >= 110)) return a;
  if (g >= 110) return a; // clearly a coloured pixel (e.g. pink hair) -> keep
  if (!((r - g) >= 60 && (b - g) >= 60)) return a; // not magenta-leaning
  // Feather between g=55 (fully transparent) and g=110 (fully kept).
  const keep = Math.max(0, Math.min(1, (g - 55) / (110 - 55)));
  return Math.round(a * keep);
}

/** Apply the chroma key in-place over an RGBA buffer. */
function applyKey(png) {
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = keyAlpha(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }
}

/** Premultiplied-alpha box downscale by an integer factor. */
function downscale(src, factor) {
  if (factor <= 1) return src;
  const outW = Math.floor(src.width / factor);
  const outH = Math.floor(src.height / factor);
  const out = new PNG({ width: outW, height: outH });
  const s = src.data;
  const d = out.data;
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      let sumA = 0, sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let by = 0; by < factor; by++) {
        const sy = oy * factor + by;
        for (let bx = 0; bx < factor; bx++) {
          const sx = ox * factor + bx;
          const si = (sy * src.width + sx) * 4;
          const a = s[si + 3];
          sumA += a;
          sumR += s[si] * a; // premultiplied accumulation
          sumG += s[si + 1] * a;
          sumB += s[si + 2] * a;
          count++;
        }
      }
      const di = (oy * outW + ox) * 4;
      if (sumA > 0) {
        d[di] = Math.round(sumR / sumA);
        d[di + 1] = Math.round(sumG / sumA);
        d[di + 2] = Math.round(sumB / sumA);
      } else {
        d[di] = d[di + 1] = d[di + 2] = 0;
      }
      d[di + 3] = Math.round(sumA / count);
    }
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }
  ensureDir(OUT_DIR);
  ensureDir(GEN_DIR);

  const files = fs.readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
  const sizes = {};

  for (const file of files) {
    const outName = file.replace(/\s+/g, ''); // "P1 - A1.png" -> "P1-A1.png"
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, outName);

    if (COPY_ASIS.has(outName)) {
      const png = PNG.sync.read(fs.readFileSync(srcPath));
      fs.copyFileSync(srcPath, outPath);
      sizes[outName] = { w: png.width, h: png.height };
      console.log(`copy   ${file.padEnd(14)} -> ${outName}  ${png.width}x${png.height}`);
      continue;
    }

    let png = PNG.sync.read(fs.readFileSync(srcPath));
    applyKey(png);

    let factor = 1;
    if (!KEY_NO_DOWNSCALE.has(outName)) {
      const maxDim = Math.max(png.width, png.height);
      factor = Math.max(1, Math.round(maxDim / TARGET_MAX_DIM));
    }
    png = downscale(png, factor);

    if (FLOOD_WHITE.has(outName)) floodRemoveBackground(png);

    fs.writeFileSync(outPath, PNG.sync.write(png));
    sizes[outName] = { w: png.width, h: png.height };
    console.log(`key/x${factor} ${file.padEnd(14)} -> ${outName}  ${png.width}x${png.height}`);
  }

  const ts =
    '// AUTO-GENERATED by scripts/preprocess.mjs. Do not edit by hand.\n' +
    '// Final pixel dimensions of every processed image in public/assets.\n' +
    'export const ASSET_SIZES: Record<string, { w: number; h: number }> = ' +
    JSON.stringify(sizes, null, 2) +
    ';\n';
  fs.writeFileSync(path.join(GEN_DIR, 'assetSizes.ts'), ts);
  console.log(`\nWrote ${Object.keys(sizes).length} assets -> public/assets`);
  console.log('Wrote src/generated/assetSizes.ts');
}

main();
