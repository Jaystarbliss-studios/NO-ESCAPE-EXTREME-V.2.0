import { DecoyInstance, EnemyEntity, GridCoord, PlayerEntity, TileType } from './types';
import { bfsShortestPath, isTileWalkable } from './mazeGenerator';

/**
 * Casts a single ray from (x0, y0) along `angle` up to `maxDist` tiles.
 * Returns the exact distance and hit point where the ray first touches a non-walkable wall/door block.
 */
export function castRayToWall(
  grid: TileType[][],
  x0: number,
  y0: number,
  angle: number,
  maxDist: number,
  isNight: boolean,
  unlockedDoors: Set<string>
): { x: number; y: number; dist: number; hitWall: boolean } {
  const stepSize = 0.045; // Fine sub-tile step (~22 checks per tile) so rays never skip corners
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const height = grid.length;
  const width = grid[0].length;

  let prevGx = Math.floor(x0);
  let prevGy = Math.floor(y0);

  for (let d = stepSize; d <= maxDist; d += stepSize) {
    const cx = x0 + cos * d;
    const cy = y0 + sin * d;
    const gx = Math.floor(cx);
    const gy = Math.floor(cy);

    if (gy < 0 || gy >= height || gx < 0 || gx >= width) {
      return { x: cx, y: cy, dist: d, hitWall: true };
    }

    // Prevent diagonal squeezing between two kitty-corner wall blocks
    if (gx !== prevGx && gy !== prevGy) {
      const side1Walkable = isTileWalkable(grid[prevGy][gx], isNight, unlockedDoors, gx, prevGy, false);
      const side2Walkable = isTileWalkable(grid[gy][prevGx], isNight, unlockedDoors, prevGx, gy, false);
      if (!side1Walkable || !side2Walkable) {
        return { x: x0 + cos * (d - stepSize), y: y0 + sin * (d - stepSize), dist: d - stepSize, hitWall: true };
      }
    }

    if (!isTileWalkable(grid[gy][gx], isNight, unlockedDoors, gx, gy, false)) {
      return { x: x0 + cos * (d - stepSize * 0.5), y: y0 + sin * (d - stepSize * 0.5), dist: d, hitWall: true };
    }

    prevGx = gx;
    prevGy = gy;
  }

  return {
    x: x0 + cos * maxDist,
    y: y0 + sin * maxDist,
    dist: maxDist,
    hitWall: false,
  };
}

/**
 * Computes a wall-occluded fan of points representing an enemy's scanning light cone.
 * The light stops immediately when touching any wall block.
 */
export function computeLightConePolygon(
  grid: TileType[][],
  originX: number,
  originY: number,
  facingAngle: number,
  halfConeAngle: number,
  maxRange: number,
  isNight: boolean,
  unlockedDoors: Set<string>,
  rayCount = 24
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: originX, y: originY }];
  for (let i = 0; i <= rayCount; i++) {
    const t = i / rayCount;
    const rayAngle = facingAngle - halfConeAngle + t * (halfConeAngle * 2);
    const hit = castRayToWall(grid, originX, originY, rayAngle, maxRange, isNight, unlockedDoors);
    points.push({ x: hit.x, y: hit.y });
  }
  return points;
}

/**
 * Strict line-of-sight check between (x0, y0) and (x1, y1).
 * Uses fine sub-tile ray marching and diagonal corner-block checking so sight never passes through blocks.
 */
export function hasLineOfSight(
  grid: TileType[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  isNight: boolean,
  unlockedDoors: Set<string>
): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 0.05) return true;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const hit = castRayToWall(grid, x0, y0, angle, dist, isNight, unlockedDoors);
  // Sight is clear only if the ray traveled the full distance to the target without hitting a wall
  return !hit.hitWall || hit.dist >= dist - 0.12;
}

/**
 * Checks whether the target is touched by the enemy's scanning light cone without any wall block in between.
 */
