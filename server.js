const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static assets from project root
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Central Asian bot names
const CENTRAL_ASIAN_NAMES = [
  'Temur', 'Dias', 'Manas', 'Rustam', 'Ivan', 'Alixon', 'Farhod',
  'Bobur', 'Sherdor', 'Alexey', 'Daniyar', 'Chingiz', 'Sanzhar',
  'Andrey', 'Valisher', 'Bekzod', 'Nurbol', 'Erlan', 'Jalol', 'Samat'
];

// Global Player ID counter (starts from 100, 3 digits)
let nextPlayerId = 100;

// Short, stable "friend code" per device (cid), so players can share a typeable number
// even though the real internal playerId is a long persistent cid string.
let nextFriendCode = 1000;
const cidToCode = new Map();   // playerId(cid) -> qisqa kod (string)
const codeToCid = new Map();   // qisqa kod -> playerId(cid)

// Connected players: playerId -> { id, name, ws, roomId, isAfk, friends: Set, kills: 0, level: 1 }
const players = new Map();

// Game Rooms: roomId -> { id, name, mode, players: Set<playerId>, bots: Array }
const rooms = new Map();

const SECTOR_SIZE = 650;
const SECTOR_THEMES = ['#00f0ff', '#ff2a5f', '#ffaa00', '#00ff88', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6'];

function getOrCreateRoom(roomId = 'default-dm', mode = 'Deathmatch') {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      name: roomId === 'default-dm' ? 'Asosiy Arena' : `Xona #${roomId}`,
      mode: mode,
      players: new Set(),
      hostId: null,
      bots: [],
      sectors: [],
      cols: 2,
      rows: 2,
      worldWidth: 1300,
      worldHeight: 1300
    });
  }
  return rooms.get(roomId);
}

function updateRoomHost(room) {
  if (room.players.size === 0) {
    room.hostId = null;
    return;
  }
  const current = room.hostId ? players.get(room.hostId) : null;
  const currentFresh = current && room.players.has(room.hostId) &&
                       (Date.now() - (current.lastSeen || 0) < 10000);
  if (currentFresh) return;   // hozirgi host yaxshi ishlayapti -- tegmaymiz

  // eng so'nggi faol o'yinchini host qilamiz
  let best = null;
  for (const pid of room.players) {
    const p = players.get(pid);
    if (!p) continue;
    if (!best || (p.lastSeen || 0) > (best.lastSeen || 0)) best = p;
  }
  const newHost = best ? best.id : Array.from(room.players)[0];
  if (newHost !== room.hostId) {
    room.hostId = newHost;
    broadcastToRoom(room.id, { type: 'host_update', hostId: room.hostId });
    console.log('[host] xona', room.id, 'uchun yangi host:', room.hostId);
  }
}

// Dynamically generate modular sectors (zones) based on room player count
// Koordinatasi yo'q botlarga sektor tanlab, spawn joyini SERVER belgilaydi.
// Shu tufayli bot hamma klientda AYNAN bir joyda tug'iladi (avval har klient uni
// massiv indeksi bo'yicha o'zi hisoblardi -- indekslar siljiganda botlar bir joyga
// to'planib qolardi). Band bo'lmagan sektorlar afzal ko'riladi.
function assignBotSpawns(room) {
  if (!room.sectors || room.sectors.length === 0) return false;
  let assigned = false;
  for (const bot of room.bots) {
    if (typeof bot.x === 'number' && typeof bot.y === 'number') continue;
    assigned = true;
    const used = new Set(room.bots.map(b => b.sectorId).filter(Boolean));
    // O'yinchi egallagan sektorlarni ham chetlab o'tamiz -- hozir bu tekshiruv yo'q,
    // shuning uchun bot to'g'ridan-to'g'ri o'yinchining tug'ilish nuqtasiga tushardi.
    let pool = room.sectors.filter(s =>
      !used.has(s.id) && !(s.ownerPlayerId && players.has(s.ownerPlayerId))
    );
    if (pool.length === 0) pool = room.sectors.filter(s => !used.has(s.id));
    if (pool.length === 0) pool = room.sectors;
    const sec = pool[Math.floor(Math.random() * pool.length)];
    bot.sectorId = sec.id;
    bot.x = sec.x + sec.w / 2 + (Math.random() - 0.5) * 60;
    bot.y = sec.y + sec.h / 2 + (Math.random() - 0.5) * 60;
  }
  return assigned;
}

