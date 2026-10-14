/**
 * O'yin mantig'ida bor, lekin avval 3D da chizilmagan narsalar:
 * - zarrachalar (uchqun, tutun, chang, olov, g'isht parchasi) -- bitta Points (1 ta chizish buyrug'i)
 * - o'lgan tank qoldig'i (yonib turgan qora tank -- 2D da u to'siq, endi ko'rinadi ham)
 * - qurol qutilari, oltin tangalar, kuyik izlari
 */
import * as THREE from '../../lib/three.module.js';
import { TankModel3D } from './TankModel.js';

const ML = globalThis.MapLayout;
const MAX_PARTICLES = 400;

// CSS rang ('#ff8800' yoki 'rgba(195,175,155,0.55)') -> THREE.Color, keshlangan
const colorCache = new Map();
function cssColor(str) {
  let c = colorCache.get(str);
  if (!c) {
    c = new THREE.Color();
    const m = /^rgba?\(([^)]+)\)/.exec(str || '');
    if (m) {
      const [r, g, b] = m[1].split(',').map((n) => parseFloat(n) / 255);
      c.setRGB(r, g, b, THREE.SRGBColorSpace);
    } else {
      try {
        c.setStyle(str || '#ffffff');
      } catch (e) {
        c.set(0xffffff);
      }
    }
    colorCache.set(str, c);
  }
  return c;
}

// Zarracha balandligi (2D da balandlik yo'q): turiga qarab yoshidan hisoblanadi
function particleHeight(p, age) {
  switch (p.type) {
    case 'smoke':
      return 1.2 + age * 2.4;
    case 'flame':
      return 0.9 + age * 1.6;
    case 'dust':
      return 0.25 + age * 0.7;
    case 'spark':
    case 'debris':
    case 'shrapnel':
      return Math.max(0.05, 0.9 + age * 5 - age * age * 11);
    default:
      return 0.9 + age * 0.8;
  }
}

