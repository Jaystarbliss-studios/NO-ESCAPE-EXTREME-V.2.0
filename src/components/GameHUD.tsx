import React, { useRef, useState } from 'react';
import { POWERUP_VISUAL_CONFIG } from '../game/renderer';
import { ActiveAbilityState, GameSettings, PowerUpType } from '../game/types';

export interface PickupNotification {
  id: number;
  type: PowerUpType;
  simpleName: string;
  color: string;
}

export interface HudSnapshot {
  level: number;
  chapterNumber: number;
  chapterTitle: string;
  objectiveText: string;
  isBossLevel: boolean;
  bossTitle?: string;
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  coins: number;
  keysCollected: number;
  keysRequired: number;
  switchesActivated: number;
  switchesRequired: number;
  isNight: boolean;
  phaseRemainingSec: number;
  phaseProgressPct: number;
  inventoryCounts: Record<PowerUpType, number>;
  selectedSlot: number;
  activeAbilities: ActiveAbilityState[];
  checkpointReached: boolean;
  statusBanner: string | null;
  pickupNotification: PickupNotification | null;
  isDailyChallenge?: boolean;
  dailyDateKey?: string;
  elapsedRunTimeSec?: number;
}

interface GameHUDProps {
  hud: HudSnapshot;
  settings: GameSettings;
  onActivatePowerUp: (type: PowerUpType) => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTouchVectorChange: (vx: number, vy: number, sprinting: boolean) => void;
  onUsePrimaryAbility: () => void;
}

export const POWERUP_SLOTS: {
  type: PowerUpType;
  keyHint: string;
  shortName: string;
  roleHint: string;
  useHint: string;
  color: string;
}[] = [
  {
    type: 'shield',
    keyHint: '1',
    shortName: 'Shield',
    roleHint: 'Block 1 Hit',
    useHint: 'Key [1] / Tap',
    color: POWERUP_VISUAL_CONFIG.shield.primaryColor,
  },
  {
    type: 'speed',
    keyHint: '2',
    shortName: 'Speed',
    roleHint: '+45% Sprint',
    useHint: 'Key [2] / Tap',
    color: POWERUP_VISUAL_CONFIG.speed.primaryColor,
  },
  {
    type: 'freeze',
    keyHint: '3',
    shortName: 'Freeze',
    roleHint: 'Stun Nearby',
    useHint: 'Key [3] / Tap',
    color: POWERUP_VISUAL_CONFIG.freeze.primaryColor,
  },
  {
    type: 'scanner',
    keyHint: '4',
    shortName: 'Scanner',
    roleHint: 'Night Map',
    useHint: 'Night Only [4]',
    color: POWERUP_VISUAL_CONFIG.scanner.primaryColor,
  },
  {
    type: 'decoy',
    keyHint: '5',
    shortName: 'Decoy',
    roleHint: 'Lure Foes',
    useHint: 'Key [5] / Tap',
    color: POWERUP_VISUAL_CONFIG.decoy.primaryColor,
  },
  {
    type: 'night_vision',
    keyHint: '6',
    shortName: 'NightVis',
    roleHint: '2x Torch',
    useHint: 'Key [6] / Tap',
    color: POWERUP_VISUAL_CONFIG.night_vision.primaryColor,
  },
];

