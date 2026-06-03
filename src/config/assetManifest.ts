import { ASSET_SIZES } from '../generated/assetSizes';

export interface SheetDef {
  file: string;
  cols: number;
  rows: number;
}

// Spritesheets (sliced into frames). cols/rows describe the grid layout that
// was confirmed by inspecting each source image; frame size is derived from the
// processed image dimensions in ASSET_SIZES.
export const SHEETS: Record<string, SheetDef> = {
  p1_idle: { file: 'P1-A1.png', cols: 3, rows: 1 },
  p1_walk: { file: 'P1-A2.png', cols: 4, rows: 1 },
  p1_carry: { file: 'P1-A3.png', cols: 2, rows: 1 },
  p1_action: { file: 'P1-A4.png', cols: 2, rows: 1 },
  p2_idle: { file: 'P2-A1.png', cols: 3, rows: 1 },
  p2_walk: { file: 'P2-A2.png', cols: 4, rows: 1 },
  p2_carry: { file: 'P2-A3.png', cols: 2, rows: 1 },
  p2_action: { file: 'P2-A4.png', cols: 2, rows: 1 },
  clothes_dirty: { file: 'B1.png', cols: 3, rows: 2 },
  clothes_wet: { file: 'B2.png', cols: 3, rows: 2 },
  clothes_folded: { file: 'B3.png', cols: 3, rows: 2 },
  socks: { file: 'B4.png', cols: 3, rows: 1 },
  washer: { file: 'C1.png', cols: 3, rows: 1 },
  sky: { file: 'D4.png', cols: 3, rows: 1 },
  rain: { file: 'E2.png', cols: 3, rows: 1 },
  storm: { file: 'E3.png', cols: 2, rows: 1 },
  meter: { file: 'F3.png', cols: 2, rows: 1 },
  hud_icons: { file: 'F4.png', cols: 4, rows: 1 },
  pu_icons: { file: 'F5.png', cols: 4, rows: 1 },
  buttons: { file: 'F6.png', cols: 3, rows: 1 },
  countdown: { file: 'F7.png', cols: 4, rows: 1 },
};

// Single images.
export const IMAGES: Record<string, string> = {
  line_empty: 'C2.png',
  line_full: 'C3.png',
  peg: 'C4.png',
  fold_table: 'C5.png',
  dirty_pile: 'C6.png',
  clean_box: 'C7.png',
  score_pile: 'C8.png',
  rack: 'C9.png',
  ground: 'D1.png',
  fence: 'D2.png',
  bg_house: 'D3.png',
  fx_wind: 'E1.png',
  fx_bolt: 'E4.png',
  marker_sock: 'E5.png',
  logo: 'F1.png',
  vs_badge: 'F2.png',
  banner_win: 'F8.png',
  p_bubbles: 'G1.png',
  p_splash: 'G2.png',
  p_sparkle: 'G3.png',
  p_bonk: 'G4.png',
  p_sweat: 'G5.png',
};

export function frameSize(def: SheetDef): { frameWidth: number; frameHeight: number } {
  const s = ASSET_SIZES[def.file];
  if (!s) throw new Error(`Missing size for ${def.file} (run npm run preprocess)`);
  return {
    frameWidth: Math.floor(s.w / def.cols),
    frameHeight: Math.floor(s.h / def.rows),
  };
}

// Texture key constants (string-typed for convenience).
export const TEX = {
  ...Object.keys(SHEETS).reduce((a, k) => ({ ...a, [k]: k }), {}),
  ...Object.keys(IMAGES).reduce((a, k) => ({ ...a, [k]: k }), {}),
} as Record<string, string>;
