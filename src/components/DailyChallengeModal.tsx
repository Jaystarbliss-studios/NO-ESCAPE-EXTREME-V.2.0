import React from 'react';
import { COSMETIC_CATALOG } from '../game/chapters';
import {
  formatSpeedrunTime,
  getDailyChallengeConfig,
  getDailyInitialNightState,
  getDailySeedCode,
} from '../game/dailyChallenge';
import { DailyLeaderboardRecord, SavedProgress } from '../game/types';

interface DailyChallengeModalProps {
  dateKey: string;
  progress: SavedProgress;
  leaderboard: DailyLeaderboardRecord[];
  currentUserUid: string | null;
  currentUserName: string | null;
  isSigningIn: boolean;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onStartDailyChallenge: () => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  dateKey,
  progress,
  leaderboard,
  currentUserUid,
  currentUserName,
  isSigningIn,
  cloudSyncStatus,
  onStartDailyChallenge,
  onSignInWithGoogle,
  onSignOut,
  onClose,
}) => {
  const dailyCfg = getDailyChallengeConfig(dateKey);
  const seedCode = getDailySeedCode(dateKey);
  const startsAtNight = getDailyInitialNightState(dateKey);

  const hasTodayPersonalBest =
    progress.dailyBestDate === dateKey && progress.dailyBestTimeMs >= 1000;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-[#171717]/90 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Challenge & Global Leaderboard"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#252525] border border-[#FFD43B]/35 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1B1B1B] border-b border-[#FFF7E6]/10">
          <div>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-widest text-[#FFD43B]">
              <span>GLOBAL SEEDED GAUNTLET</span>
              <span>·</span>
              <span>{dateKey} (UTC)</span>
              <span>·</span>
              <span className="text-[#38BDF8] font-bold">{seedCode}</span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold uppercase tracking-wider text-[#FFF7E6] leading-tight">
              DAILY CHALLENGE & LEADERBOARD
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Challenge Modal"
            className="px-2.5 py-1 bg-[#252525] hover:bg-[#333333] border border-[#FFF7E6]/20 rounded text-[10px] font-bold uppercase tracking-wider text-[#FFF7E6] cursor-pointer shrink-0"
          >
            ESC / Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3">
          {/* Today's Seeded Sector Briefing + Launch CTA */}
          <div className="p-3 bg-[#171717] border border-[#FFD43B]/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-[#FFD43B]/15 border border-[#FFD43B]/40 rounded text-[9px] font-mono-tabular font-bold text-[#FFD43B]">
                  {dailyCfg.chapterTitle}
                </span>
                <span className="px-1.5 py-0.5 bg-[#252525] border border-[#FFF7E6]/15 rounded text-[9px] font-mono-tabular text-[#FFF7E6]">
                  {dailyCfg.width}×{dailyCfg.height} GRID
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tabular font-bold border ${
                    startsAtNight
                      ? 'bg-[#E52B2B]/15 border-[#E52B2B]/40 text-[#E52B2B]'
                      : 'bg-[#FFD43B]/15 border-[#FFD43B]/40 text-[#FFD43B]'
                  }`}
                >
                  {startsAtNight ? 'NIGHTFALL START' : 'DAYLIGHT START'}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-[#FFF7E6]/85">
                Every player worldwide navigates this exact seeded labyrinth today. Retry as many
                times as you want to master the route and climb the global speedrun standings.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px] font-mono-tabular text-[#999999]">
                <span>
                  KEYS REQUIRED: <strong className="text-[#FFF7E6]">{dailyCfg.keyCount}</strong>
                </span>
                <span>·</span>
                <span>
                  YOUR BEST TODAY:{' '}
                  <strong className="text-[#FFD43B]">
                    {hasTodayPersonalBest
                      ? formatSpeedrunTime(progress.dailyBestTimeMs)
                      : 'NOT SET'}
                  </strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onStartDailyChallenge}
              className="px-4 py-2 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] font-display text-sm sm:text-base font-bold uppercase tracking-wider rounded border border-[#FFD43B]/50 shadow cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <polygon points="6,4 20,12 6,20" />
              </svg>
              <span>{hasTodayPersonalBest ? 'IMPROVE TIME' : 'PLAY DAILY RUN'}</span>
            </button>
          </div>

          {/* Firebase Cloud Sync & Identity Bar */}
          <div className="px-3 py-2 bg-[#1D1D1D] border border-[#FFF7E6]/12 rounded flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  currentUserUid ? 'bg-[#22C55E]' : 'bg-[#FFD43B]'
                }`}
              />
              <div className="text-[10px] sm:text-xs text-[#FFF7E6] truncate">
                {currentUserUid ? (
                  <>
                    Signed in as <strong className="text-[#FFD43B]">{currentUserName}</strong> ·{' '}
                    <span className="text-[#22C55E] font-mono-tabular">
                      {cloudSyncStatus === 'syncing'
                        ? 'Syncing Cloud Save...'
                        : 'Cloud Progress & Global Rank Active'}
                    </span>
                  </>
                ) : (
                  <span className="text-[#FFF7E6]/80">
                    Sign in with Google to save campaign progress to Firebase & publish your Daily
                    time globally.
                  </span>
                )}
              </div>
            </div>

            {currentUserUid ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-2 py-1 bg-[#252525] hover:bg-[#333333] border border-[#FFF7E6]/20 rounded text-[9px] font-mono-tabular uppercase text-[#999999] hover:text-[#FFF7E6] cursor-pointer shrink-0"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onSignInWithGoogle}
                className="px-2.5 py-1 bg-[#FFD43B] hover:bg-[#FFB800] text-[#171717] font-mono-tabular font-bold text-[10px] uppercase tracking-wider rounded cursor-pointer shrink-0"
              >
                {isSigningIn ? 'Connecting...' : 'Sign In with Google'}
              </button>
            )}
          </div>

          {/* Global Leaderboard Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-wider text-[#999999] px-1">
              <span>GLOBAL STANDINGS · {dateKey}</span>
              <span>FASTEST COMPLETION TIME</span>
            </div>

            <div className="border border-[#FFF7E6]/12 rounded overflow-hidden bg-[#171717]">
              <div className="grid grid-cols-12 gap-1 px-2.5 py-1.5 bg-[#1F1F1F] border-b border-[#FFF7E6]/10 text-[9px] font-mono-tabular uppercase text-[#999999]">
                <div className="col-span-2">RANK</div>
                <div className="col-span-5">SURVIVOR</div>
                <div className="col-span-2 text-center">HITS</div>
                <div className="col-span-3 text-right">CLEAR TIME</div>
              </div>

              <div className="divide-y divide-[#FFF7E6]/8 max-h-56 overflow-y-auto">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isYou =
                    (currentUserUid && entry.uid === currentUserUid) || entry.uid === 'local_you';
                  const skin =
                    COSMETIC_CATALOG.find((c) => c.id === entry.skinId) || COSMETIC_CATALOG[0];

                  return (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-12 gap-1 items-center px-2.5 py-1.5 text-xs font-mono-tabular ${
                        isYou ? 'bg-[#FFD43B]/12' : ''
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-1 font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${
                            rank === 1
                              ? 'bg-[#FFD43B] text-[#171717]'
                              : rank === 2
                              ? 'bg-[#E2E8F0] text-[#171717]'
                              : rank === 3
                              ? 'bg-[#F59E0B] text-[#171717]'
                              : 'bg-[#252525] text-[#999999]'
                          }`}
                        >
                          #{rank}
                        </span>
                      </div>

                      <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-[#171717]"
                          style={{ backgroundColor: skin.primaryColor }}
                        />
                        <span
                          className={`truncate font-sans text-[11px] sm:text-xs ${
                            isYou ? 'font-bold text-[#FFD43B]' : 'text-[#FFF7E6]'
                          }`}
                        >
                          {entry.displayName}
                        </span>
                        {isYou && (
                          <span className="px-1 py-0.2 bg-[#FFD43B]/20 border border-[#FFD43B]/50 rounded text-[8px] text-[#FFD43B] uppercase shrink-0">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center text-[10px] text-[#999999]">
                        {entry.damageTaken === 0 ? (
                          <span className="text-[#22C55E] font-bold">FLAWLESS</span>
                        ) : (
                          <span>{entry.damageTaken} hit</span>
                        )}
                      </div>

                      <div className="col-span-3 text-right font-bold text-[#FFD43B] text-[11px] sm:text-xs">
                        {formatSpeedrunTime(entry.clearTimeMs)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
