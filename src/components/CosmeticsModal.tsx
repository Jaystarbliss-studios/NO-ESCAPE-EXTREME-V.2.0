import React from 'react';
import { COSMETIC_CATALOG } from '../game/chapters';
import { SavedProgress } from '../game/types';

interface CosmeticsModalProps {
  progress: SavedProgress;
  onUnlockOrEquip: (itemId: string) => void;
  onClose: () => void;
}

export const CosmeticsModal: React.FC<CosmeticsModalProps> = ({
  progress,
  onUnlockOrEquip,
  onClose,
}) => {
  const unlockedSet = new Set(progress.unlockedCosmetics);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#171717]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Armory and Cosmetics"
    >
      <div className="w-full max-w-2xl bg-[#252525] border border-[#FFF7E6]/15 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#171717] border-b border-[#FFF7E6]/10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider uppercase text-[#FFF7E6]">
              ARMORY & <span className="text-[#FFD43B]">SKINS</span>
            </h2>
            <p className="text-[10px] text-[#999999] font-mono-tabular">
              Coins: <span className="text-[#FFD43B] font-bold">{progress.coins}</span>
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

        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {COSMETIC_CATALOG.map((item) => {
            const isUnlocked = unlockedSet.has(item.id);
            const isEquipped =
              progress.equippedSkin === item.id || progress.equippedTrail === item.id;
            const canAfford = progress.coins >= item.cost;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded border flex flex-col justify-between gap-2.5 ${
                  isEquipped
                    ? 'bg-[#1D1B14] border-[#FFD43B]'
                    : 'bg-[#1A1A1A] border-[#FFF7E6]/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-mono-tabular uppercase text-[#999999]">
                      {item.category === 'skin' ? 'RIG' : 'TRAIL'}
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#FFF7E6] leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-[#999999] mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>

                  <div
                    className="w-7 h-7 rounded-full shrink-0 border flex items-center justify-center"
                    style={{
                      backgroundColor: item.primaryColor,
                      borderColor: item.secondaryColor,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.secondaryColor }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!isUnlocked && !canAfford}
                  onClick={() => onUnlockOrEquip(item.id)}
                  className={`w-full py-1 px-2 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isEquipped
                      ? 'bg-[#FFD43B] text-[#171717]'
                      : isUnlocked
                      ? 'bg-[#252525] hover:bg-[#323232] text-[#FFF7E6] border border-[#FFD43B]/50'
                      : canAfford
                      ? 'bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6]'
                      : 'bg-[#171717] text-[#999999]/50 cursor-not-allowed border border-[#FFF7E6]/5'
                  }`}
                >
                  {isEquipped
                    ? 'EQUIPPED'
                    : isUnlocked
                    ? 'EQUIP'
                    : `UNLOCK · ${item.cost}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

