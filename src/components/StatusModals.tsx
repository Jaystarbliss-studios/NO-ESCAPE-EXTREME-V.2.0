import React from 'react';
import { GameState, RunSummarySnapshot } from '../game/types';

interface StatusModalsProps {
  gameState: GameState;
  summary: RunSummarySnapshot | null;
  currentLevel: number;
  onResume: () => void;
  onRestartLevel: () => void;
  onRespawnCheckpoint: () => void;
  onNextLevel: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  gameState,
  summary,
  currentLevel,
  onResume,
  onRestartLevel,
  onRespawnCheckpoint,
  onNextLevel,
  onOpenSettings,
  onReturnToTitle,
}) => {
  if (gameState === 'paused') {
    return (
      <div
        className="fixed inset-0 z-30 flex items-center justify-center p-3 bg-[#171717]/88 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
      >
        <div className="w-full max-w-xs bg-[#252525] border border-[#FFF7E6]/15 rounded-lg p-4 shadow-2xl space-y-3.5">
          <div className="border-b border-[#FFF7E6]/10 pb-2.5">
            <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#FFD43B]">
              SECTOR {currentLevel} · PAUSED
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wider text-[#FFF7E6]">
              GAME PAUSED
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-1.5 px-3 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] font-display text-base font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              Resume Escape
            </button>
            <button
              type="button"
              onClick={onRestartLevel}
              className="w-full py-1.5 px-3 bg-[#1A1A1A] hover:bg-[#303030] border border-[#FFF7E6]/15 text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              Restart Level {currentLevel}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full py-1.5 px-3 bg-[#1A1A1A] hover:bg-[#303030] border border-[#FFF7E6]/15 text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-1.5 px-3 bg-[#171717] hover:bg-[#2E1515] border border-[#E52B2B]/40 text-[#999999] hover:text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover' && summary) {
    const isVictory100 = summary.outcome === 'final_victory';
    const isLevelClear = summary.outcome === 'level_complete' || isVictory100;

    return (
      <div
        className="fixed inset-0 z-30 flex items-center justify-center p-3 bg-[#171717]/90 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label={isLevelClear ? 'Level Completed' : 'Game Over'}
      >
        <div className="w-full max-w-sm bg-[#252525] border border-[#FFF7E6]/20 rounded-lg p-4 shadow-2xl space-y-4">
          <div className="border-b border-[#FFF7E6]/10 pb-2.5">
            <div
              className={`text-[10px] font-mono-tabular font-bold uppercase tracking-widest ${
                isLevelClear ? 'text-[#FFD43B]' : 'text-[#E52B2B]'
              }`}
            >
              LEVEL {summary.level} · {summary.chapterTitle}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-[#FFF7E6] mt-0.5">
              {isVictory100
                ? 'ULTIMATE ESCAPE!'
                : isLevelClear
                ? 'SECTOR CLEARED'
                : 'NO ESCAPE — DEFEATED'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-[#171717] rounded border border-[#FFF7E6]/10">
              <div className="text-[8px] font-mono-tabular uppercase text-[#999999]">
                {isLevelClear ? 'TIME' : 'SURVIVED'}
              </div>
              <div className="font-display text-lg font-bold font-mono-tabular text-[#FFF7E6]">
                {Math.round(summary.clearTimeSeconds)}s
              </div>
              {isLevelClear && (
                <div className="text-[8px] font-mono-tabular text-[#FFD43B]">
                  BEST: {Math.round(summary.bestTimeSeconds)}s
                </div>
              )}
            </div>

            <div className="p-2 bg-[#171717] rounded border border-[#FFF7E6]/10">
              <div className="text-[8px] font-mono-tabular uppercase text-[#999999]">
                COINS
              </div>
              <div className="font-display text-lg font-bold font-mono-tabular text-[#FFD43B]">
                +{summary.coinsCollected}
              </div>
              <div className="text-[8px] font-mono-tabular text-[#999999]">
                SECRETS: {summary.secretsFound}
              </div>
            </div>

            <div className="p-2 bg-[#171717] rounded border border-[#FFF7E6]/10">
              <div className="text-[8px] font-mono-tabular uppercase text-[#999999]">
                {isLevelClear ? 'HP LEFT' : 'PROGRESS'}
              </div>
              <div
                className={`font-display text-lg font-bold font-mono-tabular ${
                  isLevelClear ? 'text-[#FFD43B]' : 'text-[#E52B2B]'
                }`}
              >
                {isLevelClear ? `${summary.hpRemaining}/3` : `${summary.distanceProgressPct}%`}
              </div>
              <div className="text-[8px] font-mono-tabular text-[#999999]">
                HITS: {summary.damageTaken}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {isLevelClear && !isVictory100 && (
              <button
                type="button"
                data-start="true"
                onClick={onNextLevel}
                className="w-full py-2 px-3 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] font-display text-base font-bold uppercase tracking-wider rounded border border-[#FFD43B]/40 cursor-pointer"
              >
                Next Sector · Level {Math.min(100, summary.level + 1)}
              </button>
            )}

            {!isLevelClear && summary.canRespawnAtCheckpoint && (
              <button
                type="button"
                data-start="true"
                onClick={onRespawnCheckpoint}
                className="w-full py-2 px-3 bg-[#FFD43B] hover:bg-[#FFB800] text-[#171717] font-display text-base font-bold uppercase tracking-wider rounded cursor-pointer"
              >
                Continue from Checkpoint
              </button>
            )}

            <button
              type="button"
              data-start={isLevelClear && !isVictory100 ? undefined : 'true'}
              onClick={onRestartLevel}
              className={`w-full py-1.5 px-3 rounded font-display text-base font-bold uppercase tracking-wider cursor-pointer ${
                !isLevelClear
                  ? 'bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6]'
                  : 'bg-[#1A1A1A] hover:bg-[#303030] border border-[#FFF7E6]/15 text-[#FFF7E6]'
              }`}
            >
              {isLevelClear ? 'Replay Level' : 'Retry Level'}
            </button>

            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-1.5 px-3 bg-[#171717] hover:bg-[#2E1515] border border-[#FFF7E6]/15 text-[#999999] hover:text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

