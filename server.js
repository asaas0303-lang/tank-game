const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { Sentry } = require('./lib/sentry');
const MapLayout = require('./src/shared/mapLayout.js');
const { RULES, sanitizeName, RateLimiter, validateMove, ShotLedger } = require('./lib/netRules.js');

const app = express();
const server = http.createServer(app);
// maxPayload: juda katta xabar bilan serverni bo'g'ib qo'yishning oldini oladi
const wss = new WebSocket.Server({ server, maxPayload: 32 * 1024 });

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  Sentry.captureException(err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  Sentry.captureException(reason);
});

// Faqat o'yinga kerakli fayllar ochiq (avval butun loyiha -- server kodi, testlar -- ochiq edi).
// HTML/JS har safar tekshiriladi -- yangi versiya chiqqanda Telegram eski kodni ko'rsatmaydi.
const noCache = { headers: { 'Cache-Control': 'no-cache' } };
app.use(
  '/src',
  express.static(path.join(__dirname, 'src'), {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  })
);
const PUBLIC_FILES = [
  '/manifest.json',
  '/lib/three.module.js',
  '/lib/three.core.js',
  '/lib/BufferGeometryUtils.js',
];
app.get(PUBLIC_FILES, (req, res) => res.sendFile(path.join(__dirname, req.path), noCache));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), noCache);
});

// Central Asian bot names
const CENTRAL_ASIAN_NAMES = [
  'Temur',
  'Dias',
  'Manas',
  'Rustam',
  'Ivan',
  'Alixon',
  'Farhod',
  'Bobur',
  'Sherdor',
  'Alexey',
  'Daniyar',
  'Chingiz',
  'Sanzhar',
  'Andrey',
  'Valisher',
  'Bekzod',
  'Nurbol',
  'Erlan',
  'Jalol',
  'Samat',
];

const MIN_VERSION = 6;
const SECTOR_IDS = ['A1', 'A2', 'B1', 'B2'];
// Bitta jangda 4 garaj = 4 tagacha odam. To'lsa yangi xona avtomatik ochiladi --
// shu tufayli 1000 kishi kirsa ham har telefon faqat o'z jangidagi 4 tankni oladi.
const ROOM_CAPACITY = 4;
// 4 ta garaj: odam + bot = 4 (har biriga bitta garaj)
const BOT_COUNT_BY_HUMANS = { 1: 3, 2: 2, 3: 1, 4: 0 };

let nextPlayerId = 100;
let nextRoomSeq = 1;

// Short, stable "friend code" per device (cid), so players can share a typeable number
// even though the real internal playerId is a long persistent cid string.
let nextFriendCode = 1000;
const cidToCode = new Map(); // playerId(cid) -> qisqa kod (string)
const codeToCid = new Map(); // qisqa kod -> playerId(cid)

// playerId -> { id, name, ws, roomId, state, ledger, rl, ... }
const players = new Map();
// roomId -> { id, name, players: Set<playerId>, hostId, bots, sectors, ... }
const rooms = new Map();

const SECTOR_SIZE = MapLayout.SECTOR_SIZE;

