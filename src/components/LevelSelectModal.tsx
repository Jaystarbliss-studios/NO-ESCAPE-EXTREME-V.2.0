import React, { useState } from 'react';
import { CHAPTERS, getChapterForLevel } from '../game/chapters';
import { SavedProgress } from '../game/types';

interface LevelSelectModalProps {
  progress: SavedProgress;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  progress,
  onSelectLevel,
  onClose,
}) => {
  const initialChapter = getChapterForLevel(progress.highestUnlockedLevel).number;
  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(initialChapter);

  const chapter =
    CHAPTERS.find((c) => c.number === selectedChapterNum) || CHAPTERS[0];
  const [startLvl, endLvl] = chapter.levelRange;
  const levels = Array.from({ length: endLvl - startLvl + 1 }, (_, i) => startLvl + i);

  const completedSet = new Set(progress.completedLevels);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#171717]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Level Selection"
    >
      <div className="w-full max-w-3xl bg-[#252525] border border-[#FFF7E6]/15 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#171717] border-b border-[#FFF7E6]/10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider uppercase text-[#FFF7E6]">
              SECTOR SELECT · <span className="text-[#FFD43B]">100 LEVELS</span>
            </h2>
            <p className="text-[10px] text-[#999999] font-mono-tabular">
              Unlocked: {progress.highestUnlockedLevel}/100 · Cleared: {progress.completedLevels.length}/100
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-[#252525] hover:bg-[#E52B2B] text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded border border-[#FFF7E6]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Back
          </button>
        </div>

        {/* 10 Chapter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-[#1C1C1C] border-b border-[#FFF7E6]/10 overflow-x-auto">
          {CHAPTERS.map((chap) => {
            const isActive = chap.number === selectedChapterNum;
            const chapUnlocked = progress.highestUnlockedLevel >= chap.levelRange[0];
            return (
              <button
                key={chap.number}
                type="button"
                onClick={() => setSelectedChapterNum(chap.number)}
                className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-mono-tabular font-bold uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-[#E52B2B] text-[#FFF7E6] border-[#FFD43B]'
                    : chapUnlocked
                    ? 'bg-[#252525] text-[#FFF7E6] border-[#FFF7E6]/15 hover:border-[#FFD43B]/60'
                    : 'bg-[#171717] text-[#999999] border-[#FFF7E6]/5'
                }`}
              >
                CH {chap.number} ({chap.levelRange[0]}–{chap.levelRange[1]})
              </button>
            );
          })}
        </div>

        {/* Selected Chapter Overview & 10-Level Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3">
          <div className="pb-2 border-b border-[#FFF7E6]/10">
            <div className="text-[9px] font-mono-tabular uppercase tracking-widest text-[#FFD43B]">
              CHAPTER {chapter.number} · LEVELS {chapter.levelRange[0]}–{chapter.levelRange[1]}
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#FFF7E6] tracking-wide">
              {chapter.title} — <span className="text-[#999999] font-normal">{chapter.subtitle}</span>
            </h3>
            <p className="text-[11px] text-[#999999] mt-0.5">{chapter.description}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {levels.map((lvl) => {
              const isUnlocked = lvl <= progress.highestUnlockedLevel;
              const isCompleted = completedSet.has(lvl);
              const isBoss = lvl % 10 === 0;
              const bestTime = progress.levelBestTimes[lvl];

              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) onSelectLevel(lvl);
                  }}
                  aria-label={`Level ${lvl}${isBoss ? ' Boss' : ''}${
                    !isUnlocked ? ' Locked' : isCompleted ? ' Completed' : ' Unlocked'
                  }`}
                  className={`relative flex flex-col justify-between p-2.5 rounded border text-left transition-all min-h-[64px] ${
                    !isUnlocked
                      ? 'bg-[#171717]/70 border-[#FFF7E6]/10 text-[#999999]/50 cursor-not-allowed'
                      : isBoss
                      ? 'bg-[#2B1414] hover:bg-[#3A1919] border-[#E52B2B] text-[#FFF7E6] cursor-pointer shadow'
                      : isCompleted
                      ? 'bg-[#1F241D] hover:bg-[#283025] border-[#FFD43B]/60 text-[#FFF7E6] cursor-pointer'
                      : 'bg-[#1A1A1A] hover:bg-[#2E2E2E] border-[#FFD43B] text-[#FFF7E6] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-display text-base sm:text-lg font-extrabold font-mono-tabular leading-none">
                      LV {lvl}
                    </span>
                    {!isUnlocked ? (
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#999999]/50">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                      </svg>
                    ) : isCompleted ? (
                      <span className="text-[9px] font-mono-tabular font-bold text-[#FFD43B]">
                        DONE
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono-tabular font-bold text-[#E52B2B]">
                        PLAY
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono-tabular">
                    {isBoss ? (
                      <span className="text-[#E52B2B] font-bold uppercase">BOSS</span>
                    ) : (
                      <span className="text-[#999999]">SEC {lvl}</span>
                    )}
                    {bestTime !== undefined && (
                      <span className="text-[#FFD43B]">{bestTime}s</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

