/**
 * Server "hakam" qoidalari: klientdan kelgan har bir xabar shu yerda tekshiriladi.
 * Sof funksiyalar -- serverga bog'liq emas, shuning uchun alohida test qilinadi.
 */
const MapLayout = require('../src/shared/mapLayout.js');

const RULES = {
  TICK_MS: 66, // server dunyo holatini 15 marta/soniya yuboradi (trafik va batareya tejaladi)
  MAX_SPEED_PX_S: 260, // nitro bilan ham ~125 px/s; zaxira bilan
  MOVE_SLACK_PX: 40,
  SPAWN_RADIUS_PX: 140, // qayta tug'ilish garaj yonida bo'lishi shart
  SHOT_BUCKET: 4, // ketma-ket ruxsat etilgan o'qlar (shotgun = 3 dona)
  SHOT_REFILL_S: 0.6,
  SHOT_TTL_MS: 6000, // o'q 4.5 s yashaydi
  // Har qurolning eng katta zarari (oddiy o'q darajaga qarab 35..80 gacha o'sadi)
  MAX_DAMAGE: { standard: 80, shotgun: 25, rocket: 80, mine: 100 },
  MINE_TTL_MS: 180000, // mina yerda uzoq yotadi
  MAX_BULLET_SPEED: 320, // px/s
  MUZZLE_RANGE_PX: 90, // o'q tank yonidan chiqishi kerak
  HIT_TOLERANCE_PX: 90, // kechikish tufayli nishon biroz siljigan bo'lishi mumkin
  AOE_TOLERANCE_PX: 240,
  SPAWN_PROTECT_MS: 3000,
  KILL_CREDIT_WINDOW_MS: 6000,
  MSG_PER_SEC: 60,
  MSG_BURST: 120,
  NAME_MAX: 14,
};

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Ismdan HTML va boshqaruv belgilarini olib tashlaydi (XSS himoyasi). */
function sanitizeName(raw) {
  return String(raw == null ? '' : raw)
    .replace(/[<>&"'`\\]/g, '')
    .split('')
    .filter((ch) => {
      // boshqaruv va ko'rinmas (yo'nalish) belgilari
      const c = ch.charCodeAt(0);
      return !(
        c < 32 ||
        (c >= 0x7f && c <= 0x9f) ||
        (c >= 0x200b && c <= 0x200f) ||
        (c >= 0x2028 && c <= 0x202e)
      );
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, RULES.NAME_MAX);
}

/** Har ulanish uchun xabar cheklagichi (token bucket). */
class RateLimiter {
  constructor(perSec = RULES.MSG_PER_SEC, burst = RULES.MSG_BURST, now = Date.now()) {
    this.perSec = perSec;
    this.burst = burst;
    this.tokens = burst;
    this.last = now;
    this.dropped = 0;
  }
  allow(now = Date.now()) {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.perSec);
    this.last = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    this.dropped++;
    return false;
  }
}

const nearAnySpawn = (x, y) =>
  ['A1', 'A2', 'B1', 'B2'].some((sid) => {
    const s = MapLayout.spawnFor(sid);
    return Math.hypot(s.x - x, s.y - y) <= RULES.SPAWN_RADIUS_PX;
  });

/**
 * Harakatni tekshiradi. prev -- serverdagi oxirgi qabul qilingan holat (yoki null).
 * Qaytaradi: { ok, x, y, respawned } -- ok=false bo'lsa x,y eski (tuzatilgan) joy.
 */
function validateMove(prev, msg, now = Date.now()) {
  if (!finite(msg.x) || !finite(msg.y))
    return { ok: false, x: prev ? prev.x : 0, y: prev ? prev.y : 0 };
  const x = Math.max(0, Math.min(MapLayout.WORLD_SIZE, msg.x));
  const y = Math.max(0, Math.min(MapLayout.WORLD_SIZE, msg.y));
  if (!prev) return { ok: true, x, y, respawned: false };
  const respawned = prev.dead && !msg.dead;
  if (respawned) {
    return nearAnySpawn(x, y)
      ? { ok: true, x, y, respawned: true }
      : { ok: false, x: prev.x, y: prev.y };
  }
  const dt = Math.max(0.05, (now - prev.t) / 1000);
  const maxDist = RULES.MAX_SPEED_PX_S * dt + RULES.MOVE_SLACK_PX;
  if (Math.hypot(x - prev.x, y - prev.y) > maxDist) return { ok: false, x: prev.x, y: prev.y };
  return { ok: true, x, y, respawned: false };
}

/** Har o'yinchining otgan o'qlari ro'yxati: urilish faqat haqiqatan otilgan o'q bilan. */
class ShotLedger {
  constructor(now = Date.now()) {
    this.tokens = RULES.SHOT_BUCKET;
    this.last = now;
    this.shots = new Map(); // bulletId -> { t, damage, aoe, hitsLeft }
  }
  /** O'q otildi. Qaytaradi: true -- qabul qilindi. */
  fire(msg, shooterState, now = Date.now()) {
    this.tokens = Math.min(
      RULES.SHOT_BUCKET,
      this.tokens + (now - this.last) / 1000 / RULES.SHOT_REFILL_S
    );
    this.last = now;
    if (this.tokens < 1) return false;
    if (!msg || typeof msg.id !== 'string' || msg.id.length > 40) return false;
    if (!finite(msg.x) || !finite(msg.y) || !finite(msg.vx) || !finite(msg.vy)) return false;
    if (Math.hypot(msg.vx, msg.vy) > RULES.MAX_BULLET_SPEED) return false;
    if (shooterState) {
      if (shooterState.dead) return false;
      if (Math.hypot(msg.x - shooterState.x, msg.y - shooterState.y) > RULES.MUZZLE_RANGE_PX)
        return false;
    }
    this.tokens -= 1;
    const aoe = msg.weaponType === 'rocket' || msg.weaponType === 'mine';
    const ttl = msg.weaponType === 'mine' ? RULES.MINE_TTL_MS : RULES.SHOT_TTL_MS;
    this.shots.set(msg.id, {
      t: now,
      ttl,
      damage: Math.min(
        RULES.MAX_DAMAGE[msg.weaponType] || RULES.MAX_DAMAGE.standard,
        Math.max(0, Number(msg.damage) || 0)
      ),
      aoe,
      hitsLeft: aoe ? 6 : 1,
      targets: new Set(),
    });
    for (const [id, s] of this.shots) if (now - s.t > s.ttl) this.shots.delete(id);
    if (this.shots.size > 200) this.shots.delete(this.shots.keys().next().value);
    return true;
  }
  /** Urilishni tekshiradi; to'g'ri bo'lsa ruxsat etilgan zararni qaytaradi, aks holda 0. */
  claimHit(msg, targetState, now = Date.now()) {
    const shot = this.shots.get(msg && msg.bulletId);
    if (!shot || now - shot.t > shot.ttl || shot.hitsLeft <= 0) return 0;
    if (!targetState || targetState.dead) return 0;
    if (shot.targets.has(msg.targetId)) return 0; // bitta o'q bitta nishonga bir marta
    if (now - (targetState.spawnedAt || 0) < RULES.SPAWN_PROTECT_MS) return 0;
    if (!finite(msg.x) || !finite(msg.y)) return 0;
    const tol = shot.aoe ? RULES.AOE_TOLERANCE_PX : RULES.HIT_TOLERANCE_PX;
    if (Math.hypot(msg.x - targetState.x, msg.y - targetState.y) > tol) return 0;
    const dmg = Math.min(shot.damage, Math.max(0, Number(msg.damage) || 0));
    if (dmg <= 0) return 0;
    shot.hitsLeft--;
    shot.targets.add(msg.targetId);
    return dmg;
  }
}

module.exports = { RULES, sanitizeName, RateLimiter, validateMove, ShotLedger, nearAnySpawn };
