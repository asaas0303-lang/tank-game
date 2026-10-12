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
    this.scene.background = new THREE.Color(0x9cb6c9); // Clear daytime sky blue
    this.scene.fog = new THREE.FogExp2(0x9cb6c9, 0.007);

    // 2. Camera (TPS Perspective)
    this.camera = new THREE.PerspectiveCamera(48, this.width / this.height, 0.5, 350);
    this.cameraDistance = 22;
    this.cameraHeight = 13.5;
    this.cameraLookHeight = 2.0;

    // 3. Renderer (Ultra-HD Quality)
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
    this.renderer.toneMappingExposure = 1.15;

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

    // 6. Tank instances: id -> { root, hull, turret, barrel, muzzlePoint, ... }
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    // Hemisphere light for realistic sky & earth bounce
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x554433, 0.5);
    hemiLight.position.set(0, 40, 0);
    this.scene.add(hemiLight);

    // Directional Sunlight with soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.85);
    this.sunLight.position.set(45, 65, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -55;
    this.sunLight.shadow.camera.right = 55;
    this.sunLight.shadow.camera.top = 55;
    this.sunLight.shadow.camera.bottom = -55;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);
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

    const worldW = game.worldWidth || 1300;
    const worldH = game.worldHeight || 1300;

    // 1. Synchronize Player Tank
    const player3D = this.getOrCreateTank(this.playerTankId, {
      primaryColor: 0x5d783b, // Player is Olive Green (Garage 1)
      garageIndex: 1,
    });

    const pPos3D = this.to3DCoords(game.player.x, game.player.y, worldW, worldH);
    player3D.root.position.set(pPos3D.x, 0, pPos3D.z);
    player3D.root.rotation.y = -game.player.angle;
    player3D.turret.rotation.y = -(game.player.turretAngle - game.player.angle);

    // Firing recoil animation
    if (game.player.recoilOffset) {
      player3D.barrel.position.z = 0.85 - game.player.recoilOffset * 0.04;
    } else {
      player3D.barrel.position.z = 0.85;
    }

    // 2. TPS Chaser Camera positioning
    const playerRot = -game.player.angle;
    const targetCamX = pPos3D.x + Math.sin(playerRot) * this.cameraDistance;
    const targetCamZ = pPos3D.z + Math.cos(playerRot) * this.cameraDistance;

    const smoothFactor = Math.min(1.0, dt * 6.0);
    this.camera.position.x += (targetCamX - this.camera.position.x) * smoothFactor;
    this.camera.position.y += (this.cameraHeight - this.camera.position.y) * smoothFactor;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * smoothFactor;

    const lookTarget = new THREE.Vector3(
      pPos3D.x - Math.sin(playerRot) * 4,
      this.cameraLookHeight,
      pPos3D.z - Math.cos(playerRot) * 4
    );
    this.camera.lookAt(lookTarget);

    // Keep sunlight tracking player
    this.sunLight.position.set(pPos3D.x + 40, 65, pPos3D.z + 30);
    this.sunLight.target.position.set(pPos3D.x, 0, pPos3D.z);

    // 3. Synchronize Bots
    const activeTankIds = new Set([this.playerTankId]);
    const botColors = [0xbf4136, 0x3d6ebd, 0xd4882e, 0x8b4594];

    if (game.bots) {
      game.bots.forEach((bot, idx) => {
        const botId = `bot_${bot.id || idx}`;
        activeTankIds.add(botId);

        const bot3D = this.getOrCreateTank(botId, {
          primaryColor: botColors[idx % botColors.length],
          garageIndex: (idx % 3) + 2,
        });

        if (bot.dead) {
          bot3D.root.visible = false;
        } else {
          bot3D.root.visible = true;
          const bPos = this.to3DCoords(bot.x, bot.y, worldW, worldH);
          bot3D.root.position.set(bPos.x, 0, bPos.z);
          bot3D.root.rotation.y = -bot.angle;
          bot3D.turret.rotation.y = -(bot.turretAngle - bot.angle);
        }
      });
    }

    // 4. Synchronize Remote Human Players
    if (game.remotePlayers) {
      game.remotePlayers.forEach((rp, id) => {
        const rpId = `rp_${id}`;
        activeTankIds.add(rpId);

        const rp3D = this.getOrCreateTank(rpId, {
          primaryColor: 0x3d6ebd,
          garageIndex: 3,
        });

        if (rp.dead) {
          rp3D.root.visible = false;
        } else {
          rp3D.root.visible = true;
          const rPos = this.to3DCoords(rp.x, rp.y, worldW, worldH);
          rp3D.root.position.set(rPos.x, 0, rPos.z);
          rp3D.root.rotation.y = -rp.angle;
          rp3D.turret.rotation.y = -(rp.turretAngle - rp.angle);
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
      const bGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
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
        mesh.position.set(b3D.x, 0.9, b3D.z);
        mesh.rotation.y = -b.angle;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    }

    // 6. Synchronize 3D Landmines
    const activeMines = game.landmines || [];
    while (this.mineMeshes.length < activeMines.length) {
      const mGroup = new THREE.Group();
      const baseGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.12, 16);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x333639,
        metalness: 0.6,
        roughness: 0.4,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.castShadow = true;
      mGroup.add(base);

      const ledGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 0.08;
      mGroup.add(led);

      this.scene.add(mGroup);
      this.mineMeshes.push({ group: mGroup, led, timer: 0 });
    }
    for (let i = 0; i < this.mineMeshes.length; i++) {
      const mObj = this.mineMeshes[i];
      if (i < activeMines.length) {
        const m = activeMines[i];
        const m3D = this.to3DCoords(m.x, m.y, worldW, worldH);
        mObj.group.position.set(m3D.x, 0.06, m3D.z);
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
