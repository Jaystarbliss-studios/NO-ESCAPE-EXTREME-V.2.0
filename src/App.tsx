import { useCallback, useEffect, useRef, useState } from 'react';
import { COSMETIC_CATALOG, getLevelConfig } from './game/chapters';
import { generateMaze, isTileWalkable } from './game/mazeGenerator';
import { updateEnemyAI } from './game/pathfinding';
import { ParticlePool } from './game/particlePool';
import { MazeRenderer, POWERUP_VISUAL_CONFIG } from './game/renderer';
import { audioManager } from './game/audio';
import {
  loadSavedProgress,
  recordLevelCompletion,
  resetAllProgress,
  saveProgress,
} from './game/storage';
import {
  DecoyInstance,
  GameSettings,
  GameState,
  GeneratedMaze,
  PlayerEntity,
  PowerUpType,
  RunSummarySnapshot,
  SavedProgress,
  SubMenuState,
} from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { LevelSelectModal } from './components/LevelSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { CosmeticsModal } from './components/CosmeticsModal';
import { CreditsModal, HowToPlayModal } from './components/HowToPlayModal';
import { GameHUD, HudSnapshot, POWERUP_SLOTS, PickupNotification } from './components/GameHUD';
import { StatusModals } from './components/StatusModals';

interface EngineMutableState {
  gameState: GameState;
  subMenu: SubMenuState;
  currentLevel: number;
  attemptCount: number;
  maze: GeneratedMaze;
  player: PlayerEntity;
  decoys: DecoyInstance[];
  particles: ParticlePool;
  unlockedDoors: Set<string>;
  elapsedRunTime: number;
  cycleTimer: number;
  isNight: boolean;
  nightFactor: number;
  hitstopTimer: number;
  cameraTrauma: number;
  cameraX: number;
  cameraY: number;
  damageTakenThisRun: number;
  statusBanner: string | null;
  statusBannerTimer: number;
  pickupNotification: PickupNotification | null;
  pickupNotificationTimer: number;
  touchVx: number;
  touchVy: number;
  touchSprint: boolean;
}

function createInitialPlayer(maze: GeneratedMaze): PlayerEntity {
  return {
    x: maze.start.x + 0.5,
    y: maze.start.y + 0.5,
    vx: 0,
    vy: 0,
    radius: 0.29,
    baseSpeed: 4.6, // Brisk, responsive top-down exploration speed
    hp: 3,
    maxHp: 3,
    invulnerableTimer: 1.5, // Safe spawn grace period
    shieldActive: false,
    facingAngle: 0,
    walkDistance: 0,
    scaleX: 1,
    scaleY: 1,
    isSprinting: false,
    noiseLevel: 0,
    inventory: ['scanner'], // Start with 1 Sector Radar Scanner charge
    selectedSlot: 3, // Highlight slot 4 (Scanner) initially
    activeAbilities: [],
    keysCollected: [],
    coinsEarnedThisRun: 0,
    secretsFoundThisRun: 0,
    checkpointPos: null,
  };
}

function buildHudSnapshot(
  eng: EngineMutableState,
  savedCoins: number
): HudSnapshot {
  const counts: Record<PowerUpType, number> = {
    shield: 0,
    speed: 0,
    freeze: 0,
    scanner: 0,
    decoy: 0,
    night_vision: 0,
  };
  for (const item of eng.player.inventory) {
    counts[item] = (counts[item] || 0) + 1;
  }

  const settings = loadSavedProgress().settings;
  const dayDur = Math.max(5, settings.dayDuration);
  const nightDur = Math.max(10, settings.nightDuration);
  const phaseTotal = eng.isNight ? nightDur : dayDur;
  const phaseRem = Math.max(0, phaseTotal - eng.cycleTimer);
  const phasePct = (phaseRem / phaseTotal) * 100;

  return {
    level: eng.maze.config.level,
    chapterNumber: eng.maze.config.chapter,
    chapterTitle: eng.maze.config.chapterTitle,
    objectiveText: eng.maze.config.objectiveText,
    isBossLevel: eng.maze.config.isBossLevel,
    bossTitle: eng.maze.config.bossTitle,
    hp: eng.player.hp,
    maxHp: eng.player.maxHp,
    shieldActive: eng.player.shieldActive,
    coins: savedCoins + eng.player.coinsEarnedThisRun,
    keysCollected: eng.player.keysCollected.length,
    keysRequired: eng.maze.keys.length,
    switchesActivated: eng.maze.bossSwitches.filter((s) => s.activated).length,
    switchesRequired: eng.maze.bossSwitches.length,
    isNight: eng.isNight,
    phaseRemainingSec: phaseRem,
    phaseProgressPct: phasePct,
    inventoryCounts: counts,
    selectedSlot: eng.player.selectedSlot,
    activeAbilities: [...eng.player.activeAbilities],
    checkpointReached: eng.player.checkpointPos !== null,
    statusBanner: eng.statusBanner,
    pickupNotification: eng.pickupNotification,
  };
}

