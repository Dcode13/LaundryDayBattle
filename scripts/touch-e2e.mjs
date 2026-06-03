// Verifies on-screen touch controls on an emulated mobile device:
//  - the virtual joystick moves the player
//  - the GRAB button picks up an item
// Dispatches real touch events via CDP at coordinates mapped from the game's
// 1280x720 design space into CSS pixels (through Phaser's Scale Manager).
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=960,540'],
});
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 960, height: 540, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:5173/?touch=1', { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2200);
await page.keyboard.press('Enter'); // menu -> select
await sleep(1000);
await page.keyboard.press('Enter'); // select -> game
await sleep(4500); // countdown + GO

const ev = (src) =>
  page.evaluate((s) => eval('(' + s + ')')(window.LDB.scene.getScene('GameScene')), src);

// Map design-space (1280x720) coords to CSS px via the Scale Manager.
const map = await page.evaluate(() => {
  const s = window.LDB.scale;
  const b = s.canvasBounds;
  return { bx: b.x, by: b.y, sw: s.displaySize.width, sh: s.displaySize.height, gw: s.gameSize.width, gh: s.gameSize.height };
});
const css = (dx, dy) => ({ x: map.bx + (dx * map.sw) / map.gw, y: map.by + (dy * map.sh) / map.gh });

const client = await page.target().createCDPSession();
const touch = (type, pts) =>
  client.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });

// Confirm touch controls exist (a UIScene should hold the joystick/button arcs).
const controlsCount = await page.evaluate(() => {
  const ui = window.LDB.scene.getScene('UIScene');
  return ui.children.list.filter((o) => o.type === 'Arc').length;
});
console.log('touch control arcs in UIScene:', controlsCount);

// 1) JOYSTICK: press in P1 joystick zone (design ~110,560) and drag right to move.
const x0 = await ev(`(s)=>Math.round(s.players[1].x)`);
const start = css(110, 560);
const right = css(210, 560); // +100px -> near full deflection right
await touch('touchStart', [start]);
await sleep(60);
await touch('touchMove', [right]);
await sleep(700); // hold the stick right
const x1 = await ev(`(s)=>Math.round(s.players[1].x)`);
await touch('touchEnd', []);
console.log(`joystick move: x ${x0} -> ${x1} (moved right by ${x1 - x0}px)`);

// 2) GRAB button: teleport P1 onto the shared basket, then tap GRAB (design ~430,628).
await ev(`(s)=>{ s.players[1].sprite.setPosition(780,360); s.players[1].sprite.body.reset(780,360); }`);
await sleep(120);
const grabBtn = css(430, 540 - 92 + (720 - 540)); // button is at H-92 in design; H=720
const gb = css(430, 720 - 92);
void grabBtn;
await touch('touchStart', [gb]);
await sleep(80);
await touch('touchEnd', []);
await sleep(200);
const held = await ev(`(s)=>s.registry.get('held1')`);
console.log('after GRAB tap:', JSON.stringify(held));

await page.screenshot({ path: 'scripts/shots/09-touch.png' });

console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'NONE');
const moved = x1 - x0 > 30;
const grabbed = held && typeof held.type === 'number';
console.log('RESULT:', moved && grabbed && errors.length === 0 ? 'PASS' : 'FAIL', { moved, grabbed });
await browser.close();
process.exit(moved && grabbed && errors.length === 0 ? 0 : 1);
