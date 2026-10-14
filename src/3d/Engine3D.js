/**
 * 3D dvigatel (Three.js): sahna, yorug'lik/soyalar, TPS kamera, tanklar, o'qlar, minalar, effektlar.
 * O'yin mantig'i 2D (index.html GameEngine) -- bu yerda faqat uning holati chiziladi.
 *
 * Telefon kuchiga qarab 3 ta sifat darajasi (QUALITY) avtomatik tanlanadi va FPS tushsa
 * o'zi pasaytiriladi -- arzon telefon ham qotmaydi.
 */
import * as THREE from '../../lib/three.module.js';
import { TankModel3D } from './TankModel.js';
import { BattlefieldMap3D } from './BattlefieldMap.js';
import { Effects3D } from './Effects3D.js';

const ML = globalThis.MapLayout;

if (typeof window !== 'undefined') {
  window.BattlefieldMap3D = BattlefieldMap3D;
}

const QUALITY = [
  { name: 'past', dpr: 1, shadows: false, shadowSize: 0, antialias: false },
  { name: "o'rta", dpr: 1.5, shadows: true, shadowSize: 1024, antialias: false },
  { name: 'yuqori', dpr: 2, shadows: true, shadowSize: 2048, antialias: true },
];

// Foydalanuvchi sozlamalardan qo'lda tanlagan sifat (yo'q bo'lsa -- Avto)
function manualQuality() {
  try {
    const m = localStorage.getItem('tankQualityManual');
    if (m !== null && QUALITY[+m]) return +m;
  } catch (e) {}
  return null;
}

function detectQuality(ignoreSaved = false) {
  try {
    const saved = localStorage.getItem('tankQuality');
    if (!ignoreSaved && saved !== null && QUALITY[+saved]) return +saved;
  } catch (e) {}
  const mobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '');
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (!mobile) return 2;
  if (cores <= 4 || mem <= 3) return 0;
  return 1;
}

// Doimiy rang: o'yinchi id'sidan (bot massivdagi o'rni o'zgarsa ham rangi o'zgarmaydi)
const TANK_COLORS = [
  { hex: 0x3d6ebd, str: '#3b82f6' },
  { hex: 0xa8392f, str: '#ff2a5f' },
  { hex: 0xc57d2a, str: '#ffaa00' },
  { hex: 0x7d4189, str: '#a855f7' },
  { hex: 0x2f7d7a, str: '#14b8a6' },
];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TANK_COLORS[Math.abs(h) % TANK_COLORS.length];
}

const angleToRotY = (a) => Math.atan2(Math.cos(a), Math.sin(a));

