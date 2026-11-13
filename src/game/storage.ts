import { GameSettings, SavedProgress } from './types';

const STORAGE_KEY = 'no_escape_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 65,
  sfxVolume: 80,
  muted: false,
  dayDuration: 10,
  nightDuration: 25,
  transitionDuration: 1.5,
  nightVisionRadius: 3.2,
  controlSensitivity: 1.0,
  touchLayout: 'joystick',
  graphicsQuality: 'high',
  reducedMotion: false,
  screenShake: true,
};

export const DEFAULT_PROGRESS: SavedProgress = {
  highestUnlockedLevel: 1,
  completedLevels: [],
  levelBestTimes: {},
  lastSelectedLevel: 1,
  coins: 0,
  unlockedCosmetics: ['skin_default', 'trail_ember'],
  equippedSkin: 'skin_default',
  equippedTrail: 'trail_ember',
  equippedPortalStyle: 'default',
  dailyBestDate: '',
  dailyBestTimeMs: 0,
  settings: { ...DEFAULT_SETTINGS },
};

export function loadSavedProgress(): SavedProgress {
  if (typeof window === 'undefined' || !window.localStorage) {
    return structuredClone(DEFAULT_PROGRESS);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const rawSettings: Partial<GameSettings> = parsed.settings ?? {};
    const migratedDay =
      rawSettings.dayDuration === undefined || rawSettings.dayDuration === 90
        ? DEFAULT_SETTINGS.dayDuration
        : rawSettings.dayDuration;
    const migratedNight =
      rawSettings.nightDuration === undefined || rawSettings.nightDuration === 45
        ? DEFAULT_SETTINGS.nightDuration
        : rawSettings.nightDuration;

    return {
      highestUnlockedLevel: Math.max(1, Math.min(100, parsed.highestUnlockedLevel ?? 1)),
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
      levelBestTimes: parsed.levelBestTimes ?? {},
      lastSelectedLevel: Math.max(1, Math.min(100, parsed.lastSelectedLevel ?? 1)),
      coins: Math.max(0, parsed.coins ?? 0),
      unlockedCosmetics: Array.isArray(parsed.unlockedCosmetics)
        ? Array.from(new Set(['skin_default', 'trail_ember', ...parsed.unlockedCosmetics]))
        : ['skin_default', 'trail_ember'],
      equippedSkin: parsed.equippedSkin ?? 'skin_default',
      equippedTrail: parsed.equippedTrail ?? 'trail_ember',
      equippedPortalStyle: parsed.equippedPortalStyle ?? 'default',
      dailyBestDate: typeof parsed.dailyBestDate === 'string' ? parsed.dailyBestDate.slice(0, 10) : '',
      dailyBestTimeMs: typeof parsed.dailyBestTimeMs === 'number' && parsed.dailyBestTimeMs >= 0 ? Math.round(parsed.dailyBestTimeMs) : 0,
      settings: {
        ...DEFAULT_SETTINGS,
        ...rawSettings,
        dayDuration: migratedDay,
        nightDuration: migratedNight,
        transitionDuration: 1.5,
      },
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordLevelCompletion(
  current: SavedProgress,
  level: number,
  clearTimeSeconds: number,
  coinsEarned: number
): SavedProgress {
  const completedSet = new Set(current.completedLevels);
  completedSet.add(level);

  const nextUnlocked = Math.min(100, Math.max(current.highestUnlockedLevel, level + 1));
  const prevBest = current.levelBestTimes[level];
  const newBest =
    prevBest === undefined ? clearTimeSeconds : Math.min(prevBest, clearTimeSeconds);

  const updated: SavedProgress = {
    ...current,
    highestUnlockedLevel: nextUnlocked,
    completedLevels: Array.from(completedSet).sort((a, b) => a - b),
    levelBestTimes: {
      ...current.levelBestTimes,
      [level]: Math.round(newBest),
    },
    lastSelectedLevel: Math.min(100, level + 1),
    coins: current.coins + Math.max(0, Math.floor(coinsEarned)),
  };

  saveProgress(updated);
  return updated;
}

export function recordDailyCompletion(
  current: SavedProgress,
  dateKey: string,
  clearTimeMs: number,
  coinsEarned: number
): SavedProgress {
  const roundedMs = Math.max(1000, Math.round(clearTimeMs));
  const isSameDate = current.dailyBestDate === dateKey;
  const bestMs =
    isSameDate && current.dailyBestTimeMs > 0
      ? Math.min(current.dailyBestTimeMs, roundedMs)
      : roundedMs;

  const updated: SavedProgress = {
    ...current,
    dailyBestDate: dateKey,
    dailyBestTimeMs: bestMs,
    coins: current.coins + Math.max(0, Math.floor(coinsEarned)),
  };

  saveProgress(updated);
  return updated;
}

export function mergeCloudProgressWithLocal(
  local: SavedProgress,
  cloud: Partial<SavedProgress>
): SavedProgress {
  const completedSet = new Set([
    ...local.completedLevels,
    ...(Array.isArray(cloud.completedLevels) ? cloud.completedLevels : []),
  ]);
  const unlockedCosmeticsSet = new Set([
    'skin_default',
    'trail_ember',
    ...local.unlockedCosmetics,
    ...(Array.isArray(cloud.unlockedCosmetics) ? cloud.unlockedCosmetics : []),
  ]);

  let dailyBestDate = local.dailyBestDate;
  let dailyBestTimeMs = local.dailyBestTimeMs;
  if (cloud.dailyBestDate && cloud.dailyBestTimeMs && cloud.dailyBestTimeMs > 0) {
    if (!dailyBestDate || cloud.dailyBestDate > dailyBestDate) {
      dailyBestDate = cloud.dailyBestDate;
      dailyBestTimeMs = cloud.dailyBestTimeMs;
    } else if (cloud.dailyBestDate === dailyBestDate) {
      dailyBestTimeMs =
        dailyBestTimeMs > 0
          ? Math.min(dailyBestTimeMs, cloud.dailyBestTimeMs)
          : cloud.dailyBestTimeMs;
    }
  }

  const merged: SavedProgress = {
    ...local,
    highestUnlockedLevel: Math.min(
      100,
      Math.max(local.highestUnlockedLevel, cloud.highestUnlockedLevel ?? 1)
    ),
    completedLevels: Array.from(completedSet)
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 100)
      .sort((a, b) => a - b)
      .slice(0, 100),
    coins: Math.max(local.coins, cloud.coins ?? 0),
    unlockedCosmetics: Array.from(unlockedCosmeticsSet).slice(0, 20),
    equippedSkin: cloud.equippedSkin || local.equippedSkin,
    equippedTrail: cloud.equippedTrail || local.equippedTrail,
    equippedPortalStyle: cloud.equippedPortalStyle || local.equippedPortalStyle,
    dailyBestDate,
    dailyBestTimeMs,
  };

  saveProgress(merged);
  return merged;
}

export function resetAllProgress(): SavedProgress {
  const fresh = structuredClone(DEFAULT_PROGRESS);
  saveProgress(fresh);
  return fresh;
}
