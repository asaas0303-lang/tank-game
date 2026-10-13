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

  static createWeatheredWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base rustic weathered dark timber
    ctx.fillStyle = '#443729';
    ctx.fillRect(0, 0, 512, 512);

    // Vertical wooden planks (32px wide each)
    const plankW = 32;
    for (let x = 0; x < 512; x += plankW) {
      const plankTone = ['#4e3f30', '#413426', '#392d21', '#554535', '#483a2d'][
        Math.floor((x / plankW) % 5)
      ];
      ctx.fillStyle = plankTone;
      ctx.fillRect(x + 1, 0, plankW - 2, 512);

      // Dark seam shadow between planks
      ctx.fillStyle = '#1c150e';
      ctx.fillRect(x, 0, 1.5, 512);

      // Wood grain streaks
      for (let s = 0; s < 18; s++) {
        const sx = x + 2 + Math.random() * (plankW - 5);
        const sy = Math.random() * 512;
        const sh = 15 + Math.random() * 45;
        ctx.fillStyle = Math.random() > 0.5 ? '#32261a' : '#5a4938';
        ctx.fillRect(sx, sy, 1.2, sh);
      }

      // Wooden knots
      if ((x / plankW) % 3 === 0) {
        const knotY = 80 + ((x * 37) % 350);
        ctx.fillStyle = '#22180e';
        ctx.beginPath();
        ctx.ellipse(x + plankW / 2, knotY, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Iron mounting nails / bolts at top, middle, bottom
      [35, 170, 340, 480].forEach((ny) => {
        ctx.fillStyle = '#181818';
        ctx.beginPath();
        ctx.arc(x + plankW / 2, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(x + plankW / 2 - 0.7, ny - 0.7, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static createWoodRoofTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Weathered dark wood shingle/plank tone
    ctx.fillStyle = '#2e251c';
    ctx.fillRect(0, 0, 512, 512);

    // Overlapping horizontal roof timber planks
    const rowH = 24;
    for (let y = 0; y < 512; y += rowH) {
      ctx.fillStyle = (y / rowH) % 2 === 0 ? '#382d22' : '#30261d';
      ctx.fillRect(0, y + 1, 512, rowH - 2);

      // Deep shadow under roof overhang plank
      ctx.fillStyle = '#140f0a';
      ctx.fillRect(0, y, 512, 2);

      // Weathering grain
      for (let g = 0; g < 20; g++) {
        const gx = Math.random() * 512;
        const gw = 10 + Math.random() * 30;
        ctx.fillStyle = Math.random() > 0.5 ? '#1f1811' : '#45372a';
        ctx.fillRect(gx, y + 3, gw, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
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

    const woodTex = this.createWeatheredWoodTexture();
    const garageWallMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.85,
      metalness: 0.08,
    });

    const roofWoodTex = this.createWoodRoofTexture();
    const garageRoofMat = new THREE.MeshStandardMaterial({
      map: roofWoodTex,
      roughness: 0.78,
      metalness: 0.12,
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

      // Hollow Wooden Garage Walls (Left, Right, Back, Front Frame)
      // Left Wall (Thickness: 1.6, Height: 10, Length: 28)
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 10, 28), garageWallMat);
      leftWall.position.set(-9.2, 5, -5);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      gGroup.add(leftWall);

      // Right Wall
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 10, 28), garageWallMat);
      rightWall.position.set(9.2, 5, -5);
      rightWall.castShadow = true;
      rightWall.receiveShadow = true;
      gGroup.add(rightWall);

      // Back Wall (Width: 20, Height: 10, Thickness: 1.6)
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 1.6), garageWallMat);
      backWall.position.set(0, 5, -18.2);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      gGroup.add(backWall);

      // Front Door Left Pillar
      const frontPillarL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 10, 1.6), garageWallMat);
      frontPillarL.position.set(-8.25, 5, 8.2);
      frontPillarL.castShadow = true;
      frontPillarL.receiveShadow = true;
      gGroup.add(frontPillarL);

      // Front Door Right Pillar
      const frontPillarR = new THREE.Mesh(new THREE.BoxGeometry(3.5, 10, 1.6), garageWallMat);
      frontPillarR.position.set(8.25, 5, 8.2);
      frontPillarR.castShadow = true;
      frontPillarR.receiveShadow = true;
      gGroup.add(frontPillarR);

      // Front Door Top Lintel
      const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(13, 2.5, 1.6), garageWallMat);
      frontLintel.position.set(0, 8.75, 8.2);
      frontLintel.castShadow = true;
      frontLintel.receiveShadow = true;
      gGroup.add(frontLintel);

      // Interior Hanging Lantern Light (warm glowing beacon inside hangar)
      const lanternLight = new THREE.PointLight(0xffdf99, 1.3, 28);
      lanternLight.position.set(0, 7.5, -4);
      gGroup.add(lanternLight);

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

      // Spawn point INSIDE the garage facing towards the glowing doorway
      const spawnDirX = -Math.sin(cfg.rot);
      const spawnDirZ = -Math.cos(cfg.rot);
      garageSpawns.push({
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        // Centered inside the hangar (z = -4 in garage local coordinates)
        x: cfg.x - spawnDirX * 4,
        z: cfg.z - spawnDirZ * 4,
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

  /**
   * Generates exact 2D physics colliders (Hitbox/AABB/OBB) matching all 3D battlefield objects:
   * 4 Garages (solid left/right/back walls + front pillars, open doorway),
   * 4 Ruin brick foundations (destructible),
   * 12 Pine tree trunks,
   * 8 Anti-tank hedgehogs,
   * Outer arena boundaries.
   */
  static getColliders(worldW = 1300, worldH = 1300, worldScale = 0.085) {
    const cx = worldW * 0.5;
    const cy = worldH * 0.5;
    const colliders = [];

    // 1. Outer boundary walls (impassable perimeter)
    colliders.push({ x: 0, y: 0, w: worldW, h: 24, destructible: false });
    colliders.push({ x: 0, y: worldH - 24, w: worldW, h: 24, destructible: false });
    colliders.push({ x: 0, y: 0, w: 24, h: worldH, destructible: false });
    colliders.push({ x: worldW - 24, y: 0, w: 24, h: worldH, destructible: false });

    // Helper: convert 3D point + dimensions to 2D collider
    const to2DBox = (x3D, z3D, w3D, d3D, rot = 0, destructible = false, hp = 80) => {
      const w2D = w3D / worldScale;
      const h2D = d3D / worldScale;
      const x2D = cx + x3D / worldScale - w2D / 2;
      const y2D = cy + z3D / worldScale - h2D / 2;
      return {
        x: x2D,
        y: y2D,
        w: w2D,
        h: h2D,
        rot: rot,
        destructible: destructible,
        hp: hp,
        maxHp: hp,
        destroyed: false,
      };
    };

    // 2. 4 Military Wooden Garages
    const garageConfigs = [
      { x: -44, z: -44, rot: Math.PI / 4 }, // Top-Left
      { x: -44, z: 44, rot: -Math.PI / 4 }, // Bottom-Left
      { x: 44, z: 44, rot: -(Math.PI * 3) / 4 }, // Bottom-Right
      { x: 44, z: -44, rot: (Math.PI * 3) / 4 }, // Top-Right
    ];

    garageConfigs.forEach((cfg) => {
      const cos = Math.cos(cfg.rot);
      const sin = Math.sin(cfg.rot);

      const toWorld = (lx, lz) => ({
        x: cfg.x + lx * cos - lz * sin,
        z: cfg.z + lx * sin + lz * cos,
      });

      // Left Wall (Thickness: 1.6, Length: 28)
      const pL = toWorld(-9.2, -5);
      colliders.push(to2DBox(pL.x, pL.z, 1.6, 28, cfg.rot, false));

      // Right Wall
      const pR = toWorld(9.2, -5);
      colliders.push(to2DBox(pR.x, pR.z, 1.6, 28, cfg.rot, false));

      // Back Wall (Width: 20, Thickness: 1.6)
      const pB = toWorld(0, -18.2);
      colliders.push(to2DBox(pB.x, pB.z, 20, 1.6, cfg.rot, false));

      // Front Left Pillar
      const pFL = toWorld(-8.25, 8.2);
      colliders.push(to2DBox(pFL.x, pFL.z, 3.5, 1.6, cfg.rot, false));

      // Front Right Pillar
      const pFR = toWorld(8.25, 8.2);
      colliders.push(to2DBox(pFR.x, pFR.z, 3.5, 1.6, cfg.rot, false));
    });

    // 3. 4 WW2 Ruined Brick Foundations (Destructible)
    const ruinLocations = [
      { x: -16, z: -16, w: 14, d: 9 },
      { x: 16, z: -18, w: 15, d: 11 },
      { x: -18, z: 18, w: 12, d: 13 },
      { x: 14, z: 18, w: 13, d: 10 },
    ];

    ruinLocations.forEach((r) => {
      // Wall 1: horizontal
      colliders.push(to2DBox(r.x, r.z - r.d / 2, r.w, 1.4, 0, true, 80));
      // Wall 2: vertical
      colliders.push(to2DBox(r.x - r.w / 2, r.z, 1.4, r.d, 0, true, 80));
      // Wall 3: horizontal partial
      colliders.push(to2DBox(r.x + r.w * 0.2, r.z + r.d / 2, r.w * 0.6, 1.4, 0, true, 80));
    });

    // 4. 12 Pine Tree Trunks (Impassable solid circular obstacles)
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
      // Trunk collider: 1.4 x 1.4 in 3D units
      colliders.push(to2DBox(tx, tz, 1.4, 1.4, 0, false));
    });

    // 5. Anti-Tank Hedgehogs
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
      colliders.push(to2DBox(hx, hz, 1.8, 1.8, 0, false));
    });

    return colliders;
  }
}
