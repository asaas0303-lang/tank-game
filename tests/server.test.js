/**
 * Haqiqiy server + WebSocket klientlar bilan sinov: xonalar, dunyo paketi, zarba tekshiruvi.
 */
const WebSocket = require('ws');
const MapLayout = require('../src/shared/mapLayout.js');
const { server, wss, rooms } = require('../server.js');

let url;
beforeAll((done) => {
  server.listen(0, () => {
    url = `ws://127.0.0.1:${server.address().port}`;
    done();
  });
});
afterAll((done) => {
  wss.clients.forEach((c) => c.terminate());
  server.close(() => done());
});

function connect(cid) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${url}/?cid=${cid}&v=6`);
    const inbox = [];
    ws.inbox = inbox;
    ws.on('message', (m) => inbox.push(JSON.parse(m)));
    ws.waitFor = (pred, ms = 2000) =>
      new Promise((res, rej) => {
        const t0 = Date.now();
        const tick = () => {
          const i = inbox.findIndex(pred);
          if (i !== -1) return res(inbox.splice(i, 1)[0]);
          if (Date.now() - t0 > ms) return rej(new Error('timeout'));
          setTimeout(tick, 10);
        };
        tick();
      });
    ws.sendJ = (o) => ws.send(JSON.stringify(o));
    ws.on('open', () => resolve(ws));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("ikki o'yinchi: bitta xona, server tasdiqlagan zarba IKKALASIGA keladi, soxtasi rad etiladi", async () => {
  const a = await connect('aaaa1');
  const b = await connect('bbbb2');
  const wa = await a.waitFor((m) => m.type === 'welcome');
  const wb = await b.waitFor((m) => m.type === 'welcome');
  expect(wa.roomId).toBe(wb.roomId);

  // Har kim o'z garajidan chiqqan joyda turibdi
  const spA = MapLayout.spawnFor('A1');
  a.sendJ({ type: 'sync_state', x: spA.x, y: spA.y, hp: 100, maxHp: 100, dead: false });
  b.sendJ({ type: 'sync_state', x: spA.x + 200, y: spA.y, hp: 100, maxHp: 100, dead: false });
  const world = await a.waitFor((m) => m.type === 'world' && m.players.length === 2);
  expect(world.players.map((p) => p.id).sort()).toEqual(['aaaa1', 'bbbb2']);

  // Yangi tug'ilganlar 3 s himoyada -- himoya o'tishini kutmasdan sinash uchun vaqtni siljitamiz
  for (const r of rooms.values()) {
    for (const pid of r.players) {
      const st = require('../server.js').players.get(pid).state;
      if (st) st.spawnedAt -= 10000;
    }
  }

  // A otadi va tegdi deydi
  a.sendJ({
    type: 'fire_bullet',
    id: 'aaaa1:1',
    x: spA.x + 30,
    y: spA.y,
    vx: 234,
    vy: 0,
    damage: 35,
  });
  await b.waitFor((m) => m.type === 'peer_fired' && m.id === 'aaaa1:1');
  a.sendJ({
    type: 'hit_peer',
    targetId: 'bbbb2',
    damage: 35,
    bulletId: 'aaaa1:1',
    x: spA.x + 200,
    y: spA.y,
  });
  const hitB = await b.waitFor((m) => m.type === 'hit');
  const hitA = await a.waitFor((m) => m.type === 'hit');
  expect(hitB).toMatchObject({ targetId: 'bbbb2', attackerId: 'aaaa1', damage: 35 });
  expect(hitA.targetId).toBe('bbbb2');

  // Soxta: otilmagan o'q bilan "tegdi"
  a.sendJ({
    type: 'hit_peer',
    targetId: 'bbbb2',
    damage: 999,
    bulletId: 'aaaa1:777',
    x: spA.x + 200,
    y: spA.y,
  });
  await sleep(150);
  expect(b.inbox.some((m) => m.type === 'hit')).toBe(false);

  // Speedhack: bir paketda xaritaning narigi chetiga
  a.sendJ({ type: 'sync_state', x: spA.x + 1200, y: spA.y, hp: 100, maxHp: 100, dead: false });
  const fix = await a.waitFor((m) => m.type === 'pos_correct');
  expect(fix.x).toBeCloseTo(spA.x);

  // Ism orqali HTML kiritish
  a.sendJ({ type: 'set_name', name: '<img src=x onerror=alert(1)>' });
  const ren = await b.waitFor((m) => m.type === 'player_renamed');
  expect(ren.name).not.toMatch(/[<>]/);

  a.close();
  b.close();
});

test("5-o'yinchi yangi xonaga tushadi (bitta jangda 4 tagacha)", async () => {
  await sleep(100);
  const socks = [];
  const roomsSeen = [];
  for (let i = 0; i < 5; i++) {
    const s = await connect(`room${i}x`);
    socks.push(s);
    roomsSeen.push((await s.waitFor((m) => m.type === 'welcome')).roomId);
  }
  expect(new Set(roomsSeen.slice(0, 4)).size).toBe(1);
  expect(roomsSeen[4]).not.toBe(roomsSeen[0]);
  socks.forEach((s) => s.close());
});

test('xabar bombardimoni cheklanadi, server yiqilmaydi', async () => {
  const s = await connect('flood1');
  await s.waitFor((m) => m.type === 'welcome');
  for (let i = 0; i < 400; i++) s.sendJ({ type: 'ping', time: i });
  s.send('{buzuq json');
  await sleep(300);
  const pongs = s.inbox.filter((m) => m.type === 'pong').length;
  expect(pongs).toBeLessThanOrEqual(130);
  expect(pongs).toBeGreaterThan(0);
  s.close();
});

test("server kodi va maxfiy fayllar internetga ochiq emas, o'yin fayllari ochiq", async () => {
  const http = require('http');
  const get = (p) =>
    new Promise((resolve) => {
      http.get(url.replace('ws://', 'http://') + p, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
    });
  const srv = await get('/server.js');
  expect(srv.body).not.toContain('require(');
  expect((await get('/lib/telegramBot.js')).body).not.toContain('TELEGRAM');
  expect((await get('/package.json')).body).not.toContain('"dependencies"');
  const three = await get('/lib/three.module.js');
  expect(three.status).toBe(200);
  expect(three.body).toContain('export');
  expect((await get('/src/shared/mapLayout.js')).body).toContain('MapLayout');
});

test('bir xil o\'yinchi ikkinchi oynada ochilsa, birinchisiga "replaced" keladi', async () => {
  const first = await connect('dupe1');
  await first.waitFor((m) => m.type === 'welcome');
  const second = await connect('dupe1');
  await second.waitFor((m) => m.type === 'welcome');
  const msg = await first.waitFor((m) => m.type === 'replaced');
  expect(msg.type).toBe('replaced');
  second.close();
});
