/**
 * Procedural WW2 Military Battlefield Generator matching Reference Image 2:
 * - Dirt crossroads with grass and river/water pond
 * - 4 Military Wooden / Steel Garages ("GARAJ 1", "GARAJ 2", "GARAJ 3", "GARAJ 4")
 *   with interior glowing exit beams
 * - Ruined brick foundations, sandbags, anti-tank hedgehogs
 * - Stylized 3D trees and camouflage bushes
 */
import * as THREE from '../../lib/three.module.js';

const ML = globalThis.MapLayout;

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
    texture.repeat.set(30, 30);
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

  static build(scene) {
    const worldSize = ML.WORLD_SIZE * ML.SCALE; // o'yin maydoni (chegara devorigacha)
    const meshesByKey = {};
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
    // Yer chegaradan tashqariga ham cho'ziladi -- ufqda bo'shliq ko'rinmasin
    const groundGeo = new THREE.PlaneGeometry(worldSize * 2.2, worldSize * 2.2, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, groundGrassMat);
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // 2. DIRT CROSSROADS (Main horizontal & vertical roads meeting in center)
    const roadWidth = 20;
    const roadHGeo = new THREE.PlaneGeometry(worldSize * 0.9, roadWidth);
    roadHGeo.rotateX(-Math.PI / 2);
    const roadH = new THREE.Mesh(roadHGeo, dirtRoadMat);
    roadH.position.y = 0.02; // qatlamlar orasida 1 sm dan kam bo'lmasin -- aks holda miltillaydi
    roadH.receiveShadow = true;
    mapGroup.add(roadH);

    const roadVGeo = new THREE.PlaneGeometry(roadWidth, worldSize * 0.9);
    roadVGeo.rotateX(-Math.PI / 2);
    const roadV = new THREE.Mesh(roadVGeo, dirtRoadMat);
    roadV.position.y = 0.04;
    roadV.receiveShadow = true;
    mapGroup.add(roadV);

    // Diagonal connector roads branching to garages
    [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4].forEach((ang) => {
      const diagGeo = new THREE.PlaneGeometry(18, 48);
      diagGeo.rotateX(-Math.PI / 2);
      const diagRoad = new THREE.Mesh(diagGeo, dirtRoadMat);
      diagRoad.rotation.y = -ang + Math.PI / 2;
      diagRoad.position.set(Math.cos(ang) * 26, 0.03, Math.sin(ang) * 26);
      diagRoad.receiveShadow = true;
      mapGroup.add(diagRoad);
    });

    // 3. SAYOZ KO'LMAK (tank shu yerda sekinlashadi -- MapLayout.WATER)
    const waterGroup = new THREE.Group();
    waterGroup.position.set(ML.WATER.x, 0, ML.WATER.z);
    const bankGeo = new THREE.PlaneGeometry(ML.WATER.w + 4, ML.WATER.d + 4);
    bankGeo.rotateX(-Math.PI / 2);
    const bank = new THREE.Mesh(
      bankGeo,
      new THREE.MeshStandardMaterial({ color: 0x9e8867, roughness: 0.95 })
    );
    bank.position.y = 0.05;
    bank.receiveShadow = true;
    waterGroup.add(bank);
    const waterGeo = new THREE.PlaneGeometry(ML.WATER.w, ML.WATER.d);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.065;
    water.receiveShadow = true;
    waterGroup.add(water);
    mapGroup.add(waterGroup);

    // 3b. CHEGARA DEVORI -- to'siq bor joyda devor ham ko'rinadi
    const borderMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0x9a948a,
      roughness: 0.95,
    });
    ML.colliders()
      .filter((c) => c.key.startsWith('border_'))
      .forEach((c) => {
        const p = ML.to3D(c.x + c.w / 2, c.y + c.h / 2);
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(c.w * ML.SCALE, 2.2, c.h * ML.SCALE),
          borderMat
        );
        wall.position.set(p.x, 1.1, p.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        mapGroup.add(wall);
      });

    // 4. 4 TA HARBIY GARAJ (hammasining eshigi markazga qaragan)
    const garages = [];
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    const wallHeight = 10;

    ML.GARAGES.forEach((cfg) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(cfg.x, 0, cfg.z);
      gGroup.rotation.y = cfg.rot;

      // Devorlar to'siqlar bilan bir xil o'lcham va joyda (MapLayout.GARAGE_WALLS)
      ML.GARAGE_WALLS.forEach((p) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w, wallHeight, p.d), garageWallMat);
        wall.position.set(p.lx, wallHeight / 2, p.lz);
        wall.castShadow = true;
        wall.receiveShadow = true;
        gGroup.add(wall);
      });

      // Eshik tepasidagi to'sin (tank ostidan o'tadi -- to'siq emas)
      const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(13, 2.5, 1.6), garageWallMat);
      frontLintel.position.set(0, 8.75, 8.2);
      frontLintel.castShadow = true;
      frontLintel.receiveShadow = true;
      gGroup.add(frontLintel);

      // Ichki osma chiroq (yorug'ligini Engine3D dagi BITTA umumiy chiroq beradi)
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), lanternMat);
      lantern.position.set(0, 7.5, -4);
      gGroup.add(lantern);

      // Tom (o'yinchi ichkarida bo'lsa shaffoflashadi)
      const roofGeo = new THREE.ConeGeometry(15, 6, 4);
      roofGeo.rotateY(Math.PI / 4);
      roofGeo.scale(1.0, 1.0, 1.5);
      const roofMat = garageRoofMat.clone();
      roofMat.transparent = true;
      roofMat.opacity = 1.0;
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 12, -5);
      roof.castShadow = true;
      gGroup.add(roof);

      // Eshik nuri (pol ustida). Vertikal "parda" olib tashlandi -- kamera undan o'tganda
      // butun ekran rangga bo'yalib qolardi.
      const floorBeamGeo = new THREE.PlaneGeometry(14, 20);
      floorBeamGeo.rotateX(-Math.PI / 2);
      const floorBeamMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const floorBeam = new THREE.Mesh(floorBeamGeo, floorBeamMat);
      floorBeam.position.set(0, 0.04, 19);
      gGroup.add(floorBeam);

      // Yozuv: "GARAJ 1" va h.k.
      const labelTex = this.createGarageLabel(cfg.name);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), labelMat);
      labelMesh.position.set(0, 9.4, 9.15);
      gGroup.add(labelMesh);

      mapGroup.add(gGroup);
      garages.push({
        id: cfg.id,
        name: cfg.name,
        x: cfg.x,
        z: cfg.z,
        rot: cfg.rot,
        color: cfg.color,
        group: gGroup,
        roofMesh: roof,
        roofMat: roofMat,
      });
    });

    // 5. G'ISHT XAROBALAR (buziladigan -- har devor kaliti bilan saqlanadi)
    ML.RUINS.forEach((r, i) => {
      ML.ruinWalls(r).forEach((p) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), brickRuinsMat);
        wall.position.set(r.x + p.x, p.h / 2, r.z + p.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        mapGroup.add(wall);
        meshesByKey[`ruin${i}_${p.part}`] = wall;
      });
    });

    // Bir xil narsalar bitta chizish buyrug'i bilan (InstancedMesh) -- telefon yengillashadi
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const instanced = (geo, mat, matrices) => {
      const im = new THREE.InstancedMesh(geo, mat, matrices.length);
      matrices.forEach((m, k) => im.setMatrixAt(k, m));
      im.castShadow = true;
      im.receiveShadow = true;
      mapGroup.add(im);
      return im;
    };
    const place = (x, y, z, rx = 0, ry = 0, rz = 0) =>
      new THREE.Matrix4().compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one);

    // 6. CHEX "KIRPI"LARI (3 ta kesishgan po'lat to'sin)
    const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 2.5);
    [
      [Math.PI / 4, 0, 0],
      [0, Math.PI / 2, Math.PI / 4],
      [-Math.PI / 4, Math.PI / 2, 0],
    ].forEach(([rx, ry, rz]) => {
      instanced(
        beamGeo,
        hedgehogMat,
        ML.HEDGEHOGS.map(([hx, hz]) => place(hx, 0.75, hz, rx, ry, rz))
      );
    });

    // 7. QUM QOPLARI (endi to'siq ham -- MapLayout.SANDBAGS)
    const bagGeo = new THREE.BoxGeometry(1.3, 0.5, 0.7);
    const bagMatrices = [];
    ML.SANDBAGS.forEach((sb) => {
      const base = place(sb.x, 0, sb.z, 0, sb.rot, 0);
      for (let row = 0; row < 2; row++) {
        for (let col = -1; col <= 1; col++) {
          bagMatrices.push(
            base.clone().multiply(m4.makeTranslation(col * 1.25, 0.28 + row * 0.44, 0))
          );
        }
      }
    });
    instanced(bagGeo, sandbagMat, bagMatrices);

    // 8. ARCHALAR (to'siq faqat tanasi -- shoxlar ostidan o'q o'tadi)
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.65, 3.4, 8);
    instanced(
      trunkGeo,
      trunkMat,
      ML.TREES.map(([tx, tz]) => place(tx, 1.7, tz))
    );
    [
      { r: 2.6, h: 3.8, y: 4.4 },
      { r: 2.1, h: 3.2, y: 6.4 },
      { r: 1.5, h: 2.6, y: 8.2 },
    ].forEach((c) => {
      instanced(
        new THREE.ConeGeometry(c.r, c.h, 9),
        foliageMat,
        ML.TREES.map(([tx, tz]) => place(tx, c.y, tz))
      );
    });

    // 9. UFQ: chegaradan tashqarida o'rmon va tepaliklar -- dunyo "tugab qolgan"dek ko'rinmaydi.
    // Soya tashlamaydi va oddiy material -- deyarli bepul.
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const farFoliage = new THREE.MeshLambertMaterial({ color: 0x2b4f25 });
    const farTrunk = new THREE.MeshLambertMaterial({ color: 0x4a3524 });
    const farTrees = [];
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2;
      const r = worldSize / 2 + 8 + rnd() * 55;
      const sc = 0.9 + rnd() * 0.9;
      farTrees.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, sc });
    }
    const farMats = (y) =>
      farTrees.map((t) =>
        new THREE.Matrix4().compose(
          v.set(t.x, y * t.sc, t.z),
          q.identity(),
          new THREE.Vector3(t.sc, t.sc, t.sc)
        )
      );
    const addFar = (geo, mat, mats) => {
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      mats.forEach((m, k) => im.setMatrixAt(k, m));
      mapGroup.add(im);
    };
    addFar(new THREE.CylinderGeometry(0.4, 0.6, 3.4, 6), farTrunk, farMats(1.7));
    addFar(new THREE.ConeGeometry(2.8, 5.5, 7), farFoliage, farMats(5.2));
    addFar(new THREE.ConeGeometry(2.0, 4.2, 7), farFoliage, farMats(7.6));
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x55703c });
    const hills = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rnd() * 0.3;
      const r = worldSize / 2 + 70 + rnd() * 40;
      const sx = 30 + rnd() * 30;
      hills.push(
        new THREE.Matrix4().compose(
          v.set(Math.cos(a) * r, -2, Math.sin(a) * r),
          q.identity(),
          new THREE.Vector3(sx, 8 + rnd() * 10, sx * 0.8)
        )
      );
    }
    addFar(new THREE.SphereGeometry(1, 12, 6), hillMat, hills);

    scene.add(mapGroup);

    return { mapGroup, garages, meshesByKey };
  }

  /** 2D to'siqlar -- yagona manbadan (MapLayout). */
  static getColliders() {
    return ML.colliders();
  }
}
