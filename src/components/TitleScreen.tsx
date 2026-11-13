import React from 'react';
import { SavedProgress, SubMenuState } from '../game/types';
import { getChapterForLevel } from '../game/chapters';
import {
  formatSpeedrunTime,
  getDailySeedCode,
} from '../game/dailyChallenge';

interface TitleScreenProps {
  progress: SavedProgress;
  todayDateKey: string;
  currentUserUid: string | null;
  currentUserName: string | null;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onStartNewOrSelected: (level: number) => void;
  onContinue: () => void;
  onStartDailyChallenge: () => void;
  onOpenSubMenu: (menu: SubMenuState) => void;
  onSignInWithGoogle: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  todayDateKey,
  currentUserUid,
  currentUserName,
  cloudSyncStatus,
  onStartNewOrSelected,
  onContinue,
  onStartDailyChallenge,
  onOpenSubMenu,
  onSignInWithGoogle,
}) => {
  const continueLevel = progress.highestUnlockedLevel;
  const continueChapter = getChapterForLevel(continueLevel);
  const hasSavedRun =
    progress.highestUnlockedLevel > 1 || progress.completedLevels.length > 0;
  const seedCode = getDailySeedCode(todayDateKey);
  const hasTodayBest =
    progress.dailyBestDate === todayDateKey && progress.dailyBestTimeMs >= 1000;

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 md:p-10 pointer-events-none"
      style={{
        background:
          'linear-gradient(90deg, rgba(23,23,23,0.94) 0%, rgba(23,23,23,0.82) 48%, rgba(23,23,23,0.25) 100%)',
      }}
    >
      {/* Top Status Strip: Player Coin Vault, Cloud Sync & Completion */}
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[9px] sm:text-xs tracking-wider uppercase font-mono-tabular text-[#999999]">
          <span className="text-[#FFD43B] font-bold">10 CHAPTERS</span>
          <span aria-hidden="true">·</span>
          <span className="hidden xs:inline">100 LEVELS</span>
          <span className="hidden xs:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-[#FFF7E6]">
            {progress.completedLevels.length}/100 CLEARED
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {currentUserUid ? (
            <button
              type="button"
              onClick={() => onOpenSubMenu('daily_challenge')}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#1D281E]/90 hover:bg-[#243426] border border-[#22C55E]/45 rounded text-[9px] sm:text-[11px] font-mono-tabular text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span className="truncate max-w-[90px] sm:max-w-[130px] font-bold text-[#22C55E]">
                {currentUserName || 'CLOUD SYNCED'}
              </span>
              <span className="hidden sm:inline text-[#999999]">
                {cloudSyncStatus === 'syncing' ? 'SYNCING' : 'SAVED'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignInWithGoogle}
              className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#252525]/90 hover:bg-[#323232] border border-[#38BDF8]/40 rounded text-[9px] sm:text-[11px] font-mono-tabular font-semibold text-[#38BDF8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              <span>CLOUD SAVE</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenSubMenu('cosmetics')}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#252525]/90 hover:bg-[#303030] border border-[#FFD43B]/40 rounded text-[10px] sm:text-xs font-semibold text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#FFD43B]">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" fill="#171717" />
            </svg>
            <span className="font-mono-tabular text-[#FFD43B] font-bold">
              {progress.coins}
            </span>
            <span>ARMORY</span>
          </button>
        </div>
      </div>

      {/* Main Focal Anchor: Compact Responsive Title Lockup + 50%-Scaled Actions */}
      <div className="w-full max-w-7xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-4 sm:gap-6">
        <div className="lg:col-span-5 flex flex-col items-start space-y-2.5 sm:space-y-3.5 pointer-events-auto">
          {/* Bespoke Inline SVG Title Emblem Lockup */}
          <div className="w-full max-w-[260px] sm:max-w-sm md:max-w-md">
            <svg
              viewBox="0 0 520 155"
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label="NO ESCAPE — Survive. Explore. Escape."
            >
              <path
                d="M4 34 L4 8 L56 8 M464 8 L516 8 L516 34 M4 110 L4 136 L56 136 M464 136 L516 136 L516 110"
                fill="none"
                stroke="#E52B2B"
                strokeWidth="4"
              />
              <rect x="14" y="18" width="10" height="10" fill="#FFD43B" />
              <text
                x="34"
                y="27"
                fill="#FFD43B"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="12"
                fontWeight="700"
                letterSpacing="4"
              >
                PROCEDURAL LABYRINTH SURVIVAL
              </text>

              <text
                x="16"
                y="108"
                fill="#B81717"
                fontFamily="'Barlow Condensed', sans-serif"
                fontSize="94"
                fontWeight="800"
                letterSpacing="5"
              >
                NO ESCAPE
              </text>

              <text
                x="12"
                y="104"
                fill="#FFF7E6"
                stroke="#171717"
                strokeWidth="3"
                fontFamily="'Barlow Condensed', sans-serif"
                fontSize="94"
                fontWeight="800"
                letterSpacing="5"
              >
                NO <tspan fill="#E52B2B">ESCAPE</tspan>
              </text>

              <rect x="12" y="120" width="380" height="24" fill="#252525" />
              <rect x="12" y="120" width="6" height="24" fill="#FFD43B" />
              <text
                x="28"
                y="136"
                fill="#FFD43B"
                fontFamily="'Barlow Condensed', sans-serif"
                fontSize="16"
                fontWeight="700"
                letterSpacing="6"
              >
                SURVIVE. EXPLORE. ESCAPE.
              </text>
            </svg>
          </div>

          {/* Primary & Secondary Action Stack (Scaled down ~50% for mobile & desktop clarity) */}
          <div className="w-full max-w-[270px] sm:max-w-xs flex flex-col gap-1.5 sm:gap-2">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                type="button"
                data-start="true"
                onClick={() => onStartNewOrSelected(progress.lastSelectedLevel || 1)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] font-display text-base sm:text-lg font-bold tracking-wider uppercase rounded shadow border border-[#FFD43B]/40 transition-transform active:scale-98 cursor-pointer whitespace-nowrap shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
                <span>PLAY</span>
              </button>

              <button
                type="button"
                onClick={onContinue}
                className={`flex flex-col items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hasSavedRun
                    ? 'bg-[#252525] hover:bg-[#303030] border-[#FFD43B] text-[#FFD43B]'
                    : 'bg-[#252525]/80 hover:bg-[#303030] border-[#999999]/40 text-[#FFF7E6]'
                }`}
              >
                <span className="font-display text-sm sm:text-base font-bold tracking-wider uppercase leading-none">
                  CONTINUE
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono-tabular text-[#999999] mt-0.5">
                  LV {continueLevel} · CH {continueChapter.number}
                </span>
              </button>
            </div>

            {/* DAILY CHALLENGE & GLOBAL LEADERBOARD ROW */}
            <div className="grid grid-cols-12 gap-1.5">
              <button
                type="button"
                onClick={onStartDailyChallenge}
                className="col-span-8 flex items-center justify-between px-2.5 py-1.5 bg-[#2B2210]/95 hover:bg-[#382C14] border border-[#FFD43B]/70 rounded text-left transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FFD43B] leading-none">
                    DAILY CHALLENGE
                  </div>
                  <div className="text-[8px] font-mono-tabular text-[#FFF7E6]/80 truncate mt-0.5">
                    {hasTodayBest
                      ? `BEST: ${formatSpeedrunTime(progress.dailyBestTimeMs)}`
                      : `${todayDateKey} · ${seedCode}`}
                  </div>
                </div>
                <span className="px-1.5 py-0.5 bg-[#FFD43B] text-[#171717] font-mono-tabular font-bold text-[8px] uppercase rounded shrink-0">
                  RUN
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSubMenu('daily_challenge')}
                className="col-span-4 flex flex-col items-center justify-center px-1.5 py-1 bg-[#252525]/95 hover:bg-[#323232] border border-[#FFD43B]/40 rounded text-[#FFD43B] transition-colors cursor-pointer"
              >
                <span className="font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider leading-none">
                  RANKS
                </span>
                <span className="text-[7.5px] font-mono-tabular text-[#999999] mt-0.5">
                  GLOBAL
                </span>
              </button>
            </div>

            {/* Secondary Navigation Grid (50%-scaled compact buttons) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onOpenSubMenu('levels')}
                className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-[#252525]/90 hover:bg-[#323232] border border-[#FFF7E6]/15 hover:border-[#FFD43B] rounded text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Levels
              </button>
              <button
                type="button"
                onClick={() => onOpenSubMenu('how_to_play')}
                className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-[#252525]/90 hover:bg-[#323232] border border-[#FFF7E6]/15 hover:border-[#FFD43B] rounded text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Guide
              </button>
              <button
                type="button"
                onClick={() => onOpenSubMenu('settings')}
                className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-[#252525]/90 hover:bg-[#323232] border border-[#FFF7E6]/15 hover:border-[#FFD43B] rounded text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => onOpenSubMenu('credits')}
                className="px-1.5 py-1 sm:px-2 sm:py-1.5 bg-[#252525]/90 hover:bg-[#323232] border border-[#FFF7E6]/15 hover:border-[#FFD43B] rounded text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#FFF7E6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Credits
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Compact Control Hint Line */}
      <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[9px] sm:text-[11px] text-[#999999] font-mono-tabular">
        <div className="truncate">
          WASD / Touch Move · Shift Sprint · Space / E / 1–6 Power-Ups · Esc Pause
        </div>
        <div className="text-[#FFD43B]">
          ENTER / TAP PLAY · SECTOR {progress.lastSelectedLevel || 1}
        </div>
      </div>
    </div>
  );
};
