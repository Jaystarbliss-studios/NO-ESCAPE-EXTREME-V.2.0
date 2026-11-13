import React from 'react';

interface ModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<ModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#171717]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="How to Play"
    >
      <div className="w-full max-w-2xl bg-[#252525] border border-[#FFF7E6]/15 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#171717] border-b border-[#FFF7E6]/10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider uppercase text-[#FFF7E6]">
              SURVIVAL GUIDE · <span className="text-[#FFD43B]">HOW TO PLAY</span>
            </h2>
            <p className="text-[10px] text-[#999999]">
              Master the labyrinth rules before darkness falls.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Got It
          </button>
        </div>

        <div className="p-3.5 sm:p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1 p-3 bg-[#1A1A1A] rounded border border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold text-[#FFD43B] uppercase">
              01. Controls & Hotkeys
            </h3>
            <p className="text-[11px] text-[#FFF7E6]/90 leading-relaxed">
              Move with <strong>WASD / Arrows</strong> (or the compact mobile joystick/D-pad). Hold{' '}
              <strong>Shift</strong> to sprint. Activate collected power-ups via{' '}
              <strong>Space</strong>, <strong>E</strong>, number keys <strong>1–6</strong>, or by
              tapping the bottom dock.
            </p>
          </div>

          <div className="space-y-1 p-3 bg-[#1A1A1A] rounded border border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold text-[#E52B2B] uppercase">
              02. 10s Day & 25s Night Cycle
            </h3>
            <p className="text-[11px] text-[#FFF7E6]/90 leading-relaxed">
              Levels start randomly in <strong>Daylight (10s)</strong> or{' '}
              <strong>Nightfall (25s)</strong> and alternate continuously. At night, vision narrows
              to your torch radius, Shadows accelerate, and Shifting Walls toggle.
            </p>
          </div>

          <div className="space-y-1 p-3 bg-[#1A1A1A] rounded border border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold text-[#FFD43B] uppercase">
              03. Line-of-Sight Scanning
            </h3>
            <p className="text-[11px] text-[#FFF7E6]/90 leading-relaxed">
              Enemy scanning beams stop at solid walls—hide behind blocks so their light cannot
              touch you. Watch out for <strong>Wanderers</strong>, <strong>Hunters</strong>,{' '}
              <strong>Shadows</strong>, and <strong>Guardians</strong>.
            </p>
          </div>

          <div className="space-y-1 p-3 bg-[#1A1A1A] rounded border border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold text-[#FFD43B] uppercase">
              04. Power-Ups & Night Scanner
            </h3>
            <p className="text-[11px] text-[#FFF7E6]/90 leading-relaxed">
              Check the bottom bar for your collected power-ups: <strong>[1] Shield</strong>,{' '}
              <strong>[2] Speed</strong>, <strong>[3] Freeze</strong>,{' '}
              <strong>[4] Scanner</strong> (works <em>only</em> in Night Mode to reveal the dark
              maze), <strong>[5] Decoy</strong>, and <strong>[6] NightVis</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreditsModal: React.FC<ModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#171717]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Credits"
    >
      <div className="w-full max-w-md bg-[#252525] border border-[#FFF7E6]/15 rounded-lg shadow-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#FFF7E6]/10 pb-2.5">
          <h2 className="font-display text-lg font-bold tracking-wider uppercase text-[#FFF7E6]">
            NO ESCAPE · <span className="text-[#FFD43B]">CREDITS</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] text-[10px] font-bold uppercase rounded cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 text-[11px] text-[#FFF7E6]/90 leading-relaxed">
          <p className="text-xs font-semibold text-[#FFD43B]">
            NO ESCAPE — SURVIVE. EXPLORE. ESCAPE.
          </p>
          <p>
            A 100-Level 2.5D Procedural Maze Survival Adventure featuring wall-occluded raycast
            lighting, dynamic Day/Night survival cycles, and A* tactical pathfinding.
          </p>
          <div className="pt-1 text-[10px] text-[#999999] font-mono-tabular">
            10 Chapters · 100 Validated Levels · 4 Enemy Archetypes · 10 Boss Encounters
          </div>
        </div>
      </div>
    </div>
  );
};

