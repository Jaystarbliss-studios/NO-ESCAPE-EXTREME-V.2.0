import { ChapterInfo, CosmeticItem, HazardType, LevelConfig, BossArchetype } from './types';

export const CHAPTERS: ChapterInfo[] = [
  {
    number: 1,
    title: 'THE BEGINNING',
    subtitle: 'First Steps Into the Labyrinth',
    description: 'Master navigation, collect resources, and evade the erratic Wanderers patrolling the outer perimeter.',
    levelRange: [1, 10],
    accentColor: '#FFD43B',
  },
  {
    number: 2,
    title: 'THE PURSUIT',
    subtitle: 'Eyes in the Corridors',
    description: 'The Hunters awaken. Break line-of-sight around corners before they lock onto your trail.',
    levelRange: [11, 20],
    accentColor: '#FFB800',
  },
  {
    number: 3,
    title: 'THE DARKNESS',
    subtitle: 'When the Torches Fade',
    description: 'Longer nights and encroaching fog-of-war bring out the Shadows that hunt by sound.',
    levelRange: [21, 30],
    accentColor: '#E52B2B',
  },
  {
    number: 4,
    title: 'THE PORTAL WORLD',
    subtitle: 'Fractured Space',
    description: 'Warp through unstable dimensional rifts and seek Golden Portals to bypass deadly sectors.',
    levelRange: [31, 40],
    accentColor: '#FFD43B',
  },
  {
    number: 5,
    title: 'THE TRAPS',
    subtitle: 'Mechanized Cruelty',
    description: 'Navigate spike plates, sweeping fire corridors, laser barriers, and multi-key security doors.',
    levelRange: [41, 50],
    accentColor: '#E52B2B',
  },
  {
    number: 6,
    title: 'THE HUNT',
    subtitle: 'Pack Coordination',
    description: 'Combined enemy squads patrol interlocking sectors while Guardians lock down vital keys.',
    levelRange: [51, 60],
    accentColor: '#FFB800',
  },
  {
    number: 7,
    title: 'THE FORGOTTEN MAZE',
    subtitle: 'Ancient Vaults & Hidden Rooms',
    description: 'Vast subterranean layouts conceal secret rooms, rare relics, and collapsing pathways.',
    levelRange: [61, 70],
    accentColor: '#FFD43B',
  },
  {
    number: 8,
    title: 'THE SHADOW REALM',
    subtitle: 'Walls That Breathe at Night',
    description: 'The Shifting Maze alters corridor geometry when darkness falls, opening and sealing routes.',
    levelRange: [71, 80],
    accentColor: '#B81717',
  },
  {
    number: 9,
    title: 'THE LABYRINTH',
    subtitle: 'Crucible of Survival',
    description: 'Every hazard, shifting wall, portal anomaly, and relentless hunter converges.',
    levelRange: [81, 90],
    accentColor: '#E52B2B',
  },
  {
    number: 10,
    title: 'THE FINAL ESCAPE',
    subtitle: '100 Levels. One Way Out.',
    description: 'The deepest core of the facility. Outsmart the Omega Overlord and claim your freedom.',
    levelRange: [91, 100],
    accentColor: '#FFD43B',
  },
];

export const COSMETIC_CATALOG: CosmeticItem[] = [
  {
    id: 'skin_default',
    name: 'Survivor Gold',
    category: 'skin',
    cost: 0,
    primaryColor: '#FFD43B',
    secondaryColor: '#E52B2B',
    shape: 'runner',
    description: 'Standard high-visibility survival rig with crimson visor.',
  },
  {
    id: 'skin_crimson',
    name: 'Crimson Vanguard',
    category: 'skin',
    cost: 40,
    primaryColor: '#E52B2B',
    secondaryColor: '#FFF7E6',
    shape: 'vanguard',
    description: 'Armored red chassis forged from defeated Hunter plating.',
  },
  {
    id: 'skin_solar',
    name: 'Solar Flare',
    category: 'skin',
    cost: 85,
    primaryColor: '#FFB800',
    secondaryColor: '#FFF7E6',
    shape: 'solar',
    description: 'Radiant golden core that gleams brightly in dark corridors.',
  },
  {
    id: 'skin_phantom',
    name: 'Obsidian Ghost',
    category: 'skin',
    cost: 140,
    primaryColor: '#FFF7E6',
    secondaryColor: '#FFD43B',
    shape: 'phantom',
    description: 'Sleek ivory stealth cloak trimmed with electric yellow.',
  },
  {
    id: 'skin_sentinel',
    name: 'Apex Sentinel',
    category: 'skin',
    cost: 220,
    primaryColor: '#FFD43B',
    secondaryColor: '#B81717',
    shape: 'sentinel',
    description: 'Elite geometric frame worn by masters of the Labyrinth.',
  },
  {
    id: 'trail_ember',
    name: 'Ember Sparks',
    category: 'trail',
    cost: 0,
    primaryColor: '#FFD43B',
    secondaryColor: '#E52B2B',
    shape: 'runner',
    description: 'Classic warm spark wake on movement.',
  },
  {
    id: 'trail_crimson',
    name: 'Bloodline Wake',
    category: 'trail',
    cost: 60,
    primaryColor: '#E52B2B',
    secondaryColor: '#B81717',
    shape: 'vanguard',
    description: 'Leaves a sharp crimson afterimage when sprinting.',
  },
  {
    id: 'trail_starlight',
    name: 'Golden Nova',
    category: 'trail',
    cost: 120,
    primaryColor: '#FFF7E6',
    secondaryColor: '#FFD43B',
    shape: 'solar',
    description: 'Luminous golden motes that linger in the dark.',
  },
];

