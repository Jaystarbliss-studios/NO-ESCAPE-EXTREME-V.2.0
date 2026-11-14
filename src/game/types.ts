export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type SubMenuState =
  | 'none'
  | 'levels'
  | 'daily_challenge'
  | 'how_to_play'
  | 'settings'
  | 'cosmetics'
  | 'credits';

export type EndOutcome = 'none' | 'level_complete' | 'game_over' | 'final_victory';

export type TileType =
  | 'wall'
  | 'floor'
  | 'start'
  | 'exit'
  | 'locked_door'
  | 'shifting_day_open'   // Open during Day, becomes Wall at Night
  | 'shifting_night_open' // Wall during Day, opens at Night
  | 'mystery_floor'       // Secret room floor
  | 'secret_wall';        // False/shimmer wall that opens at night or on touch

export type PowerUpType =
  | 'shield'       // 1. Protective Shield: blocks 1 enemy/hazard hit
  | 'speed'        // 2. Speed Boost: increases movement speed
  | 'freeze'       // 3. Freeze Blast: freezes nearby enemies
  | 'scanner'      // 4. Maze Scanner: reveals full maze layout even at night
  | 'decoy'        // 5. Decoy: spawns holographic lure that attracts enemies
  | 'night_vision';// 6. Night Vision: expands nighttime visibility radius

export type EnemyType =
  | 'wanderer'     // Enemy 1: Random valid patrol pathways
  | 'hunter'       // Enemy 2: Patrols, LOS detection, pursues, investigates last known pos
  | 'shadow'       // Enemy 3: Faster at night, reduced visibility, sound/proximity detection
  | 'guardian'     // Enemy 4: Patrols territory around keys/exit, pursues intruders
  | 'boss';        // Milestone Boss (Levels 10, 20, ..., 100)

export type BossArchetype =
  | 'giant_hunter'    // Lv 10, 60: Relentless charge telegraph & seismic slam
  | 'shadow_monarch'  // Lv 20, 80: Phases and surges during darkness
  | 'gate_warden'     // Lv 30, 50: Guards security switches & locked exit
  | 'maze_architect'  // Lv 40, 70, 90: Periodically toggles shifting walls
  | 'omega_overlord'; // Lv 100: Ultimate multi-phase survival boss

export type HazardType =
  | 'spikes'          // Periodic telegraph -> active spikes
  | 'fire_corridor'   // Sweeping ember jet
  | 'laser_barrier'   // Timed laser beam across corridor
  | 'collapsing_tile' // Crumbles shortly after stepping on it
  | 'night_stalk_trap'; // Dormant by day, active electric floor at night

export type PortalCategory = 'normal' | 'golden';

export interface GridCoord {
  x: number;
  y: number;
}

export interface PortalPair {
  id: string;
  category: PortalCategory;
  entry: GridCoord;
  exit: GridCoord;
  temporary: boolean;
  maxDuration: number;
  remainingTime: number;
  active: boolean;
  cooldown: number;
}

export interface KeyItem {
  id: string;
  x: number;
  y: number;
  color: string;
  colorName: string;
  collected: boolean;
}

export interface LockedDoor {
  id: string;
  x: number;
  y: number;
  keyId: string;
  color: string;
  colorName: string;
  unlocked: boolean;
  unlockAnim: number; // 0 to 1
}

export interface CollectibleCoin {
  id: string;
  x: number;
  y: number;
  value: number;
  isRareTreasure: boolean;
  isSecretRoom: boolean;
  collected: boolean;
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  collected: boolean;
}

export interface HazardEntity {
  id: string;
  type: HazardType;
  x: number;
  y: number;
  cyclePeriod: number;
  phaseOffset: number;
  state: 'idle' | 'windup' | 'active' | 'cooldown';
  timer: number;
  nightOnly: boolean;
  steppedTimer: number; // for collapsing tiles
}

export interface BossSwitch {
  id: string;
  x: number;
  y: number;
  activated: boolean;
}

export interface CheckpointTile {
  x: number;
  y: number;
  activated: boolean;
}

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  bossArchetype?: BossArchetype;
  bossTitle?: string;
  x: number; // world tile coordinates (e.g., 3.5)
  y: number;
  vx: number;
  vy: number;
  baseSpeed: number;
  currentSpeed: number;
  detectionRange: number;
  hearingRange: number;
  state: 'patrol' | 'alert_windup' | 'chase' | 'search' | 'return' | 'frozen';
  stateTimer: number;
  windupTimer: number;
  frozenTimer: number;
  homePos: GridCoord;
  territoryRadius: number;
  targetPos: GridCoord | null;
  lastKnownPlayerPos: GridCoord | null;
  path: GridCoord[];
  pathUpdateTimer: number;
  facingAngle: number;
  scaleX: number;
  scaleY: number;
  hitFlashTimer: number;
  patrolWaypoints: GridCoord[];
  currentWaypointIdx: number;
}