function updateRoomSectors(room) {
  const humanCount = room.players.size;
  let cols = 2;
  let rows = 2;

  if (humanCount <= 1) {
    cols = 2; rows = 2; // 4 sectors (A1, A2, B1, B2)
  } else if (humanCount === 2) {
    cols = 3; rows = 2; // 6 sectors (A1, A2, A3, B1, B2, B3)
  } else if (humanCount === 3) {
    cols = 3; rows = 3; // 9 sectors (A1..A3, B1..B3, C1..C3)
  } else {
    cols = 4; rows = Math.ceil(Math.max(4, humanCount * 3) / 4);
  }

  const sectors = [];
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const playerList = Array.from(room.players).map(pId => players.get(pId)).filter(Boolean);

  let sIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${rowLetters[r] || 'X'}${c + 1}`;
      let ownerName = 'Taktik Zona';
      let ownerPlayerId = null;
      let themeColor = SECTOR_THEMES[sIdx % SECTOR_THEMES.length];

      if (sIdx < playerList.length) {
        ownerName = `${playerList[sIdx].name} Hududi`;
        ownerPlayerId = playerList[sIdx].id;
        themeColor = '#00f0ff';
      } else {
        const botIdx = sIdx - playerList.length;
        if (room.bots[botIdx]) {
          ownerName = `${room.bots[botIdx].name} Hududi`;
          ownerPlayerId = room.bots[botIdx].id;
          themeColor = '#ff2a5f';
        } else {
          ownerName = `Neytral Sektor ${id}`;
        }
      }

      const roomNumber = r * cols + c + 1;
      sectors.push({
        id: id,
        name: `${roomNumber}-xona`,
        subName: `[${ownerName}]`,
        ownerName: ownerName,
        ownerPlayerId: ownerPlayerId,
        col: c,
        row: r,
        x: c * SECTOR_SIZE,
        y: r * SECTOR_SIZE,
        w: SECTOR_SIZE,
        h: SECTOR_SIZE,
        themeColor: themeColor
      });
      sIdx++;
    }
  }

  room.cols = cols;
  room.rows = rows;
  room.sectors = sectors;
  room.worldWidth = cols * SECTOR_SIZE;
  room.worldHeight = rows * SECTOR_SIZE;

  // Koordinatasi yo'q botlarga joy beramiz. Buni SHU YERDA qilamiz, chunki
  // balanceRoomBots() har doim updateRoomSectors() dan OLDIN chaqiriladi (sektorlar
  // bot soniga bog'liq), ya'ni bot yaratilayotganda room.sectors hali bo'sh bo'ladi.
  // Joy berilgan bo'lsa -- bots_update'ni QAYTA yuboramiz, chunki balanceRoomBots()
  // dagi birinchi broadcast hali koordinatasiz (null) ketgan edi.
  if (assignBotSpawns(room)) {
    broadcastToRoom(room.id, {
      type: 'bots_update',
      bots: room.bots,
      humanCount: room.players.size,
      targetBotCount: room.bots.length
    });
  }

  // Har bir o'yinchiga O'ZINING sektor id'sini alohida yuboramiz. Buni broadcast bilan
  // qilib bo'lmaydi -- bitta paket hammaga bir xil ketadi, mySectorId esa har kimda
  // boshqacha. Aynan shu sabab mySectorId avval FAQAT welcome'da yuborilardi va xona
  // tarkibi o'zgarganda klientdagi qiymat eskirib qolardi -> ikki o'yinchi bitta
  // sektor markazida tug'ilardi.
  for (const pid of room.players) {
    const mySec = room.sectors.find(s => s.ownerPlayerId === pid);
    sendTo(pid, {
      type: 'sectors_update',
      cols: room.cols,
      rows: room.rows,
      worldWidth: room.worldWidth,
      worldHeight: room.worldHeight,
      sectorSize: SECTOR_SIZE,
      sectors: room.sectors,
      mySectorId: mySec ? mySec.id : null
    });
  }
}

// Balance bots in room by human player count (easy to retune, see the map below)
const BOT_COUNT_BY_HUMANS = { 1: 3, 2: 4, 3: 3, 4: 2, 5: 1, 6: 1 };
function balanceRoomBots(room) {
  const humanCount = room.players.size;
  const targetBotCount = humanCount > 6 ? 0 : (BOT_COUNT_BY_HUMANS[humanCount] || 0);

  // Adjust bots array
  while (room.bots.length < targetBotCount) {
    const botId = `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const randomName = CENTRAL_ASIAN_NAMES[Math.floor(Math.random() * CENTRAL_ASIAN_NAMES.length)];
    const level = Math.floor(Math.random() * 2) + 1;

    // Koordinatani bu yerda emas, quyida assignBotSpawns() beradi: bot yaratilayotganda
    // sektorlar hali tayyor bo'lmasligi mumkin (birinchi ulanishda sektorlar bot soniga
    // qarab keyinroq quriladi). Joyni HAR DOIM server beradi -> hamma klientda bir xil.
    room.bots.push({
      id: botId,
      name: randomName,
      level: level,
      isBot: true,
      sectorId: null,
      x: null,
      y: null
    });
  }

  while (room.bots.length > targetBotCount) {
    room.bots.pop();
  }

  // Sektorlar allaqachon mavjud bo'lsa (masalan bot o'lib qayta tug'ilganda) -- spawn
  // joyini SHU YERDA beramiz. Aks holda bot koordinatasiz (null) ketadi va klient uni
  // yana massiv indeksi bo'yicha joylashtirib, botlarni bir joyga to'playdi.
  // Birinchi ulanishda sektorlar hali bo'sh -- u holda bu false qaytaradi va joyni
  // keyinroq updateRoomSectors() dagi chaqiruv beradi (o'sha kod o'z holicha qoladi).
  assignBotSpawns(room);

  // Broadcast bot update to all players in the room
  broadcastToRoom(room.id, {
    type: 'bots_update',
    bots: room.bots,
    humanCount: humanCount,
    targetBotCount: targetBotCount
  });
}

