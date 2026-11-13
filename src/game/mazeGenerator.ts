import {
  BossSwitch,
  CheckpointTile,
  CollectibleCoin,
  EnemyEntity,
  EnemyType,
  GeneratedMaze,
  GridCoord,
  HazardEntity,
  KeyItem,
  LevelConfig,
  LockedDoor,
  PortalPair,
  PowerUpItem,
  PowerUpType,
  TileType,
} from './types';

// Deterministic Mulberry32 PRNG
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isTileWalkable(
  tile: TileType,
  isNight: boolean,
  unlockedDoorPositions: Set<string>,
  x: number,
  y: number,
  allowSecretWalls = false
): boolean {
  if (tile === 'wall') return false;
  if (tile === 'locked_door') {
    return unlockedDoorPositions.has(`${x},${y}`);
  }
  if (tile === 'shifting_day_open') {
    return !isNight;
  }
  if (tile === 'shifting_night_open') {
    return isNight;
  }
  if (tile === 'secret_wall') {
    return allowSecretWalls || isNight;
  }
  return true;
}

export function bfsShortestPath(
  grid: TileType[][],
  start: GridCoord,
  goal: GridCoord,
  options: {
    isNight?: boolean;
    unlockedDoors?: Set<string>;
    treatLockedDoorsAsOpen?: boolean;
  } = {}
): GridCoord[] | null {
  const height = grid.length;
  const width = grid[0].length;
  const isNight = options.isNight ?? false;
  const unlockedDoors = options.unlockedDoors ?? new Set<string>();
  const treatLockedOpen = options.treatLockedDoorsAsOpen ?? false;

  const visited = Array.from({ length: height }, () => new Uint8Array(width));
  const parentX = Array.from({ length: height }, () => new Int16Array(width).fill(-1));
  const parentY = Array.from({ length: height }, () => new Int16Array(width).fill(-1));

  const queue: GridCoord[] = [start];
  visited[start.y][start.x] = 1;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (curr.x === goal.x && curr.y === goal.y) {
      const path: GridCoord[] = [];
      let cx = goal.x;
      let cy = goal.y;
      while (cx !== -1 && cy !== -1) {
        path.push({ x: cx, y: cy });
        if (cx === start.x && cy === start.y) break;
        const px = parentX[cy][cx];
        const py = parentY[cy][cx];
        cx = px;
        cy = py;
      }
      return path.reverse();
    }

    for (const d of dirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      if (visited[ny][nx]) continue;

      const tile = grid[ny][nx];
      let canPass = false;
      if (tile === 'locked_door') {
        canPass = treatLockedOpen || unlockedDoors.has(`${nx},${ny}`);
      } else {
        canPass = isTileWalkable(tile, isNight, unlockedDoors, nx, ny, false);
      }

      if (canPass) {
        visited[ny][nx] = 1;
        parentX[ny][nx] = curr.x;
        parentY[ny][nx] = curr.y;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return null;
}

export function getReachableTiles(
  grid: TileType[][],
  start: GridCoord,
  options: {
    isNight?: boolean;
    unlockedDoors?: Set<string>;
    treatLockedDoorsAsOpen?: boolean;
  } = {}
): Map<string, number> {
  const height = grid.length;
  const width = grid[0].length;
  const isNight = options.isNight ?? false;
  const unlockedDoors = options.unlockedDoors ?? new Set<string>();
  const treatLockedOpen = options.treatLockedDoorsAsOpen ?? false;

  const distances = new Map<string, number>();
  const queue: { x: number; y: number; dist: number }[] = [{ x: start.x, y: start.y, dist: 0 }];
  distances.set(`${start.x},${start.y}`, 0);

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    for (const d of dirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      const key = `${nx},${ny}`;
      if (distances.has(key)) continue;

      const tile = grid[ny][nx];
      let canPass = false;
      if (tile === 'locked_door') {
        canPass = treatLockedOpen || unlockedDoors.has(key);
      } else {
        canPass = isTileWalkable(tile, isNight, unlockedDoors, nx, ny, false);
      }

      if (canPass) {
        distances.set(key, curr.dist + 1);
        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
      }
    }
  }
  return distances;
}

export function validateMazeLayout(maze: GeneratedMaze): { valid: boolean; reason?: string } {
  const { grid, start, exit, keys, doors, portals, powerUps, coins, enemies, bossSwitches } = maze;

  // 1. Start and Exit must not be walls
  if (grid[start.y]?.[start.x] === 'wall') {
    return { valid: false, reason: 'Start is inside wall' };
  }
  if (grid[exit.y]?.[exit.x] === 'wall') {
    return { valid: false, reason: 'Exit is inside wall' };
  }

  // 2. Reachability BEFORE opening locked doors (both Day & Night):
  // All keys and all boss switches must be reachable from Start without opening any locked doors!
  const reachableDayClosed = getReachableTiles(grid, start, { isNight: false, treatLockedDoorsAsOpen: false });
  const reachableNightClosed = getReachableTiles(grid, start, { isNight: true, treatLockedDoorsAsOpen: false });

  for (const k of keys) {
    const kCoord = `${k.x},${k.y}`;
    if (!reachableDayClosed.has(kCoord) || !reachableNightClosed.has(kCoord)) {
      return { valid: false, reason: `Key ${k.id} unreachable before unlocking doors` };
    }
  }

  for (const sw of bossSwitches) {
    const swCoord = `${sw.x},${sw.y}`;
    if (!reachableDayClosed.has(swCoord) || !reachableNightClosed.has(swCoord)) {
      return { valid: false, reason: `Boss switch ${sw.id} unreachable` };
    }
  }

  // 3. Reachability AFTER unlocking doors (both Day & Night):
  // Exit, all power-ups, all non-secret coins, all portals, and all enemies must be reachable!
  const reachableDayOpen = getReachableTiles(grid, start, { isNight: false, treatLockedDoorsAsOpen: true });
  const reachableNightOpen = getReachableTiles(grid, start, { isNight: true, treatLockedDoorsAsOpen: true });

  const exitKey = `${exit.x},${exit.y}`;
  if (!reachableDayOpen.has(exitKey)) {
    return { valid: false, reason: 'Exit unreachable during Day' };
  }
  if (!reachableNightOpen.has(exitKey)) {
    return { valid: false, reason: 'Exit unreachable during Night (shifting maze blocked route)' };
  }

  // 4. Verify locked doors actually guard the exit when present
  for (const d of doors) {
    if (grid[d.y]?.[d.x] !== 'locked_door') {
      return { valid: false, reason: 'Locked door missing on grid' };
    }
  }

  // 5. Power-ups and standard coins must be reachable
  for (const p of powerUps) {
    if (!reachableDayOpen.has(`${p.x},${p.y}`)) {
      return { valid: false, reason: `PowerUp ${p.id} unreachable` };
    }
  }

  for (const c of coins) {
    if (!c.isSecretRoom && !reachableDayOpen.has(`${c.x},${c.y}`)) {
      return { valid: false, reason: `Coin ${c.id} unreachable` };
    }
  }

  // 6. Portals must be on valid reachable tiles and separated
  const distFromExitMap = getReachableTiles(grid, exit, { isNight: false, treatLockedDoorsAsOpen: true });
  for (const portal of portals) {
    const entryKey = `${portal.entry.x},${portal.entry.y}`;
    const destKey = `${portal.exit.x},${portal.exit.y}`;
    if (!reachableDayOpen.has(entryKey) || !reachableDayOpen.has(destKey)) {
      return { valid: false, reason: `Portal ${portal.id} endpoints unreachable` };
    }
    const manhattan = Math.abs(portal.entry.x - portal.exit.x) + Math.abs(portal.entry.y - portal.exit.y);
    if (manhattan < 4) {
      return { valid: false, reason: `Portal ${portal.id} endpoints too close` };
    }
    if (portal.category === 'golden') {
      const entryDistToExit = distFromExitMap.get(entryKey) ?? 999;
      const destDistToExit = distFromExitMap.get(destKey) ?? 999;
      if (destDistToExit >= entryDistToExit) {
        return { valid: false, reason: 'Golden portal does not move player closer to exit' };
      }
    }
  }

  // 7. Enemies must not overlap start and must be on navigable tiles
  for (const e of enemies) {
    const ex = Math.floor(e.x);
    const ey = Math.floor(e.y);
    if (!reachableDayOpen.has(`${ex},${ey}`)) {
      return { valid: false, reason: `Enemy ${e.id} on unreachable tile` };
    }
    const distStart = Math.hypot(e.x - (start.x + 0.5), e.y - (start.y + 0.5));
    if (distStart < 3.5) {
      return { valid: false, reason: `Enemy ${e.id} spawned too close to start` };
    }
  }

  return { valid: true };
}

export function generateMaze(config: LevelConfig): GeneratedMaze {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = buildCandidateMaze(config, config.seed + attempt * 997);
    const check = validateMazeLayout(candidate);
    if (check.valid) {
      return candidate;
    }
  }
  // Guaranteed fallback with simplified obstacles if 25 attempts had rare constraints
  return buildCandidateMaze({ ...config, shiftingWallCount: 0 }, config.seed + 99999);
}