export class Effects3D {
  constructor(scene) {
    this.scene = scene;
    this._initParticles();
    this.wrecks = [];
    this.crateMeshes = new Map();
    this.coinMeshes = [];
    this.decals = [];
    this._crateGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    this._crateMats = {};
    this._coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16);
    this._coinGeo.rotateX(Math.PI / 2);
    this._coinMat = new THREE.MeshStandardMaterial({
      color: 0xffc83a,
      emissive: 0x6b4a00,
      metalness: 0.9,
      roughness: 0.3,
    });
    this._decalGeo = new THREE.PlaneGeometry(1, 1);
    this._decalGeo.rotateX(-Math.PI / 2);
    this._decalMat = new THREE.MeshBasicMaterial({
      map: this._scorchTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  }

  _initParticles() {
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 4);
    this.pSize = new Float32Array(MAX_PARTICLES);
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage)
    );
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(this.pCol, 4).setUsage(THREE.DynamicDrawUsage)
    );
    geo.setAttribute(
      'size',
      new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage)
    );
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: `
        attribute float size;
        attribute vec4 color;
        uniform float uScale;
        varying vec4 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 96.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec4 vColor;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          gl_FragColor = vec4(vColor.rgb, vColor.a * (1.0 - r));
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  setViewportHeight(h) {
    // Nuqta o'lchami ekran balandligiga mos (har xil telefonda bir xil ko'rinsin)
    this.points.material.uniforms.uScale.value = h * 0.9;
  }

  syncParticles(particles) {
    const n = Math.min(particles.length, MAX_PARTICLES);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const p = particles[particles.length - 1 - i];
      if (p.type === 'shockwave' || p.life <= 0) continue;
      const age = p.maxLife - p.life;
      const pos = ML.to3D(p.x, p.y);
      const c = cssColor(p.color);
      const fade = Math.max(0, p.life / p.maxLife);
      this.pPos[k * 3] = pos.x;
      this.pPos[k * 3 + 1] = particleHeight(p, age);
      this.pPos[k * 3 + 2] = pos.z;
      this.pCol[k * 4] = c.r;
      this.pCol[k * 4 + 1] = c.g;
      this.pCol[k * 4 + 2] = c.b;
      this.pCol[k * 4 + 3] = p.type === 'smoke' || p.type === 'dust' ? fade * 0.7 : fade;
      this.pSize[k] = Math.max(0.08, p.size * ML.SCALE * 2.2);
      k++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, k);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
  }

  // O'lgan tank qoldig'i -- 2D dagi TankWreckage bilan bir xil joy va o'lcham
  syncWreckages(wreckages) {
    while (this.wrecks.length < wreckages.length) {
      const w = TankModel3D.build({ name: '', primaryColor: 0x1d1c1a });
      w.badgeSprite.visible = false;
      w.root.traverse((o) => {
        if (o.material && o.material.color && o.material !== w.badgeSprite.material) {
          o.material = o.material.clone();
          o.material.color.multiplyScalar(0.35);
          if (o.material.emissive) o.material.emissive.setHex(0x120400);
        }
      });
      this.scene.add(w.root);
      this.wrecks.push(w);
    }
    for (let i = 0; i < this.wrecks.length; i++) {
      const mesh = this.wrecks[i];
      const wr = wreckages[i];
      if (!wr || wr.life <= 0) {
        mesh.root.visible = false;
        continue;
      }
      const p = ML.to3D(wr.x, wr.y);
      // Oxirgi 1.5 soniyada yerga cho'kib yo'qoladi
      const sink = wr.life < 1.5 ? (1.5 - wr.life) * 1.2 : 0;
      mesh.root.visible = true;
      mesh.root.position.set(p.x, -sink, p.z);
      const body = Math.atan2(Math.cos(wr.bodyAngle), Math.sin(wr.bodyAngle));
      const tur = Math.atan2(Math.cos(wr.turretAngle), Math.sin(wr.turretAngle));
      mesh.root.rotation.set(0.04, body, -0.05);
      mesh.turret.rotation.y = tur - body;
      mesh.turret.position.x = (wr.turretOffset ? wr.turretOffset.x : 0) * ML.SCALE;
    }
  }

  syncCrates(crates, time) {
    const colors = { shotgun: 0xff3366, rocket: 0xffd700, mine: 0x2ecc71, shield: 0x3b82f6 };
    const seen = new Set();
    for (const c of crates) {
      seen.add(c.id);
      let m = this.crateMeshes.get(c.id);
      if (!m) {
        const col = colors[c.type] || 0x00f0ff;
        if (!this._crateMats[col]) {
          this._crateMats[col] = new THREE.MeshStandardMaterial({
            color: 0x5b4a33,
            emissive: col,
            emissiveIntensity: 0.35,
            roughness: 0.8,
          });
        }
        m = new THREE.Mesh(this._crateGeo, this._crateMats[col]);
        m.castShadow = true;
        this.scene.add(m);
        this.crateMeshes.set(c.id, m);
      }
      m.visible = !c.collected;
      if (m.visible) {
        const p = ML.to3D(c.x, c.y);
        m.position.set(p.x, 0.9 + Math.sin(time * 2 + p.x) * 0.15, p.z);
        m.rotation.y = time * 0.8;
      }
    }
    for (const [id, m] of this.crateMeshes) if (!seen.has(id)) m.visible = false;
  }

  syncCoins(coins, time) {
    while (this.coinMeshes.length < coins.length) {
      const m = new THREE.Mesh(this._coinGeo, this._coinMat);
      m.castShadow = true;
      this.scene.add(m);
      this.coinMeshes.push(m);
    }
    for (let i = 0; i < this.coinMeshes.length; i++) {
      const m = this.coinMeshes[i];
      const c = coins[i];
      m.visible = !!c && !c.collected && c.life > 0;
      if (!m.visible) continue;
      const p = ML.to3D(c.x, c.y);
      m.position.set(p.x, 0.7 + Math.sin(time * 3 + i) * 0.12, p.z);
      m.rotation.y = time * 3 + i;
    }
  }

  syncDecals(decals) {
    while (this.decals.length < decals.length) {
      const m = new THREE.Mesh(this._decalGeo, this._decalMat);
      m.renderOrder = 1;
      this.scene.add(m);
      this.decals.push(m);
    }
    for (let i = 0; i < this.decals.length; i++) {
      const m = this.decals[i];
      const d = decals[i];
      m.visible = !!d && (d.life === undefined || d.life > 0);
      if (!m.visible) continue;
      const p = ML.to3D(d.x, d.y);
      const s = (d.radius || 60) * ML.SCALE * 1.4;
      m.position.set(p.x, 0.085, p.z);
      m.scale.set(s, 1, s);
    }
  }

  // Gusenitsa izlari: har iz -- ikki qora chiziq (chap va o'ng gusenitsa), asta so'nadi
  syncTreads(marks) {
    const MAX = 200;
    if (!this.treads) {
      const geo = new THREE.PlaneGeometry(1, 1);
      geo.rotateX(-Math.PI / 2);
      this.treads = new THREE.InstancedMesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0x1f1810,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        MAX
      );
      this.treads.frustumCulled = false;
      this.treads.renderOrder = 1;
      this.scene.add(this.treads);
      this._tm = new THREE.Matrix4();
      this._tq = new THREE.Quaternion();
      this._tv = new THREE.Vector3();
      this._ts = new THREE.Vector3();
      this._up = new THREE.Vector3(0, 1, 0);
    }
    let k = 0;
    for (let i = marks.length - 1; i >= 0 && k < MAX - 1; i--) {
      const m = marks[i];
      if (m.life <= 0) continue;
      const fade = Math.min(1, m.life / 12) * (m.alpha / (m.initialAlpha || 1));
      const rotY = Math.atan2(Math.cos(m.angle), Math.sin(m.angle));
      this._tq.setFromAxisAngle(this._up, rotY);
      const px = -Math.sin(m.angle);
      const py = Math.cos(m.angle);
      for (const side of [-1, 1]) {
        const p = ML.to3D(m.x + px * side * (m.width / 2), m.y + py * side * (m.width / 2));
        this._tm.compose(
          this._tv.set(p.x, 0.075, p.z),
          this._tq,
          this._ts.set(0.38 * fade + 0.05, 1, 1.25)
        );
        this.treads.setMatrixAt(k++, this._tm);
      }
    }
    this.treads.count = k;
    this.treads.instanceMatrix.needsUpdate = true;
  }

  // Buzilgan devor g'isht parchalari: uchib chiqadi, yerga tushib sirpanadi (to'siq emas)
  syncDebris(chunks) {
    const MAX = 60;
    if (!this.debris) {
      this.debris = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
        MAX
      );
      this.debris.castShadow = true;
      this.debris.frustumCulled = false;
      this.scene.add(this.debris);
      this._m4 = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._e = new THREE.Euler();
      this._v = new THREE.Vector3();
      this._s = new THREE.Vector3();
    }
    let k = 0;
    for (let i = 0; i < chunks.length && k < MAX; i++) {
      const d = chunks[i];
      if (d.life <= 0) continue;
      const p = ML.to3D(d.x, d.y);
      const age = d.maxLife - d.life;
      // Birinchi 0.6 soniyada havoda yoy chizib uchadi
      const h = Math.max(0.12, 0.4 + age * 6 - age * age * 10);
      const sz = d.size * ML.SCALE * (d.life < 1 ? d.life : 1);
      this._m4.compose(
        this._v.set(p.x, h, p.z),
        this._q.setFromEuler(this._e.set(d.rot, d.rot * 0.7, 0)),
        this._s.set(sz, sz, sz)
      );
      this.debris.setMatrixAt(k, this._m4);
      this.debris.setColorAt(k, cssColor(d.color));
      k++;
    }
    this.debris.count = k;
    this.debris.instanceMatrix.needsUpdate = true;
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
  }

  _scorchTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(8,6,5,0.85)');
    g.addColorStop(0.55, 'rgba(25,20,16,0.55)');
    g.addColorStop(1, 'rgba(30,25,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
}