function broadcastToRoom(roomId, message, senderId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);

  room.players.forEach(pId => {
    if (pId !== senderId) {
      const player = players.get(pId);
      if (player && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  });
}

function sendTo(playerId, message) {
  const player = players.get(playerId);
  if (player && player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}

function getFriendsListPayload(playerId) {
  const player = players.get(playerId);
  if (!player) return [];
  const list = [];
  player.friends.forEach(fId => {
    const friend = players.get(fId);
    if (friend) {
      list.push({
        id: friend.id,
        name: friend.name,
        code: cidToCode.get(friend.id) || '',
        online: true,
        roomId: friend.roomId,
        isAfk: friend.isAfk
      });
    } else {
      list.push({
        id: fId,
        name: `O'yinchi #${cidToCode.get(fId) || fId}`,
        code: cidToCode.get(fId) || '',
        online: false,
        roomId: null,
        isAfk: false
      });
    }
  });
  return list;
}

// --- Tiriklik tekshiruvi: yarim-ochiq (half-open) ulanishlarni o'ldirish ---
// Telefon internetdan uzilsa 'close' hodisasi KELMAYDI. Shuning uchun har 15 soniyada
// WebSocket-darajasidagi ping yuboramiz; javob bermagan ulanish keyingi turda o'ldiriladi.
const HEARTBEAT_MS = 15000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      console.log('[heartbeat] javob bermagan ulanish o\'ldirildi');
      try { client.terminate(); } catch (e) {}
      return;
    }
    client.isAlive = false;
    try { client.ping(); } catch (e) {}
  });
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(heartbeatTimer));