function createRoom() {
  const id = `arena-${nextRoomSeq++}`;
  const room = {
    id,
    name: `Jang #${id.split('-')[1]}`,
    mode: 'Deathmatch',
    players: new Set(),
    hostId: null,
    bots: [],
    sectors: [],
    cols: 2,
    rows: 2,
    worldWidth: MapLayout.WORLD_SIZE,
    worldHeight: MapLayout.WORLD_SIZE,
    lastBotSyncAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

// Eng to'la (lekin to'lmagan) xona -- odamlar bir joyga yig'ilsin, bo'sh janglar ko'paymasin
function findOpenRoom() {
  let best = null;
  for (const r of rooms.values()) {
    if (r.players.size >= ROOM_CAPACITY) continue;
    if (!best || r.players.size > best.players.size) best = r;
  }
  return best || createRoom();
}

function broadcastToRoom(roomId, message, senderId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  room.players.forEach((pId) => {
    if (pId === senderId) return;
    const p = players.get(pId);
    if (p && p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  });
}

function sendTo(playerId, message) {
  const p = players.get(playerId);
  if (p && p.ws.readyState === WebSocket.OPEN) p.ws.send(JSON.stringify(message));
}

function updateRoomHost(room) {
  if (room.players.size === 0) {
    room.hostId = null;
    return;
  }
  const current = room.hostId ? players.get(room.hostId) : null;
  const currentFresh =
    current && room.players.has(room.hostId) && Date.now() - (current.lastSeen || 0) < 10000;
  if (currentFresh) return; // hozirgi host yaxshi ishlayapti -- tegmaymiz

  // eng so'nggi faol o'yinchini host qilamiz (botlarni shu o'yinchi boshqaradi)
  let best = null;
  for (const pid of room.players) {
    const p = players.get(pid);
    if (p && (!best || (p.lastSeen || 0) > (best.lastSeen || 0))) best = p;
  }
  const newHost = best ? best.id : Array.from(room.players)[0];
  if (newHost !== room.hostId) {
    room.hostId = newHost;
    broadcastToRoom(room.id, { type: 'host_update', hostId: room.hostId });
  }
}

// Bot joyini SERVER belgilaydi -> hamma klientda bir xil. Odamlarning garajiga bot tushmaydi.
function assignBotSpawns(room) {
  if (!room.sectors || room.sectors.length === 0) return false;
  let assigned = false;
  const humanSectorIds = new Set();
  for (const pid of room.players) {
    const sec = room.sectors.find((s) => s.ownerPlayerId === pid);
    if (sec) humanSectorIds.add(sec.id);
  }
  for (const bot of room.bots) {
    if (typeof bot.x === 'number' && typeof bot.y === 'number') continue;
    assigned = true;
    const used = new Set(room.bots.map((b) => b.sectorId).filter(Boolean));
    const free = SECTOR_IDS.filter((sid) => !humanSectorIds.has(sid) && !used.has(sid));
    const sid = free[0] || SECTOR_IDS.find((s) => !humanSectorIds.has(s)) || 'B2';
    const sp = MapLayout.spawnFor(sid);
    bot.sectorId = sid;
    bot.x = sp.x;
    bot.y = sp.y;
  }
  return assigned;
}

function updateRoomSectors(room) {
  const humans = Array.from(room.players)
    .map((pid) => players.get(pid))
    .filter(Boolean);
  // Har bir odamga bitta garaj (o'tirgan garajini o'zgartirmaymiz)
  const taken = new Map(); // sid -> owner
  for (const p of humans) if (p.sectorId && !taken.has(p.sectorId)) taken.set(p.sectorId, p);
  for (const p of humans) {
    if (p.sectorId && taken.get(p.sectorId) === p) continue;
    p.sectorId = SECTOR_IDS.find((s) => !taken.has(s)) || SECTOR_IDS[0];
    taken.set(p.sectorId, p);
  }
  // Odam egallagan garajdagi bot boshqa garajga ko'chadi
  for (const b of room.bots) {
    if (b.sectorId && taken.has(b.sectorId)) {
      b.sectorId = null;
      b.x = null;
      b.y = null;
    }
  }

  room.sectors = SECTOR_IDS.map((id, i) => {
    const owner = taken.get(id);
    const bot = room.bots.find((b) => b.sectorId === id);
    const ownerName = owner ? `${owner.name} Hududi` : bot ? `${bot.name} Hududi` : 'Taktik Zona';
    return {
      id,
      name: `${i + 1}-xona`,
      subName: `[${ownerName}]`,
      ownerName,
      ownerPlayerId: owner ? owner.id : null,
      col: i % 2,
      row: Math.floor(i / 2),
      x: (i % 2) * SECTOR_SIZE,
      y: Math.floor(i / 2) * SECTOR_SIZE,
      w: SECTOR_SIZE,
      h: SECTOR_SIZE,
      themeColor: owner ? '#00f0ff' : '#ff2a5f',
    };
  });

  if (assignBotSpawns(room)) {
    broadcastToRoom(room.id, {
      type: 'bots_update',
      bots: room.bots,
      humanCount: room.players.size,
      targetBotCount: room.bots.length,
    });
  }

  // mySectorId har kimda boshqacha -- shuning uchun alohida yuboriladi
  for (const p of humans) {
    sendTo(p.id, {
      type: 'sectors_update',
      cols: 2,
      rows: 2,
      worldWidth: room.worldWidth,
      worldHeight: room.worldHeight,
      sectorSize: SECTOR_SIZE,
      sectors: room.sectors,
      mySectorId: p.sectorId,
    });
  }
}

function balanceRoomBots(room) {
  const targetBotCount = BOT_COUNT_BY_HUMANS[room.players.size] || 0;
  while (room.bots.length < targetBotCount) {
    room.bots.push({
      id: `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: CENTRAL_ASIAN_NAMES[Math.floor(Math.random() * CENTRAL_ASIAN_NAMES.length)],
      level: Math.floor(Math.random() * 2) + 1,
      isBot: true,
      sectorId: null,
      x: null,
      y: null,
    });
  }
  while (room.bots.length > targetBotCount) room.bots.pop();
  assignBotSpawns(room);
  broadcastToRoom(room.id, {
    type: 'bots_update',
    bots: room.bots,
    humanCount: room.players.size,
    targetBotCount,
  });
}

function roomPlayersPayload(room) {
  return Array.from(room.players)
    .map((pid) => players.get(pid))
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      kills: p.kills,
      level: p.level,
      isAfk: p.isAfk,
    }));
}

function leaveRoom(player) {
  const room = rooms.get(player.roomId);
  player.roomId = null;
  player.sectorId = null;
  player.state = null;
  if (!room) return;
  room.players.delete(player.id);
  if (room.players.size === 0) {
    rooms.delete(room.id); // bo'sh xona xotirada qolmaydi
    return;
  }
  updateRoomHost(room);
  broadcastToRoom(room.id, { type: 'player_left', playerId: player.id });
  balanceRoomBots(room);
  updateRoomSectors(room);
}

function joinRoom(player, room, type = 'room_joined') {
  if (player.roomId) leaveRoom(player);
  room.players.add(player.id);
  player.roomId = room.id;
  updateRoomHost(room);
  balanceRoomBots(room);
  updateRoomSectors(room);
  sendTo(player.id, {
    type,
    playerId: player.id,
    code: player.code,
    name: player.name,
    roomId: room.id,
    roomName: room.name,
    mode: room.mode,
    hostId: room.hostId,
    serverVersion: 'v7',
    players: roomPlayersPayload(room),
    bots: room.bots,
    sectors: room.sectors,
    cols: 2,
    rows: 2,
    worldWidth: room.worldWidth,
    worldHeight: room.worldHeight,
    sectorSize: SECTOR_SIZE,
    mySectorId: player.sectorId,
    tashkentOffset: 5, // UTC+5
  });
  sendTo(player.id, { type: 'host_update', hostId: room.hostId });
  broadcastToRoom(
    room.id,
    { type: 'player_joined', playerId: player.id, name: player.name },
    player.id
  );
}

function getFriendsListPayload(playerId) {
  const player = players.get(playerId);
  if (!player) return [];
  return Array.from(player.friends).map((fId) => {
    const friend = players.get(fId);
    return friend
      ? {
          id: friend.id,
          name: friend.name,
          code: cidToCode.get(friend.id) || '',
          online: true,
          roomId: friend.roomId,
          isAfk: friend.isAfk,
        }
      : {
          id: fId,
          name: `O'yinchi #${cidToCode.get(fId) || fId}`,
          code: cidToCode.get(fId) || '',
          online: false,
          roomId: null,
          isAfk: false,
        };
  });
}

// --- Tiriklik tekshiruvi: yarim-ochiq (half-open) ulanishlarni o'ldirish ---
// Telefon internetdan uzilsa 'close' hodisasi KELMAYDI. Shuning uchun har 15 soniyada
// WebSocket-darajasidagi ping yuboramiz; javob bermagan ulanish keyingi turda o'ldiriladi.
const HEARTBEAT_MS = 15000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      try {
        client.terminate();
      } catch (e) {}
      return;
    }
    client.isAlive = false;
    try {
      client.ping();
    } catch (e) {}
  });
}, HEARTBEAT_MS).unref();
wss.on('close', () => clearInterval(heartbeatTimer));

