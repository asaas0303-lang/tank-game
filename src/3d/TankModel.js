/**
 * Procedural Stylized WW2 Cartoonish Tank 3D Model Generator
 * Matches the reference image:
 * - Olive green rounded hull with white star decal
 * - Dome-shaped turret with white star and top hatch
 * - Chubby cannon barrel with thick muzzle ring
 * - 3 large road wheels per side, drive/idler wheels, segmented tracks
 * - Radio antenna with ball tip, rear fuel drums, fender toolboxes
 * - Billboard Name & HP Badge floating over the turret (Reference Image 2)
 */
import * as THREE from '../../lib/three.module.js';
import { mergeGeometries } from '../../lib/BufferGeometryUtils.js';

// Bir xil materialdagi bo'laklarni bitta mesh'ga birlashtiradi: tank ~40 ta emas, ~10 ta
// chizish buyrug'i bo'ladi (soyasi bilan ikki barobar) -- telefon GPU'si uchun katta yengillik.
function mergeByMaterial(group, skip) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const isSkipped = (o) => {
    for (let p = o; p && p !== group; p = p.parent) if (p === skip) return true;
    return false;
  };
  group.traverse((o) => {
    if (!o.isMesh || isSkipped(o)) return;
    const geo = o.geometry
      .clone()
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push({ o, geo });
  });
  for (const [mat, list] of buckets) {
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map((x) => x.geo));
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = list.some((x) => x.o.castShadow);
    mesh.receiveShadow = list.some((x) => x.o.receiveShadow);
    list.forEach((x) => {
      x.o.parent.remove(x.o);
      x.o.geometry.dispose();
    });
    group.add(mesh);
  }
}

let starTextureCache = null;
let flashTextureCache = null;
function muzzleFlashTexture() {
  if (flashTextureCache) return flashTextureCache;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,250,220,1)');
  g.addColorStop(0.3, 'rgba(255,190,80,0.9)');
  g.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  flashTextureCache = new THREE.CanvasTexture(cv);
  flashTextureCache.colorSpace = THREE.SRGBColorSpace;
  return flashTextureCache;
}

export class TankModel3D {
  static createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Draw clean 5-pointed white star with subtle warm drop-shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#f8faf0';
    ctx.beginPath();
    const cx = 128,
      cy = 128,
      spikes = 5,
      outerRadius = 105,
      innerRadius = 46;
    let rot = (Math.PI / 2) * 3;
    let x = cx,
      y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createBadgeTexture(name = 'Player', hpPercent = 1.0, colorHex = '#00ff88') {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 384, 96);

    // Background sleek dark capsule badge
    ctx.fillStyle = 'rgba(8, 14, 24, 0.88)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3;