function PowerUpSlotIcon({ type, color }: { type: PowerUpType; color: string }) {
  if (type === 'shield') {
    return (
      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" fill={color}>
        <path d="M12 2L4 5.5v6.1c0 5.1 3.4 9.8 8 11.4 4.6-1.6 8-6.3 8-11.4V5.5L12 2z" />
      </svg>
    );
  }
  if (type === 'speed') {
    return (
      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" fill={color}>
        <path d="M13 2L4 14h7l-2 8 10-12h-7l1-8z" />
      </svg>
    );
  }
  if (type === 'freeze') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
      </svg>
    );
  }
  if (type === 'scanner') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill={color} />
        <path d="M12 12l6.5-6.5" />
      </svg>
    );
  }
  if (type === 'decoy') {
    return (
      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" fill={color}>
        <circle cx="12" cy="7.5" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
      stroke={color}
      strokeWidth="2.2"
      fill="none"
    >
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3.5" fill={color} />
    </svg>
  );
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  settings,
  onActivatePowerUp,
  onToggleMute,
  onPause,
  onRestart,
  onTouchVectorChange,
  onUsePrimaryAbility,
}) => {
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchSprint, setTouchSprint] = useState(false);

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const maxR = rect.width * 0.36;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 3 ? Math.cos(angle) * (clampedDist / maxR) : 0;
    const ny = dist > 3 ? Math.sin(angle) * (clampedDist / maxR) : 0;

    setKnobOffset({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist,
    });
    onTouchVectorChange(nx, ny, touchSprint);
  };

  const handleJoystickEnd = () => {
    setKnobOffset({ x: 0, y: 0 });
    onTouchVectorChange(0, 0, touchSprint);
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-1.5 sm:p-2.5 select-none">
      {hud.hp === 1 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 45px rgba(229, 43, 43, 0.42)',
          }}
        />
      )}

      {/* TOP BAR + NON-INTRUSIVE FLOATING TOAST */}
      <div className="w-full flex flex-col items-center gap-1">
        <div className="w-full flex items-start justify-between gap-1.5">
          {/* TOP LEFT: Compact Level/Daily, Chapter & Objective */}
          <div className="bg-[#171717]/82 border border-[#FFF7E6]/15 rounded px-2 py-1 max-w-[165px] sm:max-w-xs shadow">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs sm:text-sm font-extrabold text-[#FFD43B] font-mono-tabular leading-none">
                {hud.isDailyChallenge ? 'DAILY' : `LV ${hud.level}`}
              </span>
              <span className="text-[#999999] text-[9px]" aria-hidden="true">
                ·
              </span>
              <span className="text-[8px] sm:text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#FFF7E6] truncate">
                {hud.isDailyChallenge
                  ? `${(hud.elapsedRunTimeSec ?? 0).toFixed(1)}s`
                  : `CH ${hud.chapterNumber}: ${hud.chapterTitle}`}
              </span>
            </div>

            <div className="hidden sm:block mt-0.5 text-[9px] text-[#FFF7E6]/80 truncate">
              {hud.objectiveText}
            </div>

            {(hud.keysRequired > 0 || hud.switchesRequired > 0 || hud.checkpointReached) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[8px] sm:text-[9px] font-mono-tabular font-bold">
                {hud.keysRequired > 0 && (
                  <span
                    className={
                      hud.keysCollected >= hud.keysRequired
                        ? 'text-[#FFD43B]'
                        : 'text-[#E52B2B]'
                    }
                  >
                    KEYS {hud.keysCollected}/{hud.keysRequired}
                  </span>
                )}
                {hud.switchesRequired > 0 && (
                  <span
                    className={
                      hud.switchesActivated >= hud.switchesRequired
                        ? 'text-[#FFD43B]'
                        : 'text-[#E52B2B]'
                    }
                  >
                    SW {hud.switchesActivated}/{hud.switchesRequired}
                  </span>
                )}
                {hud.checkpointReached && (
                  <span className="text-[#FFD43B]">SAVED</span>
                )}
              </div>
            )}
          </div>

          {/* TOP CENTRE: Compact Day (10s) / Night (25s) Cycle & Countdown */}
          <div className="bg-[#171717]/82 border border-[#FFF7E6]/15 rounded px-2 py-1 flex flex-col items-center min-w-[88px] sm:min-w-[122px] shadow">
            <div className="flex items-center justify-between w-full gap-1.5">
              <div className="flex items-center gap-1">
                {hud.isNight ? (
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#E52B2B]">
                    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#FFD43B]">
                    <circle cx="12" cy="12" r="5" />
                    <path
                      d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
                      stroke="#FFD43B"
                      strokeWidth="2"
                    />
                  </svg>
                )}
                <span
                  className={`text-[8px] sm:text-[10px] font-mono-tabular font-bold uppercase tracking-wider ${
                    hud.isNight ? 'text-[#E52B2B]' : 'text-[#FFD43B]'
                  }`}
                >
                  {hud.isNight ? 'NIGHT' : 'DAY'}
                </span>
              </div>

              <span className="font-display text-xs sm:text-sm font-extrabold font-mono-tabular text-[#FFF7E6] leading-none">
                {Math.ceil(hud.phaseRemainingSec)}s
              </span>
            </div>

            <div className="w-full h-1 bg-[#252525] rounded-full overflow-hidden mt-1">
              <div
                className="h-full transition-transform duration-150 origin-left"
                style={{
                  backgroundColor: hud.isNight ? '#E52B2B' : '#FFD43B',
                  transform: `scaleX(${Math.max(0, Math.min(1, hud.phaseProgressPct / 100))})`,
                }}
              />
            </div>
          </div>

          {/* TOP RIGHT: 50%-Scaled Health, Coins & Utility Controls */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <div className="bg-[#171717]/82 border border-[#FFF7E6]/15 rounded px-1.5 py-1 flex items-center gap-1.5 shadow">
              <div className="flex items-center gap-0.5" aria-label={`Health: ${hud.hp} of ${hud.maxHp}`}>
                {Array.from({ length: hud.maxHp }, (_, idx) => {
                  const filled = idx < hud.hp;
                  return (
                    <svg key={idx} viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5">
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={filled ? '#E52B2B' : '#252525'}
                        stroke={hud.shieldActive && filled ? '#FFD43B' : '#FFF7E6'}
                        strokeWidth="1.8"
                      />
                    </svg>
                  );
                })}
              </div>

              <div className="flex items-center gap-0.5 pl-1 border-l border-[#FFF7E6]/15">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#FFD43B]">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <span className="font-mono-tabular font-bold text-[9px] sm:text-[11px] text-[#FFD43B]">
                  {hud.coins}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                tabIndex={-1}
                aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 bg-[#171717]/82 hover:bg-[#252525] border border-[#FFF7E6]/15 rounded flex items-center justify-center text-[#FFF7E6] cursor-pointer"
              >
                {settings.muted ? (
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#E52B2B]">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[#FFD43B]">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Restart Level"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestart();
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 bg-[#171717]/82 hover:bg-[#252525] border border-[#FFF7E6]/15 rounded flex items-center justify-center text-[#FFF7E6] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current">
                  <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause Game"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 bg-[#E52B2B] hover:bg-[#B81717] border border-[#FFD43B]/40 rounded flex items-center justify-center text-[#FFF7E6] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* TRANSPARENT FLOATING PICKUP NOTIFICATION & COMPACT TOP STATUS PILL (Never blocks center screen) */}
        <div className="flex flex-col items-center gap-1 pointer-events-none h-6">
          {hud.pickupNotification && (
            <div
              key={hud.pickupNotification.id}
              data-testid="powerup-pickup-toast"
              className="animate-float-up-fade bg-[#171717]/40 border px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
              style={{ borderColor: `${hud.pickupNotification.color}88` }}
            >
              <PowerUpSlotIcon
                type={hud.pickupNotification.type}
                color={hud.pickupNotification.color}
              />
              <span
                className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider"
                style={{ color: hud.pickupNotification.color }}
              >
                Collected {hud.pickupNotification.simpleName}
              </span>
            </div>
          )}

          {hud.statusBanner && !hud.pickupNotification && (
            <div className="bg-[#171717]/55 border border-[#FFD43B]/45 px-2.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#FFD43B]">
              {hud.statusBanner}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR: COMPACT MINIMALIST POWER-UP DOCK & TOUCH SPRINT/USE */}
      <div className="w-full flex items-end justify-between gap-1.5">
        <div className="w-12 hidden md:block" />

        {/* MINIMALIST POWER-UP DOCK (Icon + Count badge + Shortcut key) */}
        <div className="mx-auto flex flex-col items-center gap-0.5 pointer-events-auto max-w-full overflow-hidden">
          <div className="bg-[#171717]/85 border border-[#FFF7E6]/15 rounded-lg px-1.5 py-1 flex items-center gap-1.5 shadow-lg overflow-x-auto max-w-full">
            {POWERUP_SLOTS.map((item, idx) => {
              const count = hud.inventoryCounts[item.type] || 0;
              const activeState = hud.activeAbilities.find((a) => a.type === item.type);
              const isAvailable = count > 0;
              const isSelected = hud.selectedSlot === idx;

              return (
                <button
                  key={item.type}
                  type="button"
                  tabIndex={-1}
                  disabled={!isAvailable}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (isAvailable) onActivatePowerUp(item.type);
                  }}
                  aria-label={`${item.shortName} - Shortcut [${item.keyHint}] - Stock: ${count}`}
                  className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all min-w-[38px] sm:min-w-[44px] h-[40px] sm:h-[46px] ${
                    activeState
                      ? 'bg-[#2B2210] border-[#FFD43B] text-[#FFF7E6] scale-105'
                      : isAvailable
                      ? 'bg-[#252525]/90 hover:bg-[#323232] text-[#FFF7E6] cursor-pointer'
                      : 'bg-[#171717]/60 border-[#FFF7E6]/10 text-[#999999]/35 cursor-not-allowed opacity-60'
                  }`}
                  style={{
                    borderColor: activeState
                      ? '#FFD43B'
                      : isSelected && isAvailable
                      ? item.color
                      : isAvailable
                      ? `${item.color}88`
                      : undefined,
                    boxShadow:
                      isSelected && isAvailable ? `0 0 0 1.5px ${item.color}` : undefined,
                  }}
                >
                  <div className="absolute top-0.5 left-1 text-[7px] sm:text-[8px] font-mono-tabular font-bold text-[#FFF7E6]/70 leading-none">
                    {item.keyHint}
                  </div>
                  <div className="absolute top-0.5 right-1 text-[7px] sm:text-[8px] font-mono-tabular font-bold leading-none" style={{ color: count > 0 ? item.color : '#666' }}>
                    x{count}
                  </div>

                  <div className="mt-1 flex items-center justify-center">
                    <PowerUpSlotIcon
                      type={item.type}
                      color={count > 0 || activeState ? item.color : '#555555'}
                    />
                  </div>

                  {activeState && (
                    <div className="absolute bottom-0.5 text-[6px] sm:text-[7px] font-mono-tabular font-bold text-[#FFD43B] leading-none">
                      {activeState.remaining.toFixed(0)}s
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !touchSprint;
              setTouchSprint(next);
            }}
            className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase ${
              touchSprint
                ? 'bg-[#FFD43B] text-[#171717] border-[#FFD43B]'
                : 'bg-[#171717]/65 text-[#FFF7E6] border-[#FFF7E6]/25'
            }`}
          >
            Sprint
          </button>
          <button
            type="button"
            onClick={onUsePrimaryAbility}
            className="px-2.5 py-1 rounded bg-[#E52B2B]/85 text-[#FFF7E6] border border-[#FFD43B] text-[9px] font-bold uppercase"
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
};


