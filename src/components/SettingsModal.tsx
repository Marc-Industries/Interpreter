import React, { useEffect, useState } from 'react';
import { X, Headphones, Mic, Sliders, Volume2, RotateCcw, ShieldCheck, RefreshCw, Music, Key, Globe } from 'lucide-react';
import { AudioDevice, AudioSettings, LanguageOption } from '../types';
import { speakTargetText, getAvailableVoices } from '../utils/audioUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  devices: AudioDevice[];
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  onRefreshDevices: () => void;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { name: 'Italiano', code: 'it-IT' },
  { name: 'Inglese', code: 'en-US' },
  { name: 'Spagnolo', code: 'es-ES' },
  { name: 'Francese', code: 'fr-FR' },
  { name: 'Tedesco', code: 'de-DE' },
  { name: 'Polacco', code: 'pl-PL' },
  { name: 'Portoghese', code: 'pt-BR' },
  { name: 'Russo', code: 'ru-RU' },
  { name: 'Cinese', code: 'zh-CN' },
  { name: 'Giapponese', code: 'ja-JP' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  devices,
  onUpdateSettings,
  onRefreshDevices,
}) => {
  const [testSpeechActive, setTestSpeechActive] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available system voices for the target language
  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const v = getAvailableVoices(settings.targetLang?.code || 'it-IT');
        setVoices(v);
      };

      loadVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [isOpen, settings.targetLang?.code]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    setTestSpeechActive(true);
    speakTargetText(
      `Test vocale in ${settings.targetLang?.name || 'Italiano'}.`,
      settings.ttsRate,
      settings.ttsPitch || 0.95,
      settings.targetLang?.code || 'it-IT',
      settings.selectedVoiceURI,
      () => setTestSpeechActive(true),
      () => setTestSpeechActive(false)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0A0A0B]/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card border border-zinc-700/60 bg-zinc-950/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight">Impostazioni Applicazione</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200">
          
          {/* API KEY SECTION */}
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <Key className="w-4 h-4" /> CHIAVE API GEMINI
            </label>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Incolla qui la tua API Key Gemini..."
                value={settings.apiKey}
                onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
              />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                La tua chiave viene salvata solo in locale sul browser. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Ottieni una chiave gratuita qui</a>.
              </p>
            </div>
          </div>

          {/* LANGUAGES SECTION */}
          <div className="space-y-4 pt-3 border-t border-zinc-800">
            <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> LINGUE TRADUZIONE
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-300">Lingua Origine (Parlata):</span>
                <select
                  value={settings.sourceLang?.code || 'pl-PL'}
                  onChange={(e) => {
                    const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                    if (lang) onUpdateSettings({ sourceLang: lang });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 appearance-none"
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-300">Lingua Destinazione:</span>
                <select
                  value={settings.targetLang?.code || 'it-IT'}
                  onChange={(e) => {
                    const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                    if (lang) onUpdateSettings({ targetLang: lang });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 appearance-none"
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SORGENTE MICROFONO */}
          <div className="space-y-2.5 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400" /> SORGENTE MICROFONO
              </label>
              <button
                onClick={onRefreshDevices}
                className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Aggiorna
              </button>
            </div>
            <div className="relative">
              <select
                value={settings.selectedDeviceId}
                onChange={(e) => onUpdateSettings({ selectedDeviceId: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono transition-colors appearance-none pr-10"
              >
                <option value="">Predefinito di Sistema (Smartphone / Auricolari)</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.isBluetooth ? '🎧 ' : '🎙️ '}
                    {d.label} {d.isBluetooth ? '(Bluetooth)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CONFIGURAZIONE VOCALE E TONO */}
          <div className="space-y-4 pt-3 border-t border-zinc-800">
            <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> SCELTA VOCE TTS
            </label>

            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-300">Voce di Sistema / Browser:</span>
              <div className="relative">
                <select
                  value={settings.selectedVoiceURI || ''}
                  onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none pr-8 font-mono"
                >
                  <option value="">Automatica</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      🗣️ {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-emerald-400" /> Tono della Voce (Pitch):
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {(settings.ttsPitch || 0.95).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.3"
                step="0.05"
                value={settings.ttsPitch || 0.95}
                onChange={(e) => onUpdateSettings({ ttsPitch: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> Velocità di Lettura:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {settings.ttsRate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.2"
                step="0.05"
                value={settings.ttsRate}
                onChange={(e) => onUpdateSettings({ ttsRate: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded-lg"
              />
            </div>

            <button
              onClick={handleTestSpeech}
              disabled={testSpeechActive}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-98 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2 border border-emerald-500/40 transition-colors shadow-sm"
            >
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              {testSpeechActive ? 'Riproduzione in corso...' : 'ASCOLTA CAMPIONE VOCE'}
            </button>
          </div>

          {/* STANDBY INFO BADGE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Prevenzione standby attiva tramite <strong>MediaSession API</strong> e audio silente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-xl uppercase tracking-wider font-mono"
          >
            SALVA IMPOSTAZIONI
          </button>
        </div>
      </div>
    </div>
  );
};