export default function App() {
  const [progress, setProgress] = useState<SavedProgress>(() => loadSavedProgress());
  const progressRef = useRef<SavedProgress>(progress);
  progressRef.current = progress;

  // Support ?autostart=1 to boot directly into 'playing'
  const initialAutoStart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<GameState>(
    initialAutoStart ? 'playing' : 'title'
  );
  const [subMenu, setSubMenu] = useState<SubMenuState>('none');
  const [runSummary, setRunSummary] = useState<RunSummarySnapshot | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());

  const engineRef = useRef<EngineMutableState | null>(null);
  if (!engineRef.current) {
    const startLvl = progress.lastSelectedLevel || 1;
    const cfg = getLevelConfig(startLvl, 0);
    const initialMaze = generateMaze(cfg);
    const initialNight = Math.random() < 0.5;
    engineRef.current = {
      gameState: initialAutoStart ? 'playing' : 'title',
      subMenu: 'none',
      currentLevel: startLvl,
      attemptCount: 0,
      maze: initialMaze,
      player: createInitialPlayer(initialMaze),
      decoys: [],
      particles: new ParticlePool(),
      unlockedDoors: new Set<string>(),
      elapsedRunTime: 0,
      cycleTimer: 0,
      isNight: initialNight,
      nightFactor: initialNight ? 1 : 0,
      hitstopTimer: 0,
      cameraTrauma: 0,
      cameraX: initialMaze.start.x + 0.5,
      cameraY: initialMaze.start.y + 0.5,
      damageTakenThisRun: 0,
      statusBanner: initialAutoStart
        ? `SECTOR ${startLvl} (${initialNight ? 'NIGHTFALL' : 'DAYLIGHT'})`
        : null,
      statusBannerTimer: initialAutoStart ? 2.2 : 0,
      pickupNotification: null,
      pickupNotificationTimer: 0,
      touchVx: 0,
      touchVy: 0,
      touchSprint: false,
    };
  }

  const [hud, setHud] = useState<HudSnapshot>(() =>
    buildHudSnapshot(engineRef.current!, progress.coins)
  );

  // Sync document.body.dataset.state
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = gameState;
    }
    if (engineRef.current) {
      engineRef.current.gameState = gameState;
      engineRef.current.subMenu = subMenu;
    }
  }, [gameState, subMenu]);

  // Configure audio manager whenever settings change
  useEffect(() => {
    audioManager.configure(progress.settings);
  }, [progress.settings]);

  const setBanner = useCallback((text: string, duration = 2.0) => {
    if (!engineRef.current) return;
    engineRef.current.statusBanner = text;
    engineRef.current.statusBannerTimer = duration;
  }, []);

  const startLevel = useCallback(
    (levelNum: number, incrementAttempt = false) => {
      const eng = engineRef.current;
      if (!eng) return;

      const clampedLvl = Math.max(1, Math.min(100, levelNum));
      const nextAttempt = incrementAttempt ? eng.attemptCount + 1 : 0;
      const cfg = getLevelConfig(clampedLvl, nextAttempt);
      const newMaze = generateMaze(cfg);
      // Randomly start each level in either Daylight or Nightfall
      const startAtNight = Math.random() < 0.5;

      eng.currentLevel = clampedLvl;
      eng.attemptCount = nextAttempt;
      eng.maze = newMaze;
      eng.player = createInitialPlayer(newMaze);
      eng.decoys = [];
      eng.particles.clear();
      eng.unlockedDoors.clear();
      eng.elapsedRunTime = 0;
      eng.cycleTimer = 0;
      eng.isNight = startAtNight;
      eng.nightFactor = startAtNight ? 1 : 0;
      eng.hitstopTimer = 0;
      eng.cameraTrauma = 0;
      eng.cameraX = newMaze.start.x + 0.5;
      eng.cameraY = newMaze.start.y + 0.5;
      eng.damageTakenThisRun = 0;
      eng.pickupNotification = null;
      eng.pickupNotificationTimer = 0;
      eng.statusBanner = cfg.isBossLevel
        ? `BOSS SECTOR ${clampedLvl}: ${cfg.bossTitle} (${startAtNight ? 'NIGHT' : 'DAY'})`
        : `SECTOR ${clampedLvl} — ${startAtNight ? 'NIGHTFALL START' : 'DAYLIGHT START'}`;
      eng.statusBannerTimer = 2.4;

      keysHeldRef.current.clear();
      if (typeof document !== 'undefined') {
        (document.activeElement as HTMLElement | null)?.blur?.();
        document.body.dataset.state = 'playing';
      }

      const updatedProgress = {
        ...progressRef.current,
        lastSelectedLevel: clampedLvl,
      };
      setProgress(updatedProgress);
      saveProgress(updatedProgress);

      setSubMenu('none');
      setRunSummary(null);
      setGameState('playing');
      setHud(buildHudSnapshot(eng, updatedProgress.coins));
      audioManager.startAmbient(startAtNight);
    },
    []
  );

  const handleRespawnAtCheckpoint = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || !eng.player.checkpointPos) {
      startLevel(eng?.currentLevel || 1, true);
      return;
    }
    const cp = eng.player.checkpointPos;
    eng.player.x = cp.x + 0.5;
    eng.player.y = cp.y + 0.5;
    eng.player.hp = 3;
    eng.player.invulnerableTimer = 2.5;
    eng.cameraX = eng.player.x;
    eng.cameraY = eng.player.y;
    eng.statusBanner = 'RESPAWNED AT CHECKPOINT';
    eng.statusBannerTimer = 2.0;
    keysHeldRef.current.clear();

    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
    setRunSummary(null);
    setGameState('playing');
    setHud(buildHudSnapshot(eng, progressRef.current.coins));
  }, [startLevel]);

  const activatePowerUp = useCallback(
    (type: PowerUpType) => {
      const eng = engineRef.current;
      if (!eng || eng.gameState !== 'playing') return;

      const idx = eng.player.inventory.indexOf(type);
      if (idx === -1) return;

      // Scanner can ONLY be used in Night Mode!
      if (type === 'scanner' && !eng.isNight) {
        eng.pickupNotification = null;
        eng.pickupNotificationTimer = 0;
        setBanner('SCANNER CAN ONLY BE USED IN NIGHT MODE!', 2.2);
        setHud(buildHudSnapshot(eng, progressRef.current.coins));
        return;
      }

      // Consume from inventory
      eng.player.inventory.splice(idx, 1);
      audioManager.playPowerUpPickup();
      eng.particles.spawnBurst(eng.player.x, eng.player.y, 16, '#FFD43B', 3.2, 4, 0.5);

      if (type === 'shield') {
        eng.player.shieldActive = true;
        setBanner('SHIELD ACTIVE');
      } else if (type === 'speed') {
        eng.player.activeAbilities = eng.player.activeAbilities.filter((a) => a.type !== 'speed');
        eng.player.activeAbilities.push({ type: 'speed', remaining: 8.0, maxDuration: 8.0 });
        setBanner('SPEED BOOST (8s)');
      } else if (type === 'freeze') {
        let frozenCount = 0;
        for (const enemy of eng.maze.enemies) {
          const d = Math.hypot(enemy.x - eng.player.x, enemy.y - eng.player.y);
          if (d <= 7.5) {
            enemy.frozenTimer = 6.0;
            enemy.state = 'frozen';
            frozenCount++;
            eng.particles.spawnBurst(enemy.x, enemy.y, 12, '#38BDF8', 2.5, 3.5, 0.45);
          }
        }
        setBanner(
          frozenCount > 0 ? `FROZE ${frozenCount} ENEMY(S)!` : 'FREEZE BLAST USED'
        );
      } else if (type === 'scanner') {
        eng.player.activeAbilities = eng.player.activeAbilities.filter((a) => a.type !== 'scanner');
        eng.player.activeAbilities.push({ type: 'scanner', remaining: 7.0, maxDuration: 7.0 });
        setBanner('NIGHT SCANNER ACTIVE (7s)');
      } else if (type === 'decoy') {
        eng.decoys.push({
          x: eng.player.x,
          y: eng.player.y,
          remainingTime: 9.0,
          pulsePhase: 0,
        });
        setBanner('DECOY DEPLOYED');
      } else if (type === 'night_vision') {
        eng.player.activeAbilities = eng.player.activeAbilities.filter(
          (a) => a.type !== 'night_vision'
        );
        eng.player.activeAbilities.push({
          type: 'night_vision',
          remaining: 14.0,
          maxDuration: 14.0,
        });
        setBanner('NIGHT VISION (14s)');
      }

      setHud(buildHudSnapshot(eng, progressRef.current.coins));
    },
    [setBanner]
  );

  const usePrimaryAbility = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.player.inventory.length === 0) return;
    // Prefer the currently selected slot if it has charges in inventory
    const selectedType = POWERUP_SLOTS[eng.player.selectedSlot]?.type;
    if (selectedType && eng.player.inventory.includes(selectedType)) {
      // If selectedType is scanner during Daylight, check if player has another usable power-up first; otherwise trigger scanner to show the Night-Only message
      if (selectedType === 'scanner' && !eng.isNight) {
        const usableAlt = eng.player.inventory.find((t) => t !== 'scanner');
        if (usableAlt) {
          activatePowerUp(usableAlt);
          return;
        }
      }
      activatePowerUp(selectedType);
      return;
    }
    const latestCollected = eng.player.inventory[eng.player.inventory.length - 1];
    if (latestCollected) {
      activatePowerUp(latestCollected);
    }
  }, [activatePowerUp]);

  const cycleSelectedAbilitySlot = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    for (let offset = 1; offset <= POWERUP_SLOTS.length; offset++) {
      const candidateIdx = (eng.player.selectedSlot + offset) % POWERUP_SLOTS.length;
      const candidateType = POWERUP_SLOTS[candidateIdx].type;
      if (eng.player.inventory.includes(candidateType)) {
        eng.player.selectedSlot = candidateIdx;
        setHud(buildHudSnapshot(eng, progressRef.current.coins));
        return;
      }
    }
    eng.player.selectedSlot = (eng.player.selectedSlot + 1) % POWERUP_SLOTS.length;
    setHud(buildHudSnapshot(eng, progressRef.current.coins));
  }, []);

  // Global keyboard & focus-loss listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const eng = engineRef.current;
      if (!eng) return;

      // Title screen start handshake: Enter or Space starts when no subMenu is open
      if (eng.gameState === 'title' && eng.subMenu === 'none') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          startLevel(progressRef.current.lastSelectedLevel || 1, false);
          return;
        }
      }

      // Pause / Resume toggle with Escape or KeyP
      if (code === 'Escape' || code === 'KeyP') {
        if (eng.gameState === 'playing') {
          e.preventDefault();
          keysHeldRef.current.clear();
          audioManager.stopAmbient();
          setGameState('paused');
          return;
        } else if (eng.gameState === 'paused') {
          e.preventDefault();
          if (eng.subMenu !== 'none') {
            setSubMenu('none');
          } else {
            audioManager.startAmbient(eng.isNight);
            setGameState('playing');
          }
          return;
        } else if (eng.gameState === 'title' && eng.subMenu !== 'none') {
          e.preventDefault();
          setSubMenu('none');
          return;
        }
      }

      if (eng.gameState !== 'playing') return;

      // Edge-triggered one-shot controls during active gameplay (no screen clicking required on PC)
      if (!e.repeat) {
        if (code === 'Space' || code === 'KeyE') {
          e.preventDefault();
          usePrimaryAbility();
        } else if (code === 'KeyQ') {
          e.preventDefault();
          cycleSelectedAbilitySlot();
        } else if (code === 'Digit1' || code === 'Numpad1') {
          eng.player.selectedSlot = 0;
          activatePowerUp('shield');
        } else if (code === 'Digit2' || code === 'Numpad2') {
          eng.player.selectedSlot = 1;
          activatePowerUp('speed');
        } else if (code === 'Digit3' || code === 'Numpad3') {
          eng.player.selectedSlot = 2;
          activatePowerUp('freeze');
        } else if (code === 'Digit4' || code === 'Numpad4') {
          eng.player.selectedSlot = 3;
          activatePowerUp('scanner');
        } else if (code === 'Digit5' || code === 'Numpad5') {
          eng.player.selectedSlot = 4;
          activatePowerUp('decoy');
        } else if (code === 'Digit6' || code === 'Numpad6') {
          eng.player.selectedSlot = 5;
          activatePowerUp('night_vision');
        } else if (code === 'KeyM') {
          const cur = progressRef.current;
          const updated: SavedProgress = {
            ...cur,
            settings: { ...cur.settings, muted: !cur.settings.muted },
          };
          setProgress(updated);
          saveProgress(updated);
        } else if (code === 'KeyR') {
          startLevel(eng.currentLevel, true);
        }
      }

      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }

      keysHeldRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const onBlurOrVisibility = () => {
      keysHeldRef.current.clear();
      if (engineRef.current) {
        engineRef.current.touchVx = 0;
        engineRef.current.touchVy = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrVisibility);
    document.addEventListener('visibilitychange', onBlurOrVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrVisibility);
      document.removeEventListener('visibilitychange', onBlurOrVisibility);
    };
  }, [activatePowerUp, cycleSelectedAbilitySlot, startLevel, usePrimaryAbility]);

  // Isolated 60Hz Canvas Simulation & Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new MazeRenderer();
    let rafId = 0;
    let timerId = 0;
    let isCancelled = false;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const scheduleNextFrame = () => {
      if (isCancelled) return;
      timerId = window.setTimeout(() => {
        if (!isCancelled) {
          rafId = requestAnimationFrame(stepSimulation);
        }
      }, 16);
    };

    const stepSimulation = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      // Clamp frame delta time to <= 0.05s so tab switches never tunnel entities through walls
      const dt = Math.min(Math.max(0.001, rawDt), 0.05);

      const eng = engineRef.current;
      const curProgress = progressRef.current;
      const settings = curProgress.settings;

      if (eng) {
        // Decay camera shake in real dt
        eng.cameraTrauma = Math.max(0, eng.cameraTrauma - dt * 2.2);
        const shakeMag =
          settings.screenShake && !settings.reducedMotion
            ? eng.cameraTrauma * eng.cameraTrauma * 14
            : 0;
        const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
        const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

        if (eng.gameState === 'title') {
          // Live-World Camera Pan across the procedural maze on Title Screen
          eng.elapsedRunTime += dt;
          const cx = eng.maze.width / 2 + Math.cos(eng.elapsedRunTime * 0.25) * (eng.maze.width * 0.22);
          const cy = eng.maze.height / 2 + Math.sin(eng.elapsedRunTime * 0.18) * (eng.maze.height * 0.22);
          eng.cameraX += (cx - eng.cameraX) * Math.min(1, dt * 3);
          eng.cameraY += (cy - eng.cameraY) * Math.min(1, dt * 3);

          // Gently animate wandering enemies in the background tour
          for (const enemy of eng.maze.enemies) {
            updateEnemyAI(enemy, dt * 0.6, eng.maze.grid, eng.player, [], false, eng.unlockedDoors);
          }

          renderer.render(ctx, canvas.width, canvas.height, {
            maze: eng.maze,
            player: eng.player,
            decoys: [],
            particles: eng.particles,
            nightFactor: 0.2,
            isTransitioningToNight: false,
            timeUntilTransition: 90,
            effectiveVisionTiles: 5,
            scannerActive: false,
            cameraX: eng.cameraX,
            cameraY: eng.cameraY,
            shakeOffsetX: 0,
            shakeOffsetY: 0,
            elapsedTime: eng.elapsedRunTime,
            equippedSkinId: curProgress.equippedSkin,
            equippedTrailId: curProgress.equippedTrail,
            isTitleCameraTour: true,
          });
        } else if (eng.gameState === 'playing') {
          // Sim-level hitstop freeze timer (30-80ms on heavy hits)
          if (eng.hitstopTimer > 0) {
            eng.hitstopTimer = Math.max(0, eng.hitstopTimer - dt);
          } else {
            updateGameplayStep(eng, dt, settings, keysHeldRef.current, {
              onHudNeedSync: () => {
                hudSyncAccumulator = 1.0;
              },
              onTriggerVictory: (isFinal100) => {
                audioManager.stopAmbient();
                audioManager.playLevelComplete();
                const updatedProg = recordLevelCompletion(
                  progressRef.current,
                  eng.currentLevel,
                  eng.elapsedRunTime,
                  eng.player.coinsEarnedThisRun + 5
                );
                setProgress(updatedProg);

                const bestTime =
                  updatedProg.levelBestTimes[eng.currentLevel] ?? eng.elapsedRunTime;

                setRunSummary({
                  level: eng.currentLevel,
                  chapterTitle: eng.maze.config.chapterTitle,
                  outcome: isFinal100 ? 'final_victory' : 'level_complete',
                  clearTimeSeconds: eng.elapsedRunTime,
                  bestTimeSeconds: bestTime,
                  coinsCollected: eng.player.coinsEarnedThisRun + 5,
                  totalCoinsInLevel: eng.maze.coins.length,
                  secretsFound: eng.player.secretsFoundThisRun,
                  damageTaken: eng.damageTakenThisRun,
                  hpRemaining: eng.player.hp,
                  distanceProgressPct: 100,
                  canRespawnAtCheckpoint: false,
                });
                setGameState('gameover');
              },
              onTriggerGameOver: () => {
                audioManager.stopAmbient();
                audioManager.playGameOver();
                const totalDist = Math.hypot(
                  eng.maze.exit.x - eng.maze.start.x,
                  eng.maze.exit.y - eng.maze.start.y
                );
                const remDist = Math.hypot(
                  eng.maze.exit.x + 0.5 - eng.player.x,
                  eng.maze.exit.y + 0.5 - eng.player.y
                );
                const pct = Math.max(
                  5,
                  Math.min(99, Math.round((1 - remDist / Math.max(1, totalDist)) * 100))
                );

                setRunSummary({
                  level: eng.currentLevel,
                  chapterTitle: eng.maze.config.chapterTitle,
                  outcome: 'game_over',
                  clearTimeSeconds: eng.elapsedRunTime,
                  bestTimeSeconds:
                    progressRef.current.levelBestTimes[eng.currentLevel] ?? 0,
                  coinsCollected: eng.player.coinsEarnedThisRun,
                  totalCoinsInLevel: eng.maze.coins.length,
                  secretsFound: eng.player.secretsFoundThisRun,
                  damageTaken: eng.damageTakenThisRun,
                  hpRemaining: 0,
                  distanceProgressPct: pct,
                  canRespawnAtCheckpoint: eng.player.checkpointPos !== null,
                });
                setGameState('gameover');
              },
            });
          }

          // Smooth camera follow
          eng.cameraX += (eng.player.x - eng.cameraX) * Math.min(1, dt * 10);
          eng.cameraY += (eng.player.y - eng.cameraY) * Math.min(1, dt * 10);

          const hasNightVision = eng.player.activeAbilities.some(
            (a) => a.type === 'night_vision'
          );
          const scannerActive = eng.player.activeAbilities.some(
            (a) => a.type === 'scanner'
          );
          const baseVision = Math.min(
            settings.nightVisionRadius,
            eng.maze.config.nightVisibilityTiles +
              (settings.nightVisionRadius - 3.2)
          );
          const effectiveVision = hasNightVision ? baseVision * 1.9 : baseVision;

          const phaseDur = eng.isNight ? settings.nightDuration : settings.dayDuration;
          const timeUntilTrans = Math.max(0, phaseDur - eng.cycleTimer);

          renderer.render(ctx, canvas.width, canvas.height, {
            maze: eng.maze,
            player: eng.player,
            decoys: eng.decoys,
            particles: eng.particles,
            nightFactor: eng.nightFactor,
            isTransitioningToNight: !eng.isNight && timeUntilTrans <= settings.transitionDuration,
            timeUntilTransition: timeUntilTrans,
            effectiveVisionTiles: Math.max(2.0, effectiveVision),
            scannerActive,
            cameraX: eng.cameraX,
            cameraY: eng.cameraY,
            shakeOffsetX: shakeX,
            shakeOffsetY: shakeY,
            elapsedTime: eng.elapsedRunTime,
            equippedSkinId: curProgress.equippedSkin,
            equippedTrailId: curProgress.equippedTrail,
            isTitleCameraTour: false,
          });

          // Throttle HUD React state updates to ~5Hz or immediate discrete changes
          hudSyncAccumulator += dt;
          if (hudSyncAccumulator >= 0.2) {
            hudSyncAccumulator = 0;
            setHud(buildHudSnapshot(eng, curProgress.coins));
          }
        } else {
          // Paused or Game Over: render static frozen frame underneath modal
          renderer.render(ctx, canvas.width, canvas.height, {
            maze: eng.maze,
            player: eng.player,
            decoys: eng.decoys,
            particles: eng.particles,
            nightFactor: eng.nightFactor,
            isTransitioningToNight: false,
            timeUntilTransition: 30,
            effectiveVisionTiles: settings.nightVisionRadius,
            scannerActive: false,
            cameraX: eng.cameraX,
            cameraY: eng.cameraY,
            shakeOffsetX: 0,
            shakeOffsetY: 0,
            elapsedTime: eng.elapsedRunTime,
            equippedSkinId: curProgress.equippedSkin,
            equippedTrailId: curProgress.equippedTrail,
            isTitleCameraTour: false,
          });
        }
      }

      scheduleNextFrame();
    };

    scheduleNextFrame();
    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    const updated: SavedProgress = {
      ...progress,
      settings: newSettings,
    };
    setProgress(updated);
    saveProgress(updated);
  };

  const handleUnlockOrEquipCosmetic = (itemId: string) => {
    const item = COSMETIC_CATALOG.find((c) => c.id === itemId);
    if (!item) return;
    const isUnlocked = progress.unlockedCosmetics.includes(itemId);

    if (isUnlocked) {
      const updated: SavedProgress = {
        ...progress,
        equippedSkin: item.category === 'skin' ? itemId : progress.equippedSkin,
        equippedTrail: item.category === 'trail' ? itemId : progress.equippedTrail,
      };
      setProgress(updated);
      saveProgress(updated);
    } else if (progress.coins >= item.cost) {
      const updated: SavedProgress = {
        ...progress,
        coins: progress.coins - item.cost,
        unlockedCosmetics: [...progress.unlockedCosmetics, itemId],
        equippedSkin: item.category === 'skin' ? itemId : progress.equippedSkin,
        equippedTrail: item.category === 'trail' ? itemId : progress.equippedTrail,
      };
      setProgress(updated);
      saveProgress(updated);
      audioManager.playPowerUpPickup();
    }
  };

  const handleResetProgress = () => {
    const fresh = resetAllProgress();
    setProgress(fresh);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#171717] select-none">
      {/* Isolated Full-Viewport 2D Game Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="maze-canvas"
        className="block w-full h-full"
      />

      {/* TITLE SCREEN OVERLAY */}
      {gameState === 'title' && subMenu === 'none' && (
        <TitleScreen
          progress={progress}
          onStartNewOrSelected={(lvl) => startLevel(lvl, false)}
          onContinue={() => startLevel(progress.highestUnlockedLevel, false)}
          onOpenSubMenu={(menu) => setSubMenu(menu)}
        />
      )}

      {/* SUB-MODALS (Accessible from Title Screen or Pause Menu) */}
      {subMenu === 'levels' && (
        <LevelSelectModal
          progress={progress}
          onSelectLevel={(lvl) => startLevel(lvl, false)}
          onClose={() => setSubMenu('none')}
        />
      )}

      {subMenu === 'settings' && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setSubMenu('none')}
        />
      )}

      {subMenu === 'cosmetics' && (
        <CosmeticsModal
          progress={progress}
          onUnlockOrEquip={handleUnlockOrEquipCosmetic}
          onClose={() => setSubMenu('none')}
        />
      )}

      {subMenu === 'how_to_play' && (
        <HowToPlayModal onClose={() => setSubMenu('none')} />
      )}

      {subMenu === 'credits' && (
        <CreditsModal onClose={() => setSubMenu('none')} />
      )}

      {/* ACTIVE GAMEPLAY HUD */}
      {gameState === 'playing' && (
        <GameHUD
          hud={hud}
          settings={progress.settings}
          onActivatePowerUp={activatePowerUp}
          onToggleMute={() =>
            handleUpdateSettings({
              ...progress.settings,
              muted: !progress.settings.muted,
            })
          }
          onPause={() => {
            keysHeldRef.current.clear();
            audioManager.stopAmbient();
            setGameState('paused');
          }}
          onRestart={() => startLevel(engineRef.current?.currentLevel || 1, true)}
          onTouchVectorChange={(vx, vy, sprinting) => {
            if (engineRef.current) {
              engineRef.current.touchVx = vx;
              engineRef.current.touchVy = vy;
              engineRef.current.touchSprint = sprinting;
            }
          }}
          onUsePrimaryAbility={usePrimaryAbility}
        />
      )}

      {/* PAUSE / VICTORY / GAME OVER STATUS MODALS */}
      {subMenu === 'none' && (gameState === 'paused' || gameState === 'gameover') && (
        <StatusModals
          gameState={gameState}
          summary={runSummary}
          currentLevel={engineRef.current?.currentLevel || 1}
          onResume={() => {
            audioManager.startAmbient(engineRef.current?.isNight || false);
            setGameState('playing');
          }}
          onRestartLevel={() =>
            startLevel(engineRef.current?.currentLevel || 1, true)
          }
          onRespawnCheckpoint={handleRespawnAtCheckpoint}
          onNextLevel={() =>
            startLevel(
              Math.min(100, (engineRef.current?.currentLevel || 1) + 1),
              false
            )
          }
          onOpenSettings={() => setSubMenu('settings')}
          onReturnToTitle={() => {
            audioManager.stopAmbient();
            setRunSummary(null);
            setSubMenu('none');
            setGameState('title');
          }}
        />
      )}
    </main>
  );
}

