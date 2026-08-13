import React from 'react';
import { Settings, Headphones, Mic, ShieldCheck, History } from 'lucide-react';
import { AudioDevice } from '../types';

interface HeaderProps {
  isListening: boolean;
  activeDevice: AudioDevice | null;
  historyCount: number;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isListening,
  activeDevice,
  historyCount,
  onOpenSettings,
  onOpenHistory,
}) => {
  const isBluetooth = activeDevice?.isBluetooth;

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Title & Pulse Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-emerald-500 pulse-ring' : 'bg-red-500 pulse-ring'}`} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase text-zinc-100 flex items-center gap-2">
              VoxLink <span className="text-zinc-500 font-normal text-xs sm:text-sm">Realtime Interpreter</span>
            </h1>
          </div>
        </div>

        {/* Status Badges & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Language Pair Pill */}
          <div className="hidden sm:inline-flex px-3 py-1 rounded-full border border-zinc-700/80 bg-zinc-900 text-xs font-mono text-zinc-300">
            PL-PL → IT-IT
          </div>

          {/* Active Audio Input Badge */}
          <button
            onClick={onOpenSettings}
            title={activeDevice ? `Input: ${activeDevice.label}` : 'Seleziona microfono'}
            className={`px-3 py-1 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 ${
              isBluetooth
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600'
            }`}
          >
            {isBluetooth ? (
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="truncate max-w-[100px]">
              {isBluetooth ? 'BT-HEADSET' : 'MIC-INTERNAL'}
            </span>
          </button>

          {/* Standby Protection Badge */}
          <div
            title="Protezione Anti-Standby Background Attiva (MediaSession API)"
            className="hidden md:flex items-center justify-center p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400"
          >
            <ShieldCheck className="w-4 h-4" />
          </div>

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
            title="Cronologia Conversazione"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-zinc-950 font-mono font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
            title="Impostazioni"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

