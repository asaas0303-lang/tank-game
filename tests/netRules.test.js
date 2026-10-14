const {
  RULES,
  sanitizeName,
  RateLimiter,
  validateMove,
  ShotLedger,
} = require('../lib/netRules.js');
const MapLayout = require('../src/shared/mapLayout.js');

describe('server hakam qoidalari', () => {
  test('ismdan HTML/skript olib tashlanadi', () => {
    expect(sanitizeName('<img src=x onerror=alert(1)>')).not.toMatch(/[<>]/);
    expect(sanitizeName('  Abror​  444 ')).toBe('Abror 444');
    expect(sanitizeName('a'.repeat(50)).length).toBe(RULES.NAME_MAX);
    expect(sanitizeName(null)).toBe('');
  });

  test('xabar oqimi cheklanadi', () => {
    const rl = new RateLimiter(10, 20, 0);
    let ok = 0;
    for (let i = 0; i < 100; i++) if (rl.allow(0)) ok++;
    expect(ok).toBe(20);
    expect(rl.allow(1000)).toBe(true); // 1 soniyadan keyin yana ruxsat
  });

  test('tezlikni buzib yuborish (speedhack) rad etiladi', () => {
    const prev = { x: 800, y: 800, t: 0, dead: false };
    expect(validateMove(prev, { x: 806, y: 800 }, 50).ok).toBe(true);
    const cheat = validateMove(prev, { x: 1200, y: 800 }, 50);
    expect(cheat.ok).toBe(false);
    expect(cheat.x).toBe(800);
    expect(validateMove(prev, { x: NaN, y: 1 }, 50).ok).toBe(false);
  });

  test("qayta tug'ilish faqat garaj yonida qabul qilinadi", () => {
    const dead = { x: 800, y: 800, t: 0, dead: true };
    const sp = MapLayout.spawnFor('B2');
    expect(validateMove(dead, { x: sp.x, y: sp.y, dead: false }, 50)).toMatchObject({
      ok: true,
      respawned: true,
    });
    expect(validateMove(dead, { x: 800, y: 300, dead: false }, 50).ok).toBe(false);
  });

  test("faqat haqiqatan otilgan o'q zarar beradi, bir marta", () => {
    const led = new ShotLedger(0);
    const shooter = { x: 500, y: 500, dead: false };
    const target = { x: 700, y: 500, dead: false, spawnedAt: -10000 };
    expect(led.fire({ id: 'p1:1', x: 520, y: 500, vx: 234, vy: 0, damage: 35 }, shooter, 0)).toBe(
      true
    );
    // otilmagan o'q bilan urilish
    expect(
      led.claimHit({ bulletId: 'p1:999', targetId: 't', x: 700, y: 500, damage: 35 }, target, 100)
    ).toBe(0);
    // soxta katta zarar -- otilgan o'q zararidan oshmaydi
    expect(
      led.claimHit({ bulletId: 'p1:1', targetId: 't', x: 700, y: 500, damage: 9999 }, target, 100)
    ).toBe(35);
    // shu o'q bilan ikkinchi marta
    expect(
      led.claimHit({ bulletId: 'p1:1', targetId: 't', x: 700, y: 500, damage: 35 }, target, 120)
    ).toBe(0);
  });

  test('uzoqdagi nishonga "tegdi" deyish rad etiladi; yangi tug\'ilgan himoyalangan', () => {
    const led = new ShotLedger(0);
    const shooter = { x: 500, y: 500, dead: false };
    led.fire({ id: 'a', x: 520, y: 500, vx: 234, vy: 0, damage: 35 }, shooter, 0);
    led.fire({ id: 'b', x: 520, y: 500, vx: 234, vy: 0, damage: 35 }, shooter, 0);
    expect(
      led.claimHit(
        { bulletId: 'a', targetId: 't', x: 700, y: 500, damage: 35 },
        { x: 1300, y: 500, spawnedAt: -1e5 },
        10
      )
    ).toBe(0);
    expect(
      led.claimHit(
        { bulletId: 'b', targetId: 't', x: 700, y: 500, damage: 35 },
        { x: 700, y: 500, spawnedAt: 0 },
        10
      )
    ).toBe(0);
  });

  test('tez-tez otish (rapid fire) cheklanadi', () => {
    const led = new ShotLedger(0);
    const shooter = { x: 500, y: 500, dead: false };
    let ok = 0;
    for (let i = 0; i < 20; i++)
      if (led.fire({ id: 'x' + i, x: 500, y: 500, vx: 1, vy: 0, damage: 35 }, shooter, 0)) ok++;
    expect(ok).toBe(RULES.SHOT_BUCKET);
    // tankdan uzoqda paydo bo'lgan o'q
    expect(led.fire({ id: 'far', x: 900, y: 500, vx: 1, vy: 0, damage: 35 }, shooter, 10000)).toBe(
      false
    );
  });
});

describe('mina', () => {
  test('mina uzoq yashaydi va AoE sifatida bir necha nishonga tegadi', () => {
    const led = new ShotLedger(0);
    const owner = { x: 500, y: 500, dead: false };
    expect(
      led.fire(
        { id: 'm1', x: 480, y: 500, vx: 0, vy: 0, damage: 100, weaponType: 'mine' },
        owner,
        0
      )
    ).toBe(true);
    const t1 = { x: 500, y: 520, spawnedAt: -1e9 };
    const t2 = { x: 520, y: 500, spawnedAt: -1e9 };
    expect(
      led.claimHit({ bulletId: 'm1', targetId: 'a', x: 480, y: 500, damage: 90 }, t1, 60000)
    ).toBe(90);
    expect(
      led.claimHit({ bulletId: 'm1', targetId: 'b', x: 480, y: 500, damage: 50 }, t2, 60000)
    ).toBe(50);
  });
});
