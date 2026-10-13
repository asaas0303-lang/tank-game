/**
 * Procedural WW2 Military Battlefield Generator matching Reference Image 2:
 * - Dirt crossroads with grass and river/water pond
 * - 4 Military Wooden / Steel Garages ("GARAJ 1", "GARAJ 2", "GARAJ 3", "GARAJ 4")
 *   with interior glowing exit beams
 * - Ruined brick foundations, sandbags, anti-tank hedgehogs
 * - Stylized 3D trees and camouflage bushes
 */
import * as THREE from '../../lib/three.module.js';

export class BattlefieldMap3D {
  static createGarageLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);

    // Military stencil style sign
    ctx.fillStyle = 'rgba(20, 24, 20, 0.9)';
    ctx.fillRect(8, 8, 496, 112);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 488, 104);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base olive grass
    ctx.fillStyle = '#546b38';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle noise & patchy natural greens
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? '#43562c' : '#627c42';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createDirtRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base packed earth
    ctx.fillStyle = '#877054';
    ctx.fillRect(0, 0, 512, 512);

    // Wheel tracks / tire ruts
    ctx.fillStyle = '#6e5a42';
    ctx.fillRect(80, 0, 48, 512);
    ctx.fillRect(384, 0, 48, 512);

    // Pebbles & dirt variations
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#9c8466' : '#5c4a35';
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Mortar grey background
    ctx.fillStyle = '#9e9992';
    ctx.fillRect(0, 0, 256, 256);

    // Red/brown bricks
    const rowH = 16;
    const colW = 32;
    for (let y = 0; y < 256; y += rowH) {
      const offset = (y / rowH) % 2 === 0 ? 0 : colW / 2;
      for (let x = -colW; x < 256 + colW; x += colW) {
        ctx.fillStyle = (x + y) % 5 === 0 ? '#6d4838' : '#855642';
        ctx.fillRect(x + offset + 2, y + 2, colW - 4, rowH - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static build(scene, worldSize = 140) {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'ww2_battlefield';

    // Materials with procedural textures
    const grassTex = this.createGrassTexture();
    const groundGrassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.88,
      metalness: 0.05,
    });

    const roadTex = this.createDirtRoadTexture();
    const dirtRoadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
      metalness: 0.02,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x226275,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85,
    });

    const garageWallMat = new THREE.MeshStandardMaterial({
      color: 0x343c34, // Dark military hangar metal
      roughness: 0.65,
      metalness: 0.35,
    });

    const garageRoofMat = new THREE.MeshStandardMaterial({
      color: 0x242a24,
      roughness: 0.55,
      metalness: 0.45,
    });

    const brickTex = this.createBrickTexture();
    const brickRuinsMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2f6027,
      roughness: 0.68,
      metalness: 0.05,
    });

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4d3725,
      roughness: 0.9,
      metalness: 0.0,
    });

    const hedgehogMat = new THREE.MeshStandardMaterial({
      color: 0x3a3e42,
      roughness: 0.45,
      metalness: 0.8,
    });

    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0xa89674,
      roughness: 0.95,
      metalness: 0.0,
    });

    // 1. MAIN GROUND (Grass Plane)
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, groundGrassMat);
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // 2. DIRT CROSSROADS (Main horizontal & vertical roads meeting in center)
    const roadWidth = 20;
    const roadHGeo = new THREE.PlaneGeometry(worldSize * 0.9, roadWidth);
    roadHGeo.rotateX(-Math.PI / 2);
    const roadH = new THREE.Mesh(roadHGeo, dirtRoadMat);
    roadH.position.y = 0.02;
    roadH.receiveShadow = true;
    mapGroup.add(roadH);

    const roadVGeo = new THREE.PlaneGeometry(roadWidth, worldSize * 0.9);
    roadVGeo.rotateX(-Math.PI / 2);
    const roadV = new THREE.Mesh(roadVGeo, dirtRoadMat);
    roadV.position.y = 0.03;
    roadV.receiveShadow = true;
    mapGroup.add(roadV);

    // Diagonal connector roads branching to garages
    [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4].forEach((ang) => {
      const diagGeo = new THREE.PlaneGeometry(18, 48);
      diagGeo.rotateX(-Math.PI / 2);
      const diagRoad = new THREE.Mesh(diagGeo, dirtRoadMat);
      diagRoad.rotation.y = -ang + Math.PI / 2;
      diagRoad.position.set(Math.cos(ang) * 26, 0.025, Math.sin(ang) * 26);
      diagRoad.receiveShadow = true;
      mapGroup.add(diagRoad);
    });

    // 3. RIVER / WATER POND (Right & bottom edge)
    const waterGroup = new THREE.Group();
    waterGroup.position.set(40, 0, 26);

    // Sandy bank
    const bankGeo = new THREE.PlaneGeometry(42, 52);
    bankGeo.rotateX(-Math.PI / 2);
    const bank = new THREE.Mesh(
      bankGeo,
      new THREE.MeshStandardMaterial({ color: 0x9e8867, roughness: 0.95 })
    );
    bank.position.y = 0.03;
    bank.receiveShadow = true;
    waterGroup.add(bank);

    // Water surface
    const waterGeo = new THREE.PlaneGeometry(38, 48);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.06;
    water.receiveShadow = true;
    waterGroup.add(water);
    mapGroup.add(waterGroup);

    // 4. 4 MILITARY GARAGES (Spawns at 4 corners matching Reference Image 2)
    const garageConfigs = [
      { id: 1, name: 'GARAJ 1', x: -44, z: -44, rot: Math.PI / 4, color: 0x00ff88 }, // Top-Left (Green)
      { id: 2, name: 'GARAJ 2', x: -44, z: 44, rot: -Math.PI / 4, color: 0xff3b30 }, // Bottom-Left (Red)
      { id: 3, name: 'GARAJ 3', x: 44, z: 44, rot: -(Math.PI * 3) / 4, color: 0x007aff }, // Bottom-Right (Blue)
      { id: 4, name: 'GARAJ 4', x: 44, z: -44, rot: (Math.PI * 3) / 4, color: 0xff9500 }, // Top-Right (Orange)
    ];

    const garageSpawns = [];

    garageConfigs.forEach((cfg) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(cfg.x, 0, cfg.z);
      gGroup.rotation.y = cfg.rot;

      // Hangar building body (Length: 28, Width: 20, Height: 10)
      const wGeo = new THREE.BoxGeometry(20, 10, 28);
      const building = new THREE.Mesh(wGeo, garageWallMat);
      building.position.set(0, 5, -5);
      building.castShadow = true;
      building.receiveShadow = true;
      gGroup.add(building);

      // Gabled Roof with overhang
      const roofGeo = new THREE.ConeGeometry(15, 6, 4);
      roofGeo.rotateY(Math.PI / 4);
      roofGeo.scale(1.0, 1.0, 1.5);
      const roof = new THREE.Mesh(roofGeo, garageRoofMat);
      roof.position.set(0, 12, -5);
      roof.castShadow = true;
      gGroup.add(roof);

      // Glowing Doorway Aperture (Exit Beam)
      const doorOpenMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.55,
      });
      const doorOpenGeo = new THREE.PlaneGeometry(13, 8.5);
      const doorBeam = new THREE.Mesh(doorOpenGeo, doorOpenMat);
      doorBeam.position.set(0, 4.3, 9.05);
      gGroup.add(doorBeam);

      // Projecting Light Beam on Ground in front of hangar
      const floorBeamGeo = new THREE.PlaneGeometry(14, 20);
      floorBeamGeo.rotateX(-Math.PI / 2);
      const floorBeamMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });
      const floorBeam = new THREE.Mesh(floorBeamGeo, floorBeamMat);
      floorBeam.position.set(0, 0.04, 19);
      gGroup.add(floorBeam);

      // Signboard: "GARAJ 1", etc.
      const labelTex = this.createGarageLabel(cfg.name);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), labelMat);
      labelMesh.position.set(0, 9.4, 9.15);
      gGroup.add(labelMesh);

      mapGroup.add(gGroup);

      // Spawn point just outside garage threshold facing the arena center
      const spawnDirX = -Math.sin(cfg.rot);
      const spawnDirZ = -Math.cos(cfg.rot);
      garageSpawns.push({
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        x: cfg.x + spawnDirX * 12,
        z: cfg.z + spawnDirZ * 12,
        angle: Math.atan2(-spawnDirX, -spawnDirZ),
      });
    });

    // 5. WW2 RUINED BRICK FOUNDATIONS (Ruins in quadrant zones)
    const ruinLocations = [
      { x: -16, z: -16, w: 14, d: 9, h: 3.2 },
      { x: 16, z: -18, w: 15, d: 11, h: 3.5 },
      { x: -18, z: 18, w: 12, d: 13, h: 3.0 },
      { x: 14, z: 18, w: 13, d: 10, h: 3.2 },
    ];

    ruinLocations.forEach((r) => {
      const ruinGroup = new THREE.Group();
      ruinGroup.position.set(r.x, 0, r.z);

      // Perimeter crumbling brick walls
      const wall1 = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, 1.4), brickRuinsMat);
      wall1.position.set(0, r.h / 2, -r.d / 2);
      wall1.castShadow = true;
      wall1.receiveShadow = true;
      ruinGroup.add(wall1);

      const wall2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, r.h * 0.75, r.d), brickRuinsMat);
      wall2.position.set(-r.w / 2, (r.h * 0.75) / 2, 0);
      wall2.castShadow = true;
      wall2.receiveShadow = true;
      ruinGroup.add(wall2);

      const wall3 = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.6, r.h * 0.5, 1.4), brickRuinsMat);
      wall3.position.set(r.w * 0.2, (r.h * 0.5) / 2, r.d / 2);
      wall3.castShadow = true;
      wall3.receiveShadow = true;
      ruinGroup.add(wall3);

      mapGroup.add(ruinGroup);
    });

    // 6. CZECH ANTI-TANK HEDGEHOGS (Crossed steel I-beams)
    const hedgehogPositions = [
      [-7, -5],
      [7, -6],
      [-6, 7],
      [8, 6],
      [-24, 0],
      [24, 0],
      [0, -24],
      [0, 24],
    ];

    hedgehogPositions.forEach(([hx, hz]) => {
      const hhGroup = new THREE.Group();
      hhGroup.position.set(hx, 0.75, hz);

      const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 2.5);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(beamGeo, hedgehogMat);
        b.rotation.x = i === 0 ? Math.PI / 4 : 0;
        b.rotation.y = i === 1 ? Math.PI / 4 : 0;
        b.rotation.z = i === 2 ? Math.PI / 4 : 0;
        b.castShadow = true;
        b.receiveShadow = true;
        hhGroup.add(b);
      }
      mapGroup.add(hhGroup);
    });

    // 7. SANDBAG DEFENSE BARRICADES
    const sandbagPositions = [
      { x: -11, z: -11, rot: Math.PI / 4 },
      { x: 11, z: -11, rot: -Math.PI / 4 },
      { x: -11, z: 11, rot: -Math.PI / 4 },
      { x: 11, z: 11, rot: Math.PI / 4 },
    ];

    sandbagPositions.forEach((sb) => {
      const sbGroup = new THREE.Group();
      sbGroup.position.set(sb.x, 0, sb.z);
      sbGroup.rotation.y = sb.rot;

      for (let row = 0; row < 2; row++) {
        for (let col = -1; col <= 1; col++) {
          const bagGeo = new THREE.BoxGeometry(1.3, 0.5, 0.7);
          const bag = new THREE.Mesh(bagGeo, sandbagMat);
          bag.position.set(col * 1.25, 0.28 + row * 0.44, 0);
          bag.castShadow = true;
          bag.receiveShadow = true;
          sbGroup.add(bag);
        }
      }
      mapGroup.add(sbGroup);
    });

    // 8. STYLIZED 3D TREES (Multi-tiered pine trees)
    const treePositions = [
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

    treePositions.forEach(([tx, tz]) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.65, 3.4, 10);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.7;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      // Foliage layers (3 stacked cones with shadows)
      const coneSizes = [
        { r: 2.6, h: 3.8, y: 4.4 },
        { r: 2.1, h: 3.2, y: 6.4 },
        { r: 1.5, h: 2.6, y: 8.2 },
      ];
      coneSizes.forEach((c) => {
        const coneGeo = new THREE.ConeGeometry(c.r, c.h, 10);
        const cone = new THREE.Mesh(coneGeo, foliageMat);
        cone.position.y = c.y;
        cone.castShadow = true;
        cone.receiveShadow = true;
        treeGroup.add(cone);
      });

      mapGroup.add(treeGroup);
    });

    scene.add(mapGroup);

    return {
      mapGroup,
      garageSpawns,
      ruinLocations,
    };
  }
}