export function isTargetInScanningLight(
  grid: TileType[][],
  enemy: EnemyEntity,
  targetX: number,
  targetY: number,
  isNight: boolean,
  unlockedDoors: Set<string>
): boolean {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const dist = Math.hypot(dx, dy);
  const maxConeLen = Math.min(3.6, enemy.detectionRange * 0.72);
  if (dist > maxConeLen) return false;

  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = Math.abs(
    Math.atan2(Math.sin(angleToTarget - enemy.facingAngle), Math.cos(angleToTarget - enemy.facingAngle))
  );
  // Must be inside the scanning beam's angular spread (or touching the enemy body directly)
  const halfCone = 0.48;
  if (dist > 0.65 && angleDiff > halfCone) {
    return false;
  }

  return hasLineOfSight(grid, enemy.x, enemy.y, targetX, targetY, isNight, unlockedDoors);
}

export function getValidNeighbors(
  grid: TileType[][],
  gx: number,
  gy: number,
  isNight: boolean,
  unlockedDoors: Set<string>
): GridCoord[] {
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  const res: GridCoord[] = [];
  for (const d of dirs) {
    const nx = gx + d.dx;
    const ny = gy + d.dy;
    if (ny <= 0 || ny >= grid.length - 1 || nx <= 0 || nx >= grid[0].length - 1) continue;
    if (isTileWalkable(grid[ny][gx === nx ? nx : gx], isNight, unlockedDoors, nx, ny, false)) {
      if (isTileWalkable(grid[ny][nx], isNight, unlockedDoors, nx, ny, false)) {
        res.push({ x: nx, y: ny });
      }
    }
  }
  return res;
}

