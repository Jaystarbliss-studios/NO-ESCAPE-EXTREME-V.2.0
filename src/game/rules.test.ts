import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, getChapterForLevel, getLevelConfig } from './chapters';
import { bfsShortestPath, generateMaze, validateMazeLayout } from './mazeGenerator';
import {
  castRayToWall,
  hasLineOfSight,
  isTargetInScanningLight,
  updateEnemyAI,
} from './pathfinding';
import { EnemyEntity, PlayerEntity, TileType } from './types';

test('100-level progression covers all 10 chapters and 10 milestone bosses', () => {
  assert.equal(CHAPTERS.length, 10);
  const bossLevels: number[] = [];

  for (let lvl = 1; lvl <= 100; lvl++) {
    const cfg = getLevelConfig(lvl);
    assert.equal(cfg.level, lvl);
    assert.ok(cfg.width % 2 === 1 && cfg.width >= 13, `Level ${lvl} width must be odd >= 13`);
    assert.ok(cfg.height % 2 === 1 && cfg.height >= 11, `Level ${lvl} height must be odd >= 11`);
    const chap = getChapterForLevel(lvl);
    assert.equal(cfg.chapter, chap.number);
    if (cfg.isBossLevel) {
      bossLevels.push(lvl);
      assert.ok(cfg.bossSwitchCount >= 2, `Boss level ${lvl} must require switches`);
      assert.ok(cfg.bossTitle && cfg.bossTitle.length > 0);
    }
  }

  assert.deepEqual(bossLevels, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
});

test('procedural maze generator creates valid, solvable layouts across diverse levels', () => {
  const sampleLevels = [1, 4, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 100];

  for (const lvl of sampleLevels) {
    const cfg = getLevelConfig(lvl);
    const maze = generateMaze(cfg);
    const validation = validateMazeLayout(maze);
    assert.equal(
      validation.valid,
      true,
      `Level ${lvl} failed maze validation: ${validation.reason}`
    );

    // Ensure path from start to exit exists in both Day and Night modes
    const dayPath = bfsShortestPath(maze.grid, maze.start, maze.exit, {
      isNight: false,
      treatLockedDoorsAsOpen: true,
    });
    const nightPath = bfsShortestPath(maze.grid, maze.start, maze.exit, {
      isNight: true,
      treatLockedDoorsAsOpen: true,
    });

    assert.ok(dayPath && dayPath.length > 1, `Level ${lvl} must have valid Day path`);
    assert.ok(nightPath && nightPath.length > 1, `Level ${lvl} must have valid Night path`);
  }
});

test('enemy archetypes exhibit genuinely distinct movement and detection policies', () => {
  const cfg = getLevelConfig(55); // Chapter 6 has Wanderer, Hunter, Shadow, Guardian
  const maze = generateMaze(cfg);

  const wanderer = maze.enemies.find((e) => e.type === 'wanderer');
  const hunter = maze.enemies.find((e) => e.type === 'hunter');
  const shadow = maze.enemies.find((e) => e.type === 'shadow');
  const guardian = maze.enemies.find((e) => e.type === 'guardian');

  assert.ok(wanderer && hunter && shadow && guardian, 'All 4 enemy types spawned on Level 55');

  // Wanderer never has detection range, Hunter has high visual range, Shadow has high hearing range
  assert.equal(wanderer.detectionRange, 0);
  assert.ok(hunter.detectionRange > shadow.detectionRange);
  assert.ok(shadow.hearingRange > hunter.hearingRange);

  const dummyPlayer: PlayerEntity = {
    x: shadow.x + 1.0,
    y: shadow.y,
    vx: 0,
    vy: 0,
    radius: 0.3,
    baseSpeed: 4.6,
    hp: 3,
    maxHp: 3,
    invulnerableTimer: 0,
    shieldActive: false,
    facingAngle: 0,
    walkDistance: 0,
    scaleX: 1,
    scaleY: 1,
    isSprinting: true,
    noiseLevel: 1.0,
    inventory: [],
    selectedSlot: 0,
    activeAbilities: [],
    keysCollected: [],
    coinsEarnedThisRun: 0,
    secretsFoundThisRun: 0,
    checkpointPos: null,
  };

  // Update Shadow at night vs day: speed at night must be faster than during day
  updateEnemyAI(shadow, 0.016, maze.grid, dummyPlayer, [], false, new Set());
  const daySpeed = shadow.currentSpeed;
  updateEnemyAI(shadow, 0.016, maze.grid, dummyPlayer, [], true, new Set());
  const nightSpeed = shadow.currentSpeed;

  assert.ok(nightSpeed > daySpeed, 'Shadow must move faster during Night mode');
});

test('enemy scanning light rays and line-of-sight never pass through solid wall blocks', () => {
  const grid: TileType[][] = [
    ['wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'floor', 'wall', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall'],
  ];

  const unlocked = new Set<string>();

  // Enemy at (1.5, 1.5) facing east (angle 0) toward wall at (2, 1) and player at (3.5, 1.5)
  const rayHit = castRayToWall(grid, 1.5, 1.5, 0, 4.0, false, unlocked);
  assert.ok(rayHit.dist < 0.6, 'Scanning light ray must stop at the wall boundary x=2.0');
  assert.equal(rayHit.hitWall, true);
  assert.equal(
    hasLineOfSight(grid, 1.5, 1.5, 3.5, 1.5, false, unlocked),
    false,
    'Line of sight must be blocked by the wall tile at (2, 1)'
  );

  const maze = generateMaze(getLevelConfig(55));
  const hunter = maze.enemies.find((e) => e.type === 'hunter')!;
  hunter.x = 1.5;
  hunter.y = 1.5;
  hunter.facingAngle = 0;
  hunter.detectionRange = 6;

  assert.equal(
    isTargetInScanningLight(grid, hunter, 3.5, 1.5, false, unlocked),
    false,
    'Enemy scanning light must NOT detect player on the other side of a wall block'
  );

  // Move both into the open corridor at y = 2.5
  hunter.y = 2.5;
  assert.equal(
    isTargetInScanningLight(grid, hunter, 3.5, 2.5, false, unlocked),
    true,
    'Enemy scanning light MUST detect player when in direct unobstructed corridor sight'
  );
});