const BOSS_DEFINITIONS: Record<number, { archetype: BossArchetype; title: string; switches: number }> = {
  10: { archetype: 'giant_hunter', title: 'THE CRIMSON STALKER', switches: 2 },
  20: { archetype: 'shadow_monarch', title: 'APEX PROWLER', switches: 2 },
  30: { archetype: 'gate_warden', title: 'DUSK WRAITH', switches: 3 },
  40: { archetype: 'maze_architect', title: 'RIFT WARDEN', switches: 3 },
  50: { archetype: 'gate_warden', title: 'THE IRON CITADEL', switches: 3 },
  60: { archetype: 'giant_hunter', title: 'BLOODHOUND ALPHA', switches: 3 },
  70: { archetype: 'maze_architect', title: 'THE VAULT KEEPER', switches: 4 },
  80: { archetype: 'shadow_monarch', title: 'SOVEREIGN OF NIGHT', switches: 4 },
  90: { archetype: 'maze_architect', title: 'THE GRAND ARCHITECT', switches: 4 },
  100: { archetype: 'omega_overlord', title: 'THE OMEGA WARDEN', switches: 5 },
};

export function getChapterForLevel(level: number): ChapterInfo {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  const chapterIdx = Math.floor((clamped - 1) / 10);
  return CHAPTERS[chapterIdx] || CHAPTERS[0];
}

