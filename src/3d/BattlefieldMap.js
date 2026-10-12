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
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static build(scene, worldSize = 140) {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'ww2_battlefield';

    // Materials
    const groundGrassMat = new THREE.MeshStandardMaterial({
      color: 0x566d3a,
      roughness: 0.85,
      metalness: 0.05,
    });

    const dirtRoadMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.02,
    });

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2e5661,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    });

    const garageWallMat = new THREE.MeshStandardMaterial({
      color: 0x3d473d, // Military hangar grey-green
      roughness: 0.7,
      metalness: 0.2,
    });

    const garageRoofMat = new THREE.MeshStandardMaterial({
      color: 0x2b332b,
      roughness: 0.6,
      metalness: 0.3,
    });

    const brickRuinsMat = new THREE.MeshStandardMaterial({
      color: 0x7a6352,
      roughness: 0.9,
      metalness: 0.05,
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2e5927,
      roughness: 0.7,
      metalness: 0.05,
    });

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.0,
    });

    const hedgehogMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d40,
      roughness: 0.5,
      metalness: 0.7,
    });

    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x9e8e6b,
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
    const roadWidth = 18;
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
      const diagGeo = new THREE.PlaneGeometry(16, 45);
      diagGeo.rotateX(-Math.PI / 2);
      const diagRoad = new THREE.Mesh(diagGeo, dirtRoadMat);
      diagRoad.rotation.y = -ang + Math.PI / 2;
      diagRoad.position.set(Math.cos(ang) * 26, 0.025, Math.sin(ang) * 26);
      diagRoad.receiveShadow = true;
      mapGroup.add(diagRoad);
    });

    // 3. RIVER / WATER POND (Right & bottom edge)
    const waterGeo = new THREE.PlaneGeometry(38, 48);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(38, 0.04, 22);
    water.receiveShadow = true;
    mapGroup.add(water);

    // 4. 4 MILITARY GARAGES (Spawns at 4 corners)
    const garageConfigs = [
      { id: 1, name: 'GARAJ 1', x: -44, z: -44, rot: Math.PI / 4, color: 0x00ff88 }, // Top-Left
      { id: 2, name: 'GARAJ 2', x: -44, z: 44, rot: -Math.PI / 4, color: 0xff3b30 }, // Bottom-Left
      { id: 3, name: 'GARAJ 3', x: 44, z: 44, rot: -(Math.PI * 3) / 4, color: 0x007aff }, // Bottom-Right
      { id: 4, name: 'GARAJ 4', x: 44, z: -44, rot: (Math.PI * 3) / 4, color: 0xff9500 }, // Top-Right
    ];

    const garageSpawns = [];

    garageConfigs.forEach((cfg) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(cfg.x, 0, cfg.z);
      gGroup.rotation.y = cfg.rot;

      // Hangar building body (Length: 26, Width: 18, Height: 9)
      const wGeo = new THREE.BoxGeometry(18, 9, 26);
      const building = new THREE.Mesh(wGeo, garageWallMat);
      building.position.set(0, 4.5, -5);
      building.castShadow = true;
      building.receiveShadow = true;
      gGroup.add(building);

      // Gabled Roof
      const roofGeo = new THREE.ConeGeometry(13.5, 5, 4);
      roofGeo.rotateY(Math.PI / 4);
      roofGeo.scale(1.0, 1.0, 1.45);
      const roof = new THREE.Mesh(roofGeo, garageRoofMat);
      roof.position.set(0, 11, -5);
      roof.castShadow = true;
      gGroup.add(roof);

      // Open Gate Entrance Frame
      const gateLightMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
      });
      const gateBeamGeo = new THREE.PlaneGeometry(12, 7.5);
      const gateBeam = new THREE.Mesh(gateBeamGeo, gateLightMat);
      gateBeam.position.set(0, 3.8, 8.1);
      gGroup.add(gateBeam);

      // Interior Spot Beam projecting out
      const spotLight = new THREE.SpotLight(cfg.color, 4.5, 30, Math.PI / 5, 0.4, 1.2);
      spotLight.position.set(0, 6, 4);
      spotLight.target.position.set(0, 0, 18);
      gGroup.add(spotLight);
      gGroup.add(spotLight.target);

      // Signboard: "GARAJ 1", etc.
      const labelTex = this.createGarageLabel(cfg.name);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.3), labelMat);
      labelMesh.position.set(0, 8.2, 8.15);
      gGroup.add(labelMesh);

      mapGroup.add(gGroup);

      // Spawn point just outside garage threshold facing the arena center
      const spawnDirX = -Math.sin(cfg.rot);
      const spawnDirZ = -Math.cos(cfg.rot);
      garageSpawns.push({
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        x: cfg.x + spawnDirX * 10,
        z: cfg.z + spawnDirZ * 10,
        angle: cfg.rot + Math.PI,
      });
    });

    // 5. WW2 RUINED BRICK FOUNDATIONS (Ruins in quadrant zones)
    const ruinLocations = [
      { x: -16, z: -16, w: 12, d: 8, h: 2.8 },
      { x: 16, z: -18, w: 14, d: 10, h: 3.2 },
      { x: -18, z: 18, w: 10, d: 12, h: 2.6 },
      { x: 14, z: 18, w: 12, d: 9, h: 2.9 },
    ];

    ruinLocations.forEach((r) => {
      const ruinGroup = new THREE.Group();
      ruinGroup.position.set(r.x, 0, r.z);

      // Perimeter crumbling walls
      const wall1 = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, 1.2), brickRuinsMat);
      wall1.position.set(0, r.h / 2, -r.d / 2);
      wall1.castShadow = true;
      ruinGroup.add(wall1);

      const wall2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, r.h * 0.75, r.d), brickRuinsMat);
      wall2.position.set(-r.w / 2, (r.h * 0.75) / 2, 0);
      wall2.castShadow = true;
      ruinGroup.add(wall2);

      const wall3 = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.6, r.h * 0.5, 1.2), brickRuinsMat);
      wall3.position.set(r.w * 0.2, (r.h * 0.5) / 2, r.d / 2);
      wall3.castShadow = true;
      ruinGroup.add(wall3);

      mapGroup.add(ruinGroup);
    });

    // 6. CZECH ANTI-TANK HEDGEHOGS (Crossed steel I-beams)
    const hedgehogPositions = [
      [-6, -4],
      [6, -5],
      [-5, 6],
      [7, 5],
      [-22, 0],
      [22, 0],
      [0, -22],
      [0, 22],
    ];

    hedgehogPositions.forEach(([hx, hz]) => {
      const hhGroup = new THREE.Group();
      hhGroup.position.set(hx, 0.65, hz);

      const beamGeo = new THREE.BoxGeometry(0.25, 0.25, 2.2);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(beamGeo, hedgehogMat);
        b.rotation.x = i === 0 ? Math.PI / 4 : 0;
        b.rotation.y = i === 1 ? Math.PI / 4 : 0;
        b.rotation.z = i === 2 ? Math.PI / 4 : 0;
        b.castShadow = true;
        hhGroup.add(b);
      }
      mapGroup.add(hhGroup);
    });

    // 7. SANDBAG DEFENSE BARRICADES
    const sandbagPositions = [
      { x: -10, z: -10, rot: Math.PI / 4 },
      { x: 10, z: -10, rot: -Math.PI / 4 },
      { x: -10, z: 10, rot: -Math.PI / 4 },
      { x: 10, z: 10, rot: Math.PI / 4 },
    ];

    sandbagPositions.forEach((sb) => {
      const sbGroup = new THREE.Group();
      sbGroup.position.set(sb.x, 0, sb.z);
      sbGroup.rotation.y = sb.rot;

      for (let row = 0; row < 2; row++) {
        for (let col = -1; col <= 1; col++) {
          const bagGeo = new THREE.BoxGeometry(1.2, 0.45, 0.65);
          const bag = new THREE.Mesh(bagGeo, sandbagMat);
          bag.position.set(col * 1.15, 0.25 + row * 0.4, 0);
          bag.castShadow = true;
          sbGroup.add(bag);
        }
      }
      mapGroup.add(sbGroup);
    });

    // 8. STYLIZED 3D TREES & BUSHES
    const treePositions = [
      [-52, -18],
      [-54, 18],
      [52, -18],
      [54, -36],
      [-32, -50],
      [32, -50],
      [-20, 52],
      [10, 54],
      [-30, -12],
      [30, -12],
      [-32, 28],
      [28, 32],
    ];

    treePositions.forEach(([tx, tz]) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Foliage layers (2 stacked cones)
      const f1Geo = new THREE.ConeGeometry(2.4, 3.8, 8);
      const f1 = new THREE.Mesh(f1Geo, foliageMat);
      f1.position.y = 4.2;
      f1.castShadow = true;
      treeGroup.add(f1);

      const f2Geo = new THREE.ConeGeometry(1.8, 3.2, 8);
      const f2 = new THREE.Mesh(f2Geo, foliageMat);
      f2.position.y = 6.2;
      f2.castShadow = true;
      treeGroup.add(f2);

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