export interface DecoyInstance {
  x: number;
  y: number;
  remainingTime: number;
  pulsePhase: number;
}

export interface ActiveAbilityState {
  type: PowerUpType;
  remaining: number;
  maxDuration: number;
}

export interface PlayerEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseSpeed: number;
  hp: number;
  maxHp: number;
  invulnerableTimer: number;
  shieldActive: boolean;
  facingAngle: number;
  walkDistance: number;
  scaleX: number;
  scaleY: number;
  isSprinting: boolean;
  noiseLevel: number; // 0 to 1
  inventory: PowerUpType[]; // Held power-ups ready to activate (or auto-queued)
  selectedSlot: number;
  activeAbilities: ActiveAbilityState[];
  keysCollected: string[];
  coinsEarnedThisRun: number;
  secretsFoundThisRun: number;
  checkpointPos: GridCoord | null;
  playerAutoPath?: GridCoord[];
}

export interface ChapterInfo {
  number: number;
  title: string;
  subtitle: string;
  description: string;
  levelRange: [number, number];
  accentColor: string;
}

export interface LevelConfig {
  level: number;
  chapter: number;
  chapterTitle: string;
  width: number;  // Odd grid dimension
  height: number; // Odd grid dimension
  seed: number;
  braidRatio: number; // 0 = pure tree maze, higher = more loops/intersections
  enemyCounts: {
    wanderer: number;
    hunter: number;
    shadow: number;
    guardian: number;
  };
  isBossLevel: boolean;
  bossArchetype?: BossArchetype;
  bossTitle?: string;
  bossSwitchCount: number;
  keyCount: number;
  normalPortalPairs: number;
  hasGoldenPortal: boolean;
  temporaryPortals: boolean;
  powerUpCount: number;
  coinCount: number;
  hazardCount: number;
  allowedHazards: HazardType[];
  shiftingWallCount: number;
  secretRoomCount: number;
  hasCheckpoint: boolean;
  dayDurationOverride?: number;
  nightDurationOverride?: number;
  nightVisibilityTiles: number;
  objectiveText: string;
}

export interface GeneratedMaze {
  config: LevelConfig;
  width: number;
  height: number;
  grid: TileType[][];
  start: GridCoord;
  exit: GridCoord;
  keys: KeyItem[];
  doors: LockedDoor[];
  portals: PortalPair[];
  powerUps: PowerUpItem[];
  coins: CollectibleCoin[];
  hazards: HazardEntity[];
  enemies: EnemyEntity[];
  bossSwitches: BossSwitch[];
  checkpoint: CheckpointTile | null;
  secretRooms: GridCoord[];
  solutionPath: GridCoord[];
}

export interface GameSettings {
  musicVolume: number;       // 0..100
  sfxVolume: number;         // 0..100
  muted: boolean;
  dayDuration: number;       // seconds (default 90)
  nightDuration: number;     // seconds (default 45)
  transitionDuration: number;// seconds (default 3)
  nightVisionRadius: number; // tiles (default 3.2)
  controlSensitivity: number;// 0.5..1.5 (default 1.0)
  touchLayout: 'joystick' | 'dpad' | 'off';
  graphicsQuality: 'high' | 'medium';
  reducedMotion: boolean;
  screenShake: boolean;
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'skin' | 'trail' | 'portal';
  cost: number;
  primaryColor: string;
  secondaryColor: string;
  shape: 'runner' | 'sentinel' | 'phantom' | 'vanguard' | 'solar';
  description: string;
}

export interface SavedProgress {
  highestUnlockedLevel: number;
  completedLevels: number[];
  levelBestTimes: Record<number, number>;
  lastSelectedLevel: number;
  coins: number;
  unlockedCosmetics: string[];
  equippedSkin: string;
  equippedTrail: string;
  equippedPortalStyle: string;
  dailyBestDate: string;
  dailyBestTimeMs: number;
  settings: GameSettings;
}

export interface DailyLeaderboardRecord {
  id: string;
  uid: string;
  displayName: string;
  dateKey: string;
  seed: number;
  clearTimeMs: number;
  coinsCollected: number;
  damageTaken: number;
  skinId: string;
  isLiveCloud?: boolean;
}

export interface RunSummarySnapshot {
  level: number;
  chapterTitle: string;
  outcome: EndOutcome;
  clearTimeSeconds: number;
  clearTimeMs?: number;
  bestTimeSeconds: number;
  bestTimeMs?: number;
  coinsCollected: number;
  totalCoinsInLevel: number;
  secretsFound: number;
  damageTaken: number;
  hpRemaining: number;
  distanceProgressPct: number;
  canRespawnAtCheckpoint: boolean;
  isDailyChallenge?: boolean;
  dailyDateKey?: string;
  dailySeedCode?: string;
}