    // Rounded rectangle
    const r = 16,
      w = 376,
      h = 88,
      x = 4,
      y = 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Icon & Player Name
    const cleanName = (name || 'Tank').toUpperCase().slice(0, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Rajdhani", sans-serif, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤 ' + cleanName, 22, 36);

    // HP Percentage text on right
    const roundedHp = Math.max(0, Math.min(100, Math.round(hpPercent * 100)));
    ctx.fillStyle = colorHex;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${roundedHp}%`, 362, 36);

    // HP Bar background track
    const barX = 22,
      barY = 62,
      barW = 340,
      barH = 14;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(barX, barY, barW, barH, 7) : ctx.rect(barX, barY, barW, barH);
    ctx.fill();

    // Dynamic HP Color (green -> amber -> crimson)
    let hpColor = colorHex;
    if (roundedHp <= 25) hpColor = '#ff2a5f';
    else if (roundedHp <= 50) hpColor = '#ffaa00';

    // HP Bar fill
    const fillW = Math.max(0, Math.min(barW, barW * hpPercent));
    if (fillW > 0) {
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(barX, barY, fillW, barH, 7) : ctx.rect(barX, barY, fillW, barH);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Creates a complete stylized tank group
   * @param {Object} options - color theme and custom scales
   */
  static build(options = {}) {
    const root = new THREE.Group();
    root.name = 'tank_root';

    const baseColor = options.primaryColor || 0x5d783b; // Army Olive Green
    const darkColor = 0x475c2b;
    const trackColor = 0x222426;
    const wheelColor = 0x526934;
    const metalColor = 0x3a3d40;

    // High quality PBR materials with clear specular sheen
    const hullMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.35,
      metalness: 0.18,
    });

    const darkHullMat = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.4,
      metalness: 0.15,
    });

    const trackMat = new THREE.MeshStandardMaterial({
      color: trackColor,
      roughness: 0.75,
      metalness: 0.35,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: wheelColor,
      roughness: 0.38,
      metalness: 0.2,
    });

    const starTexture = starTextureCache || (starTextureCache = this.createStarTexture());
    const starMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // 1. CHASSIS / HULL (Main lower body)
    const hullGroup = new THREE.Group();
    hullGroup.name = 'hull';

    // Rounded central body
    const mainHullGeo = new THREE.CylinderGeometry(1.4, 1.55, 2.4, 18);
    mainHullGeo.rotateZ(Math.PI / 2);
    mainHullGeo.scale(1.25, 0.75, 1.05);
    const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
    mainHull.position.set(0, 0.85, 0);
    mainHull.castShadow = true;
    mainHull.receiveShadow = true;
    hullGroup.add(mainHull);

    // Front sloped glacis
    const frontGlacisGeo = new THREE.SphereGeometry(1.3, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
    frontGlacisGeo.scale(1.15, 0.78, 1.3);
    const frontGlacis = new THREE.Mesh(frontGlacisGeo, hullMat);
    frontGlacis.rotation.x = Math.PI * 0.15;
    frontGlacis.position.set(0, 0.76, 0.6);
    frontGlacis.castShadow = true;
    frontGlacis.receiveShadow = true;
    hullGroup.add(frontGlacis);

    // Front star decal (prominent on front glacis)
    const frontStarGeo = new THREE.PlaneGeometry(0.68, 0.68);
    const frontStar = new THREE.Mesh(frontStarGeo, starMat);
    frontStar.position.set(0, 0.88, 1.68);
    frontStar.rotation.x = -Math.PI * 0.18;
    hullGroup.add(frontStar);

    // Fenders / Mudguards (Left & Right curved plates over tracks)
    [-1.32, 1.32].forEach((sideX) => {
      const fenderGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.7, 18, 1, false, 0, Math.PI);
      fenderGeo.rotateZ(Math.PI / 2);
      fenderGeo.scale(0.85, 0.38, 1.65);
      const fender = new THREE.Mesh(fenderGeo, darkHullMat);
      fender.position.set(sideX, 1.0, 0.05);
      fender.castShadow = true;
      hullGroup.add(fender);

      // Toolbox on fender
      const boxGeo = new THREE.BoxGeometry(0.38, 0.28, 0.7);
      const box = new THREE.Mesh(boxGeo, darkHullMat);
      box.position.set(sideX, 1.22, -0.3);
      box.castShadow = true;
      hullGroup.add(box);
    });

    // Rear Fuel Drums (Two green cylinders at back)
    [-0.58, 0.58].forEach((drumX) => {
      const drumGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.58, 16);
      drumGeo.rotateZ(Math.PI / 2);
      const drum = new THREE.Mesh(drumGeo, darkHullMat);
      drum.position.set(drumX, 0.98, -1.45);
      drum.castShadow = true;
      hullGroup.add(drum);
    });

    // Radio Antenna (Thin mast with spherical knob on rear right)
    const antennaGroup = new THREE.Group();
    const mastGeo = new THREE.CylinderGeometry(0.02, 0.025, 1.3, 8);
    const mast = new THREE.Mesh(
      mastGeo,
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.85, roughness: 0.2 })
    );
    mast.position.set(1.2, 1.8, -1.05);
    mast.castShadow = true;
    antennaGroup.add(mast);

    const knobGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const knob = new THREE.Mesh(
      knobGeo,
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.85, roughness: 0.2 })
    );
    knob.position.set(1.2, 2.45, -1.05);
    antennaGroup.add(knob);
    hullGroup.add(antennaGroup);

    // 2. TRACKS AND ROAD WHEELS (Left & Right)
    [-1.32, 1.32].forEach((sideX) => {
      // 3 Main Large Road Wheels
      const wheelPositionsZ = [-0.7, 0.0, 0.7];
      wheelPositionsZ.forEach((wz) => {
        // Outer wheel rim
        const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 20);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(sideX, 0.46, wz);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        hullGroup.add(wheel);

        // Center hub cap
        const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.38, 16);
        hubGeo.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, darkHullMat);
        hub.position.set(sideX, 0.46, wz);
        hullGroup.add(hub);
      });

      // Front & Rear Idler / Drive Sprocket Wheels (slightly raised)
      [-1.25, 1.25].forEach((iz) => {
        const idlerGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.32, 16);
        idlerGeo.rotateZ(Math.PI / 2);
        const idler = new THREE.Mesh(idlerGeo, darkHullMat);
        idler.position.set(sideX, 0.56, iz);
        idler.castShadow = true;
        hullGroup.add(idler);
      });

      // Track Belt Mesh (Dark rounded continuous tread wrapper)
      const trackTreadGeo = new THREE.BoxGeometry(0.38, 0.78, 2.85);
      const trackTread = new THREE.Mesh(trackTreadGeo, trackMat);
      trackTread.position.set(sideX, 0.46, 0);
      trackTread.castShadow = true;
      trackTread.receiveShadow = true;
      hullGroup.add(trackTread);
    });

    root.add(hullGroup);

    // 3. TURRET (360° Rotatable independently)
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turret';
    turretGroup.position.set(0, 1.35, 0.1);

    // Bulbous dome turret
    const domeGeo = new THREE.SphereGeometry(1.15, 22, 18);
    domeGeo.scale(1.02, 0.8, 1.18);
    const dome = new THREE.Mesh(domeGeo, hullMat);
    dome.position.set(0, 0.38, -0.05);
    dome.castShadow = true;
    dome.receiveShadow = true;
    turretGroup.add(dome);

    // Top Cupola Hatch (Round dome on top)
    const hatchGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.2, 18);
    const hatch = new THREE.Mesh(hatchGeo, darkHullMat);
    hatch.position.set(0, 1.15, -0.05);
    hatch.castShadow = true;
    turretGroup.add(hatch);

    const hatchTopGeo = new THREE.SphereGeometry(0.48, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const hatchTop = new THREE.Mesh(hatchTopGeo, hullMat);
    hatchTop.position.set(0, 1.22, -0.05);
    turretGroup.add(hatchTop);

    // Side White Stars on Turret (Left & Right)
    [-1.12, 1.12].forEach((sideX) => {
      const starPlaneGeo = new THREE.PlaneGeometry(0.62, 0.62);
      const turretStar = new THREE.Mesh(starPlaneGeo, starMat);
      turretStar.position.set(sideX, 0.5, 0.05);
      turretStar.rotation.y = sideX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      turretGroup.add(turretStar);
    });

    // 4. CANNON BARREL & TURRET MANTLET (Stvol & To'p Kallagi)
    const barrelPivot = new THREE.Group();
    barrelPivot.name = 'barrel_pivot';
    barrelPivot.position.set(0, 0.45, 0.95);

    // Heavy Cast Armor Mantlet Shield (front of turret dome)
    const mantletShieldGeo = new THREE.BoxGeometry(0.96, 0.68, 0.45);
    const mantletShield = new THREE.Mesh(mantletShieldGeo, darkHullMat);
    mantletShield.position.set(0, 0, 0.22);
    mantletShield.castShadow = true;
    mantletShield.receiveShadow = true;
    barrelPivot.add(mantletShield);

    // Mantlet Collar (thick rounded ring base around barrel root)
    const mantletCollarGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.42, 18);
    mantletCollarGeo.rotateX(Math.PI / 2);
    const mantlet = new THREE.Mesh(mantletCollarGeo, darkHullMat);
    mantlet.position.set(0, 0, 0.45);
    mantlet.castShadow = true;
    mantlet.receiveShadow = true;
    barrelPivot.add(mantlet);

    // Reinforced Gun Sleeve / Root Collar
    const collarGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.5, 18);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, hullMat);
    collar.position.set(0, 0, 0.7);
    collar.castShadow = true;
    barrelPivot.add(collar);

    // Well-Proportioned High-Velocity Rifled Tank Cannon Tube (1.8 units long)
    const tubeGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.8, 18);
    tubeGeo.rotateX(Math.PI / 2);
    const tube = new THREE.Mesh(tubeGeo, hullMat);
    tube.position.set(0, 0, 1.6); // Extends from 0.7 to 2.5 in barrelPivot local space
    tube.castShadow = true;
    barrelPivot.add(tube);

    // Tactical Dual-Baffle Muzzle Brake (Ogiz tormozi - WoT Blitz style)
    const muzzleBrakeGeo = new THREE.BoxGeometry(0.44, 0.34, 0.48);
    const muzzleBrake = new THREE.Mesh(muzzleBrakeGeo, darkHullMat);
    muzzleBrake.position.set(0, 0, 2.65);
    muzzleBrake.castShadow = true;
    barrelPivot.add(muzzleBrake);

    // Muzzle Side Gas Vents (Left & Right Dark Slots)
    [-0.23, 0.23].forEach((vx) => {
      const ventGeo = new THREE.BoxGeometry(0.04, 0.16, 0.3);
      const vent = new THREE.Mesh(ventGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
      vent.position.set(vx, 0, 2.65);
      barrelPivot.add(vent);
    });

    // Front Muzzle Ring Lip
    const muzzleRingGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 18);
    muzzleRingGeo.rotateX(Math.PI / 2);
    const muzzleRing = new THREE.Mesh(muzzleRingGeo, darkHullMat);
    muzzleRing.position.set(0, 0, 2.92);
    muzzleRing.castShadow = true;
    barrelPivot.add(muzzleRing);

    // Dark Inner Muzzle Bore (Deep gun barrel opening)
    const holeGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14);
    holeGeo.rotateX(Math.PI / 2);
    const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x020202 }));
    hole.position.set(0, 0, 2.98);
    barrelPivot.add(hole);

    // Muzzle tip position marker for projectile spawning
    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.name = 'muzzle_point';
    muzzlePoint.position.set(0, 0, 3.05);
    barrelPivot.add(muzzlePoint);

    // Stvol uchidagi olov (o'q otilgan zahoti 0.06 s ko'rinadi)
    const muzzleFlash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: muzzleFlashTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      })
    );
    muzzleFlash.position.set(0, 0, 3.35);
    muzzleFlash.visible = false;
    barrelPivot.add(muzzleFlash);

    turretGroup.add(barrelPivot);
    root.add(turretGroup);

    mergeByMaterial(hullGroup);
    mergeByMaterial(turretGroup, barrelPivot);
    mergeByMaterial(barrelPivot);

    // 5. FLOATING BILLBOARD BADGE (Reference Image 2)
    const badgeColor =
      options.badgeColor ||
      (options.primaryColor ? '#' + options.primaryColor.toString(16).padStart(6, '0') : '#00ff88');
    const badgeTex = this.createBadgeTexture(options.name || 'Tank', 1.0, badgeColor);
    const badgeMat = new THREE.SpriteMaterial({
      map: badgeTex,
      transparent: true,
      // Ekranda doim bir xil kichik o'lcham (yaqin kelganda ekranni to'smaydi) va
      // devor orqasida ko'rinmaydi (devor ortidagi dushmanni "sezdirmaydi")
      sizeAttenuation: false,
      depthTest: true,
    });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(0.2, 0.05, 1);
    badgeSprite.position.set(0, 3.3, 0);
    root.add(badgeSprite);

    return {
      root,
      hull: hullGroup,
      turret: turretGroup,
      barrel: barrelPivot,
      muzzlePoint,
      muzzleFlash,
      barrelRestZ: barrelPivot.position.z,
      paintMats: [hullMat, darkHullMat],
      badgeSprite,
      badgeColor,
      _lastHp: 100,
      _lastName: options.name || 'Tank',
      updateBadge(name, hpPercent) {
        const roundedHp = Math.max(0, Math.min(100, Math.round(hpPercent * 100)));
        if (this._lastHp === roundedHp && this._lastName === name) {
          return;
        }
        this._lastHp = roundedHp;
        this._lastName = name;
        if (badgeSprite.material.map) {
          badgeSprite.material.map.dispose();
        }
        badgeSprite.material.map = TankModel3D.createBadgeTexture(
          name,
          roundedHp / 100,
          badgeColor
        );
        badgeSprite.material.needsUpdate = true;
      },
      // Tank o'yindan chiqqanda GPU xotirasini bo'shatish
      dispose() {
        root.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (
            o.material &&
            o.material.map &&
            o.material.map !== starTextureCache &&
            o.material.map !== flashTextureCache
          ) {
            o.material.map.dispose();
          }
          if (o.material) o.material.dispose();
        });
      },
    };
  }
}