// 20 soniya mutlaqo jim bo'lsa -- bu o'yinchi yo'q, tozalaymiz. Host bot_sync yubormasa almashadi.
const ACTIVITY_TIMEOUT_MS = 20000;
setInterval(() => {
  const now = Date.now();
  for (const p of players.values()) {
    // lastSeen'ni bu yerda yangilamaymiz -- u host saylovida ishlatiladi
    const lastActivity = Math.max(p.lastSeen || 0, (p.ws && p.ws.lastPongAt) || 0);
    if (now - lastActivity > ACTIVITY_TIMEOUT_MS) {
      try {
        p.ws.terminate();
      } catch (e) {}
    }
  }
  for (const room of rooms.values()) {
    if (room.players.size < 2 || room.bots.length === 0) continue;
    if (now - (room.lastBotSyncAt || 0) > 6000) {
      room.hostId = null; // majburan qayta tanlash
      updateRoomHost(room);
      room.lastBotSyncAt = now;
    }
  }
}, 5000).unref();

// --- Dunyo holati: har 50 ms da xonadagi hamma tanklar BITTA paketda ---
// Avval har o'yinchi har 35 ms da xabar yuborardi va server uni har kimga alohida
// tarqatardi (N^2 xabar). Endi server bitta paket yig'adi.
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.players.size < 2) continue;
    const list = [];
    for (const pid of room.players) {
      const p = players.get(pid);
      if (!p || !p.state) continue;
      const s = p.state;
      list.push({
        id: p.id,
        n: p.name,
        c: p.code,
        x: r1(s.x),
        y: r1(s.y),
        b: r3(s.b),
        tu: r3(s.tu),
        hp: Math.round(s.hp),
        mhp: s.mhp,
        sh: s.sh,
        lv: s.lv,
        w: s.w,
        d: s.d ? 1 : 0,
        afk: p.isAfk ? 1 : 0,
      });
    }
    if (list.length > 0) broadcastToRoom(room.id, { type: 'world', t: Date.now(), players: list });
  }
}, RULES.TICK_MS).unref();