function updateGameplayStep(
  eng: EngineMutableState,
  dt: number,
  settings: GameSettings,
  keysHeld: Set<string>,
  callbacks: {
    onHudNeedSync: () => void;
    onTriggerVictory: (isFinal100: boolean) => void;
    onTriggerGameOver: () => void;
  }
): void {
  eng.elapsedRunTime += dt;

  // Status banner countdown
  if (eng.statusBannerTimer > 0) {
    eng.statusBannerTimer = Math.max(0, eng.statusBannerTimer - dt);
    if (eng.statusBannerTimer === 0) {
      eng.statusBanner = null;
      callbacks.onHudNeedSync();
    }
  }

  // Power-Up pickup notification card countdown
  if (eng.pickupNotificationTimer > 0) {
    eng.pickupNotificationTimer = Math.max(0, eng.pickupNotificationTimer - dt);
    if (eng.pickupNotificationTimer === 0) {
      eng.pickupNotification = null;
      callbacks.onHudNeedSync();
    }
  }

  // 1. Update Day (10s) & Night (25s) Environmental Cycle + Smooth Sunset/Sunrise Transition
  const dayDuration = Math.max(5, settings.dayDuration);
  const nightDuration = Math.max(10, settings.nightDuration);
  const transDuration = Math.max(0.8, settings.transitionDuration);

  eng.cycleTimer += dt;
  const currentPhaseMax = eng.isNight ? nightDuration : dayDuration;

  if (eng.cycleTimer >= currentPhaseMax) {
    eng.cycleTimer = 0;
    eng.isNight = !eng.isNight;
    audioManager.playNightTransition(eng.isNight);
    audioManager.updateAmbientTone(eng.isNight);
    eng.statusBanner = eng.isNight ? 'NIGHTFALL' : 'DAYLIGHT';
    eng.statusBannerTimer = 1.6;
    callbacks.onHudNeedSync();
  }

  // Smoothly interpolate nightFactor (0 = full day, 1 = full night) over transitionDuration
  const remInPhase = currentPhaseMax - eng.cycleTimer;
  if (!eng.isNight) {
    if (remInPhase <= transDuration) {
      eng.nightFactor = 1 - remInPhase / transDuration;
    } else if (eng.cycleTimer <= transDuration && eng.elapsedRunTime > transDuration) {
      eng.nightFactor = Math.max(0, 1 - eng.cycleTimer / transDuration);
    } else {
      eng.nightFactor = 0;
    }
  } else {
    if (remInPhase <= transDuration) {
      eng.nightFactor = remInPhase / transDuration;
    } else if (eng.cycleTimer <= transDuration) {
      eng.nightFactor = Math.min(1, eng.cycleTimer / transDuration);
    } else {
      eng.nightFactor = 1;
    }
  }

  // 2. Update Player Active Abilities & Timers
  const p = eng.player;
  if (p.invulnerableTimer > 0) {
    p.invulnerableTimer = Math.max(0, p.invulnerableTimer - dt);
  }
  p.scaleX += (1 - p.scaleX) * Math.min(1, dt * 12);
  p.scaleY += (1 - p.scaleY) * Math.min(1, dt * 12);

  for (let i = p.activeAbilities.length - 1; i >= 0; i--) {
    p.activeAbilities[i].remaining -= dt;
    if (p.activeAbilities[i].remaining <= 0) {
      p.activeAbilities.splice(i, 1);
      callbacks.onHudNeedSync();
    }
  }

  // Update Decoys
  for (let i = eng.decoys.length - 1; i >= 0; i--) {
    eng.decoys[i].remainingTime -= dt;
    if (eng.decoys[i].remainingTime <= 0) {
      eng.decoys.splice(i, 1);
    }
  }

  // 3. Player Input & Smooth Wall-Sliding Movement
  let ix = eng.touchVx;
  let iy = eng.touchVy;

  if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) iy -= 1;
  if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) iy += 1;
  if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) ix -= 1;
  if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) ix += 1;

  const inputMag = Math.hypot(ix, iy);
  if (inputMag > 1) {
    ix /= inputMag;
    iy /= inputMag;
  }

  const sprinting =
    eng.touchSprint || keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight');
  const hasSpeedBoost = p.activeAbilities.some((a) => a.type === 'speed');

  const speedMult =
    (sprinting ? 1.35 : 1.0) *
    (hasSpeedBoost ? 1.45 : 1.0) *
    settings.controlSensitivity;
  const moveSpeed = p.baseSpeed * speedMult;

  if (inputMag > 0.05) {
    p.facingAngle = Math.atan2(iy, ix);
    p.isSprinting = sprinting;
    p.noiseLevel = sprinting ? 1.0 : 0.35;

    const dx = ix * moveSpeed * dt;
    const dy = iy * moveSpeed * dt;

    // Separate X and Y collision resolution for smooth corner sliding in narrow corridors
    const nextX = p.x + dx;
    if (canPlayerOccupy(eng.maze.grid, nextX, p.y, p.radius, eng.isNight, eng.unlockedDoors)) {
      p.x = nextX;
    }
    const nextY = p.y + dy;
    if (canPlayerOccupy(eng.maze.grid, p.x, nextY, p.radius, eng.isNight, eng.unlockedDoors)) {
      p.y = nextY;
    }

    const distMoved = Math.hypot(dx, dy);
    p.walkDistance += distMoved;
    audioManager.playFootstep(sprinting);
  } else {
    p.isSprinting = false;
    p.noiseLevel = Math.max(0, p.noiseLevel - dt * 2);
  }

  const pgx = Math.floor(p.x);
  const pgy = Math.floor(p.y);

  // 4. Check Mystery / Secret Room discovery
  if (eng.maze.grid[pgy]?.[pgx] === 'mystery_floor') {
    eng.maze.grid[pgy][pgx] = 'floor';
    p.secretsFoundThisRun++;
    eng.particles.spawnBurst(p.x, p.y, 20, '#FFD43B', 3.0, 4, 0.6);
    eng.statusBanner = 'SECRET ROOM DISCOVERED! +BONUS TREASURE';
    eng.statusBannerTimer = 3.0;
    callbacks.onHudNeedSync();
  }

  // 5. Check Collectibles: Coins, Keys, Power-Ups, Boss Switches, Checkpoint
  for (const coin of eng.maze.coins) {
    if (coin.collected) continue;
    if (Math.hypot(coin.x + 0.5 - p.x, coin.y + 0.5 - p.y) < 0.52) {
      coin.collected = true;
      p.coinsEarnedThisRun += coin.value;
      audioManager.playCoinPickup(coin.isRareTreasure);
      eng.particles.spawnBurst(
        coin.x + 0.5,
        coin.y + 0.5,
        coin.isRareTreasure ? 16 : 6,
        '#FFD43B',
        2.2,
        3,
        0.35
      );
      callbacks.onHudNeedSync();
    }
  }

  for (const key of eng.maze.keys) {
    if (key.collected) continue;
    if (Math.hypot(key.x + 0.5 - p.x, key.y + 0.5 - p.y) < 0.55) {
      key.collected = true;
      p.keysCollected.push(key.id);
      audioManager.playKeyAndDoor(false);
      eng.particles.spawnBurst(key.x + 0.5, key.y + 0.5, 18, key.color, 3.0, 4, 0.5);

      if (p.keysCollected.length >= eng.maze.keys.length) {
        // Unlock exit gate!
        for (const door of eng.maze.doors) {
          if (door.keyId === 'all_keys') {
            door.unlocked = true;
            eng.unlockedDoors.add(`${door.x},${door.y}`);
            audioManager.playKeyAndDoor(true);
          }
        }
        eng.statusBanner = 'ALL KEYS COLLECTED — EXIT GATE UNLOCKED!';
      } else {
        eng.statusBanner = `KEY COLLECTED (${p.keysCollected.length}/${eng.maze.keys.length})`;
      }
      eng.statusBannerTimer = 3.0;
      callbacks.onHudNeedSync();
    }
  }

  for (const sw of eng.maze.bossSwitches) {
    if (sw.activated) continue;
    if (Math.hypot(sw.x + 0.5 - p.x, sw.y + 0.5 - p.y) < 0.55) {
      sw.activated = true;
      audioManager.playKeyAndDoor(false);
      eng.particles.spawnBurst(sw.x + 0.5, sw.y + 0.5, 20, '#FFD43B', 3.4, 4, 0.55);

      const allActive = eng.maze.bossSwitches.every((s) => s.activated);
      if (allActive) {
        for (const door of eng.maze.doors) {
          if (door.keyId === 'boss_switches') {
            door.unlocked = true;
            eng.unlockedDoors.add(`${door.x},${door.y}`);
            audioManager.playKeyAndDoor(true);
          }
        }
        eng.statusBanner = 'ALL BOSS SWITCHES ENGAGED — EXIT GATE UNLOCKED!';
      } else {
        const done = eng.maze.bossSwitches.filter((s) => s.activated).length;
        eng.statusBanner = `SECURITY SWITCH ACTIVATED (${done}/${eng.maze.bossSwitches.length})`;
      }
      eng.statusBannerTimer = 3.0;
      callbacks.onHudNeedSync();
    }
  }

  for (const pu of eng.maze.powerUps) {
    if (pu.collected) continue;
    if (Math.hypot(pu.x + 0.5 - p.x, pu.y + 0.5 - p.y) < 0.55) {
      pu.collected = true;
      p.inventory.push(pu.type);
      const slotIdx = POWERUP_SLOTS.findIndex((s) => s.type === pu.type);
      if (slotIdx !== -1) {
        p.selectedSlot = slotIdx;
      }
      const vis = POWERUP_VISUAL_CONFIG[pu.type];
      audioManager.playPowerUpPickup();
      eng.particles.spawnBurst(pu.x + 0.5, pu.y + 0.5, 14, vis.primaryColor, 2.8, 3.8, 0.5);
      eng.pickupNotification = {
        id: Math.floor(eng.elapsedRunTime * 1000) + Math.floor(Math.random() * 1000),
        type: pu.type,
        simpleName: vis.simpleName,
        color: vis.primaryColor,
      };
      eng.pickupNotificationTimer = 1.55;
      callbacks.onHudNeedSync();
    }
  }

  if (eng.maze.checkpoint && !eng.maze.checkpoint.activated) {
    const cp = eng.maze.checkpoint;
    if (Math.hypot(cp.x + 0.5 - p.x, cp.y + 0.5 - p.y) < 0.55) {
      cp.activated = true;
      p.checkpointPos = { x: cp.x, y: cp.y };
      audioManager.playPowerUpPickup();
      eng.particles.spawnBurst(cp.x + 0.5, cp.y + 0.5, 18, '#FFD43B', 2.8, 3.8, 0.5);
      eng.statusBanner = 'CHECKPOINT ACTIVATED';
      eng.statusBannerTimer = 2.5;
      callbacks.onHudNeedSync();
    }
  }

  // 6. Update & Check Portals
  for (const portal of eng.maze.portals) {
    if (!portal.active) continue;
    if (portal.temporary) {
      portal.remainingTime -= dt;
      if (portal.remainingTime <= 0) {
        portal.active = false;
        continue;
      }
    }
    if (portal.cooldown > 0) {
      portal.cooldown = Math.max(0, portal.cooldown - dt);
      continue;
    }

    const dEntry = Math.hypot(portal.entry.x + 0.5 - p.x, portal.entry.y + 0.5 - p.y);
    const dExit = Math.hypot(portal.exit.x + 0.5 - p.x, portal.exit.y + 0.5 - p.y);

    if (dEntry < 0.44) {
      p.x = portal.exit.x + 0.5;
      p.y = portal.exit.y + 0.5;
      portal.cooldown = 1.8;
      audioManager.playPortalWarp(portal.category === 'golden');
      eng.particles.spawnBurst(p.x, p.y, 22, '#FFD43B', 3.5, 4, 0.55);
      eng.statusBanner =
        portal.category === 'golden'
          ? 'GOLDEN PORTAL WARP — ADVANCED TOWARD EXIT!'
          : 'PORTAL TELEPORTATION COMPLETE';
      eng.statusBannerTimer = 2.5;
      callbacks.onHudNeedSync();
    } else if (dExit < 0.44 && portal.category === 'normal') {
      p.x = portal.entry.x + 0.5;
      p.y = portal.entry.y + 0.5;
      portal.cooldown = 1.8;
      audioManager.playPortalWarp(false);
      eng.particles.spawnBurst(p.x, p.y, 18, '#38BDF8', 3.2, 3.8, 0.5);
    }
  }

  // 7. Update & Check Environmental Hazards
  for (const h of eng.maze.hazards) {
    if (h.nightOnly && !eng.isNight) {
      h.state = 'idle';
      continue;
    }

    if (h.type === 'collapsing_tile') {
      const onTile = Math.hypot(h.x + 0.5 - p.x, h.y + 0.5 - p.y) < 0.48;
      if (h.state === 'idle' && onTile) {
        h.state = 'windup';
        h.steppedTimer = 0.65;
      } else if (h.state === 'windup') {
        h.steppedTimer -= dt;
        if (h.steppedTimer <= 0) {
          h.state = 'active';
          h.steppedTimer = 3.0;
        }
      } else if (h.state === 'active') {
        h.steppedTimer -= dt;
        if (h.steppedTimer <= 0) {
          h.state = 'idle';
        }
      }
    } else {
      h.timer = (h.timer + dt) % h.cyclePeriod;
      const norm = h.timer / h.cyclePeriod;
      if (norm < 0.55) {
        h.state = 'idle';
      } else if (norm < 0.72) {
        h.state = 'windup';
      } else {
        h.state = 'active';
      }
    }

    if (
      h.state === 'active' &&
      Math.hypot(h.x + 0.5 - p.x, h.y + 0.5 - p.y) < 0.45 &&
      p.invulnerableTimer <= 0
    ) {
      applyDamageToPlayer(eng, callbacks);
      if (eng.player.hp <= 0) return;
    }
  }

  // 8. Update Enemies & Check Player Collision
  for (const enemy of eng.maze.enemies) {
    updateEnemyAI(
      enemy,
      dt,
      eng.maze.grid,
      p,
      eng.decoys,
      eng.isNight,
      eng.unlockedDoors,
      () => {
        audioManager.playEnemyAlert();
      }
    );

    const hitRadius = enemy.type === 'boss' ? 0.58 : 0.46;
    if (
      enemy.state !== 'frozen' &&
      Math.hypot(enemy.x - p.x, enemy.y - p.y) < hitRadius &&
      p.invulnerableTimer <= 0
    ) {
      applyDamageToPlayer(eng, callbacks);
      if (eng.player.hp <= 0) return;
    }
  }

  // 9. Update Particles
  eng.particles.update(dt);

  // 10. Check Level Exit Condition
  const distToExit = Math.hypot(eng.maze.exit.x + 0.5 - p.x, eng.maze.exit.y + 0.5 - p.y);
  const allDoorsUnlocked = eng.maze.doors.every((d) => d.unlocked);
  if (distToExit < 0.52 && allDoorsUnlocked) {
    eng.particles.spawnBurst(p.x, p.y, 28, '#FFD43B', 4.0, 4.5, 0.7);
    callbacks.onTriggerVictory(eng.currentLevel === 100);
  }
}