export function getLevelConfig(levelNum: number, attemptOffset = 0): LevelConfig {
  const level = Math.max(1, Math.min(100, Math.floor(levelNum)));
  const chapter = getChapterForLevel(level);
  const posInChapter = ((level - 1) % 10) + 1; // 1..10
  const isBossLevel = level % 10 === 0;
  const bossDef = BOSS_DEFINITIONS[level];

  // Grid dimensions must be odd integers for wall/corridor carving
  // Chapter 1 starts at 13x13, scales smoothly up to 29x25 in Chapter 10
  const baseW = 13 + Math.floor((level - 1) / 7) * 2;
  const baseH = 11 + Math.floor((level - 1) / 9) * 2;
  const width = Math.min(31, baseW % 2 === 0 ? baseW + 1 : baseW);
  const height = Math.min(25, baseH % 2 === 0 ? baseH + 1 : baseH);

  // Deterministic base seed per level + optional attempt offset
  const seed = level * 104729 + attemptOffset * 7919 + 31337;

  // Braid ratio controls intersections/loops (0.08 early -> 0.28 later so tactical evasion is possible)
  const braidRatio = Math.min(0.32, 0.08 + chapter.number * 0.022 + (isBossLevel ? 0.08 : 0));

  // Enemy archetype progression across chapters
  let wanderer = 0;
  let hunter = 0;
  let shadow = 0;
  let guardian = 0;

  if (chapter.number === 1) {
    wanderer = level === 1 ? 1 : Math.min(3, 1 + Math.floor(posInChapter / 3));
    if (level >= 7) hunter = 1;
  } else if (chapter.number === 2) {
    wanderer = 1;
    hunter = Math.min(3, 1 + Math.floor(posInChapter / 3));
  } else if (chapter.number === 3) {
    wanderer = 1;
    hunter = 1;
    shadow = Math.min(3, 1 + Math.floor(posInChapter / 3));
  } else if (chapter.number === 4) {
    wanderer = 1;
    hunter = 2;
    shadow = 1;
    if (posInChapter >= 5) guardian = 1;
  } else if (chapter.number === 5) {
    wanderer = 1;
    hunter = 2;
    shadow = 1;
    guardian = 1;
  } else if (chapter.number === 6) {
    wanderer = 1;
    hunter = 2 + (posInChapter >= 6 ? 1 : 0);
    shadow = 2;
    guardian = 1;
  } else if (chapter.number === 7) {
    wanderer = 1;
    hunter = 2;
    shadow = 2;
    guardian = 2;
  } else if (chapter.number === 8) {
    wanderer = 1;
    hunter = 2;
    shadow = 3;
    guardian = 2;
  } else if (chapter.number === 9) {
    wanderer = 2;
    hunter = 3;
    shadow = 3;
    guardian = 2;
  } else {
    // Chapter 10
    wanderer = 2;
    hunter = 3;
    shadow = 4;
    guardian = 2;
  }

  // Keys & Locked Exits
  let keyCount = 0;
  if (level >= 4 && !isBossLevel) {
    if (chapter.number <= 2) {
      keyCount = posInChapter % 2 === 0 ? 1 : 0;
    } else if (chapter.number <= 4) {
      keyCount = 1;
    } else if (chapter.number <= 7) {
      keyCount = posInChapter >= 6 ? 2 : 1;
    } else {
      keyCount = posInChapter >= 7 ? 3 : 2;
    }
  }

  // Portals
  let normalPortalPairs = 0;
  let hasGoldenPortal = false;
  let temporaryPortals = false;

  if (level >= 6) {
    if (chapter.number === 4) {
      normalPortalPairs = 2;
      hasGoldenPortal = posInChapter % 2 === 1 || isBossLevel;
      temporaryPortals = posInChapter >= 6;
    } else if (chapter.number >= 3) {
      normalPortalPairs = posInChapter % 2 === 0 ? 1 : 2;
      hasGoldenPortal = posInChapter === 5 || posInChapter === 9 || isBossLevel;
      temporaryPortals = chapter.number >= 7 && posInChapter % 3 === 0;
    } else {
      normalPortalPairs = posInChapter >= 7 ? 1 : 0;
    }
  }

  // Hazards
  const allowedHazards: HazardType[] = [];
  let hazardCount = 0;
  if (level >= 8) {
    allowedHazards.push('spikes');
    hazardCount = Math.min(12, Math.floor(level / 6));
  }
  if (chapter.number >= 3) {
    allowedHazards.push('night_stalk_trap');
  }
  if (chapter.number >= 5) {
    allowedHazards.push('fire_corridor', 'laser_barrier');
    hazardCount = Math.min(16, 4 + Math.floor(level / 5));
  }
  if (chapter.number >= 7) {
    allowedHazards.push('collapsing_tile');
  }

  // Shifting Maze walls (introduced gradually from Level 25+, flagship in Chapter 8+)
  let shiftingWallCount = 0;
  if (level >= 25) {
    if (chapter.number >= 8) {
      shiftingWallCount = 6 + Math.floor(posInChapter / 2);
    } else if (chapter.number >= 6) {
      shiftingWallCount = 3 + Math.floor(posInChapter / 3);
    } else {
      shiftingWallCount = 2;
    }
  }

  // Mystery / Secret Rooms
  const secretRoomCount = level >= 3 ? (chapter.number >= 7 ? 2 : 1) : 0;

  // Checkpoints on larger/harder levels (Level 15+ odd/milestone levels)
  const hasCheckpoint = level >= 10 && (isBossLevel || posInChapter >= 5);

  // Power-ups & Coins
  const powerUpCount = Math.max(2, Math.min(5, 2 + Math.floor(width / 8) - (chapter.number >= 9 ? 1 : 0)));
  const coinCount = Math.min(24, 6 + Math.floor(level / 4));

  // Night visibility radius (default ~3.2 tiles, tighter in Chapter 3 & 8)
  let nightVisibilityTiles = 3.2;
  if (chapter.number === 3 || chapter.number === 8 || chapter.number === 10) {
    nightVisibilityTiles = 2.8;
  }

  // Objective text
  let objectiveText = 'Locate the unlocked Exit Portal to escape.';
  if (isBossLevel && bossDef) {
    objectiveText = `BOSS ENCOUNTER: Activate all ${bossDef.switches} Security Switches while surviving ${bossDef.title} to unlock the Exit!`;
  } else if (keyCount === 1) {
    objectiveText = 'Find the Security Key to unlock the Exit Gate.';
  } else if (keyCount > 1) {
    objectiveText = `Collect all ${keyCount} Security Keys to unlock the sector gates and reach the Exit.`;
  }

  return {
    level,
    chapter: chapter.number,
    chapterTitle: chapter.title,
    width,
    height,
    seed,
    braidRatio,
    enemyCounts: {
      wanderer,
      hunter,
      shadow,
      guardian,
    },
    isBossLevel,
    bossArchetype: bossDef?.archetype,
    bossTitle: bossDef?.title,
    bossSwitchCount: isBossLevel && bossDef ? bossDef.switches : 0,
    keyCount,
    normalPortalPairs,
    hasGoldenPortal,
    temporaryPortals,
    powerUpCount,
    coinCount,
    hazardCount,
    allowedHazards,
    shiftingWallCount,
    secretRoomCount,
    hasCheckpoint,
    nightVisibilityTiles,
    objectiveText,
  };
}
