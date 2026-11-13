import React, { useState } from 'react';
import { GameSettings } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (updated: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleToggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#171717]/92 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings"
    >
      <div className="w-full max-w-xl bg-[#252525] border border-[#FFF7E6]/15 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#171717] border-b border-[#FFF7E6]/10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider uppercase text-[#FFF7E6]">
              SETTINGS & <span className="text-[#FFD43B]">CONTROLS</span>
            </h2>
            <p className="text-[10px] text-[#999999]">
              Audio, 10s/25s Day-Night cycle, and mobile touch controls.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-[#E52B2B] hover:bg-[#B81717] text-[#FFF7E6] text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Save & Close
          </button>
        </div>

        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 text-xs">
          {/* Audio Section */}
          <div className="space-y-2 pb-3 border-b border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FFD43B]">
              01. Audio & Atmosphere
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Music & Ambience</span>
                  <span className="text-[#FFD43B]">{settings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.musicVolume}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })
                  }
                  className="accent-[#E52B2B] cursor-pointer h-1.5"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Sound Effects</span>
                  <span className="text-[#FFD43B]">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
                  }
                  className="accent-[#E52B2B] cursor-pointer h-1.5"
                />
              </label>
            </div>
          </div>

          {/* Day & Night Environmental Cycle Section */}
          <div className="space-y-2 pb-3 border-b border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FFD43B]">
              02. Day & Night Cycle Timing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Daylight Duration</span>
                  <span className="text-[#FFD43B]">{settings.dayDuration}s</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={35}
                  step={1}
                  value={settings.dayDuration}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, dayDuration: Number(e.target.value) })
                  }
                  className="accent-[#FFD43B] cursor-pointer h-1.5"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Nightfall Duration</span>
                  <span className="text-[#E52B2B]">{settings.nightDuration}s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={1}
                  value={settings.nightDuration}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, nightDuration: Number(e.target.value) })
                  }
                  className="accent-[#E52B2B] cursor-pointer h-1.5"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Night Torch Sight</span>
                  <span className="text-[#FFD43B]">{settings.nightVisionRadius.toFixed(1)} tiles</span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={5.5}
                  step={0.2}
                  value={settings.nightVisionRadius}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, nightVisionRadius: Number(e.target.value) })
                  }
                  className="accent-[#FFD43B] cursor-pointer h-1.5"
                />
              </label>
            </div>
          </div>

          {/* Controls & Accessibility */}
          <div className="space-y-2 pb-3 border-b border-[#FFF7E6]/10">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FFD43B]">
              03. Controls & Mobile Layout
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono-tabular">
                  <span>Movement Sensitivity</span>
                  <span className="text-[#FFD43B]">{Math.round(settings.controlSensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.4}
                  step={0.1}
                  value={settings.controlSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      controlSensitivity: Number(e.target.value),
                    })
                  }
                  className="accent-[#E52B2B] cursor-pointer h-1.5"
                />
              </label>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono-tabular">Phone Touch Controls</span>
                <div className="flex items-center gap-1.5">
                  {(['joystick', 'dpad', 'off'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, touchLayout: mode })}
                      className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        settings.touchLayout === mode
                          ? 'bg-[#E52B2B] text-[#FFF7E6]'
                          : 'bg-[#171717] text-[#999999] hover:text-[#FFF7E6]'
                      }`}
                    >
                      {mode === 'joystick' ? 'Joystick' : mode === 'dpad' ? 'D-Pad' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, screenShake: !settings.screenShake })
                }
                className={`px-2 py-1 rounded border text-[9px] font-bold uppercase cursor-pointer ${
                  settings.screenShake
                    ? 'bg-[#171717] border-[#FFD43B] text-[#FFD43B]'
                    : 'bg-[#171717] border-[#FFF7E6]/10 text-[#999999]'
                }`}
              >
                Shake: {settings.screenShake ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, reducedMotion: !settings.reducedMotion })
                }
                className={`px-2 py-1 rounded border text-[9px] font-bold uppercase cursor-pointer ${
                  settings.reducedMotion
                    ? 'bg-[#171717] border-[#FFD43B] text-[#FFD43B]'
                    : 'bg-[#171717] border-[#FFF7E6]/10 text-[#999999]'
                }`}
              >
                Motion: {settings.reducedMotion ? 'LOW' : 'FULL'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    graphicsQuality: settings.graphicsQuality === 'high' ? 'medium' : 'high',
                  })
                }
                className="px-2 py-1 rounded border border-[#FFF7E6]/15 bg-[#171717] text-[9px] font-bold uppercase text-[#FFF7E6] cursor-pointer"
              >
                GFX: {settings.graphicsQuality.toUpperCase()}
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="px-2 py-1 rounded border border-[#FFF7E6]/15 bg-[#171717] hover:border-[#FFD43B] text-[9px] font-bold uppercase text-[#FFF7E6] cursor-pointer"
              >
                Fullscreen
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset Progress */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="text-[10px] text-[#999999]">
              Reset unlocked levels & coins
            </div>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-2.5 py-1 bg-[#171717] hover:bg-[#B81717] border border-[#E52B2B] text-[#FFF7E6] text-[9px] font-bold uppercase rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="px-2 py-1 bg-[#E52B2B] text-[#FFF7E6] text-[9px] font-bold uppercase rounded cursor-pointer whitespace-nowrap shrink-0"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 bg-[#171717] text-[#999999] text-[9px] font-bold uppercase rounded cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

