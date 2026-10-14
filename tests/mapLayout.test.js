const ML = require('../src/shared/mapLayout.js');

const walls = ML.colliders();
const blocked = (x, y, r) => walls.some((w) => ML.circleVsBox(x, y, r, w));

describe('MapLayout -- yagona xarita manbasi', () => {
  test("to'siq kalitlari takrorlanmaydi", () => {
    const keys = walls.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("to'siqlar xarita ichida", () => {
    for (const w of walls) {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      const c = Math.cos(w.rot || 0);
      const s = Math.sin(w.rot || 0);
      for (const [lx, ly] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const x = cx + (lx * w.w * c - ly * w.h * s) / 2;
        const y = cy + (lx * w.w * s + ly * w.h * c) / 2;
        expect(x).toBeGreaterThanOrEqual(-1e-6);
        expect(y).toBeGreaterThanOrEqual(-1e-6);
        expect(x).toBeLessThanOrEqual(ML.WORLD_SIZE + 1e-6);
        expect(y).toBeLessThanOrEqual(ML.WORLD_SIZE + 1e-6);
      }
    }
  });

  test.each(['A1', 'A2', 'B1', 'B2'])(
    "%s: tank garaj ichida bo'sh joyda tug'iladi va eshikdan chiqa oladi",
    (sid) => {
      const sp = ML.spawnFor(sid);
      const R = 19;
      expect(blocked(sp.x, sp.y, R)).toBe(false);
      // eshikka qarab garajdan va eshik oldidagi nur yo'lagidan (25 birlik) bemalol chiqadi
      for (let d = 0; d <= 300; d += 5) {
        const x = sp.x + Math.cos(sp.angle) * d;
        const y = sp.y + Math.sin(sp.angle) * d;
        expect(blocked(x, y, R)).toBe(false);
      }
      // orqaga yursa garajning orqa devoriga urilishi kerak (garaj haqiqatan atrofida)
      let hitBack = false;
      for (let d = 0; d <= 300; d += 5) {
        if (blocked(sp.x - Math.cos(sp.angle) * d, sp.y - Math.sin(sp.angle) * d, R))
          hitBack = true;
      }
      expect(hitBack).toBe(true);
    }
  );

  test('har garaj eshigi xarita markaziga qaragan', () => {
    for (const g of ML.GARAGES) {
      const doorX = Math.sin(g.rot);
      const doorZ = Math.cos(g.rot);
      expect(doorX * -g.x + doorZ * -g.z).toBeGreaterThan(0);
    }
  });

  test("to2D/to3D o'zaro teskari", () => {
    const p = ML.to3D(ML.to2D(12.5, -30).x, ML.to2D(12.5, -30).y);
    expect(p.x).toBeCloseTo(12.5);
    expect(p.z).toBeCloseTo(-30);
  });

  test("circleVsBox: burilgan devorni to'g'ri hisoblaydi", () => {
    // 45° burilgan uzun yupqa devor (markaz 100,100). Diagonal bo'ylab ichida -- tegadi,
    // AABB burchagida (diagonaldan uzoqda) -- tegmaydi.
    const w = { x: 100 - 5, y: 100 - 100, w: 10, h: 200, rot: Math.PI / 4 };
    expect(ML.circleVsBox(100 - 50, 100 + 50, 5, w)).not.toBeNull();
    expect(ML.circleVsBox(100 + 60, 100 + 60, 5, w)).toBeNull();
    const hit = ML.circleVsBox(103, 100, 5, { x: 90, y: 90, w: 20, h: 20, rot: 0 });
    expect(hit.overlap).toBeGreaterThan(0);
  });

  test("segmentVsBox: tez o'q devordan sakrab o'tmaydi", () => {
    const w = { x: 100, y: 0, w: 4, h: 100, rot: 0 };
    // bir qadamda devorning u tomoniga o'tib ketadi -- baribir tegishi aniqlanadi
    const t = ML.segmentVsBox(50, 50, 150, 50, w, 2);
    expect(t).toBeGreaterThan(0.4);
    expect(t).toBeLessThan(0.5);
    expect(ML.segmentVsBox(50, 150, 150, 150, w, 2)).toBe(-1);
  });

  test("ko'lmak sekinlashtiradi, quruqlik yo'q", () => {
    const c = ML.to2D(ML.WATER.x, ML.WATER.z);
    expect(ML.inWater(c.x, c.y)).toBe(true);
    expect(ML.inWater(ML.WORLD_SIZE / 2, ML.WORLD_SIZE / 2)).toBe(false);
  });
});