export function updateEnemyAI(
  enemy: EnemyEntity,
  dt: number,
  grid: TileType[][],
  player: PlayerEntity,
  decoys: DecoyInstance[],
  isNight: boolean,
  unlockedDoors: Set<string>,
  onEnemyAlert?: (enemy: EnemyEntity) => void
): void {
  if (enemy.hitFlashTimer > 0) {
    enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
  }

  // Recover squash & stretch
  enemy.scaleX += (1 - enemy.scaleX) * Math.min(1, dt * 10);
  enemy.scaleY += (1 - enemy.scaleY) * Math.min(1, dt * 10);

  // Frozen state from Freeze Blast power-up
  if (enemy.frozenTimer > 0) {
    enemy.frozenTimer = Math.max(0, enemy.frozenTimer - dt);
    enemy.state = 'frozen';
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  } else if (enemy.state === 'frozen') {
    enemy.state = 'patrol';
  }

  const egx = Math.floor(enemy.x);
  const egy = Math.floor(enemy.y);

  // Check if decoy lures this enemy
  let targetActorX = player.x;
  let targetActorY = player.y;
  let targetNoise = player.noiseLevel;
  let luredByDecoy = false;

  if (decoys.length > 0 && enemy.type !== 'wanderer') {
    const activeDecoy = decoys[0];
    const distDecoy = Math.hypot(activeDecoy.x - enemy.x, activeDecoy.y - enemy.y);
    if (distDecoy <= enemy.hearingRange * 1.8) {
      targetActorX = activeDecoy.x;
      targetActorY = activeDecoy.y;
      targetNoise = 1.0;
      luredByDecoy = true;
    }
  }

  const distToTarget = Math.hypot(targetActorX - enemy.x, targetActorY - enemy.y);

  // Determine speed multiplier by archetype and Day/Night state
  let speedMult = 1.0;
  if (enemy.type === 'shadow') {
    speedMult = isNight ? 1.48 : 0.85;
  } else if (enemy.type === 'boss') {
    if (enemy.bossArchetype === 'shadow_monarch' || enemy.bossArchetype === 'omega_overlord') {
      speedMult = isNight ? 1.35 : 1.05;
    } else if (enemy.state === 'chase') {
      speedMult = 1.22;
    }
  } else if (enemy.state === 'chase') {
    speedMult = 1.15;
  }
  enemy.currentSpeed = enemy.baseSpeed * speedMult;

  // ENEMY 1: THE WANDERER — random valid pathways, never actively pursues player
  if (enemy.type === 'wanderer') {
    enemy.state = 'patrol';
    if (!enemy.targetPos || Math.hypot(enemy.targetPos.x + 0.5 - enemy.x, enemy.targetPos.y + 0.5 - enemy.y) < 0.15) {
      const neighbors = getValidNeighbors(grid, egx, egy, isNight, unlockedDoors);
      if (neighbors.length > 0) {
        const forward = neighbors.filter((n) => {
          const angle = Math.atan2(n.y + 0.5 - enemy.y, n.x + 0.5 - enemy.x);
          const diff = Math.abs(Math.atan2(Math.sin(angle - enemy.facingAngle), Math.cos(angle - enemy.facingAngle)));
          return diff < 2.2;
        });
        const pool = forward.length > 0 ? forward : neighbors;
        enemy.targetPos = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    moveAlongGridTarget(enemy, dt, grid, isNight, unlockedDoors);
    return;
  }

  // Strict Line-of-Sight & Wall-Occluded Scanning Light Detection:
  // Enemies NEVER detect the player through a solid wall block.
  const directLOS =
    distToTarget <= enemy.detectionRange &&
    hasLineOfSight(grid, enemy.x, enemy.y, targetActorX, targetActorY, isNight, unlockedDoors);

  const inScanningBeam = isTargetInScanningLight(
    grid,
    enemy,
    targetActorX,
    targetActorY,
    isNight,
    unlockedDoors
  );

  let detected = false;

  if (enemy.type === 'hunter') {
    // Hunter only detects when its scanning light touches the player (or while actively chasing with unbroken LOS)
    detected = inScanningBeam || (enemy.state === 'chase' && directLOS);
  } else if (enemy.type === 'shadow') {
    // Shadow detects direct unobstructed sight OR sprinting noise along an open corridor (never through a wall block)
    const heardOpenCorridor =
      directLOS && distToTarget <= enemy.hearingRange * (0.55 + targetNoise * 0.75);
    detected = inScanningBeam || heardOpenCorridor || (luredByDecoy && directLOS);
  } else if (enemy.type === 'guardian') {
    // Guardian protects its territory and only detects when it has unobstructed LOS to the intruder
    const playerDistToHome = Math.hypot(
      targetActorX - (enemy.homePos.x + 0.5),
      targetActorY - (enemy.homePos.y + 0.5)
    );
    detected =
      directLOS &&
      (inScanningBeam || (playerDistToHome <= enemy.territoryRadius && distToTarget <= 3.5));
  } else if (enemy.type === 'boss') {
    // Boss detects via scanning beam or unobstructed LOS within range
    detected = inScanningBeam || directLOS;
  }

  // State machine transitions
  if (detected) {
    enemy.lastKnownPlayerPos = { x: Math.floor(targetActorX), y: Math.floor(targetActorY) };
    if (enemy.state === 'patrol' || enemy.state === 'search' || enemy.state === 'return') {
      enemy.state = 'alert_windup';
      enemy.windupTimer = 0.28;
      enemy.scaleX = 1.25;
      enemy.scaleY = 0.8;
      onEnemyAlert?.(enemy);
    } else if (enemy.state === 'alert_windup') {
      enemy.windupTimer -= dt;
      if (enemy.windupTimer <= 0) {
        enemy.state = 'chase';
      }
    }
  } else {
    if (enemy.state === 'alert_windup') {
      enemy.state = 'chase';
    } else if (enemy.state === 'chase') {
      enemy.state = 'search';
      enemy.stateTimer = 4.0;
    } else if (enemy.state === 'search') {
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'return';
      }
    }
  }

  // Guardian territory leash check
  if (enemy.type === 'guardian' && enemy.state === 'chase') {
    const distFromHome = Math.hypot(enemy.x - (enemy.homePos.x + 0.5), enemy.y - (enemy.homePos.y + 0.5));
    if (distFromHome > enemy.territoryRadius * 1.6 && !directLOS) {
      enemy.state = 'return';
    }
  }

  if (enemy.state === 'alert_windup') {
    enemy.facingAngle = Math.atan2(targetActorY - enemy.y, targetActorX - enemy.x);
    return;
  }

  // Update pathfinding periodically
  enemy.pathUpdateTimer -= dt;
  if (enemy.pathUpdateTimer <= 0) {
    enemy.pathUpdateTimer = 0.35;
    let goalCoord: GridCoord = enemy.homePos;

    if (enemy.state === 'chase' && enemy.lastKnownPlayerPos) {
      goalCoord = enemy.lastKnownPlayerPos;
    } else if (enemy.state === 'search' && enemy.lastKnownPlayerPos) {
      goalCoord = enemy.lastKnownPlayerPos;
    } else if (enemy.state === 'return') {
      goalCoord = enemy.homePos;
      if (egx === enemy.homePos.x && egy === enemy.homePos.y) {
        enemy.state = 'patrol';
      }
    } else {
      const wp = enemy.patrolWaypoints[enemy.currentWaypointIdx] || enemy.homePos;
      if (egx === wp.x && egy === wp.y) {
        enemy.currentWaypointIdx = (enemy.currentWaypointIdx + 1) % Math.max(1, enemy.patrolWaypoints.length);
      }
      goalCoord = enemy.patrolWaypoints[enemy.currentWaypointIdx] || enemy.homePos;
    }

    const foundPath = bfsShortestPath(
      grid,
      { x: egx, y: egy },
      goalCoord,
      { isNight, unlockedDoors }
    );

    if (foundPath && foundPath.length > 1) {
      enemy.path = foundPath.slice(1);
      enemy.targetPos = enemy.path[0];
    } else {
      const neighbors = getValidNeighbors(grid, egx, egy, isNight, unlockedDoors);
      if (neighbors.length > 0) {
        enemy.targetPos = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }
  }

  // Advance along path
  if (
    enemy.targetPos &&
    Math.hypot(enemy.targetPos.x + 0.5 - enemy.x, enemy.targetPos.y + 0.5 - enemy.y) < 0.14
  ) {
    if (enemy.path.length > 1) {
      enemy.path.shift();
      enemy.targetPos = enemy.path[0];
    } else if (enemy.state === 'search') {
      const neighbors = getValidNeighbors(grid, egx, egy, isNight, unlockedDoors);
      if (neighbors.length > 0) {
        enemy.lastKnownPlayerPos = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }
  }

  moveAlongGridTarget(enemy, dt, grid, isNight, unlockedDoors);
}

function moveAlongGridTarget(
  enemy: EnemyEntity,
  dt: number,
  grid: TileType[][],
  isNight: boolean,
  unlockedDoors: Set<string>
): void {
  if (!enemy.targetPos) return;
  const tx = enemy.targetPos.x + 0.5;
  const ty = enemy.targetPos.y + 0.5;
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return;

  const step = Math.min(dist, enemy.currentSpeed * dt);
  const nx = enemy.x + (dx / dist) * step;
  const ny = enemy.y + (dy / dist) * step;

  const checkGx = Math.floor(nx);
  const checkGy = Math.floor(ny);
  if (
    checkGy >= 0 &&
    checkGy < grid.length &&
    checkGx >= 0 &&
    checkGx < grid[0].length &&
    isTileWalkable(grid[checkGy][checkGx], isNight, unlockedDoors, checkGx, checkGy, false)
  ) {
    enemy.x = nx;
    enemy.y = ny;
    enemy.vx = (dx / dist) * enemy.currentSpeed;
    enemy.vy = (dy / dist) * enemy.currentSpeed;
    enemy.facingAngle = Math.atan2(dy, dx);
  } else {
    enemy.targetPos = null;
  }
}
