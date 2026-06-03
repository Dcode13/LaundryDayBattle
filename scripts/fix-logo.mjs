// One-off: strip the white background from an already-processed logo in
// public/assets (used when the high-res source in /Assets isn't available to
// re-run the full preprocess). Idempotent.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { floodRemoveBackground } from './lib/imagekit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '..', 'public', 'assets', process.argv[2] ?? 'F1.png');

const png = PNG.sync.read(fs.readFileSync(file));
floodRemoveBackground(png);
fs.writeFileSync(file, PNG.sync.write(png));
console.log(`Stripped background from ${path.basename(file)} (${png.width}x${png.height})`);