export class Engine3D {
  constructor(canvasContainer) {
    this.container = canvasContainer || document.getElementById('game-container') || document.body;
    this._measure();

    const manual = manualQuality();
    this.autoQuality = manual === null;
    this.qualityIndex = manual !== null ? manual : detectQuality();
    this.quality = QUALITY[this.qualityIndex];
    // Avtomatik ko'tarish shu qurilma uchun boshlang'ich darajadan oshmaydi
    this.maxQualityIndex = Math.max(this.qualityIndex, detectQuality(true));

    // 1. Sahna: osmon gumbazi + ufqdagi tuman (uzoqdagi narsalar osmonga qo'shilib ketadi)
    this.scene = new THREE.Scene();
    const horizon = new THREE.Color(0xc9d8e4);
    this.scene.background = horizon;
    this.scene.fog = new THREE.Fog(horizon, 70, 210);
    this.scene.add(this._buildSky());

    // 2. Kamera (uchinchi shaxs)
    this.camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.4, 420);
    this.cameraDistance = 11;
    this.cameraLookHeight = 2.0;
    this.cameraYaw = null; // tank atrofida gorizontal burchak (= minora yo'nalishi)
    this.cameraPitch = 0.38;
    this.cameraInitialized = false;
    this.shake = 0;

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: this.quality.antialias,
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.dpr));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type =
      this.qualityIndex === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    // Kinodagidek rang: yorqin joylar "kuyib" ketmaydi, soyalar chuqur
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const cv = this.renderer.domElement;
    cv.id = 'webgl3dCanvas';
    Object.assign(cv.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
    });
    this.container.prepend(cv);
    // Telefon xotirasi to'lsa brauzer WebGL'ni vaqtincha o'chiradi -- qora ekranda qolmaslik
    // uchun tiklanishiga ruxsat beramiz (Three.js resurslarni o'zi qayta yuklaydi)
    this.contextLost = false;
    cv.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    cv.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
    });

    // 4. Yorug'lik
    this.setupLighting();

    // 5. Jang maydoni
    this.battlefield = BattlefieldMap3D.build(this.scene);
    this.garages = this.battlefield.garages;
    this.meshesByKey = this.battlefield.meshesByKey;
    // Kamera faqat baland garaj devorlaridan o'tmasligi kerak (past to'siqlar ustidan ko'rinadi)
    this.cameraBlockers = ML.colliders().filter((c) => c.key.startsWith('garage'));
    this.effects = new Effects3D(this.scene);
    this.effects.setViewportHeight(this.height);
    this.time = 0;

    // 6. Tanklar: id -> TankModel3D natijasi
    this.tanks = new Map();
    this.playerTankId = 'player';
    this.bulletMeshes = [];
    this.mineMeshes = [];
    this._bulletParts = null;

    this.worldScale = ML.SCALE;
    this._fpsWindow = { t: 0, frames: 0, slow: 0 };
    this._v3 = new THREE.Vector3();

    window.addEventListener('resize', () => this.onResize());
  }

  _measure() {
    // Portret ekran CSS bilan landshaftga burilgan bo'lsa -- eni va bo'yi almashadi
    const isPortrait = window._forcedLandscape || window.innerHeight > window.innerWidth;
    this.width = isPortrait ? window.innerHeight : window.innerWidth;
    this.height = isPortrait ? window.innerWidth : window.innerHeight;
  }

  _buildSky() {
    const geo = new THREE.SphereGeometry(400, 24, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x4f86c9) },
        horizon: { value: new THREE.Color(0xc9d8e4) },
        sunDir: { value: new THREE.Vector3(0.45, 0.62, 0.3).normalize() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 sunDir;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.55));
          float sun = max(dot(normalize(vDir), sunDir), 0.0);
          col += vec3(1.0, 0.86, 0.6) * (pow(sun, 600.0) * 3.0 + pow(sun, 12.0) * 0.18);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    this.sky = sky;
    return sky;
  }

  setupLighting() {
    // Osmondan tushadigan yumshoq yorug'lik (yuqori -- ko'k, pastdan yerdan qaytgan iliq)
    this.hemiLight = new THREE.HemisphereLight(0xd6e6ff, 0x4d4230, 1.15);
    this.scene.add(this.hemiLight);

    // Quyosh: kuchli, iliq, aniq soya beradi. Soya kamerasi faqat o'yinchi atrofini qamraydi --
    // shu sabab soya tiniq, lekin telefonga og'ir emas.
    this.sunLight = new THREE.DirectionalLight(0xfff0d2, 2.6);
    this.sunOffset = new THREE.Vector3(30, 42, 21);
    this.sunLight.castShadow = this.quality.shadows;
    if (this.quality.shadows) {
      this.sunLight.shadow.mapSize.set(this.quality.shadowSize, this.quality.shadowSize);
    }
    const sc = this.sunLight.shadow.camera;
    sc.near = 5;
    sc.far = 140;
    sc.left = -34;
    sc.right = 34;
    sc.top = 34;
    sc.bottom = -34;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Garaj ichidagi chiroq: 4 ta o'rniga BITTA, o'yinchiga eng yaqin garajga ko'chadi
    // (har bir qo'shimcha chiroq telefonda har pikselni qimmatlashtiradi)
    this.garageLight = new THREE.PointLight(0xffd79a, 0, 26, 1.6);
    this.scene.add(this.garageLight);
  }

  onResize() {
    this._measure();
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.effects.setViewportHeight(this.height);
  }

  // FPS doimiy past bo'lsa sifatni bir pog'ona tushiramiz, uzoq vaqt a'lo bo'lsa qaytaramiz.
  // Juda past FPS (< 12) -- bu sekin telefon emas, ilova fonda/yashirin: hisobga olinmaydi.
  _adaptQuality(dt) {
    const w = this._fpsWindow;
    w.t += dt;
    w.frames++;
    w.age = (w.age || 0) + dt;
    if (w.t < 3) return;
    const fps = w.frames / w.t;
    w.t = 0;
    w.frames = 0;
    if (!this.autoQuality || w.age < 6 || fps < 12) return; // yuklanish paytini va fon holatini o'tkazib yuboramiz
    w.slow = fps < 38 ? (w.slow || 0) + 1 : 0;
    w.fast = fps >= 57 ? (w.fast || 0) + 1 : 0;
    if (w.slow >= 3 && this.qualityIndex > 0) {
      w.slow = 0;
      this.setQuality(this.qualityIndex - 1);
    } else if (w.fast >= 10 && this.qualityIndex < this.maxQualityIndex) {
      w.fast = 0;
      this.setQuality(this.qualityIndex + 1);
    }
  }

  /** Sozlamalardan: 'auto' yoki 0 (past) / 1 (o'rta) / 2 (yuqori) */
  setQualityMode(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem('tankQualityManual');
      else localStorage.setItem('tankQualityManual', String(mode));
    } catch (e) {}
    this.autoQuality = mode === 'auto';
    this._fpsWindow = { t: 0, frames: 0, slow: 0, age: 0 };
    this.setQuality(mode === 'auto' ? detectQuality(true) : mode);
  }

  setQuality(index) {
    const q = QUALITY[Math.max(0, Math.min(QUALITY.length - 1, index))];
    this.qualityIndex = QUALITY.indexOf(q);
    this.quality = q;
    try {
      localStorage.setItem('tankQuality', String(this.qualityIndex));
    } catch (e) {}
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    this.renderer.setSize(this.width, this.height, false);
    const hadShadows = this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = q.shadows;
    this.sunLight.castShadow = q.shadows;
    if (q.shadows) {
      this.sunLight.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
    if (hadShadows !== q.shadows) {
      this.scene.traverse((o) => {
        if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true));
      });
    }
  }

  to3DCoords(x2d, y2d) {
    return ML.to3D(x2d, y2d);
  }

  /** 2D o'yin nuqtasi (h balandlikda) -> HUD kanvasidagi piksel. Ekran orqasida bo'lsa null. */
  projectToScreen(x2d, y2d, h, viewW, viewH) {
    const p = ML.to3D(x2d, y2d);
    const v = this._v3.set(p.x, h, p.z).project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: (v.x * 0.5 + 0.5) * viewW, y: (-v.y * 0.5 + 0.5) * viewH };
  }

  getOrCreateTank(id, options = {}) {
    let t = this.tanks.get(id);
    if (!t) {
      t = TankModel3D.build(options);
      this.scene.add(t.root);
      this.tanks.set(id, t);
    }
    return t;
  }

  /**
   * Barmoq bilan surish: deltaX -- kamerani (va minorani) aylantiradi, deltaY -- egilish
   */
  rotateCamera(deltaX, deltaY = 0) {
    if (this.cameraYaw === null) this.cameraYaw = 0;
    this.cameraYaw += deltaX * 0.0055;
    while (this.cameraYaw > Math.PI) this.cameraYaw -= Math.PI * 2;
    while (this.cameraYaw < -Math.PI) this.cameraYaw += Math.PI * 2;
    if (deltaY !== 0) {
      this.cameraPitch = Math.max(0.12, Math.min(0.85, this.cameraPitch + deltaY * 0.0035));
    }
    if (this.lastGame && this.lastGame.player && !this.lastGame.player.dead) {
      this.lastGame.player.turretAngle = this.cameraYaw;
      this.lastGame.player.targetTurretAngle = this.cameraYaw;
    }
  }

  addShake(amount) {
    // Ko'p otishmada ham kamera haddan tashqari titramaydi
    this.shake = Math.min(0.6, this.shake + amount);
  }

  // Bitta tankni 2D holatdan 3D ga ko'chirish (o'yinchi, bot va boshqa odamlar uchun bir xil)
  _syncTank(t3d, tank, dt, showBadge) {
    if (tank.dead) {
      t3d.root.visible = false;
      return;
    }
    t3d.root.visible = true;
    const p = ML.to3D(tank.x, tank.y);
    t3d.root.position.set(p.x, 0, p.z);
    const body = angleToRotY(tank.bodyAngle || 0);
    t3d.root.rotation.y = body;
    t3d.turret.rotation.y = angleToRotY(tank.turretAngle || 0) - body;

    const recoil = tank.barrelRecoilOffset || 0;
    t3d.barrel.position.z = t3d.barrelRestZ - recoil * 0.05;

    // Zarba tekkanda qizarish
    const flash = Math.min(1, (tank.hitFlashTimer || 0) / 0.15);
    for (const m of t3d.paintMats) m.emissive.setRGB(flash * 0.9, flash * 0.12, 0);

    // Stvol uchidagi olov (o'q otilganda 0.06 s)
    if (t3d.muzzleFlash) {
      const on = (tank.muzzleFlashTimer || 0) > 0;
      t3d.muzzleFlash.visible = on;
      if (on) t3d.muzzleFlash.scale.setScalar(1.3 + Math.random() * 0.8);
    }

    t3d.badgeSprite.visible = showBadge;
    if (showBadge) {
      t3d.updateBadge(tank.name || 'Tank', Math.max(0, tank.hp || 0) / (tank.maxHp || 100));
    }
  }

  _isInsideGarage(x3, z3) {
    for (const g of this.garages) {
      const dx = x3 - g.x;
      const dz = z3 - g.z;
      const c = Math.cos(g.rot);
      const s = Math.sin(g.rot);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      if (Math.abs(lx) < 9 && lz > -18 && lz < 9) return g;
    }
    return null;
  }

  /** Har kadrda GameEngine chaqiradi */
  renderGameState(game, dt = 0.016) {
    if (!game || this.contextLost) return;
    if (!game.player) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.lastGame = game;
    this.time += dt;
    this._adaptQuality(dt);

    const player = game.player;
    const player3D = this.getOrCreateTank(this.playerTankId, {
      name: player.name || 'Commander',
      primaryColor: 0x5d783b, // o'yinchi -- harbiy yashil
      badgeColor: '#00ff88',
    });

    // Minora kamera yo'nalishiga qaraydi
    if (this.cameraYaw === null) {
      this.cameraYaw =
        player.turretAngle !== undefined ? player.turretAngle : player.bodyAngle || 0;
    }
    if (!player.dead) {
      player.turretAngle = this.cameraYaw;
      player.targetTurretAngle = this.cameraYaw;
    }
    // O'z tankimiz ustida ism yozuvi yo'q -- jon chizig'i HUD'da (ko'rinishni to'smaydi)
    this._syncTank(player3D, player, dt, false);

    const pPos = ML.to3D(player.x, player.y);

    // Garaj tomi: o'yinchi ichkarida bo'lsa shaffoflashadi
    const insideG = this._isInsideGarage(pPos.x, pPos.z);
    for (const g of this.garages) {
      const target = g === insideG ? 0.12 : 1;
      g.roofMat.opacity += (target - g.roofMat.opacity) * Math.min(1, dt * 6);
      g.roofMesh.castShadow = g.roofMat.opacity > 0.85;
    }

    // Eng yaqin garajga chiroq
    let nearG = null;
    let nearD = 1e9;
    for (const g of this.garages) {
      const d = Math.hypot(pPos.x - g.x, pPos.z - g.z);
      if (d < nearD) {
        nearD = d;
        nearG = g;
      }
    }
    if (nearG) {
      const lp = ML.garageToWorld(nearG, 0, -4);
      this.garageLight.position.set(lp.x, 7.2, lp.z);
      this.garageLight.intensity = nearD < 40 ? 22 : 0;
    }

    // O'lgandan keyin kamera qotib qolmaydi -- portlagan joy atrofida sekin aylanadi
    if (player.dead) this.cameraYaw += dt * 0.35;
    this._updateCamera(player, pPos, insideG, dt);

    // Quyosh soyasi o'yinchi atrofida; soya xaritasi "titramasligi" uchun piksel to'riga tekislanadi
    const texel = 68 / (this.quality.shadowSize || 1024);
    const sx = Math.round(pPos.x / texel) * texel;
    const sz = Math.round(pPos.z / texel) * texel;
    this.sunLight.target.position.set(sx, 0, sz);
    this.sunLight.position.set(sx + this.sunOffset.x, this.sunOffset.y, sz + this.sunOffset.z);
    this.sunLight.target.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);

    // Botlar va boshqa o'yinchilar
    const active = new Set([this.playerTankId]);
    const others = [];
    for (const bot of game.bots || []) others.push([`bot_${bot.id}`, bot]);
    for (const [id, rp] of game.peers || []) others.push([`rp_${id}`, rp]);
    for (const [id, tank] of others) {
      active.add(id);
      const col = colorFor(id);
      const t3d = this.getOrCreateTank(id, {
        name: tank.name || 'Tank',
        primaryColor: col.hex,
        badgeColor: col.str,
      });
      this._syncTank(t3d, tank, dt, true);
    }
    for (const [id, t] of this.tanks) {
      if (active.has(id)) continue;
      // Chiqib ketgan tank: xotiradan butunlay tozalanadi
      this.scene.remove(t.root);
      t.dispose();
      this.tanks.delete(id);
    }

    this._syncBullets(game.bullets || []);
    this._syncMines(game.landmines || [], dt);

    // Buzilgan g'isht devorlar 3D da ham yo'qoladi (2D to'siq bilan bir xil kalit)
    if (game.walls) {
      for (const w of game.walls) {
        if (!w.key || !w.destructible) continue;
        const mesh = this.meshesByKey[w.key];
        if (mesh) mesh.visible = !w.destroyed;
      }
    }

    this.effects.syncWreckages(game.wreckages || []);
    this.effects.syncCrates(game.crates || [], this.time);
    this.effects.syncCoins(game.coins || [], this.time);
    this.effects.syncDecals(game.groundDecals || []);
    this.effects.syncTreads(game.treadMarks || []);
    this.effects.syncDebris(game.debrisChunks || []);
    this.effects.syncParticles(game.particles || []);

    this.renderer.render(this.scene, this.camera);
  }

  _updateCamera(player, pPos, insideG, dt) {
    // Garaj ichida -- yaqinroq va pastroq; dalada -- jangni ko'rish uchun uzoqroq
    const targetDistance = insideG ? 9 : 13.5;
    const targetLookH = insideG ? 1.9 : 2.3;
    const k = Math.min(1, dt * 4);
    this.cameraDistance += (targetDistance - this.cameraDistance) * k;
    this.cameraLookHeight += (targetLookH - this.cameraLookHeight) * k;

    let dist = this.cameraDistance;
    const cosY = Math.cos(this.cameraYaw);
    const sinY = Math.sin(this.cameraYaw);

    // Kamera devor ichiga kirmasin: tankdan kameragacha chiziq garaj devorini kesib o'tsa -- yaqinlashadi
    const horiz = dist * Math.cos(this.cameraPitch);
    const camX2 = player.x - (cosY * horiz) / ML.SCALE;
    const camY2 = player.y - (sinY * horiz) / ML.SCALE;
    let tHit = 1;
    for (const w of this.cameraBlockers) {
      const t = ML.segmentVsBox(player.x, player.y, camX2, camY2, w, 0.6 / ML.SCALE);
      if (t >= 0 && t < tHit) tHit = t;
    }
    if (tHit < 1) dist *= Math.max(0.28, tHit - 0.06);

    const h = dist * Math.cos(this.cameraPitch);
    const v = dist * Math.sin(this.cameraPitch);
    const tx = pPos.x - cosY * h;
    const tz = pPos.z - sinY * h;
    const ty = Math.max(1.6, v + 0.8);

    const look = this._v3.set(pPos.x + cosY * 4, this.cameraLookHeight, pPos.z + sinY * 4);

    if (!this.cameraInitialized) {
      this.camera.position.set(tx, ty, tz);
      this.cameraInitialized = true;
    } else {
      const f = Math.min(1, dt * 9);
      this.camera.position.x += (tx - this.camera.position.x) * f;
      this.camera.position.y += (ty - this.camera.position.y) * f;
      this.camera.position.z += (tz - this.camera.position.z) * f;
    }

    // Silkinish (otish/portlash) -- tez so'nadi
    const g = this.lastGame;
    if (g && g.cameraShakeTimer > 0) this.addShake(dt * (g.cameraShakeIntensity || 2) * 0.6);
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
      this.shake *= Math.pow(0.002, dt);
    }
    this.camera.lookAt(look);
  }

  _syncBullets(bullets) {
    if (!this._bulletParts) {
      const core = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8);
      core.rotateX(Math.PI / 2);
      const tracer = new THREE.CylinderGeometry(0.02, 0.09, 1.6, 6, 1, true);
      tracer.rotateX(-Math.PI / 2);
      tracer.translate(0, 0, -0.9);
      this._bulletParts = {
        core,
        tracer,
        coreMat: new THREE.MeshStandardMaterial({
          color: 0x8a6a3a,
          metalness: 0.8,
          roughness: 0.3,
        }),
        tracerMat: new THREE.MeshBasicMaterial({
          color: 0xffb347,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      };
    }
    const bp = this._bulletParts;
    while (this.bulletMeshes.length < bullets.length) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bp.core, bp.coreMat));
      g.add(new THREE.Mesh(bp.tracer, bp.tracerMat));
      this.scene.add(g);
      this.bulletMeshes.push(g);
    }
    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const m = this.bulletMeshes[i];
      const b = bullets[i];
      m.visible = !!b;
      if (!b) continue;
      const p = ML.to3D(b.x, b.y);
      m.position.set(p.x, 1.25, p.z);
      m.rotation.y = Math.atan2(b.vx || 1, b.vy || 0);
    }
  }

  _syncMines(mines, dt) {
    while (this.mineMeshes.length < mines.length) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.62, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x333639, metalness: 0.7, roughness: 0.35 })
      );
      base.castShadow = true;
      g.add(base);
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      led.position.y = 0.09;
      g.add(led);
      this.scene.add(g);
      this.mineMeshes.push({ group: g, led, timer: 0 });
    }
    for (let i = 0; i < this.mineMeshes.length; i++) {
      const o = this.mineMeshes[i];
      const m = mines[i];
      o.group.visible = !!m;
      if (!m) continue;
      const p = ML.to3D(m.x, m.y);
      o.group.position.set(p.x, 0.07, p.z);
      o.timer += dt * 5;
      o.led.material.color.setHex(Math.sin(o.timer) > 0 ? 0x00ff88 : 0x004422);
    }
  }
}