const num = (v, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : def);

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  // Brauzer ping freym'iga JS ishtirokisiz javob beradi (o'yin pauzada bo'lsa ham)
  ws.lastPongAt = Date.now();
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastPongAt = Date.now();
  });

  let requestedCid = null;
  let clientVersion = 0;
  try {
    const qs = (req && req.url && req.url.split('?')[1]) || '';
    const searchParams = new URLSearchParams(qs);
    const cid = searchParams.get('cid') || '';
    requestedCid = /^[A-Za-z0-9_-]{4,40}$/.test(cid) ? cid : null;
    clientVersion = parseInt(searchParams.get('v') || '0', 10);
  } catch (e) {
    requestedCid = null;
  }

  if (clientVersion < MIN_VERSION) {
    try {
      ws.send(
        JSON.stringify({
          type: 'friend_error',
          message:
            "⚠️ Eski versiya. Iltimos ilovani yangilang (ba'zi funksiyalar ishlamasligi mumkin).",
        })
      );
    } catch (e) {}
  }

  const playerId = requestedCid || 'c' + nextPlayerId++;

  // Shu ID bilan eski (uzilib qolgan) ulanish bo'lsa -- almashtiramiz
  if (players.has(playerId)) {
    const old = players.get(playerId);
    try {
      if (old.ws && old.ws !== ws) {
        // Eski oynaga aytamiz: qayta ulanmasin (ikki oyna bir-birini uzib turmasin)
        if (old.ws.readyState === WebSocket.OPEN) old.ws.send(JSON.stringify({ type: 'replaced' }));
        old.ws.close();
      }
    } catch (e) {}
    leaveRoom(old);
    players.delete(playerId);
  }

  let friendCode = cidToCode.get(playerId);
  if (!friendCode) {
    friendCode = String(nextFriendCode++);
    cidToCode.set(playerId, friendCode);
    codeToCid.set(friendCode, playerId);
  }

  const player = {
    id: playerId,
    name: `Commander-${friendCode}`,
    code: friendCode,
    ws,
    roomId: null,
    sectorId: null,
    isAfk: false,
    friends: new Set(),
    kills: 0,
    level: 1,
    // Faqat haqiqiy xabar kelganda yangilanadi (host saylovi uchun)
    lastSeen: Date.now(),
    state: null, // oxirgi tekshirilgan holat: { x, y, b, tu, hp, ..., t, spawnedAt }
    ledger: new ShotLedger(),
    rl: new RateLimiter(),
    lastHitBy: null,
    lastCorrectionAt: 0,
  };
  players.set(playerId, player);

  joinRoom(player, findOpenRoom(), 'welcome');

  ws.on('message', (raw) => {
    // Xabar oqimini cheklash: soniyasiga 60 tadan oshganlari tashlab yuboriladi
    if (!player.rl.allow()) {
      if (player.rl.dropped > 600) {
        try {
          ws.terminate();
        } catch (e) {}
      }
      return;
    }
    player.lastSeen = Date.now();
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    try {
      handleMessage(player, msg);
    } catch (err) {
      // Bitta buzuq xabar butun serverni yiqitmaydi
      console.error('WS xabar xatosi', player.id, msg.type, err);
      Sentry.captureException(err);
    }
  });

  ws.on('close', () => {
    // Shu ID bilan yangi ulanish allaqachon o'rnini egallagan bo'lishi mumkin
    if (players.get(playerId) !== player) return;
    leaveRoom(player);
    players.delete(playerId);
  });
});

