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
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    // Background capsule badge
    ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.5;

    // Rounded rectangle
    const r = 10,
      w = 250,
      h = 58,
      x = 3,
      y = 3;
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

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('👤 ' + name.toUpperCase().slice(0, 12), 16, 26);

    // HP Bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(16, 36, 224, 14);

    // HP Bar fill
    ctx.fillStyle = colorHex;
    const fillW = Math.max(0, Math.min(224, 224 * hpPercent));
    ctx.fillRect(16, 36, fillW, 14);

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

    const starTexture = this.createStarTexture();
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

    // 4. CANNON BARREL (Stvol - attached to turret with pitch pivot)
    const barrelPivot = new THREE.Group();
    barrelPivot.name = 'barrel_pivot';
    barrelPivot.position.set(0, 0.45, 0.95);

    // Mantlet Collar (thick rounded ring base)
    const mantletGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.38, 18);
    mantletGeo.rotateX(Math.PI / 2);
    const mantlet = new THREE.Mesh(mantletGeo, darkHullMat);
    mantlet.castShadow = true;
    mantlet.receiveShadow = true;
    barrelPivot.add(mantlet);

    // Chubby main tube
    const tubeGeo = new THREE.CylinderGeometry(0.26, 0.31, 1.45, 18);
    tubeGeo.rotateX(Math.PI / 2);
    const tube = new THREE.Mesh(tubeGeo, hullMat);
    tube.position.set(0, 0, 0.75);
    tube.castShadow = true;
    barrelPivot.add(tube);

    // Front Muzzle Ring Collar (thick lip at tip of barrel)
    const muzzleRingGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
    muzzleRingGeo.rotateX(Math.PI / 2);
    const muzzleRing = new THREE.Mesh(muzzleRingGeo, darkHullMat);
    muzzleRing.position.set(0, 0, 1.55);
    muzzleRing.castShadow = true;
    barrelPivot.add(muzzleRing);

    // Dark inner muzzle hole
    const holeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 14);
    holeGeo.rotateX(Math.PI / 2);
    const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    hole.position.set(0, 0, 1.69);
    barrelPivot.add(hole);

    // Muzzle tip position marker for projectile spawning
    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.name = 'muzzle_point';
    muzzlePoint.position.set(0, 0, 1.82);
    barrelPivot.add(muzzlePoint);

    turretGroup.add(barrelPivot);
    root.add(turretGroup);

    // 5. FLOATING BILLBOARD BADGE (Reference Image 2)
    const badgeColor =
      options.badgeColor ||
      (options.primaryColor ? '#' + options.primaryColor.toString(16).padStart(6, '0') : '#00ff88');
    const badgeTex = this.createBadgeTexture(options.name || 'Tank', 1.0, badgeColor);
    const badgeMat = new THREE.SpriteMaterial({
      map: badgeTex,
      transparent: true,
      depthTest: false,
    });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(4.2, 1.05, 1);
    badgeSprite.position.set(0, 3.6, 0);
    root.add(badgeSprite);

    return {
      root,
      hull: hullGroup,
      turret: turretGroup,
      barrel: barrelPivot,
      muzzlePoint,
      badgeSprite,
      badgeColor,
      updateBadge: (name, hpPercent) => {
        badgeSprite.material.map.dispose();
        badgeSprite.material.map = TankModel3D.createBadgeTexture(name, hpPercent, badgeColor);
      },
    };
  }
}
