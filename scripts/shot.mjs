// Headless smoke test: load the game, click into gameplay, capture console + screenshots.
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5173/';
const OUT = 'scripts/shots';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--window-size=1320,820', '--no-sandbox'],
  defaultViewport: { width: 1320, height: 800 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2500); // preload + menu
await page.screenshot({ path: `${OUT}/01-menu.png` });

// Menu -> CharacterSelect -> Game
await page.keyboard.press('Enter');
await sleep(1200);
await page.screenshot({ path: `${OUT}/02-select.png` });
await page.keyboard.press('Enter');
await sleep(1200);
await page.screenshot({ path: `${OUT}/03-countdown.png` });
await sleep(3000); // GO + a moment of play
await page.screenshot({ path: `${OUT}/04-game.png` });

// Drive players a bit: P1 toward center & grab; P2 around.
async function hold(key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}
await hold('KeyD', 900); // P1 right toward basket
await hold('ArrowLeft', 900); // P2 left toward basket
await page.keyboard.press('Space');
await page.keyboard.press('Enter');
await sleep(500);
await page.screenshot({ path: `${OUT}/05-play.png` });

console.log('CONSOLE LOG:\n' + (logs.join('\n') || '(none)'));
const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
console.log('\nERRORS: ' + (errors.length ? '\n' + errors.join('\n') : 'NONE'));

await browser.close();
