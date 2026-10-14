/**
 * Yuklama sinovi: N ta soxta o'yinchi serverga ulanadi, haqiqiy o'yinchidek harakatlanadi va
 * otadi. Natija: ping (server javob vaqti) va server sog'lig'i.
 *   node scripts/loadtest.js [url] [N] [soniya]
 *   node scripts/loadtest.js ws://localhost:3000 300 30
 */
const WebSocket = require('ws');
const http = require('http');
const MapLayout = require('../src/shared/mapLayout.js');

const URL = process.argv[2] || 'ws://localhost:3000';
const N = parseInt(process.argv[3] || '300', 10);
const SECONDS = parseInt(process.argv[4] || '30', 10);

const pings = [];
let received = 0;
let hits = 0;
const clients = [];

function bot(i) {
  const ws = new WebSocket(`${URL}/?cid=load${i}x&v=6`);
  let me = null;
  let a = Math.random() * Math.PI * 2;
  let shot = 0;
  ws.on('message', (raw) => {
    received++;
    const m = JSON.parse(raw);
    if (m.type === 'welcome') me = MapLayout.spawnFor(m.mySectorId || 'A1');
    if (m.type === 'pong') pings.push(Date.now() - m.time);
    if (m.type === 'hit') hits++;
  });
  ws.on('open', () => {
    const move = setInterval(() => {
      if (!me) return;
      a += 0.05;
      me.x += Math.cos(a) * 3; // ~60 px/s -- oddiy tank tezligi
      me.y += Math.sin(a) * 3;
      ws.send(
        JSON.stringify({
          type: 'sync_state',
          x: me.x,
          y: me.y,
          bodyAngle: a,
          turretAngle: a,
          hp: 100,
          maxHp: 100,
          dead: false,
        })
      );
    }, 50);
    const fire = setInterval(() => {
      if (!me) return;
      ws.send(
        JSON.stringify({
          type: 'fire_bullet',
          id: `load${i}x:${++shot}`,
          x: me.x,
          y: me.y,
          vx: 234,
          vy: 0,
          damage: 35,
        })
      );
    }, 2000);
    const ping = setInterval(
      () => ws.send(JSON.stringify({ type: 'ping', time: Date.now() })),
      1000
    );
    clients.push({ ws, timers: [move, fire, ping] });
  });
  ws.on('error', () => {});
}

const health = () =>
  new Promise((resolve) => {
    http
      .get(URL.replace('ws', 'http') + '/health', (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      })
      .on('error', () => resolve(null));
  });

(async () => {
  for (let i = 0; i < N; i++) {
    bot(i);
    if (i % 20 === 19) await new Promise((r) => setTimeout(r, 100));
  }
  const samples = [];
  for (let s = 0; s < SECONDS; s += 5) {
    await new Promise((r) => setTimeout(r, 5000));
    const h = await health();
    samples.push(h);
    console.log(`${s + 5}s`, JSON.stringify(h));
  }
  pings.sort((x, y) => x - y);
  const pct = (p) => pings[Math.floor((pings.length - 1) * p)] || 0;
  console.log(
    JSON.stringify({
      clients: clients.length,
      pingMedianMs: pct(0.5),
      ping95Ms: pct(0.95),
      ping99Ms: pct(0.99),
      msgsPerClientPerSec: Math.round(received / Math.max(1, clients.length) / SECONDS),
      maxLoopLagMs: Math.max(...samples.filter(Boolean).map((h) => h.loopLagMs)),
    })
  );
  clients.forEach((c) => {
    c.timers.forEach(clearInterval);
    c.ws.close();
  });
  setTimeout(() => process.exit(0), 500);
})();
