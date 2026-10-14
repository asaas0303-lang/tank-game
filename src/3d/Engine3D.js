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

if (typeof window !== 'undefined') {
  window.BattlefieldMap3D = BattlefieldMap3D;
}

export class Engine3D {
  constructor(canvasContainer) {
    this.container = canvasContainer || document.getElementById('game-container') || document.body;
    // When portrait is CSS-rotated to landscape, swap width/height
    const isPortrait = window._forcedLandscape || (window.innerHeight > window.innerWidth);
    this.width = isPortrait ? window.innerHeight : window.innerWidth;
    this.height = isPortrait ? window.innerWidth : window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0b8cb); // Clean bright daytime sky
    this.scene.fog = new THREE.FogExp2(0xa0b8cb, 0.005);

    // 2. Camera (TPS Perspective)
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.5, 350);
    this.cameraDistance = 8.5; // Starts inside hangar with player tank
    this.cameraHeight = 3.6;
    this.cameraLookHeight = 2.0;
    this.cameraYaw = null; // Horizontal orbital angle around player
    this.cameraPitch = 0.35; // Vertical elevation angle
    this.cameraInitialized = false;

    // 3. Renderer (Ultra-HD Quality with soft shadows & tone mapping)
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;

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
    this.garages = (this.battlefield && this.battlefield.garages) || [];

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

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
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
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
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
    // When portrait is CSS-rotated to landscape, swap width/height
    const isPortrait = window._forcedLandscape || (window.innerHeight > window.innerWidth);
    this.width = isPortrait ? window.innerHeight : window.innerWidth;
    this.height = isPortrait ? window.innerWidth : window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
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
   * World of Tanks Blitz touch-swipe look & orbit camera control
   * deltaX rotates camera horizontally around player
   * deltaY adjusts pitch elevation angle
   */
  rotateCamera(deltaX, deltaY = 0) {
    const sensX = 0.0055;
    const sensY = 0.0035;
    if (this.cameraYaw === null) {
      this.cameraYaw = 0;
    }
    this.cameraYaw += deltaX * sensX;
    while (this.cameraYaw > Math.PI) this.cameraYaw -= Math.PI * 2;
    while (this.cameraYaw < -Math.PI) this.cameraYaw += Math.PI * 2;

    if (deltaY !== 0) {
      this.cameraPitch = Math.max(0.15, Math.min(0.82, (this.cameraPitch || 0.42) + deltaY * sensY));
    }

    if (this.lastGame && this.lastGame.player && !this.lastGame.player.dead) {
      this.lastGame.player.turretAngle = this.cameraYaw;
      this.lastGame.player.targetTurretAngle = this.cameraYaw;
    }
  }

  /**
   * Main synchronization called each animation frame from GameEngine
   */
  renderGameState(game, dt = 0.016) {
    if (!game) return;
    if (!game.player) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.lastGame = game;

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

    // Turret orientation: Synchronized with 3D camera yaw
    if (this.cameraYaw === null) {
      this.cameraYaw =
        game.player.turretAngle !== undefined ? game.player.turretAngle : playerAngle;
    }
    game.player.turretAngle = this.cameraYaw;
    game.player.targetTurretAngle = this.cameraYaw;

    const turretDirX = Math.cos(this.cameraYaw);
    const turretDirZ = Math.sin(this.cameraYaw);
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
      if (player3D.badgeSprite && player3D.badgeSprite.material) {
        player3D.badgeSprite.material.rotation = 0;
      }
    }

    // 2. Garage Interior Detection & Roof Dynamic Fading
    let inGarage = false;
    const garageList = this.garages || [];
    for (const g of garageList) {
      const dist = Math.hypot(pPos3D.x - g.x, pPos3D.z - g.z);
      if (dist < 15.5) {
        inGarage = true;
      }
      // If player is inside or right at doorway of garage:
      // Fade roof so the tank inside the garage is 100% visible and unobstructed
      if (g.roofMat) {
        if (dist < 17.5) {
          g.roofMat.opacity = Math.max(0.08, g.roofMat.opacity - dt * 6.0);
          if (g.roofMesh) g.roofMesh.castShadow = false;
        } else {
          g.roofMat.opacity = Math.min(1.0, g.roofMat.opacity + dt * 4.0);
          if (g.roofMat.opacity > 0.85 && g.roofMesh) g.roofMesh.castShadow = true;
        }
      }
    }

    // 3. TPS Orbital Camera (World of Tanks Blitz Dynamics)
    // Inside garage: tighter, lower camera framed behind tank looking toward the exit doorway
    // Outside on battlefield: elevated tactical camera for wide combat awareness
    const targetDistance = inGarage ? 8.5 : 20.0;
    const targetPitch = inGarage ? 0.35 : 0.42;
    const targetLookH = inGarage ? 1.9 : 2.4;

    const smoothFactor = Math.min(1.0, dt * 5.5);
    this.cameraDistance += (targetDistance - this.cameraDistance) * smoothFactor;
    this.cameraPitch += (targetPitch - this.cameraPitch) * smoothFactor;
    this.cameraLookHeight += (targetLookH - this.cameraLookHeight) * smoothFactor;

    const horizDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const vertDist = this.cameraDistance * Math.sin(this.cameraPitch);

    const targetCamX = pPos3D.x - Math.cos(this.cameraYaw) * horizDist;
    const targetCamZ = pPos3D.z - Math.sin(this.cameraYaw) * horizDist;
    const targetCamY = Math.max(1.8, vertDist);

    const lookTarget = new THREE.Vector3(
      pPos3D.x + Math.cos(this.cameraYaw) * 4.0,
      this.cameraLookHeight,
      pPos3D.z + Math.sin(this.cameraYaw) * 4.0
    );

    if (!this.cameraInitialized) {
      this.camera.position.set(targetCamX, targetCamY, targetCamZ);
      this.camera.lookAt(lookTarget);
      this.cameraInitialized = true;
    } else {
      const camFollowSpeed = Math.min(1.0, dt * 8.0);
      this.camera.position.x += (targetCamX - this.camera.position.x) * camFollowSpeed;
      this.camera.position.y += (targetCamY - this.camera.position.y) * camFollowSpeed;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * camFollowSpeed;
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
            if (bot3D.badgeSprite && bot3D.badgeSprite.material) {
              bot3D.badgeSprite.material.rotation = 0;
            }
          }
        }
      });
    }

    // 4. Synchronize Remote Human Players
    const activePeers = game.peers || game.remotePlayers || new Map();
    activePeers.forEach((rp, id) => {
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
            if (rp3D.badgeSprite && rp3D.badgeSprite.material) {
              rp3D.badgeSprite.material.rotation = 0;
            }
          }
        }
      });

    // Hide untracked tanks
    for (const [id, t] of this.tanks) {
      if (!activeTankIds.has(id)) {
        t.root.visible = false;
      }
    }

    // 5. Synchronize 3D Bullets (Realistic AP Sabot Projectile with Radiant Tracer Streak)
    const activeBullets = game.bullets || [];
    while (this.bulletMeshes.length < activeBullets.length) {
      const bGroup = new THREE.Group();

      // Main Steel Penetrater Core
      const bodyGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.62, 10);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x3e4249,
        metalness: 0.9,
        roughness: 0.25,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.z = 0.05;
      bGroup.add(body);

      // Copper Driving Band
      const bandGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.12, 10);
      bandGeo.rotateX(Math.PI / 2);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xbf6c3b,
        metalness: 0.85,
        roughness: 0.3,
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.z = -0.15;
      bGroup.add(band);

      // Aerodynamic Ballistic Nose Cone (Sharp Brass Tip)
      const noseGeo = new THREE.ConeGeometry(0.09, 0.32, 10);
      noseGeo.rotateX(Math.PI / 2);
      const noseMat = new THREE.MeshStandardMaterial({
        color: 0xd4a559,
        metalness: 0.8,
        roughness: 0.25,
      });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.z = 0.48;
      bGroup.add(nose);

      // Incandescent Tracer Glow at Aft
      const flareGeo = new THREE.SphereGeometry(0.11, 8, 8);
      const flareMat = new THREE.MeshBasicMaterial({ color: 0xffdf55 });
      const flare = new THREE.Mesh(flareGeo, flareMat);
      flare.position.z = -0.28;
      bGroup.add(flare);

      // Radiant High-Velocity Tracer Streak Tail
      const tailGeo = new THREE.ConeGeometry(0.08, 1.35, 8);
      tailGeo.rotateX(-Math.PI / 2);
      const tailMat = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.8,
      });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.z = -0.95;
      bGroup.add(tail);

      this.scene.add(bGroup);
      this.bulletMeshes.push(bGroup);
    }
    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const bObj = this.bulletMeshes[i];
      if (i < activeBullets.length) {
        const b = activeBullets[i];
        const b3D = this.to3DCoords(b.x, b.y, worldW, worldH);
        bObj.position.set(b3D.x, 0.95, b3D.z);
        const bRot = Math.atan2(b.vx || 1, b.vy || 0);
        bObj.rotation.y = bRot;
        bObj.visible = true;
      } else {
        bObj.visible = false;
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
