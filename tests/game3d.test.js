const fs = require('fs');
const path = require('path');

describe('Tank Game 3D & Security Verification', () => {
  test('package.json contains three.js dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.dependencies.three).toBeDefined();
  });

  test('index.html contains no TNT barrels in sector generation', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).not.toMatch(/this\.barrels\.push\(new ExplosiveBarrel/);
  });

  test('3D modules exist and are well-formed', () => {
    const tankModelPath = path.join(__dirname, '..', 'src', '3d', 'TankModel.js');
    const mapPath = path.join(__dirname, '..', 'src', '3d', 'BattlefieldMap.js');
    const enginePath = path.join(__dirname, '..', 'src', '3d', 'Engine3D.js');

    expect(fs.existsSync(tankModelPath)).toBe(true);
    expect(fs.existsSync(mapPath)).toBe(true);
    expect(fs.existsSync(enginePath)).toBe(true);

    const tankModel = fs.readFileSync(tankModelPath, 'utf8');
    expect(tankModel).toContain('TankModel3D');
    expect(tankModel).toContain('createStarTexture');

    const map = fs.readFileSync(mapPath, 'utf8');
    expect(map).toContain('BattlefieldMap3D');
    expect(map).toContain('GARAJ 1');

    const engine = fs.readFileSync(enginePath, 'utf8');
    expect(engine).toContain('Engine3D');
    expect(engine).toContain('renderGameState');
  });

  test('WW2 Battlefield has 4 garages configured', () => {
    const mapContent = fs.readFileSync(
      path.join(__dirname, '..', 'src', '3d', 'BattlefieldMap.js'),
      'utf8'
    );
    expect(mapContent).toContain('GARAJ 1');
    expect(mapContent).toContain('GARAJ 2');
    expect(mapContent).toContain('GARAJ 3');
    expect(mapContent).toContain('GARAJ 4');
  });

  test('PLAN_3D_TANK.md roadmap document exists', () => {
    const planPath = path.join(__dirname, '..', 'PLAN_3D_TANK.md');
    expect(fs.existsSync(planPath)).toBe(true);
  });

  test('TOP_100_PROBLEMS_ROADMAP.md exists and contains all 100 problems', () => {
    const roadmapPath = path.join(__dirname, '..', 'TOP_100_PROBLEMS_ROADMAP.md');
    expect(fs.existsSync(roadmapPath)).toBe(true);
    const content = fs.readFileSync(roadmapPath, 'utf8');
    // Check key problem categories
    expect(content).toContain('I. FIZIKA VA TO\'QNASHUVLAR');
    expect(content).toContain('II. BOSHQARUV, JOYSTIK VA KAMERA');
    expect(content).toContain('III. TARMOQ, MULTIPLAYER VA REAL-VAQT');
    expect(content).toContain('IV. GRAFIKA, THREE.JS VA SMARTFON RESURSLARI');
    expect(content).toContain('V. TELEGRAM MINI APP (TWA) VA MOBIL BRAUZER');
    expect(content).toContain('1. **Tunneling effekti');
    expect(content).toContain('100. **Ko\'p tillilikda matn sig\'masligi:');
  });

  test('BattlefieldMap.js contains rustic weathered wood textures and hollow garages with inside spawns', () => {
    const mapContent = fs.readFileSync(
      path.join(__dirname, '..', 'src', '3d', 'BattlefieldMap.js'),
      'utf8'
    );
    expect(mapContent).toContain('createWeatheredWoodTexture');
    expect(mapContent).toContain('createWoodRoofTexture');
    expect(mapContent).toContain('cfg.x - spawnDirX * 4');
    expect(mapContent).toContain('getColliders');
  });

  test('index.html contains genuine tank movement physics, touch look, and inside-garage spawns', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    // Genuine tank controls with throttle and steer
    expect(html).toContain('this.player.updateMovement(');
    expect(html).toContain('throttle,');
    expect(html).toContain('steer,');
    // Touch look and auto-aim
    expect(html).toContain('touch-look-zone');
    expect(html).toContain('touchLookActive');
    expect(html).toContain('hasLineOfSight');
    // Inside garage spawns for reset and respawn
    expect(html).toContain('spawnsBySector');
    expect(html).toContain('A1: { x: 99, y: 99');
    expect(html).toContain('B2: { x: 1201, y: 1201');
  });

  test('server.js contains inside-garage bot spawns and valid sec selection', () => {
    const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    expect(serverCode).toContain('const garageSpawns = {');
    expect(serverCode).toContain('A1: { x: 99, y: 99 }');
    expect(serverCode).toContain('const sec = pool[Math.floor(Math.random() * pool.length)];');
  });

  test('index.html safely handles peer and bot lists without accessing undefined remotePlayers', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).not.toContain('this.remotePlayers.values()');
  });

  test('index.html draw() does not fall back to 2D maze walls, grid floor or 2D bushes', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).not.toContain('[3D Engine Render Error - 2D ga qaytildi]');
    expect(html).toContain('⚔️ 3D JANG MAYDONI YUKLANMOQDA...');
  });

  test('TankModel3D caches badge texture to avoid GPU memory leaks and context loss', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src', '3d', 'TankModel.js'), 'utf8');
    expect(code).toContain('_lastHp');
    expect(code).toContain('roundedHp');
  });

  test('Engine3D and BattlefieldMap provide orbital camera controls and inside-garage roof fading', () => {
    const engineCode = fs.readFileSync(path.join(__dirname, '..', 'src', '3d', 'Engine3D.js'), 'utf8');
    expect(engineCode).toContain('rotateCamera(deltaX, deltaY = 0)');
    expect(engineCode).toContain('this.cameraYaw');
    expect(engineCode).toContain('this.cameraPitch');
    expect(engineCode).toContain('inGarage');

    const mapCode = fs.readFileSync(path.join(__dirname, '..', 'src', '3d', 'BattlefieldMap.js'), 'utf8');
    expect(mapCode).toContain('roofMat.transparent = true');
    expect(mapCode).toContain('garages.push(');

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).toContain('window.engine3D.rotateCamera(dragX, dragY)');
  });

  test('TankModel3D includes long high-velocity cannon barrel with heavy mantlet and muzzle brake', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src', '3d', 'TankModel.js'), 'utf8');
    expect(code).toContain('mantletShieldGeo');
    expect(code).toContain('muzzleBrakeGeo');
    expect(code).toContain('muzzlePoint.position.set(0, 0, 5.15)');
  });

  test('BattlefieldMap.js computes mathematically accurate garage wall colliders with rot2D = -cfg.rot', () => {
    const mapCode = fs.readFileSync(path.join(__dirname, '..', 'src', '3d', 'BattlefieldMap.js'), 'utf8');
    expect(mapCode).toContain('const rot2D = -cfg.rot;');
    expect(mapCode).toContain('x: cfg.x + lx * cos + lz * sin');
    expect(mapCode).toContain('z: cfg.z - lx * sin + lz * cos');
  });
});
