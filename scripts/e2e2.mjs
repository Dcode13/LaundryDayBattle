// Verifies sock pairing, wind, rain and power-up code paths run without errors
// and produce the expected state changes.
import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1320, height: 800 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2200);
await page.keyboard.press('Enter');
await sleep(1000);
await page.keyboard.press('Enter');
await sleep(4500);

const ev = (src) =>
  page.evaluate((s) => eval('(' + s + ')')(window.LDB.scene.getScene('GameScene')), src);

// Grab once to obtain the ClothesItem class via an instance.
await ev(`(s)=>{s.players[1].sprite.setPosition(760,360);s.players[1].sprite.body.reset(760,360);}`);
await page.keyboard.down('Space');
await sleep(90);
await page.keyboard.up('Space');
await sleep(150);

const sockTest = await ev(`(s)=>{
  const held = s.players[1].held;
  if(!held) return {err:'no grab'};
  const Cls = held.constructor;
  const mk = ()=> new Cls(s, 3 /*SOCK*/, 2 /*DRY*/, 820, 300);
  const before = s.registry.get('score1')||0;
  s.players[1].state = 3; s.players[1].mini = {item:mk(),taps:0,holdMs:0,cursor:0,dir:1};
  s.finishFold(1, s.players[1].mini.item, true);
  const afterFirst = s.registry.get('score1')||0;
  const pending = !!s.players[1].pendingSock;
  s.players[1].state = 3; s.players[1].mini = {item:mk(),taps:0,holdMs:0,cursor:0,dir:1};
  s.finishFold(1, s.players[1].mini.item, true);
  const afterPair = s.registry.get('score1')||0;
  return {before, afterFirst, pending, afterPair, pairBonus: afterPair-afterFirst};
}`);
console.log('SOCK PAIR:', JSON.stringify(sockTest));

// Wind: hang a wet item on P2 line, then gust. Some may fall to ground.
const windTest = await ev(`(s)=>{
  const Cls = s.players[1].held ? s.players[1].held.constructor : null;
  // hang two wet items on player 2's line
  for(let i=0;i<2;i++){ const it=new Cls(s,0,1,0,0); const slot=s.stations[2].line.emptySlotIndex(); if(slot>=0) s.stations[2].line.hang(it,slot); }
  const before = s.groundItems.length;
  s.triggerWind();
  return {hung: s.stations[2].line.hungItems().length, groundDelta: s.groundItems.length - before};
}`);
console.log('WIND:', JSON.stringify(windTest));

// Rain: weather should go STORM and re-wet the line.
const rainTest = await ev(`(s)=>{ s.triggerRain(); return {weather: s.registry.get('weather'), hasEmitter: !!s.rainEmitter}; }`);
console.log('RAIN:', JSON.stringify(rainTest), '(weather 2 == STORM)');

// Sock runaway event with a pending sock present.
const sockEvt = await ev(`(s)=>{ const had=!!s.players[1].pendingSock; s.triggerSockEvent(); return {had, markers: s.sockMarkers.size}; }`);
console.log('SOCK EVENT:', JSON.stringify(sockEvt));

// Power-up: grant + use each type without error.
const puTest = await ev(`(s)=>{
  const out=[];
  for(let t=0;t<4;t++){ s.heldPowerup[1]=t; s.usePowerUp(1); out.push(s.registry.get('powerup1')); }
  return {after: out};
}`);
console.log('POWERUPS:', JSON.stringify(puTest));

await sleep(500);
console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'NONE');
const ok =
  sockTest.pending === true &&
  sockTest.afterFirst === sockTest.before &&
  sockTest.pairBonus === 40 &&
  rainTest.weather === 2 &&
  errors.length === 0;
console.log('RESULT:', ok ? 'PASS' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