function applyDamageToPlayer(
  eng: EngineMutableState,
  callbacks: {
    onHudNeedSync: () => void;
    onTriggerGameOver: () => void;
  }
): void {
  const p = eng.player;
  eng.hitstopTimer = 0.055; // 55ms heavy impact hitstop
  eng.cameraTrauma = 1.0;
  p.scaleX = 1.3;
  p.scaleY = 0.72;

  if (p.shieldActive) {
    p.shieldActive = false;
    p.invulnerableTimer = 1.6;
    audioManager.playPlayerHurt(true);
    eng.particles.spawnBurst(p.x, p.y, 20, '#FFD43B', 3.5, 4, 0.5);
    eng.statusBanner = 'PROTECTIVE SHIELD ABSORBED IMPACT!';
    eng.statusBannerTimer = 2.5;
    callbacks.onHudNeedSync();
    return;
  }

  p.hp = Math.max(0, p.hp - 1);
  p.invulnerableTimer = 1.8;
  eng.damageTakenThisRun++;
  audioManager.playPlayerHurt(false);
  eng.particles.spawnBurst(p.x, p.y, 24, '#E52B2B', 3.8, 4.2, 0.55);
  callbacks.onHudNeedSync();

  if (p.hp <= 0) {
    callbacks.onTriggerGameOver();
  }
}

function canPlayerOccupy(
  grid: GeneratedMaze['grid'],
  x: number,
  y: number,
  radius: number,
  isNight: boolean,
  unlockedDoors: Set<string>
): boolean {
  const checkOffsets = [
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ];
  for (const [ox, oy] of checkOffsets) {
    const gx = Math.floor(x + ox);
    const gy = Math.floor(y + oy);
    if (gy < 0 || gy >= grid.length || gx < 0 || gx >= grid[0].length) {
      return false;
    }
    if (!isTileWalkable(grid[gy][gx], isNight, unlockedDoors, gx, gy, false)) {
      return false;
    }
  }
  return true;
}
