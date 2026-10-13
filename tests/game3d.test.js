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
});