// Klient har 2 soniyada 'ping', har ~35ms 'sync_state' yuboradi. 20 soniya mutlaqo jim
// bo'lsa -- bu o'yinchi yo'q, tozalaymiz.
const ACTIVITY_TIMEOUT_MS = 20000;
setInterval(() => {
  const now = Date.now();
  for (const [pid, p] of players) {
    // Tirik ulanish belgisi: app xabari YOKI protokol-darajasidagi pong (pauzada ham keladi).
    // DIQQAT: lastSeen'ni bu yerda "now" qilib yangilamaymiz -- u host saylovida
    // ishlatiladi, jim klient o'zini faol ko'rsatib qo'ymasligi kerak.
    const lastActivity = Math.max(p.lastSeen || 0, (p.ws && p.ws.lastPongAt) || 0);
    if (now - lastActivity > ACTIVITY_TIMEOUT_MS) {
      console.log('[reaper] jim qolgan o\'yinchi olib tashlandi:', pid);
      try { p.ws.terminate(); } catch (e) {}
    }
  }

  // Host bot_sync yubormay qo'ygan bo'lsa -- hostni almashtiramiz
  for (const room of rooms.values()) {
    if (room.players.size === 0 || room.bots.length === 0) continue;
    if (now - (room.lastBotSyncAt || 0) > 6000 && room.players.size > 1) {
      console.log('[host] bot_sync yo\'q -> host almashtirilmoqda, xona:', room.id);
      room.hostId = null;          // majburan qayta tanlash
      updateRoomHost(room);
      room.lastBotSyncAt = Date.now();  // darrov qayta almashmasin
    }
  }
}, 5000);

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  // Brauzer ping freym'iga JS ishtirokisiz javob beradi -- ya'ni o'yin PAUZADA bo'lsa ham
  // (ism kiritish oynasi: update() ishlamaydi, 'ping'/'sync_state' yuborilmaydi) pong keladi.
  // Shuning uchun reaper faqat app-xabarlarga emas, pong'ga ham qaraydi, aks holda ismini
  // yozib turgan o'yinchi 20 soniyada uzilib qolardi.
  ws.lastPongAt = Date.now();
  ws.on('pong', () => { ws.isAlive = true; ws.lastPongAt = Date.now(); });

  // Client doimiy ID (cid) yuborsa — o'shani ishlat; bo'lmasa yangi raqamli ID ber
  let requestedCid = null;
  let clientVersion = 0;
  try {
    const qs = (req && req.url && req.url.split('?')[1]) || '';
    const searchParams = new URLSearchParams(qs);
    requestedCid = searchParams.get('cid');
    clientVersion = parseInt(searchParams.get('v') || '0', 10);
  } catch (e) { requestedCid = null; }

  const MIN_VERSION = 5;
  if (clientVersion < MIN_VERSION) {
    try {
      ws.send(JSON.stringify({
        type: 'friend_error',
        message: "⚠️ Eski versiya. Iltimos ilovani yangilang (ba'zi funksiyalar ishlamasligi mumkin)."
      }));
    } catch (e) {}
    // DIQQAT: ulanishni UZMAYMIZ — eski klient ham o'ynasin, faqat ogohlantiramiz.
  }

  const playerId = requestedCid || ('c' + (nextPlayerId++));

  // Agar shu ID bilan eski (uzilib qolgan) ulanish hali ro'yxatda bo'lsa — uni almashtir
  if (players.has(playerId)) {
    const old = players.get(playerId);
    try { if (old.ws && old.ws !== ws) old.ws.close(); } catch (e) {}
    if (old.roomId) {
      const oldRoom = rooms.get(old.roomId);
      if (oldRoom) {
        oldRoom.players.delete(playerId);
        updateRoomHost(oldRoom);
      }
    }
    players.delete(playerId);
  }

  // Barqaror, qisqa do'st-kodi: bir cid -> doim bir xil kod
  let friendCode = cidToCode.get(playerId);
  if (!friendCode) {
    friendCode = String(nextFriendCode++);
    cidToCode.set(playerId, friendCode);
    codeToCid.set(friendCode, playerId);
  }

  const defaultName = `Commander-${friendCode}`;

  const player = {
    id: playerId,
    name: defaultName,
    code: friendCode,
    ws: ws,
    roomId: null,
    isAfk: false,
    friends: new Set(),
    kills: 0,
    level: 1,
    // Ulanish vaqtidan boshlanadi va FAQAT haqiqiy xabar kelganda yangilanadi.
    // Buni reaper "now" qilib qo'ymasligi kerak -- aks holda hech narsa yubormaydigan
    // jim klient "eng faol" bo'lib ko'rinib, host saylovida yutib olardi.
    lastSeen: Date.now()
  };
  players.set(playerId, player);

  // Default join to main deathmatch arena
  const defaultRoom = getOrCreateRoom('default-dm', 'Deathmatch');
  player.roomId = defaultRoom.id;
  defaultRoom.players.add(playerId);
  updateRoomHost(defaultRoom);

  // Rebalance bots and update room sectors
  balanceRoomBots(defaultRoom);
  updateRoomSectors(defaultRoom);

  const mySector = defaultRoom.sectors.find(s => s.ownerPlayerId === playerId) || defaultRoom.sectors[0];

  // Send Welcome & ID configuration with full sectors layout
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId: playerId,
    code: friendCode,
    name: defaultName,
    roomId: defaultRoom.id,
    mode: defaultRoom.mode,
    hostId: defaultRoom.hostId,
    serverVersion: 'v6',
    players: Array.from(defaultRoom.players).map(pid => {
      const p = players.get(pid);
      return p ? { id: p.id, name: p.name, code: p.code, kills: p.kills, level: p.level, isAfk: p.isAfk } : null;
    }).filter(Boolean),
    bots: defaultRoom.bots,
    sectors: defaultRoom.sectors,
    cols: defaultRoom.cols,
    rows: defaultRoom.rows,
    worldWidth: defaultRoom.worldWidth,
    worldHeight: defaultRoom.worldHeight,
    sectorSize: SECTOR_SIZE,
    mySectorId: mySector ? mySector.id : 'A1',
    tashkentOffset: 5 // UTC+5
  }));

  // Send current host immediately
  sendTo(playerId, { type: 'host_update', hostId: defaultRoom.hostId });

  // Handle incoming WebSocket messages
  ws.on('message', (msgStr) => {
    player.lastSeen = Date.now();
    try {
      const msg = JSON.parse(msgStr);

      switch (msg.type) {
        case 'ping':
          sendTo(player.id, { type: 'pong', time: msg.time });
          break;

        case 'set_name': {
          const cleanName = String(msg.name || '').slice(0, 14).trim();
          if (cleanName) {
            player.name = cleanName;
            // Broadcast to ALL players in room (including sender) so everyone sees real name
            broadcastToRoom(player.roomId, {
              type: 'player_renamed',
              playerId: player.id,
              name: player.name
            });
            const curRoom = rooms.get(player.roomId);
            if (curRoom) updateRoomSectors(curRoom);
          }
          break;
        }

        case 'set_afk':
          player.isAfk = !!msg.isAfk;
          broadcastToRoom(player.roomId, {
            type: 'player_afk_status',
            playerId: player.id,
            isAfk: player.isAfk
          }, player.id);
          break;

        // ESLATMA: klient hozir bu xabarni yubormaydi (xonaga o'tish 'invite_response'
        // orqali bo'ladi). Xona tanlash UI qo'shilganda ishlatiladi.
        case 'join_room': {
          const targetRoomId = msg.roomId || 'default-dm';
          const mode = msg.mode || 'Deathmatch';
          if (player.roomId) {
            const oldRoom = rooms.get(player.roomId);
            if (oldRoom) {
              oldRoom.players.delete(player.id);
              updateRoomHost(oldRoom);
              broadcastToRoom(oldRoom.id, {
                type: 'player_left',
                playerId: player.id
              });
              balanceRoomBots(oldRoom);
              updateRoomSectors(oldRoom);
            }
          }

          const newRoom = getOrCreateRoom(targetRoomId, mode);
          newRoom.players.add(player.id);
          updateRoomHost(newRoom);
          player.roomId = newRoom.id;

          balanceRoomBots(newRoom);
          updateRoomSectors(newRoom);

          ws.send(JSON.stringify({
            type: 'room_joined',
            roomId: newRoom.id,
            mode: newRoom.mode,
            hostId: newRoom.hostId,
            bots: newRoom.bots,
            sectors: newRoom.sectors,
            cols: newRoom.cols,
            rows: newRoom.rows,
            worldWidth: newRoom.worldWidth,
            worldHeight: newRoom.worldHeight,
            players: Array.from(newRoom.players).map(pid => {
              const p = players.get(pid);
              return p ? { id: p.id, name: p.name, code: p.code, kills: p.kills, level: p.level, isAfk: p.isAfk } : null;
            }).filter(Boolean)
          }));

          sendTo(player.id, { type: 'host_update', hostId: newRoom.hostId });

          broadcastToRoom(newRoom.id, {
            type: 'player_joined',
            playerId: player.id,
            name: player.name
          }, player.id);
          break;
        }

        // Friends & Lobby Invites
        case 'add_friend': {
          const targetCid = codeToCid.get(String(msg.targetId).trim());
          if (!targetCid || targetCid === player.id) {
            sendTo(player.id, { type: 'friend_error', message: 'Bunday kodli o\'yinchi topilmadi' });
            break;
          }
          player.friends.add(targetCid);
          const targetPlayer = players.get(targetCid);
          if (targetPlayer) {
            targetPlayer.friends.add(player.id); // Mutual friendship
            sendTo(targetCid, {
              type: 'friend_added',
              friend: { id: player.id, name: player.name, code: friendCode, online: true, roomId: player.roomId, isAfk: player.isAfk }
            });
          }
          ws.send(JSON.stringify({
            type: 'friends_list',
            friends: getFriendsListPayload(player.id)
          }));
          break;
        }

        case 'invite_friend': {
          const targetId = msg.targetId;
          const targetPlayer = players.get(targetId);
          if (targetPlayer) {
            sendTo(targetId, {
              type: 'invite_received',
              fromId: player.id,
              fromName: player.name,
              roomId: player.roomId,
              mode: rooms.get(player.roomId)?.mode || 'Deathmatch'
            });
          }
          break;
        }

        case 'invite_response': {
          const fromId = msg.fromId;
          const accept = !!msg.accept;
          const targetRoomId = msg.roomId;

          if (accept && targetRoomId) {
            // Join friend's room
            const currentRoom = rooms.get(player.roomId);
            if (currentRoom) {
              currentRoom.players.delete(player.id);
              updateRoomHost(currentRoom);
              balanceRoomBots(currentRoom);
            }

            const targetRoom = getOrCreateRoom(targetRoomId);
            targetRoom.players.add(player.id);
            updateRoomHost(targetRoom);
            player.roomId = targetRoom.id;

            ws.send(JSON.stringify({
              type: 'room_joined',
              roomId: targetRoom.id,
              mode: targetRoom.mode,
              hostId: targetRoom.hostId,
              bots: targetRoom.bots
            }));

            balanceRoomBots(targetRoom);
          }

          sendTo(fromId, {
            type: 'invite_answered',
            fromId: player.id,
            fromName: player.name,
            accept: accept
          });
          break;
        }

        // Multiplayer State Synchronization
        case 'sync_state':
          if (player.roomId) {
            broadcastToRoom(player.roomId, {
              type: 'peer_state',
              playerId: player.id,
              code: friendCode,
              name: player.name,
              x: msg.x,
              y: msg.y,
              bodyAngle: msg.bodyAngle,
              turretAngle: msg.turretAngle,
              hp: msg.hp,
              maxHp: msg.maxHp,
              shield: msg.shield,
              level: msg.level,
              isAfk: player.isAfk,
              hasShield: msg.hasShield,
              weapon: msg.weapon,
              dead: msg.dead
            }, player.id);
          }
          break;

        case 'fire_bullet':
          if (player.roomId) {
            broadcastToRoom(player.roomId, {
              type: 'peer_fired',
              playerId: player.id,
              x: msg.x,
              y: msg.y,
              vx: msg.vx,
              vy: msg.vy,
              damage: msg.damage,
              color: msg.color,
              weaponType: msg.weaponType
            }, player.id);
          }
          break;

        case 'wall_damaged':
          if (player.roomId) {
            broadcastToRoom(player.roomId, {
              type: 'wall_damaged',
              wallIndex: msg.wallIndex,
              damage: msg.damage
            }, player.id);
          }
          break;

        case 'barrel_exploded':
          if (player.roomId) {
            broadcastToRoom(player.roomId, {
              type: 'barrel_exploded',
              barrelIndex: msg.barrelIndex,
              x: msg.x,
              y: msg.y
            }, player.id);
          }
          break;

        case 'crate_collected':
          if (player.roomId) {
            broadcastToRoom(player.roomId, {
              type: 'crate_collected',
              crateId: msg.crateId,
              playerId: player.id
            }, player.id);
          }
          break;

        case 'bot_killed':
          if (player.roomId) {
            const room = rooms.get(player.roomId);
            if (room) {
              const botIndex = room.bots.findIndex(b => b.id === msg.botId);
              if (botIndex !== -1) {
                room.bots.splice(botIndex, 1);
                
                broadcastToRoom(player.roomId, {
                  type: 'bot_killed',
                  botId: msg.botId,
                  playerId: player.id
                }, null);
                
                setTimeout(() => {
                  if (!room || (room.players && room.players.size === 0)) return;
                  
                  if (rooms.has(room.id)) {
                    const humanCount = room.players.size;
                    const targetBotCount = humanCount > 6 ? 0 : (BOT_COUNT_BY_HUMANS[humanCount] || 0);
                    
                    if (room.bots.length < targetBotCount) {
                      balanceRoomBots(room);
                    }
                  }
                }, 3500);
              }
            }
          }
          break;

        case 'bot_sync':
          if (player.roomId) {
            const room = rooms.get(player.roomId);
            if (room && room.hostId === player.id) {
              room.lastBotSyncAt = Date.now();
              broadcastToRoom(player.roomId, {
                type: 'bot_sync',
                bots: msg.bots
              }, player.id);
            }
          }
          break;

        // Bot bullets exist only on the host -- relay them so every client sees/takes them.
        case 'bot_fired':
          if (player.roomId) {
            const botFiredRoom = rooms.get(player.roomId);
            if (botFiredRoom && botFiredRoom.hostId === player.id) {
              broadcastToRoom(player.roomId, {
                type: 'peer_fired',
                playerId: 'BOT',
                x: msg.x,
                y: msg.y,
                vx: msg.vx,
                vy: msg.vy,
                damage: msg.damage,
                color: msg.color,
                weaponType: msg.weaponType
              }, player.id);
            }
          }
          break;

        // "Shooter is the referee": relay a hit to the victim, who applies it authoritatively.
        case 'hit_peer':
          if (msg.targetId) {
            sendTo(msg.targetId, {
              type: 'hit_by_peer',
              fromId: player.id,
              fromName: player.name,
              damage: Number(msg.damage) || 0
            });
          }
          break;

        // Victim died -> tell the shooter so they get the kill credited.
        case 'kill_credit':
          if (msg.targetId) {
            sendTo(msg.targetId, { type: 'kill_credit_awarded', targetName: player.name });
          }
          break;

        // WebRTC Proximity Voice Signaling
        case 'webrtc_signal':
          if (msg.targetId) {
            sendTo(msg.targetId, {
              type: 'webrtc_signal',
              fromId: player.id,
              signal: msg.signal
            });
          }
          break;
      }
    } catch (err) {
      console.error('CRITICAL WS ERROR handling message from', player.id, ':', err);
      console.error('Raw message was:', msgStr.substring(0, 200));
    }
  });

  ws.on('close', () => {
    if (player.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players.delete(player.id);
        updateRoomHost(room);
        broadcastToRoom(room.id, {
          type: 'player_left',
          playerId: player.id
        });
        balanceRoomBots(room);
        updateRoomSectors(room);
        if (room.players.size === 0 && room.id !== 'default-dm') {
          rooms.delete(room.id);
        }
      }
    }
    players.delete(playerId);
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 AAA 2D Tank Battle Server Online!`);
  console.log(`🌐 Local Port: ${PORT}`);
  console.log(`📡 WebSocket Multiplayer & WebRTC Ready!`);
  console.log(`=========================================`);
});
