import React, { useEffect, useState } from 'react';
import { X, Headphones, Mic, Sliders, Volume2, RotateCcw, ShieldCheck, Sparkles, RefreshCw, Music } from 'lucide-react';
import { AudioDevice, AudioSettings } from '../types';
import { speakItalianText, getAvailableItalianVoices } from '../utils/audioUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  devices: AudioDevice[];
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  onRefreshDevices: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  devices,
  onUpdateSettings,
  onRefreshDevices,
}) => {
  const [testSpeechActive, setTestSpeechActive] = useState(false);
  const [italianVoices, setItalianVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available system Italian voices
  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const voices = getAvailableItalianVoices();
        setItalianVoices(voices);
      };

      loadVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    setTestSpeechActive(true);

    if (settings.useGeminiTts) {
      // Test Gemini TTS
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Ciao! Questa è la voce Gemini HD, morbida, calda e chiara per la traduzione.',
          voiceName: settings.geminiVoiceName || 'Aoede'
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.audioBase64) {
            const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
            audio.playbackRate = settings.ttsRate;
            audio.onended = () => setTestSpeechActive(false);
            audio.play();
          } else {
            fallbackLocalTest();
          }
        })
        .catch(() => fallbackLocalTest());
    } else {
      fallbackLocalTest();
    }
  };

  const fallbackLocalTest = () => {
    speakItalianText(
      'Ciao! Questa è la voce di traduzione in italiano. Puoi regolare tono e velocità per renderla morbida e comprensibile.',
      settings.ttsRate,
      settings.ttsPitch || 0.95,
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
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight">Impostazioni Hardware & Voce</h2>
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
          {/* 1. SORGENTE MICROFONO */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400" /> SORGENTE MICROFONO
              </label>
              <button
                onClick={onRefreshDevices}
                className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Aggiorna Devices
              </button>
            </div>

            <div className="relative">
              <select
                value={settings.selectedDeviceId}
                onChange={(e) => onUpdateSettings({ selectedDeviceId: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono transition-colors appearance-none pr-10"
              >
                <option value="">Predefinito di Sistema (Smartphone / Auricolari)</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.isBluetooth ? '🎧 ' : '🎙️ '}
                    {d.label} {d.isBluetooth ? '(Bluetooth)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                ▼
              </div>
            </div>
          </div>

          {/* 2. CONFIGURAZIONE VOCALE E TONO */}
          <div className="space-y-4 pt-3 border-t border-zinc-800">
            <label className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> SCELTA VOCE & TONO MORBIDO
            </label>

            {/* Selection of Local WebSpeech Voice */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-300">Voce Italiana del Sistema / Browser:</span>
              <div className="relative">
                <select
                  value={settings.selectedVoiceURI || ''}
                  onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none pr-8 font-mono"
                >
                  <option value="">Migliore Voce Automatica (Automatica)</option>
                  {italianVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      🗣️ {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs">
                  ▼
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Scegli tra le voci installate sul tuo telefono/computer (es. Alice, Federica, Google Italiano).
              </p>
            </div>

            {/* Gemini Voice Preset */}
            <div className="bg-zinc-900/60 rounded-2xl p-4 space-y-3 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-zinc-200">Sintesi Vocale Gemini HD AI</span>
                  <p className="text-[11px] text-zinc-400">Voce ad altissima definizione via cloud.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.useGeminiTts}
                  onChange={(e) => onUpdateSettings({ useGeminiTts: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {settings.useGeminiTts && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <span className="text-xs font-medium text-zinc-300">Timbro Voce AI Gemini:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Aoede', label: 'Aoede', desc: 'Femminile Morbida & Calda' },
                      { id: 'Kore', label: 'Kore', desc: 'Femminile Chiara & Calma' },
                      { id: 'Puck', label: 'Puck', desc: 'Maschile Morbida' },
                      { id: 'Charon', label: 'Charon', desc: 'Maschile Profonda' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onUpdateSettings({ geminiVoiceName: v.id as any })}
                        className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                          settings.geminiVoiceName === v.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-mono font-bold">{v.label}</span>
                        <span className="text-[10px] text-zinc-400">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pitch / Tono Slider */}
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
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0.6x (Caldo / Profondo)</span>
                <span>0.95x (Morbido Consigliato)</span>
                <span>1.3x (Acuto)</span>
              </div>
            </div>

            {/* Rate / Velocità Slider */}
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
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0.7x (Molto Lento)</span>
                <span>1.0x (Naturale)</span>
                <span>1.2x (Veloce)</span>
              </div>
            </div>

            {/* Test Voice Button */}
            <button
              onClick={handleTestSpeech}
              disabled={testSpeechActive}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-98 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2 border border-emerald-500/40 transition-colors shadow-sm"
            >
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              {testSpeechActive ? 'Riproduzione in corso...' : 'ASCOLTA CAMPIONE VOCE SELEZIONATA'}
            </button>
          </div>

          {/* 3. FILTRI AUDIO HARDWARE */}
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-emerald-400" /> FILTRI MICROFONO HARDWARE
            </label>

            <div className="bg-zinc-900/60 rounded-2xl p-4 space-y-3 border border-zinc-800">
              {/* Echo Cancellation */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-zinc-200">Cancellazione Eco</span>
                  <p className="text-[11px] text-zinc-400">Previene ritorni di voce dagli altoparlanti.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.echoCancellation}
                  onChange={(e) => onUpdateSettings({ echoCancellation: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Noise Suppression */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div>
                  <span className="text-sm font-medium text-zinc-200">Soppressione Rumore</span>
                  <p className="text-[11px] text-zinc-400">Filtra fruscii e rumore ambientale.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => onUpdateSettings({ noiseSuppression: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Auto Gain Control */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div>
                  <span className="text-sm font-medium text-zinc-200">Controllo Guadagno (Auto Gain)</span>
                  <p className="text-[11px] text-zinc-400">Bilancia automaticamente il volume microfonico.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoGainControl}
                  onChange={(e) => onUpdateSettings({ autoGainControl: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. MOTORE DI TRADUZIONE */}
          <div className="space-y-2 pt-3 border-t border-zinc-800">
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> MOTORE DI TRADUZIONE
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ translationEngine: 'gemini-flash' })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  settings.translationEngine === 'gemini-flash'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-mono font-bold">Gemini 3.6 Flash</span>
                <span className="text-[10px] text-zinc-400">Massima accuratezza informale</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ translationEngine: 'websocket-live' })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  settings.translationEngine === 'websocket-live'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-mono font-bold">WebSocket Stream</span>
                <span className="text-[10px] text-zinc-400">Bassa latenza in tempo reale</span>
              </button>
            </div>
          </div>

          {/* STANDBY INFO BADGE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Sistema di prevenzione standby attivo tramite <strong>MediaSession API</strong> e audio silente per mantenere attiva l&apos;interpretazione anche con schermo spento.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-xl uppercase tracking-wider font-mono"
          >
            SALVA PREFERENZE VOCE
          </button>
        </div>
      </div>
    </div>
  );
};

