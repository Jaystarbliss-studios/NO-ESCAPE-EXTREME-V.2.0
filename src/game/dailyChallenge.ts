import { DailyLeaderboardRecord, HazardType, LevelConfig } from './types';
import { createRng } from './mazeGenerator';

export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailySeedForDate(dateKey: string): number {
  const str = `NO_ESCAPE_DAILY_V2_${dateKey.trim()}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Ensure positive non-zero 31-bit integer for Firestore int & PRNG compatibility
  return (h & 0x7fffffff) || 1337420;
}

export function getDailySeedCode(dateKey: string): string {
  const seed = getDailySeedForDate(dateKey);
  return `#NE-${seed.toString(16).toUpperCase().padStart(6, '0').slice(-6)}`;
}

export function getDailyInitialNightState(dateKey: string): boolean {
  const seed = getDailySeedForDate(dateKey);
  return seed % 2 === 1;
}

const DAILY_SECTOR_TITLES = [
  'OBSIDIAN GAUNTLET',
  'SOLAR ECLIPSE VAULT',
  'CRIMSON NEXUS',
  'SHADOW CONDUIT',
  'PHANTOM LABYRINTH',
  'INFERNO CORRIDOR',
  'CHRONO CRUCIBLE',
];

export function getDailyChallengeConfig(dateKey: string): LevelConfig {
  const seed = getDailySeedForDate(dateKey);
  const rng = createRng(seed);

  const sectorTitle =
    DAILY_SECTOR_TITLES[Math.floor(rng() * DAILY_SECTOR_TITLES.length)] || 'OBSIDIAN GAUNTLET';

  // Odd grid dimensions between 17x15 and 21x17 for a 25-60s competitive speedrun
  const widths = [17, 19, 21];
  const heights = [15, 17];
  const width = widths[Math.floor(rng() * widths.length)];
  const height = heights[Math.floor(rng() * heights.length)];

  const keyCount = rng() < 0.55 ? 1 : 2;
  const hasGoldenPortal = rng() < 0.65;
  const shiftingWallCount = 3 + Math.floor(rng() * 3);

  const allowedHazards: HazardType[] = ['spikes', 'night_stalk_trap', 'laser_barrier'];
  if (rng() < 0.5) {
    allowedHazards.push('fire_corridor');
  }

  return {
    level: 50, // Balanced mid-tier enemy speed scaling
    chapter: 5,
    chapterTitle: `DAILY · ${sectorTitle}`,
    width,
    height,
    seed,
    braidRatio: 0.22,
    enemyCounts: {
      wanderer: 1,
      hunter: 2,
      shadow: 2,
      guardian: 1,
    },
    isBossLevel: false,
    bossSwitchCount: 0,
    keyCount,
    normalPortalPairs: 2,
    hasGoldenPortal,
    temporaryPortals: false,
    powerUpCount: 4,
    coinCount: 14,
    hazardCount: 6,
    allowedHazards,
    shiftingWallCount,
    secretRoomCount: 1,
    hasCheckpoint: false, // Pure speedrun — single continuous run!
    nightVisibilityTiles: 3.1,
    objectiveText:
      keyCount === 1
        ? `DAILY CHALLENGE (${dateKey}): Collect the Security Key and reach the Exit as fast as possible!`
        : `DAILY CHALLENGE (${dateKey}): Collect all ${keyCount} Security Keys and reach the Exit for the fastest global time!`,
  };
}

export function formatSpeedrunTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((clamped % 1000) / 10);
  if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }
  return `${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}s`;
}

export function getBaselineDailyLeaderboard(dateKey: string): DailyLeaderboardRecord[] {
  const seed = getDailySeedForDate(dateKey);
  const rng = createRng(seed ^ 0x5a5a5a5a);

  const pacers = [
    { name: 'Kaelen_V', skin: 'skin_sentinel', baseMs: 21400 },
    { name: 'NyxShadow', skin: 'skin_phantom', baseMs: 24800 },
    { name: 'SolarDrift', skin: 'skin_solar', baseMs: 28100 },
    { name: 'ApexRunner', skin: 'skin_crimson', baseMs: 32900 },
    { name: 'Vanguard_09', skin: 'skin_default', baseMs: 38600 },
  ];

  return pacers
    .map((p, idx) => {
      const jitter = Math.floor(rng() * 2600) - 900;
      const clearTimeMs = Math.max(14500, p.baseMs + jitter);
      return {
        id: `${dateKey}_pacer_${idx}`,
        uid: `pacer_${idx}`,
        displayName: p.name,
        dateKey,
        seed,
        clearTimeMs,
        coinsCollected: 8 + Math.floor(rng() * 14),
        damageTaken: idx < 2 ? 0 : Math.floor(rng() * 2),
        skinId: p.skin,
        isLiveCloud: false,
      };
    })
    .sort((a, b) => a.clearTimeMs - b.clearTimeMs);
}

export function mergeLeaderboardEntries(
  cloudEntries: DailyLeaderboardRecord[],
  baselineEntries: DailyLeaderboardRecord[],
  localPersonalBest?: {
    dateKey: string;
    clearTimeMs: number;
    displayName: string;
    skinId: string;
    uid?: string;
  } | null
): DailyLeaderboardRecord[] {
  const byUid = new Map<string, DailyLeaderboardRecord>();

  for (const b of baselineEntries) {
    byUid.set(b.uid, b);
  }

  for (const c of cloudEntries) {
    const existing = byUid.get(c.uid);
    if (!existing || c.clearTimeMs <= existing.clearTimeMs) {
      byUid.set(c.uid, { ...c, isLiveCloud: true });
    }
  }

  if (localPersonalBest && localPersonalBest.clearTimeMs >= 1000) {
    const uidKey = localPersonalBest.uid || 'local_you';
    const existing = byUid.get(uidKey);
    if (!existing || localPersonalBest.clearTimeMs < existing.clearTimeMs) {
      byUid.set(uidKey, {
        id: `${localPersonalBest.dateKey}_${uidKey}`,
        uid: uidKey,
        displayName: localPersonalBest.displayName,
        dateKey: localPersonalBest.dateKey,
        seed: getDailySeedForDate(localPersonalBest.dateKey),
        clearTimeMs: Math.round(localPersonalBest.clearTimeMs),
        coinsCollected: existing?.coinsCollected ?? 12,
        damageTaken: existing?.damageTaken ?? 0,
        skinId: localPersonalBest.skinId,
        isLiveCloud: Boolean(localPersonalBest.uid),
      });
    }
  }

  return Array.from(byUid.values()).sort((a, b) => a.clearTimeMs - b.clearTimeMs);
}
