// End-to-end pipeline test: drive Player 1 through grab -> wash -> hang -> dry
// -> fold -> score, asserting the score actually increases. Uses the dev hook
// window.LDB (the Phaser.Game) to teleport the player and read private state.
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1320,820'],
  defaultViewport: { width: 1320, height: 800 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2200);
await page.keyboard.press('Enter'); // menu -> select
await sleep(1000);
await page.keyboard.press('Enter'); // select -> game
await sleep(4500); // countdown (3,2,1,GO ~ 3.2s) + margin

// Helpers that reach into the live scene.
const sceneEval = (fn) =>
  page.evaluate((src) => {
    // eslint-disable-next-line no-eval
    const f = eval('(' + src + ')');
    const scene = window.LDB.scene.getScene('GameScene');
    return f(scene);
  }, fn.toString());

const tp = (x, y) =>
  sceneEval(`(s)=>{ s.players[1].sprite.setPosition(${x}, ${y}); s.players[1].sprite.body.reset(${x}, ${y}); }`);
const tap = async (key) => {
  await page.keyboard.down(key);
  await sleep(90);
  await page.keyboard.up(key);
  await sleep(70);
};
const getState = () =>
  sceneEval(`(s)=>({
     held: s.registry.get('held1'),
     state: s.players[1].state,
     score: s.registry.get('score1') ?? 0,
     cursor: s.players[1].mini ? s.players[1].mini.cursor : null,
  })`);

const L = await sceneEval(`(s)=>s.constructor.name`);
console.log('scene class:', L);

// 1) Grab a dirty item from the shared basket (dirty at 800,360 r=96).
await tp(760, 360);
await tap('Space');
let st = await getState();
console.log('after grab:', JSON.stringify(st.held), 'state', st.state);

// 2) Go to washer (230,250 r=92), deposit + mash F.
await tp(250, 262);
await tap('Space');
for (let i = 0; i < 8; i++) await tap('KeyF');
st = await getState();
console.log('after wash:', JSON.stringify(st.held), 'state', st.state);

// 3) Hang on the clothesline (235,520 r=104).
await tp(235, 520);
await tap('Space');
st = await getState();
console.log('after hang:', JSON.stringify(st.held), 'state', st.state);

// 4) Wait for it to dry (DRY_TIME 8s) then collect.
await sleep(8600);
await tp(235, 520);
await tap('Space');
st = await getState();
console.log('after collect:', JSON.stringify(st.held), 'state', st.state);

// 5) Fold: go to table (470,360 r=92), start, then time the cursor.
await tp(470, 372);
await tap('Space');
const scoreBefore = (await getState()).score;
let folded = false;
for (let i = 0; i < 400 && !folded; i++) {
  const s = await getState();
  if (s.state !== 3 /* FOLDING */) break;
  if (s.cursor !== null && Math.abs(s.cursor - 0.5) <= 0.1) {
    await page.keyboard.press('KeyF');
    await sleep(120);
    const s2 = await getState();
    if (s2.score > scoreBefore) folded = true;
  }
  await sleep(16);
}
st = await getState();
console.log('after fold:', 'score', st.score, 'state', st.state);

await page.screenshot({ path: 'scripts/shots/06-e2e.png' });

console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'NONE');
console.log('RESULT:', st.score > 0 ? 'PASS (scored ' + st.score + ')' : 'FAIL (no score)');

await browser.close();
process.exit(st.score > 0 && errors.length === 0 ? 0 : 1);
