/**
 * Jang maydonining YAGONA manbasi.
 * 3D rasm (BattlefieldMap.js), klientdagi to'siqlar (index.html) va server (server.js)
 * hammasi shu fayldan o'qiydi -- shuning uchun ko'rinadigan narsa va to'siq hech qachon
 * bir-biridan ajralib qolmaydi ("ko'rinmas devor" muammosi).
 *
 * Koordinatalar: 3D (x, z) birlikda, markaz (0,0). 2D o'yin mantig'i px da, (0,0) chap-yuqori.
 * Brauzerda klassik <script> sifatida yuklanadi (window.MapLayout), Node'da require() bilan.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MapLayout = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const SECTOR_SIZE = 800;
  const WORLD_SIZE = SECTOR_SIZE * 2; // 2x2 sektor = 4 garaj
  const SCALE = 0.085; // 1 px (2D) = 0.085 birlik (3D)
  const HALF = WORLD_SIZE / 2;
  const BORDER = 24; // chegara devori qalinligi, px

  // sector: o'yinchi/bot shu garajda tug'iladi.
  // rot: garajning lokal +z o'qi (eshik) dunyoda (sin rot, cos rot) -- hammasi markazga qaraydi.
  const GARAGES = [
    { id: 1, name: 'GARAJ 1', sector: 'A1', x: -44, z: -44, rot: Math.PI / 4, color: 0x00ff88 },
    {
      id: 2,
      name: 'GARAJ 2',
      sector: 'B1',
      x: -44,
      z: 44,
      rot: (Math.PI * 3) / 4,
      color: 0xff3b30,
    },
    {
      id: 3,
      name: 'GARAJ 3',
      sector: 'B2',
      x: 44,
      z: 44,
      rot: (-Math.PI * 3) / 4,
      color: 0x007aff,
    },
    { id: 4, name: 'GARAJ 4', sector: 'A2', x: 44, z: -44, rot: -Math.PI / 4, color: 0xff9500 },
  ];
  // Garaj devorlari (garajning o'z koordinatasida): lx, lz -- markaz; w -- x bo'yicha, d -- z bo'yicha
  const GARAGE_WALLS = [
    { part: 'left', lx: -9.2, lz: -5, w: 1.6, d: 28 },
    { part: 'right', lx: 9.2, lz: -5, w: 1.6, d: 28 },
    { part: 'back', lx: 0, lz: -18.2, w: 20, d: 1.6 },
    { part: 'pillarL', lx: -8.25, lz: 8.2, w: 3.5, d: 1.6 },
    { part: 'pillarR', lx: 8.25, lz: 8.2, w: 3.5, d: 1.6 },
  ];
  const GARAGE_SPAWN_LZ = -4; // garaj ichida, eshikka qarab

  const RUINS = [
    { x: -16, z: -16, w: 14, d: 9, h: 3.2 },
    { x: 16, z: -18, w: 15, d: 11, h: 3.5 },
    { x: -18, z: 18, w: 12, d: 13, h: 3.0 },
    { x: 14, z: 18, w: 13, d: 10, h: 3.2 },
  ];
  // Har bir xarobaning 3 ta g'isht devori (xaroba markaziga nisbatan)
  const ruinWalls = (r) => [
    { part: 'w1', x: 0, z: -r.d / 2, w: r.w, d: 1.4, h: r.h },
    { part: 'w2', x: -r.w / 2, z: 0, w: 1.4, d: r.d, h: r.h * 0.75 },
    { part: 'w3', x: r.w * 0.2, z: r.d / 2, w: r.w * 0.6, d: 1.4, h: r.h * 0.5 },
  ];
  const RUIN_HP = 80;

  const TREES = [
    [-54, -18],
    [-56, 18],
    [54, -18],
    [56, -36],
    [-34, -52],
    [34, -52],
    [-22, 54],
    [12, 56],
    [-32, -14],
    [32, -14],
    [-34, 30],
    [30, 34],
  ];
  const TREE_TRUNK = 1.4;

  const HEDGEHOGS = [
    [-7, -5],
    [7, -6],
    [-6, 7],
    [8, 6],
    [-24, 0],
    [24, 0],
    [0, -24],
    [0, 24],
  ];
  const HEDGEHOG_SIZE = 2.2;

  const SANDBAGS = [
    { x: -11, z: -11, rot: Math.PI / 4 },
    { x: 11, z: -11, rot: -Math.PI / 4 },
    { x: -11, z: 11, rot: -Math.PI / 4 },
    { x: 11, z: 11, rot: Math.PI / 4 },
  ];
  const SANDBAG_W = 3.9;
  const SANDBAG_D = 0.8;

  // Sayoz ko'lmak: tank suvda sekinlashadi. Garaj 3 chiqish yo'lini to'smaydi.
  const WATER = { x: 48, z: 20, w: 12, d: 10 };
  const WATER_SPEED = 0.5;

  function to2D(x3, z3) {
    return { x: HALF + x3 / SCALE, y: HALF + z3 / SCALE };
  }
  function to3D(x2, y2) {
    return { x: (x2 - HALF) * SCALE, z: (y2 - HALF) * SCALE };
  }

  // Three.js rotation.y = rot: lokal (lx, lz) -> dunyo
  function garageToWorld(g, lx, lz) {
    const c = Math.cos(g.rot);
    const s = Math.sin(g.rot);
    return { x: g.x + lx * c + lz * s, z: g.z - lx * s + lz * c };
  }

  // 3D o'lchamdagi quti -> 2D to'siq. 2D da (+y pastga) burilish burchagi -rot bo'ladi.
  function box(key, x3, z3, w3, d3, rot3, destructible, hp) {
    const p = to2D(x3, z3);
    const w = w3 / SCALE;
    const h = d3 / SCALE;
    return {
      key,
      x: p.x - w / 2,
      y: p.y - h / 2,
      w,
      h,
      rot: rot3 ? -rot3 : 0,
      destructible: !!destructible,
      hp: hp || 0,
    };
  }

  function colliders() {
    const list = [];
    // Chegara devori (3D da ham ko'rinadi)
    list.push({ key: 'border_n', x: 0, y: 0, w: WORLD_SIZE, h: BORDER, rot: 0 });
    list.push({ key: 'border_s', x: 0, y: WORLD_SIZE - BORDER, w: WORLD_SIZE, h: BORDER, rot: 0 });
    list.push({ key: 'border_w', x: 0, y: 0, w: BORDER, h: WORLD_SIZE, rot: 0 });
    list.push({ key: 'border_e', x: WORLD_SIZE - BORDER, y: 0, w: BORDER, h: WORLD_SIZE, rot: 0 });

    GARAGES.forEach((g) => {
      GARAGE_WALLS.forEach((p) => {
        const c = garageToWorld(g, p.lx, p.lz);
        list.push(box(`garage${g.id}_${p.part}`, c.x, c.z, p.w, p.d, g.rot, false));
      });
    });
    RUINS.forEach((r, i) => {
      ruinWalls(r).forEach((p) => {
        list.push(box(`ruin${i}_${p.part}`, r.x + p.x, r.z + p.z, p.w, p.d, 0, true, RUIN_HP));
      });
    });
    TREES.forEach(([x, z], i) => list.push(box(`tree${i}`, x, z, TREE_TRUNK, TREE_TRUNK, 0)));
    HEDGEHOGS.forEach(([x, z], i) =>
      list.push(box(`hedgehog${i}`, x, z, HEDGEHOG_SIZE, HEDGEHOG_SIZE, 0))
    );
    SANDBAGS.forEach((s, i) =>
      list.push(box(`sandbag${i}`, s.x, s.z, SANDBAG_W, SANDBAG_D, s.rot, false))
    );
    return list;
  }

  // Garaj ichidagi tug'ilish nuqtasi, eshikka (markazga) qaragan holda. 2D px + 2D burchak.
  function spawnFor(sectorId) {
    const g = GARAGES.find((x) => x.sector === sectorId) || GARAGES[0];
    const c = garageToWorld(g, 0, GARAGE_SPAWN_LZ);
    const p = to2D(c.x, c.z);
    // Garajning +z lokal o'qi (eshik tomoni) dunyoda: (sin rot, cos rot) -> 2D burchak
    return { x: p.x, y: p.y, angle: Math.atan2(Math.cos(g.rot), Math.sin(g.rot)) };
  }

  function inWater(x2, y2) {
    const p = to3D(x2, y2);
    return Math.abs(p.x - WATER.x) < WATER.w / 2 && Math.abs(p.z - WATER.z) < WATER.d / 2;
  }

  /**
   * Aylana (tank/o'q) va to'siq (AABB yoki burilgan OBB) to'qnashuvi.
   * Qaytaradi: null (tegmadi) yoki { nx, ny, overlap } -- aylanani tashqariga surish vektori.
   */
  function circleVsBox(px, py, r, w) {
    const hw = w.w / 2;
    const hh = w.h / 2;
    const dx = px - (w.x + hw);
    const dy = py - (w.y + hh);
    const rot = w.rot || 0;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    // dunyo -> quti lokal
    const lx = rot ? dx * c + dy * s : dx;
    const ly = rot ? -dx * s + dy * c : dy;
    const qx = Math.max(-hw, Math.min(lx, hw));
    const qy = Math.max(-hh, Math.min(ly, hh));
    let ex = lx - qx;
    let ey = ly - qy;
    const d2 = ex * ex + ey * ey;
    if (d2 >= r * r) return null;
    let dist = Math.sqrt(d2);
    let overlap;
    if (dist > 1e-4) {
      ex /= dist;
      ey /= dist;
      overlap = r - dist;
    } else {
      // Markaz quti ichida: eng yaqin tomondan chiqaramiz
      const penX = hw - Math.abs(lx);
      const penY = hh - Math.abs(ly);
      if (penX < penY) {
        ex = lx >= 0 ? 1 : -1;
        ey = 0;
        overlap = penX + r;
      } else {
        ex = 0;
        ey = ly >= 0 ? 1 : -1;
        overlap = penY + r;
      }
    }
    // lokal -> dunyo
    const nx = rot ? ex * c - ey * s : ex;
    const ny = rot ? ex * s + ey * c : ey;
    return { nx, ny, overlap };
  }

  /**
   * Kesma (x1,y1)->(x2,y2) to'siqni (burilgan bo'lsa ham) kesib o'tadimi.
   * pad -- to'siqni har tomondan kengaytirish (masalan o'q radiusi).
   * Qaytaradi: birinchi tegish nuqtasi t (0..1) yoki -1.
   */
  function segmentVsBox(x1, y1, x2, y2, w, pad = 0) {
    const hw = w.w / 2 + pad;
    const hh = w.h / 2 + pad;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const rot = w.rot || 0;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const ax = x1 - cx;
    const ay = y1 - cy;
    const bx = x2 - cx;
    const by = y2 - cy;
    const lx1 = rot ? ax * c + ay * s : ax;
    const ly1 = rot ? -ax * s + ay * c : ay;
    const lx2 = rot ? bx * c + by * s : bx;
    const ly2 = rot ? -bx * s + by * c : by;
    const dx = lx2 - lx1;
    const dy = ly2 - ly1;
    let t0 = 0;
    let t1 = 1;
    const slab = (p, d, h) => {
      if (Math.abs(d) < 1e-9) return p >= -h && p <= h;
      let tn = (-h - p) / d;
      let tf = (h - p) / d;
      if (tn > tf) {
        const tmp = tn;
        tn = tf;
        tf = tmp;
      }
      t0 = Math.max(t0, tn);
      t1 = Math.min(t1, tf);
      return t0 <= t1;
    };
    if (!slab(lx1, dx, hw) || !slab(ly1, dy, hh)) return -1;
    return t0;
  }

  return {
    SECTOR_SIZE,
    WORLD_SIZE,
    SCALE,
    BORDER,
    GARAGES,
    GARAGE_WALLS,
    GARAGE_SPAWN_LZ,
    RUINS,
    ruinWalls,
    TREES,
    HEDGEHOGS,
    HEDGEHOG_SIZE,
    SANDBAGS,
    SANDBAG_W,
    SANDBAG_D,
    WATER,
    WATER_SPEED,
    to2D,
    to3D,
    garageToWorld,
    colliders,
    spawnFor,
    inWater,
    circleVsBox,
    segmentVsBox,
  };
});