function handleMessage(player, msg) {
  const room = rooms.get(player.roomId);
  switch (msg.type) {
    case 'ping':
      sendTo(player.id, { type: 'pong', time: num(msg.time) });
      break;

    case 'set_name': {
      const cleanName = sanitizeName(msg.name);
      if (!cleanName || !room) break;
      player.name = cleanName;
      broadcastToRoom(room.id, { type: 'player_renamed', playerId: player.id, name: player.name });
      updateRoomSectors(room);
      break;
    }

    case 'set_afk':
      player.isAfk = !!msg.isAfk;
      if (room) {
        broadcastToRoom(
          room.id,
          { type: 'player_afk_status', playerId: player.id, isAfk: player.isAfk },
          player.id
        );
      }
      break;

    case 'add_friend': {
      const targetCid = codeToCid.get(String(msg.targetId).trim());
      if (!targetCid || targetCid === player.id) {
        sendTo(player.id, { type: 'friend_error', message: "Bunday kodli o'yinchi topilmadi" });
        break;
      }
      player.friends.add(targetCid);
      const targetPlayer = players.get(targetCid);
      if (targetPlayer) {
        targetPlayer.friends.add(player.id); // o'zaro do'stlik
        sendTo(targetCid, {
          type: 'friend_added',
          friend: {
            id: player.id,
            name: player.name,
            code: player.code,
            online: true,
            roomId: player.roomId,
            isAfk: player.isAfk,
          },
        });
      }
      sendTo(player.id, { type: 'friends_list', friends: getFriendsListPayload(player.id) });
      break;
    }

    case 'invite_friend': {
      const target = players.get(msg.targetId);
      if (target && player.friends.has(target.id)) {
        sendTo(target.id, {
          type: 'invite_received',
          fromId: player.id,
          fromName: player.name,
          roomId: player.roomId,
          mode: room ? room.mode : 'Deathmatch',
        });
      }
      break;
    }

    case 'invite_response': {
      const accept = !!msg.accept;
      const inviter = players.get(msg.fromId);
      if (accept && inviter && inviter.roomId) {
        const targetRoom = rooms.get(inviter.roomId);
        if (targetRoom && targetRoom.id !== player.roomId) {
          if (targetRoom.players.size >= ROOM_CAPACITY) {
            sendTo(player.id, { type: 'friend_error', message: "Do'stingiz jangi to'la (4/4)" });
          } else {
            joinRoom(player, targetRoom);
          }
        }
      }
      if (inviter) {
        sendTo(inviter.id, {
          type: 'invite_answered',
          fromId: player.id,
          fromName: player.name,
          accept,
        });
      }
      break;
    }

    // Harakat: server tekshiradi (tezlikni buzish, devor orqasidan "teleport" bo'lmasin)
    case 'sync_state': {
      if (!room) break;
      const now = Date.now();
      const prev = player.state;
      const mv = validateMove(
        prev ? { x: prev.x, y: prev.y, t: prev.t, dead: prev.d } : null,
        { x: msg.x, y: msg.y, dead: !!msg.dead },
        now
      );
      if (!mv.ok && now - player.lastCorrectionAt > 500) {
        player.lastCorrectionAt = now;
        sendTo(player.id, { type: 'pos_correct', x: mv.x, y: mv.y });
      }
      const mhp = Math.max(1, Math.min(400, num(msg.maxHp, 100)));
      player.state = {
        x: mv.x,
        y: mv.y,
        b: num(msg.bodyAngle),
        tu: num(msg.turretAngle),
        hp: Math.max(0, Math.min(mhp, num(msg.hp, mhp))),
        mhp,
        sh: Math.max(0, Math.min(100, num(msg.shield))),
        lv: Math.max(1, Math.min(50, Math.round(num(msg.level, 1)))),
        w: typeof msg.weapon === 'string' ? msg.weapon.slice(0, 12) : 'standard',
        d: !!msg.dead,
        t: now,
        spawnedAt: !prev || mv.respawned ? now : prev.spawnedAt,
      };
      player.level = player.state.lv;
      break;
    }

    case 'fire_bullet': {
      if (!room) break;
      if (!player.ledger.fire(msg, player.state)) break; // tez-tez otish / soxta o'q
      broadcastToRoom(
        room.id,
        {
          type: 'peer_fired',
          playerId: player.id,
          id: msg.id,
          x: msg.x,
          y: msg.y,
          vx: msg.vx,
          vy: msg.vy,
          damage: msg.damage,
          color: typeof msg.color === 'string' ? msg.color.slice(0, 24) : '#ffaa00',
          weaponType: msg.weaponType,
        },
        player.id
      );
      break;
    }

    // Otgan o'yinchi "tegdi" deydi -> server tekshiradi -> natija HAMMAGA bir vaqtda ketadi
    case 'hit_peer': {
      if (!room) break;
      const target = players.get(msg.targetId);
      if (!target || target.roomId !== room.id || target === player) break;
      const dmg = player.ledger.claimHit(msg, target.state);
      if (dmg <= 0) break;
      target.lastHitBy = { id: player.id, t: Date.now() };
      broadcastToRoom(room.id, {
        type: 'hit',
        targetId: target.id,
        attackerId: player.id,
        attackerName: player.name,
        damage: dmg,
        bulletId: msg.bulletId,
        x: num(msg.x),
        y: num(msg.y),
      });
      break;
    }

    // Jabrlanuvchi o'ldi -> o'ldirgan odamga ochko (faqat u haqiqatan yaqinda urgan bo'lsa)
    case 'kill_credit': {
      const killer = players.get(msg.targetId);
      const hit = player.lastHitBy;
      if (!killer || !hit || hit.id !== killer.id) break;
      if (Date.now() - hit.t > RULES.KILL_CREDIT_WINDOW_MS) break;
      player.lastHitBy = null;
      killer.kills++;
      sendTo(killer.id, { type: 'kill_credit_awarded', targetName: player.name });
      break;
    }

    case 'wall_damaged':
      if (room && Number.isInteger(msg.wallIndex) && msg.wallIndex >= 0 && msg.wallIndex < 200) {
        broadcastToRoom(
          room.id,
          {
            type: 'wall_damaged',
            wallIndex: msg.wallIndex,
            damage: Math.max(0, Math.min(RULES.MAX_DAMAGE.rocket, num(msg.damage))),
          },
          player.id
        );
      }
      break;

    case 'crate_collected':
      if (room && typeof msg.crateId === 'string') {
        broadcastToRoom(
          room.id,
          { type: 'crate_collected', crateId: msg.crateId.slice(0, 40), playerId: player.id },
          player.id
        );
      }
      break;

    case 'bot_killed': {
      if (!room) break;
      const botIndex = room.bots.findIndex((b) => b.id === msg.botId);
      if (botIndex === -1) break;
      room.bots.splice(botIndex, 1);
      broadcastToRoom(room.id, { type: 'bot_killed', botId: msg.botId, playerId: player.id });
      setTimeout(() => {
        if (!rooms.has(room.id) || room.players.size === 0) return;
        if (room.bots.length < (BOT_COUNT_BY_HUMANS[room.players.size] || 0)) {
          balanceRoomBots(room);
          updateRoomSectors(room);
        }
      }, 3500);
      break;
    }

    // Botlarni xona hosti (bitta o'yinchi) boshqaradi; uning holati hammaga tarqatiladi
    case 'bot_sync':
      if (room && room.hostId === player.id && Array.isArray(msg.bots)) {
        room.lastBotSyncAt = Date.now();
        broadcastToRoom(room.id, { type: 'bot_sync', bots: msg.bots.slice(0, 8) }, player.id);
      }
      break;

    case 'bot_fired':
      if (room && room.hostId === player.id) {
        broadcastToRoom(
          room.id,
          {
            type: 'peer_fired',
            playerId: 'BOT',
            id: typeof msg.id === 'string' ? msg.id.slice(0, 40) : undefined,
            x: num(msg.x),
            y: num(msg.y),
            vx: num(msg.vx),
            vy: num(msg.vy),
            damage: Math.max(0, Math.min(RULES.MAX_DAMAGE.rocket, num(msg.damage))),
            color: typeof msg.color === 'string' ? msg.color.slice(0, 24) : '#ff3366',
            weaponType: msg.weaponType,
          },
          player.id
        );
      }
      break;

    // WebRTC ovozli aloqa signali -- faqat bir xonadagilar orasida
    case 'webrtc_signal': {
      const target = players.get(msg.targetId);
      if (target && target.roomId === player.roomId) {
        sendTo(target.id, { type: 'webrtc_signal', fromId: player.id, signal: msg.signal });
      }
      break;
    }
  }
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Tank Battle server: port ${PORT}`);
    const { initTelegramBot } = require('./lib/telegramBot');
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const gameUrl = process.env.GAME_URL || 'https://tank-game-production-c104.up.railway.app';
    if (tgToken) initTelegramBot(tgToken, gameUrl);
  });
}

module.exports = { server, wss, rooms, players, ROOM_CAPACITY };