function buildCandidateMaze(config: LevelConfig, seed: number): GeneratedMaze {
  const rng = createRng(seed);
  const { width, height } = config;

  // Initialize grid full of walls
  const grid: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'wall' as TileType)
  );

  // 1. Recursive Backtracker Maze Carving on odd coordinates
  const start: GridCoord = { x: 1, y: 1 };
  grid[start.y][start.x] = 'floor';

  const stack: GridCoord[] = [start];
  const carveDirs = [
    { dx: 2, dy: 0 },
    { dx: -2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: 0, dy: -2 },
  ];

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const unvisited: { nx: number; ny: number; wx: number; wy: number }[] = [];

    for (const d of carveDirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 'wall') {
        unvisited.push({ nx, ny, wx: curr.x + d.dx / 2, wy: curr.y + d.dy / 2 });
      }
    }

    if (unvisited.length > 0) {
      const pick = unvisited[Math.floor(rng() * unvisited.length)];
      grid[pick.wy][pick.wx] = 'floor';
      grid[pick.ny][pick.nx] = 'floor';
      stack.push({ x: pick.nx, y: pick.ny });
    } else {
      stack.pop();
    }
  }

  // Ensure start area has a clear 2x2 or L-shaped opening so player never starts boxed in
  if (grid[1][2] === 'wall' && grid[2][1] === 'wall') {
    grid[1][2] = 'floor';
  }
  if (width > 5 && height > 5) {
    grid[1][2] = 'floor';
    grid[2][1] = 'floor';
  }

  // 2. Braiding: remove some internal walls to create tactical loops/intersections
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (grid[y][x] === 'wall') {
        const horizOpen = grid[y][x - 1] === 'floor' && grid[y][x + 1] === 'floor' && grid[y - 1][x] === 'wall' && grid[y + 1][x] === 'wall';
        const vertOpen = grid[y - 1][x] === 'floor' && grid[y + 1][x] === 'floor' && grid[y][x - 1] === 'wall' && grid[y][x + 1] === 'wall';
        if ((horizOpen || vertOpen) && rng() < config.braidRatio) {
          grid[y][x] = 'floor';
        }
      }
    }
  }

  // On Boss levels, carve a central tactical arena (3x3) so player can maneuver around the boss
  if (config.isBossLevel) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ax = Math.max(1, Math.min(width - 2, cx + dx));
        const ay = Math.max(1, Math.min(height - 2, cy + dy));
        grid[ay][ax] = 'floor';
      }
    }
  }

  // 3. Determine Exit at the farthest reachable tile from Start
  const distFromStart = getReachableTiles(grid, start);
  let exit: GridCoord = { x: width - 2, y: height - 2 };
  let maxDist = -1;

  for (const [coordStr, d] of distFromStart.entries()) {
    const [cx, cy] = coordStr.split(',').map(Number);
    // Prefer tiles near the opposite quadrant with only 1 open neighbor if we need a locked door
    if (d > maxDist) {
      maxDist = d;
      exit = { x: cx, y: cy };
    }
  }

  grid[start.y][start.x] = 'start';
  grid[exit.y][exit.x] = 'exit';

  // Compute primary solution path
  const solutionPath = bfsShortestPath(grid, start, exit, { treatLockedDoorsAsOpen: true }) || [start, exit];
  const solutionSet = new Set(solutionPath.map((p) => `${p.x},${p.y}`));

  // Collect all open floor tiles excluding start and exit
  const getOpenFloorTiles = (minDistFromStart = 2): GridCoord[] => {
    const list: GridCoord[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if ((x === start.x && y === start.y) || (x === exit.x && y === exit.y)) continue;
        if (grid[y][x] === 'floor') {
          const dist = Math.abs(x - start.x) + Math.abs(y - start.y);
          if (dist >= minDistFromStart) {
            list.push({ x, y });
          }
        }
      }
    }
    return list;
  };

  const occupied = new Set<string>([`${start.x},${start.y}`, `${exit.x},${exit.y}`]);

  // 4. Keys & Locked Exit Gate
  // To guarantee 100% reachability of keys even with braided loops, we place a single locked gate
  // directly adjacent to the Exit (or convert the choke tile just before Exit into a locked gate)
  // and require collecting all keys on the level to unlock the Exit Gate!
  const keys: KeyItem[] = [];
  const doors: LockedDoor[] = [];
  const KEY_PALETTE = [
    { color: '#FFD43B', name: 'Solar Gold' },
    { color: '#E52B2B', name: 'Crimson Core' },
    { color: '#38BDF8', name: 'Cobalt Pulse' },
  ];

  if (config.keyCount > 0 && solutionPath.length >= 4) {
    // Seal the exit so only the tile before it on solutionPath connects to it
    const gateTile = solutionPath[solutionPath.length - 2];
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const nx = exit.x + d.dx;
      const ny = exit.y + d.dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      if (nx === gateTile.x && ny === gateTile.y) continue;
      if (nx === start.x && ny === start.y) continue;
      grid[ny][nx] = 'wall';
    }

    grid[gateTile.y][gateTile.x] = 'locked_door';
    occupied.add(`${gateTile.x},${gateTile.y}`);

    doors.push({
      id: 'door_exit_gate',
      x: gateTile.x,
      y: gateTile.y,
      keyId: 'all_keys',
      color: KEY_PALETTE[0].color,
      colorName: config.keyCount > 1 ? `${config.keyCount}-Key Security Gate` : 'Security Gate',
      unlocked: false,
      unlockAnim: 0,
    });

    // Now find all tiles reachable BEFORE unlocking the gate
    const preGateReachable = getReachableTiles(grid, start, { treatLockedDoorsAsOpen: false });
    const candidateKeySpots: GridCoord[] = [];
    for (const [kStr, dist] of preGateReachable.entries()) {
      if (dist < 4) continue;
      if (occupied.has(kStr)) continue;
      const [kx, ky] = kStr.split(',').map(Number);
      if (grid[ky][kx] === 'floor') {
        candidateKeySpots.push({ x: kx, y: ky });
      }
    }

    // Sort candidate key spots to favor dead-ends and distant branches
    candidateKeySpots.sort((a, b) => {
      const da = preGateReachable.get(`${a.x},${a.y}`) ?? 0;
      const db = preGateReachable.get(`${b.x},${b.y}`) ?? 0;
      return db - da;
    });

    for (let i = 0; i < config.keyCount && candidateKeySpots.length > 0; i++) {
      // Spread keys across the maze
      const pickIdx = Math.min(
        candidateKeySpots.length - 1,
        Math.floor((i / Math.max(1, config.keyCount)) * candidateKeySpots.length * 0.7 + rng() * 3)
      );
      const spot = candidateKeySpots.splice(pickIdx, 1)[0];
      if (spot) {
        const pal = KEY_PALETTE[i % KEY_PALETTE.length];
        keys.push({
          id: `key_${i + 1}`,
          x: spot.x,
          y: spot.y,
          color: pal.color,
          colorName: pal.name,
          collected: false,
        });
        occupied.add(`${spot.x},${spot.y}`);
      }
    }
  }

  // 5. Boss Switches (on milestone levels 10, 20, ..., 100)
  const bossSwitches: BossSwitch[] = [];
  if (config.isBossLevel && config.bossSwitchCount > 0 && solutionPath.length >= 4) {
    const gateTile = solutionPath[solutionPath.length - 2];
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const nx = exit.x + d.dx;
      const ny = exit.y + d.dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      if (nx === gateTile.x && ny === gateTile.y) continue;
      if (nx === start.x && ny === start.y) continue;
      grid[ny][nx] = 'wall';
    }

    grid[gateTile.y][gateTile.x] = 'locked_door';
    occupied.add(`${gateTile.x},${gateTile.y}`);
    doors.push({
      id: 'door_boss_gate',
      x: gateTile.x,
      y: gateTile.y,
      keyId: 'boss_switches',
      color: '#E52B2B',
      colorName: 'Boss Lockdown Gate',
      unlocked: false,
      unlockAnim: 0,
    });

    const preGateReachable = getReachableTiles(grid, start, { treatLockedDoorsAsOpen: false });
    const switchCandidates: GridCoord[] = [];
    for (const [kStr, dist] of preGateReachable.entries()) {
      if (dist < 4 || occupied.has(kStr)) continue;
      const [sx, sy] = kStr.split(',').map(Number);
      if (grid[sy][sx] === 'floor') {
        switchCandidates.push({ x: sx, y: sy });
      }
    }
    switchCandidates.sort((a, b) => (preGateReachable.get(`${b.x},${b.y}`) ?? 0) - (preGateReachable.get(`${a.x},${a.y}`) ?? 0));

    for (let i = 0; i < config.bossSwitchCount && switchCandidates.length > 0; i++) {
      const idx = Math.min(switchCandidates.length - 1, Math.floor((i * switchCandidates.length) / config.bossSwitchCount));
      const spot = switchCandidates.splice(idx, 1)[0];
      if (spot) {
        bossSwitches.push({
          id: `switch_${i + 1}`,
          x: spot.x,
          y: spot.y,
          activated: false,
        });
        occupied.add(`${spot.x},${spot.y}`);
      }
    }
  }

  // 6. Shifting Maze Walls (only on non-critical loop walls or safe alternate corridors so solutionPath and keys are NEVER blocked)
  // Build protected set of tiles that must stay open day & night:
  const protectedTiles = new Set<string>(solutionSet);
  for (const k of keys) {
    const p = bfsShortestPath(grid, start, { x: k.x, y: k.y }, { treatLockedDoorsAsOpen: false });
    p?.forEach((pt) => protectedTiles.add(`${pt.x},${pt.y}`));
  }
  for (const sw of bossSwitches) {
    const p = bfsShortestPath(grid, start, { x: sw.x, y: sw.y }, { treatLockedDoorsAsOpen: false });
    p?.forEach((pt) => protectedTiles.add(`${pt.x},${pt.y}`));
  }

  let shiftingPlaced = 0;
  if (config.shiftingWallCount > 0) {
    const floorCandidates = getOpenFloorTiles(3).filter(
      (c) => !protectedTiles.has(`${c.x},${c.y}`) && !occupied.has(`${c.x},${c.y}`)
    );
    for (let i = 0; i < floorCandidates.length && shiftingPlaced < config.shiftingWallCount; i++) {
      const idx = Math.floor(rng() * floorCandidates.length);
      const spot = floorCandidates.splice(idx, 1)[0];
      if (!spot) break;
      grid[spot.y][spot.x] = shiftingPlaced % 2 === 0 ? 'shifting_day_open' : 'shifting_night_open';
      occupied.add(`${spot.x},${spot.y}`);
      shiftingPlaced++;
    }
  }

  // 7. Mystery / Secret Rooms
  const secretRooms: GridCoord[] = [];
  const coins: CollectibleCoin[] = [];
  if (config.secretRoomCount > 0) {
    for (let y = 2; y < height - 2 && secretRooms.length < config.secretRoomCount; y++) {
      for (let x = 2; x < width - 2 && secretRooms.length < config.secretRoomCount; x++) {
        if (grid[y][x] !== 'wall') continue;
        // Check if this wall has exactly 1 adjacent open floor tile
        const adj = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ].filter((p) => grid[p.y][p.x] === 'floor');
        if (adj.length === 1 && rng() < 0.25) {
          grid[y][x] = 'mystery_floor';
          secretRooms.push({ x, y });
          occupied.add(`${x},${y}`);
          coins.push({
            id: `secret_coin_${secretRooms.length}`,
            x,
            y,
            value: 15,
            isRareTreasure: true,
            isSecretRoom: true,
            collected: false,
          });
        }
      }
    }
  }

  // 8. Checkpoint (midway along solutionPath)
  let checkpoint: CheckpointTile | null = null;
  if (config.hasCheckpoint && solutionPath.length >= 8) {
    const midIdx = Math.floor(solutionPath.length / 2);
    const cpSpot = solutionPath[midIdx];
    if (!occupied.has(`${cpSpot.x},${cpSpot.y}`) && grid[cpSpot.y][cpSpot.x] === 'floor') {
      checkpoint = {
        x: cpSpot.x,
        y: cpSpot.y,
        activated: false,
      };
      occupied.add(`${cpSpot.x},${cpSpot.y}`);
    }
  }

  // 9. Portals (Normal pairs & Golden Portals)
  const portals: PortalPair[] = [];
  const distToExitMap = getReachableTiles(grid, exit, { treatLockedDoorsAsOpen: true });
  const preGateTiles = Array.from(getReachableTiles(grid, start, { treatLockedDoorsAsOpen: false }).keys())
    .filter((k) => !occupied.has(k))
    .map((k) => {
      const [px, py] = k.split(',').map(Number);
      return { x: px, y: py };
    })
    .filter((p) => grid[p.y][p.x] === 'floor');

  for (let i = 0; i < config.normalPortalPairs && preGateTiles.length >= 4; i++) {
    const p1Idx = Math.floor(rng() * preGateTiles.length);
    const p1 = preGateTiles.splice(p1Idx, 1)[0];
    // Find a p2 at least 5 Manhattan distance away
    const farIndices = preGateTiles
      .map((cand, idx) => ({ cand, idx, d: Math.abs(cand.x - p1.x) + Math.abs(cand.y - p1.y) }))
      .filter((item) => item.d >= 5);

    if (farIndices.length > 0) {
      const pick = farIndices[Math.floor(rng() * farIndices.length)];
      const p2 = preGateTiles.splice(pick.idx, 1)[0];
      occupied.add(`${p1.x},${p1.y}`);
      occupied.add(`${p2.x},${p2.y}`);
      portals.push({
        id: `portal_norm_${i + 1}`,
        category: 'normal',
        entry: p1,
        exit: p2,
        temporary: config.temporaryPortals,
        maxDuration: config.temporaryPortals ? 45 : 9999,
        remainingTime: config.temporaryPortals ? 45 : 9999,
        active: true,
        cooldown: 0,
      });
    }
  }

  if (config.hasGoldenPortal && preGateTiles.length >= 2) {
    // Sort available tiles by distance to exit descending
    const sortedByExitDist = [...preGateTiles].sort(
      (a, b) => (distToExitMap.get(`${b.x},${b.y}`) ?? 0) - (distToExitMap.get(`${a.x},${a.y}`) ?? 0)
    );
    const entry = sortedByExitDist[0];
    const dest = sortedByExitDist[sortedByExitDist.length - 1];
    const entryDist = distToExitMap.get(`${entry.x},${entry.y}`) ?? 0;
    const destDist = distToExitMap.get(`${dest.x},${dest.y}`) ?? 0;
    const manhattan = Math.abs(entry.x - dest.x) + Math.abs(entry.y - dest.y);

    if (entry && dest && destDist < entryDist - 2 && manhattan >= 4) {
      occupied.add(`${entry.x},${entry.y}`);
      occupied.add(`${dest.x},${dest.y}`);
      portals.push({
        id: 'portal_golden',
        category: 'golden',
        entry,
        exit: dest,
        temporary: false,
        maxDuration: 9999,
        remainingTime: 9999,
        active: true,
        cooldown: 0,
      });
    }
  }

  // 10. Power-Ups (all 6 types represented across levels)
  const ALL_POWERUPS: PowerUpType[] = [
    'shield',
    'speed',
    'freeze',
    'scanner',
    'decoy',
    'night_vision',
  ];
  const powerUps: PowerUpItem[] = [];
  const availableForItems = getOpenFloorTiles(2).filter((p) => !occupied.has(`${p.x},${p.y}`));

  for (let i = 0; i < config.powerUpCount && availableForItems.length > 0; i++) {
    const idx = Math.floor(rng() * availableForItems.length);
    const spot = availableForItems.splice(idx, 1)[0];
    const type = ALL_POWERUPS[(config.level + i) % ALL_POWERUPS.length];
    powerUps.push({
      id: `powerup_${i + 1}`,
      type,
      x: spot.x,
      y: spot.y,
      collected: false,
    });
    occupied.add(`${spot.x},${spot.y}`);
  }

  // 11. Coins & Collectibles
  for (let i = 0; i < config.coinCount && availableForItems.length > 0; i++) {
    const idx = Math.floor(rng() * availableForItems.length);
    const spot = availableForItems.splice(idx, 1)[0];
    const isRare = i === 0 && config.level % 3 === 0;
    coins.push({
      id: `coin_${i + 1}`,
      x: spot.x,
      y: spot.y,
      value: isRare ? 10 : 2,
      isRareTreasure: isRare,
      isSecretRoom: false,
      collected: false,
    });
    occupied.add(`${spot.x},${spot.y}`);
  }

  // 12. Environmental Hazards
  const hazards: HazardEntity[] = [];
  if (config.hazardCount > 0 && config.allowedHazards.length > 0) {
    const hazardSpots = availableForItems.filter((p) => {
      const distStart = Math.abs(p.x - start.x) + Math.abs(p.y - start.y);
      return distStart >= 4;
    });

    for (let i = 0; i < config.hazardCount && hazardSpots.length > 0; i++) {
      const idx = Math.floor(rng() * hazardSpots.length);
      const spot = hazardSpots.splice(idx, 1)[0];
      const hType = config.allowedHazards[i % config.allowedHazards.length];
      hazards.push({
        id: `hazard_${i + 1}`,
        type: hType,
        x: spot.x,
        y: spot.y,
        cyclePeriod: hType === 'laser_barrier' ? 4.5 : 3.8,
        phaseOffset: (i * 0.9) % 3.8,
        state: 'idle',
        timer: (i * 0.9) % 3.8,
        nightOnly: hType === 'night_stalk_trap',
        steppedTimer: 0,
      });
      occupied.add(`${spot.x},${spot.y}`);
    }
  }

  // 13. Enemies & Milestone Bosses
  const enemies: EnemyEntity[] = [];
  const enemySpawnCandidates = getOpenFloorTiles(5).filter((p) => {
    const d = Math.hypot(p.x - start.x, p.y - start.y);
    return d >= 4.5 && grid[p.y][p.x] === 'floor';
  });

  const spawnEnemy = (type: EnemyType, index: number, customPos?: GridCoord) => {
    if (enemySpawnCandidates.length === 0 && !customPos) return;
    const spot =
      customPos ||
      enemySpawnCandidates.splice(Math.floor(rng() * enemySpawnCandidates.length), 1)[0];
    if (!spot) return;

    // Build a 3-waypoint patrol loop around home position
    const nearbyReachable = getOpenFloorTiles(4).filter(
      (p) => Math.abs(p.x - spot.x) + Math.abs(p.y - spot.y) <= 6
    );
    const waypoints: GridCoord[] = [spot];
    for (let w = 0; w < 2 && nearbyReachable.length > 0; w++) {
      const pick = nearbyReachable.splice(Math.floor(rng() * nearbyReachable.length), 1)[0];
      if (pick) waypoints.push(pick);
    }

    const levelScale = 1 + (config.level - 1) * 0.004;
    let baseSpeed = 1.65 * levelScale;
    let detectionRange = 3.5;
    let hearingRange = 2.5;
    let territoryRadius = 5;

    if (type === 'wanderer') {
      baseSpeed = 1.45 * levelScale;
      detectionRange = 0; // Does not actively pursue player
      hearingRange = 0;
    } else if (type === 'hunter') {
      baseSpeed = 1.95 * levelScale;
      detectionRange = 4.8 + Math.min(1.5, config.chapter * 0.12);
      hearingRange = 3.5;
    } else if (type === 'shadow') {
      baseSpeed = 1.75 * levelScale; // Surges to 2.55x at night
      detectionRange = 3.2;
      hearingRange = 6.0; // Acute sound detection
    } else if (type === 'guardian') {
      baseSpeed = 1.85 * levelScale;
      detectionRange = 4.2;
      hearingRange = 4.0;
      territoryRadius = 5.5;
    } else if (type === 'boss') {
      baseSpeed = 2.05 * levelScale;
      detectionRange = 6.5;
      hearingRange = 7.0;
      territoryRadius = 12;
    }

    enemies.push({
      id: `enemy_${type}_${index}`,
      type,
      bossArchetype: type === 'boss' ? config.bossArchetype : undefined,
      bossTitle: type === 'boss' ? config.bossTitle : undefined,
      x: spot.x + 0.5,
      y: spot.y + 0.5,
      vx: 0,
      vy: 0,
      baseSpeed,
      currentSpeed: baseSpeed,
      detectionRange,
      hearingRange,
      state: 'patrol',
      stateTimer: 0,
      windupTimer: 0,
      frozenTimer: 0,
      homePos: spot,
      territoryRadius,
      targetPos: null,
      lastKnownPlayerPos: null,
      path: [],
      pathUpdateTimer: (index * 0.13) % 0.4,
      facingAngle: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      patrolWaypoints: waypoints,
      currentWaypointIdx: 0,
    });
  };

  for (let i = 0; i < config.enemyCounts.wanderer; i++) spawnEnemy('wanderer', i);
  for (let i = 0; i < config.enemyCounts.hunter; i++) spawnEnemy('hunter', i);
  for (let i = 0; i < config.enemyCounts.shadow; i++) spawnEnemy('shadow', i);
  for (let i = 0; i < config.enemyCounts.guardian; i++) {
    // Anchor Guardians near keys or the exit
    const keyTarget = keys[i % Math.max(1, keys.length)];
    const guardHome =
      keyTarget && Math.hypot(keyTarget.x - start.x, keyTarget.y - start.y) >= 4.5
        ? { x: keyTarget.x, y: keyTarget.y }
        : undefined;
    spawnEnemy('guardian', i, guardHome);
  }

  if (config.isBossLevel) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const bossHome =
      Math.hypot(cx - start.x, cy - start.y) >= 4.5
        ? { x: cx, y: cy }
        : { x: exit.x, y: exit.y };
    spawnEnemy('boss', 1, bossHome);
  }

  return {
    config,
    width,
    height,
    grid,
    start,
    exit,
    keys,
    doors,
    portals,
    powerUps,
    coins,
    hazards,
    enemies,
    bossSwitches,
    checkpoint,
    secretRooms,
    solutionPath,
  };
}
