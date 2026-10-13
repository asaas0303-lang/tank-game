/**
 * Ultra-HD Three.js WebGL 3D Engine for WW2 Tank Battle Arena
 * - Manages Scene, Camera, WebGLRenderer with PCFSoftShadowMap & ACESFilmicToneMapping
 * - Third-Person Chaser Camera (TPS) following player tank
 * - Manages Player Tank, Bot Tanks, Projectiles, Landmines, and Particles
 * - Coordinates with BattlefieldMap3D (4 Garages, Dirt Crossroads, Ruins, Trees)
 * - Seamlessly synchronizes with GameEngine state
 */
import * as THREE from '../../lib/three.module.js';
import { TankModel3D } from './TankModel.js';
import { BattlefieldMap3D } from './BattlefieldMap.js';

export class Engine3D {
  constructor(canvasContainer) {
    this.container = canvasContainer || document.getElementById('game-container') || document.body;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0b8cb); // Clean bright daytime sky
    this.scene.fog = new THREE.FogExp2(0xa0b8cb, 0.005);

    // 2. Camera (TPS Perspective)
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.5, 350);
    this.cameraDistance = 22;
    this.cameraHeight = 14.5;
    this.cameraLookHeight = 2.2;
    this.cameraInitialized = false;

    // 3. Renderer (Ultra-HD Quality with soft shadows & tone mapping)
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.renderer.domElement.id = 'webgl3dCanvas';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';
    this.container.prepend(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Build Battlefield (140x140 WW2 arena)
    this.battlefield = BattlefieldMap3D.build(this.scene, 140);

    // 6. Tank instances: id -> { root, hull, turret, barrel, muzzlePoint, updateBadge, ... }
    this.tanks = new Map();
    this.playerTankId = 'player';

    // 7. Visual meshes pool
    this.bulletMeshes = [];
    this.mineMeshes = [];
    this.particles = [];

    // Scale conversion factor between 2D arena coordinates and 3D scene
    this.worldScale = 0.085;

    // Window Resize handling
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Hemisphere light for natural sky & ground bounce
    const hemiLight = new THREE.HemisphereLight(0xdef2ff, 0x5a4836, 0.65);
    hemiLight.position.set(0, 45, 0);
    this.scene.add(hemiLight);

    // Directional Sunlight with soft PCF shadows
    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 2.0);
    this.sunLight.position.set(40, 65, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 180;
    this.sunLight.shadow.camera.left = -55;
    this.sunLight.shadow.camera.right = 55;
    this.sunLight.shadow.camera.top = 55;
    this.sunLight.shadow.camera.bottom = -55;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target); // CRITICAL: Target added to scene for shadows to update
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  to3DCoords(x2d, y2d, worldW = 1300, worldH = 1300) {
    const cx = worldW * 0.5;
    const cy = worldH * 0.5;
    return {
      x: (x2d - cx) * this.worldScale,
      z: (y2d - cy) * this.worldScale,
    };
  }

  getOrCreateTank(id, options = {}) {
    if (!this.tanks.has(id)) {
      const tankObj = TankModel3D.build(options);
      this.scene.add(tankObj.root);
      tankObj.options = options;
      this.tanks.set(id, tankObj);
    }
    return this.tanks.get(id);
  }

  /**
   * Main synchronization called each animation frame from GameEngine
   */
  renderGameState(game, dt = 0.016) {
    if (!game || !game.player) return;

    const worldW =
      (typeof window !== 'undefined' && window.WORLD && window.WORLD.width) ||
      game.worldWidth ||
      1300;
    const worldH =
      (typeof window !== 'undefined' && window.WORLD && window.WORLD.height) ||
      game.worldHeight ||
      1300;

    // 1. Synchronize Player Tank
    const player3D = this.getOrCreateTank(this.playerTankId, {
      name: game.player.name || 'Commander',
      primaryColor: 0x5d783b, // Player is Olive Green (Garage 1)
      badgeColor: '#00ff88',
      garageIndex: 1,
    });

    const pPos3D = this.to3DCoords(game.player.x, game.player.y, worldW, worldH);
    player3D.root.position.set(pPos3D.x, 0, pPos3D.z);

    // Exact mathematical orientation from 2D angle to 3D Y rotation:
    const playerAngle =
      game.player.bodyAngle !== undefined ? game.player.bodyAngle : game.player.angle || 0;
    const dirX = Math.cos(playerAngle);
    const dirZ = Math.sin(playerAngle);
    const bodyRotY = Math.atan2(dirX, dirZ);
    player3D.root.rotation.y = bodyRotY;

    // Turret orientation
    const playerTurretAngle =
      game.player.turretAngle !== undefined ? game.player.turretAngle : playerAngle;
    const turretDirX = Math.cos(playerTurretAngle);
    const turretDirZ = Math.sin(playerTurretAngle);
    const turretTargetY = Math.atan2(turretDirX, turretDirZ);
    player3D.turret.rotation.y = turretTargetY - bodyRotY;

    // Firing recoil animation
    const recoilVal = game.player.barrelRecoilOffset || game.player.recoilOffset || 0;
    if (recoilVal > 0) {
      player3D.barrel.position.z = 0.95 - recoilVal * 0.04;
    } else {
      player3D.barrel.position.z = 0.95;
    }

    // Update Player HP Badge
    if (player3D.updateBadge) {
      const pMaxHp = game.player.maxHp || 100;
      const pHp = Math.max(0, game.player.hp || 0);
      player3D.updateBadge(game.player.name || 'Commander', pHp / pMaxHp);
    }

    // 2. TPS Chaser Camera positioning (Elevated rear follower)
    const targetCamX = pPos3D.x - dirX * this.cameraDistance;
    const targetCamZ = pPos3D.z - dirZ * this.cameraDistance;

    const lookTarget = new THREE.Vector3(
      pPos3D.x + dirX * 5,
      this.cameraLookHeight,
      pPos3D.z + dirZ * 5
    );

    if (!this.cameraInitialized) {
      this.camera.position.set(targetCamX, this.cameraHeight, targetCamZ);
      this.camera.lookAt(lookTarget);
      this.cameraInitialized = true;
    } else {
      const smoothFactor = Math.min(1.0, dt * 6.0);
      this.camera.position.x += (targetCamX - this.camera.position.x) * smoothFactor;
      this.camera.position.y += (this.cameraHeight - this.camera.position.y) * smoothFactor;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * smoothFactor;
      this.camera.lookAt(lookTarget);
    }

    // Keep sunlight & shadows tracking player area
    this.sunLight.position.set(pPos3D.x + 35, 65, pPos3D.z + 25);
    this.sunLight.target.position.set(pPos3D.x, 0, pPos3D.z);
    this.sunLight.target.updateMatrixWorld();

    // 3. Synchronize Bots
    const activeTankIds = new Set([this.playerTankId]);
    const botColors = [
      { hex: 0x3d6ebd, str: '#3b82f6' }, // Blue
      { hex: 0xbf4136, str: '#ff2a5f' }, // Red
      { hex: 0xd4882e, str: '#ffaa00' }, // Orange
      { hex: 0x8b4594, str: '#a855f7' }, // Purple
    ];

    if (game.bots) {
      game.bots.forEach((bot, idx) => {
        const botId = `bot_${bot.id || idx}`;
        activeTankIds.add(botId);

        const colorCfg = botColors[idx % botColors.length];
        const bot3D = this.getOrCreateTank(botId, {
          name: bot.name || `Bot ${idx + 1}`,
          primaryColor: colorCfg.hex,
          badgeColor: colorCfg.str,
          garageIndex: (idx % 3) + 2,
        });

        if (bot.dead) {
          bot3D.root.visible = false;
        } else {
          bot3D.root.visible = true;
          const bPos = this.to3DCoords(bot.x, bot.y, worldW, worldH);
          bot3D.root.position.set(bPos.x, 0, bPos.z);

          const bAngle = bot.bodyAngle !== undefined ? bot.bodyAngle : bot.angle || 0;
          const bDirX = Math.cos(bAngle);
          const bDirZ = Math.sin(bAngle);
          const bRotY = Math.atan2(bDirX, bDirZ);
          bot3D.root.rotation.y = bRotY;

          const bTurretAngle = bot.turretAngle !== undefined ? bot.turretAngle : bAngle;
          const bTurretDirX = Math.cos(bTurretAngle);
          const bTurretDirZ = Math.sin(bTurretAngle);
          const bTurretTargetY = Math.atan2(bTurretDirX, bTurretDirZ);
          bot3D.turret.rotation.y = bTurretTargetY - bRotY;

          if (bot3D.updateBadge) {
            const bMaxHp = bot.maxHp || 100;
            const bHp = Math.max(0, bot.hp || 0);
            bot3D.updateBadge(bot.name || `Bot ${idx + 1}`, bHp / bMaxHp);
          }
        }
      });
    }

    // 4. Synchronize Remote Human Players
    if (game.remotePlayers) {
      game.remotePlayers.forEach((rp, id) => {
        const rpId = `rp_${id}`;
        activeTankIds.add(rpId);

        const rp3D = this.getOrCreateTank(rpId, {
          name: rp.name || 'Player',
          primaryColor: 0x3d6ebd,
          badgeColor: '#3b82f6',
          garageIndex: 3,
        });

        if (rp.dead) {
          rp3D.root.visible = false;
        } else {
          rp3D.root.visible = true;
          const rPos = this.to3DCoords(rp.x, rp.y, worldW, worldH);
          rp3D.root.position.set(rPos.x, 0, rPos.z);

          const rAngle = rp.bodyAngle !== undefined ? rp.bodyAngle : rp.angle || 0;
          const rDirX = Math.cos(rAngle);
          const rDirZ = Math.sin(rAngle);
          const rRotY = Math.atan2(rDirX, rDirZ);
          rp3D.root.rotation.y = rRotY;

          const rTurretAngle = rp.turretAngle !== undefined ? rp.turretAngle : rAngle;
          const rTurretDirX = Math.cos(rTurretAngle);
          const rTurretDirZ = Math.sin(rTurretAngle);
          const rTurretTargetY = Math.atan2(rTurretDirX, rTurretDirZ);
          rp3D.turret.rotation.y = rTurretTargetY - rRotY;

          if (rp3D.updateBadge) {
            const rMaxHp = rp.maxHp || 100;
            const rHp = Math.max(0, rp.hp || 0);
            rp3D.updateBadge(rp.name || 'Player', rHp / rMaxHp);
          }
        }
      });
    }

    // Hide untracked tanks
    for (const [id, t] of this.tanks) {
      if (!activeTankIds.has(id)) {
        t.root.visible = false;
      }
    }

    // 5. Synchronize 3D Bullets
    const activeBullets = game.bullets || [];
    while (this.bulletMeshes.length < activeBullets.length) {
      const bGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
      bGeo.rotateX(Math.PI / 2);
      const bMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      this.scene.add(bMesh);
      this.bulletMeshes.push(bMesh);
    }
    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const mesh = this.bulletMeshes[i];
      if (i < activeBullets.length) {
        const b = activeBullets[i];
        const b3D = this.to3DCoords(b.x, b.y, worldW, worldH);
        mesh.position.set(b3D.x, 0.95, b3D.z);
        const bRot = Math.atan2(b.vx || 1, b.vy || 0);
        mesh.rotation.y = bRot;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    }

    // 6. Synchronize 3D Landmines
    const activeMines = game.landmines || [];
    while (this.mineMeshes.length < activeMines.length) {
      const mGroup = new THREE.Group();
      const baseGeo = new THREE.CylinderGeometry(0.52, 0.62, 0.14, 16);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x333639,
        metalness: 0.7,
        roughness: 0.35,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.castShadow = true;
      mGroup.add(base);

      const ledGeo = new THREE.SphereGeometry(0.14, 10, 10);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 0.09;
      mGroup.add(led);

      this.scene.add(mGroup);
      this.mineMeshes.push({ group: mGroup, led, timer: 0 });
    }
    for (let i = 0; i < this.mineMeshes.length; i++) {
      const mObj = this.mineMeshes[i];
      if (i < activeMines.length) {
        const m = activeMines[i];
        const m3D = this.to3DCoords(m.x, m.y, worldW, worldH);
        mObj.group.position.set(m3D.x, 0.07, m3D.z);
        mObj.group.visible = true;
        mObj.timer += dt * 5;
        mObj.led.material.color.setHex(Math.sin(mObj.timer) > 0 ? 0x00ff88 : 0x004422);
      } else {
        mObj.group.visible = false;
      }
    }

    // Render 3D Frame
    this.renderer.render(this.scene, this.camera);
  }
}
