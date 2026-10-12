/**
 * Procedural Stylized WW2 Cartoonish Tank 3D Model Generator
 * Matches the reference image:
 * - Olive green rounded hull with white star decal
 * - Dome-shaped turret with white star and top hatch
 * - Chubby cannon barrel with thick muzzle ring
 * - 3 large road wheels per side, drive/idler wheels, segmented tracks
 * - Radio antenna with ball tip, rear fuel drums, fender toolboxes
 */
import * as THREE from '../../lib/three.module.js';

export class TankModel3D {
  static createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    // Draw clean 5-pointed white star
    ctx.fillStyle = '#f4f6ee';
    ctx.beginPath();
    const cx = 64,
      cy = 64,
      spikes = 5,
      outerRadius = 50,
      innerRadius = 22;
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

    // High quality PBR materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.38,
      metalness: 0.12,
    });

    const darkHullMat = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.42,
      metalness: 0.1,
    });

    const trackMat = new THREE.MeshStandardMaterial({
      color: trackColor,
      roughness: 0.8,
      metalness: 0.25,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: wheelColor,
      roughness: 0.4,
      metalness: 0.15,
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
    const mainHullGeo = new THREE.CylinderGeometry(1.3, 1.45, 2.2, 16);
    mainHullGeo.rotateZ(Math.PI / 2);
    mainHullGeo.scale(1.2, 0.7, 1.0);
    const mainHull = new THREE.Mesh(mainHullGeo, hullMat);
    mainHull.position.set(0, 0.8, 0);
    mainHull.castShadow = true;
    mainHull.receiveShadow = true;
    hullGroup.add(mainHull);

    // Front sloped glacis
    const frontGlacisGeo = new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    frontGlacisGeo.scale(1.1, 0.75, 1.25);
    const frontGlacis = new THREE.Mesh(frontGlacisGeo, hullMat);
    frontGlacis.rotation.x = Math.PI * 0.15;
    frontGlacis.position.set(0, 0.72, 0.55);
    frontGlacis.castShadow = true;
    hullGroup.add(frontGlacis);

    // Front star decal
    const frontStarGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const frontStar = new THREE.Mesh(frontStarGeo, starMat);
    frontStar.position.set(0, 0.8, 1.55);
    frontStar.rotation.x = -Math.PI * 0.2;
    hullGroup.add(frontStar);

    // Fenders / Mudguards (Left & Right curved plates over tracks)
    [-1.25, 1.25].forEach((sideX) => {
      const fenderGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.65, 16, 1, false, 0, Math.PI);
      fenderGeo.rotateZ(Math.PI / 2);
      fenderGeo.scale(0.85, 0.35, 1.55);
      const fender = new THREE.Mesh(fenderGeo, darkHullMat);
      fender.position.set(sideX, 0.95, 0.05);
      fender.castShadow = true;
      hullGroup.add(fender);

      // Toolbox on fender
      const boxGeo = new THREE.BoxGeometry(0.35, 0.25, 0.65);
      const box = new THREE.Mesh(boxGeo, darkHullMat);
      box.position.set(sideX, 1.15, -0.3);
      box.castShadow = true;
      hullGroup.add(box);
    });

    // Rear Fuel Drums (Two green cylinders at back)
    [-0.55, 0.55].forEach((drumX) => {
      const drumGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.55, 14);
      drumGeo.rotateZ(Math.PI / 2);
      const drum = new THREE.Mesh(drumGeo, darkHullMat);
      drum.position.set(drumX, 0.92, -1.35);
      drum.castShadow = true;
      hullGroup.add(drum);
    });

    // Radio Antenna (Thin mast with spherical knob on rear right)
    const antennaGroup = new THREE.Group();
    const mastGeo = new THREE.CylinderGeometry(0.02, 0.025, 1.2, 8);
    const mast = new THREE.Mesh(
      mastGeo,
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.8 })
    );
    mast.position.set(1.15, 1.7, -1.0);
    antennaGroup.add(mast);

    const knobGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const knob = new THREE.Mesh(
      knobGeo,
      new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.8 })
    );
    knob.position.set(1.15, 2.3, -1.0);
    antennaGroup.add(knob);
    hullGroup.add(antennaGroup);

    // 2. TRACKS AND ROAD WHEELS (Left & Right)
    [-1.25, 1.25].forEach((sideX) => {
      // 3 Main Large Road Wheels
      const wheelPositionsZ = [-0.65, 0.0, 0.65];
      wheelPositionsZ.forEach((wz) => {
        // Outer wheel rim
        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(sideX, 0.42, wz);
        wheel.castShadow = true;
        hullGroup.add(wheel);

        // Center hub cap
        const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 14);
        hubGeo.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, darkHullMat);
        hub.position.set(sideX, 0.42, wz);
        hullGroup.add(hub);
      });

      // Front & Rear Idler / Drive Sprocket Wheels (slightly raised)
      [-1.15, 1.15].forEach((iz) => {
        const idlerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 14);
        idlerGeo.rotateZ(Math.PI / 2);
        const idler = new THREE.Mesh(idlerGeo, darkHullMat);
        idler.position.set(sideX, 0.52, iz);
        hullGroup.add(idler);
      });

      // Track Belt Mesh (Dark rounded continuous tread wrapper)
      const trackTreadGeo = new THREE.BoxGeometry(0.36, 0.72, 2.7);
      const trackTread = new THREE.Mesh(trackTreadGeo, trackMat);
      trackTread.position.set(sideX, 0.42, 0);
      trackTread.castShadow = true;
      hullGroup.add(trackTread);
    });

    root.add(hullGroup);

    // 3. TURRET (360° Rotatable independently)
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turret';
    turretGroup.position.set(0, 1.25, 0.1);

    // Bulbous dome turret
    const domeGeo = new THREE.SphereGeometry(1.05, 20, 16);
    domeGeo.scale(1.0, 0.78, 1.15);
    const dome = new THREE.Mesh(domeGeo, hullMat);
    dome.position.set(0, 0.35, -0.05);
    dome.castShadow = true;
    dome.receiveShadow = true;
    turretGroup.add(dome);

    // Top Cupola Hatch (Round dome on top)
    const hatchGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.18, 16);
    const hatch = new THREE.Mesh(hatchGeo, darkHullMat);
    hatch.position.set(0, 1.05, -0.05);
    hatch.castShadow = true;
    turretGroup.add(hatch);

    const hatchTopGeo = new THREE.SphereGeometry(0.46, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const hatchTop = new THREE.Mesh(hatchTopGeo, hullMat);
    hatchTop.position.set(0, 1.12, -0.05);
    turretGroup.add(hatchTop);

    // Side White Stars on Turret (Left & Right)
    [-1.02, 1.02].forEach((sideX) => {
      const starPlaneGeo = new THREE.PlaneGeometry(0.5, 0.5);
      const turretStar = new THREE.Mesh(starPlaneGeo, starMat);
      turretStar.position.set(sideX, 0.45, 0.05);
      turretStar.rotation.y = sideX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      turretGroup.add(turretStar);
    });

    // 4. CANNON BARREL (Stvol - attached to turret with pitch pivot)
    const barrelPivot = new THREE.Group();
    barrelPivot.name = 'barrel_pivot';
    barrelPivot.position.set(0, 0.42, 0.85);

    // Mantlet Collar (thick rounded ring base)
    const mantletGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.35, 16);
    mantletGeo.rotateX(Math.PI / 2);
    const mantlet = new THREE.Mesh(mantletGeo, darkHullMat);
    mantlet.castShadow = true;
    barrelPivot.add(mantlet);

    // Chubby main tube
    const tubeGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.35, 16);
    tubeGeo.rotateX(Math.PI / 2);
    const tube = new THREE.Mesh(tubeGeo, hullMat);
    tube.position.set(0, 0, 0.7);
    tube.castShadow = true;
    barrelPivot.add(tube);

    // Front Muzzle Ring Collar (thick lip at tip of barrel)
    const muzzleRingGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 16);
    muzzleRingGeo.rotateX(Math.PI / 2);
    const muzzleRing = new THREE.Mesh(muzzleRingGeo, darkHullMat);
    muzzleRing.position.set(0, 0, 1.45);
    muzzleRing.castShadow = true;
    barrelPivot.add(muzzleRing);

    // Dark inner muzzle hole
    const holeGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12);
    holeGeo.rotateX(Math.PI / 2);
    const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    hole.position.set(0, 0, 1.58);
    barrelPivot.add(hole);

    // Muzzle tip position marker for projectile spawning
    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.name = 'muzzle_point';
    muzzlePoint.position.set(0, 0, 1.7);
    barrelPivot.add(muzzlePoint);

    turretGroup.add(barrelPivot);
    root.add(turretGroup);

    return {
      root,
      hull: hullGroup,
      turret: turretGroup,
      barrel: barrelPivot,
      muzzlePoint,
    };
  }
}
