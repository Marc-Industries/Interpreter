import React from 'react';
import { Mic, MicOff, Volume2, Copy, Trash2, Check, FileText, VolumeX } from 'lucide-react';
import { TranslationState, LanguageOption } from '../types';

interface TranslationViewProps {
  isListening: boolean;
  state: TranslationState;
  sourceLang: LanguageOption;
  targetLang: LanguageOption;
  sourceText: string;
  interimSourceText: string;
  targetText: string;
  audioLevel: number;
  isMuted: boolean;
  ttsRate: number;
  enableAutoTts: boolean;
  onToggleAutoTts: () => void;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onClearTexts: () => void;
  onRepeatTargetSpeech: () => void;
  onSourceTextChange: (text: string) => void;
  onRequestMicPermission?: () => void;
  errorMsg: string | null;
}

export const TranslationView: React.FC<TranslationViewProps> = ({
  isListening,
  state,
  sourceLang,
  targetLang,
  sourceText,
  interimSourceText,
  targetText,
  audioLevel,
  isMuted,
  ttsRate,
  enableAutoTts,
  onToggleAutoTts,
  onToggleListening,
  onToggleMute,
  onClearTexts,
  onRepeatTargetSpeech,
  onSourceTextChange,
  onRequestMicPermission,
  errorMsg,
}) => {
  const [copiedSource, setCopiedSource] = React.useState(false);
  const [copiedTarget, setCopiedTarget] = React.useState(false);

  const handleCopySource = () => {
    if (sourceText) {
      navigator.clipboard.writeText(sourceText);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    }
  };

  const handleCopyTarget = () => {
    if (targetText) {
      navigator.clipboard.writeText(targetText);
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (state) {
      case 'listening':
        return { label: 'ASCOLTO ATTIVO', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
      case 'processing':
        return { label: 'TRADUZIONE IN CORSO...', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' };
      case 'speaking':
        return { label: 'RIPRODUZIONE AUDIO', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' };
      case 'error':
        return { label: 'ERRORE CONNETTIVITÀ', color: 'bg-rose-500/10 border-rose-500/30 text-rose-400' };
      default:
        return { label: 'STANDBY / PRONTO', color: 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 flex-1 flex flex-col gap-4">
      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="glass-card p-4 border-rose-500/50 bg-rose-950/40 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <span className="mono font-medium">{errorMsg}</span>
          <div className="flex items-center gap-2.5">
            {onRequestMicPermission && (errorMsg.toLowerCase().includes('microfono') || errorMsg.toLowerCase().includes('permess')) && (
              <button
                type="button"
                onClick={onRequestMicPermission}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold font-mono text-[11px] uppercase transition-all shadow-md active:scale-95"
              >
                Sblocca Microfono 🎙️
              </button>
            )}
            <button 
              onClick={onClearTexts} 
              className="text-rose-400 hover:text-rose-200 text-xs font-mono underline shrink-0 px-1"
            >
              CHIUDI
            </button>
          </div>
        </div>
      )}

      {/* BENTO GRID CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">

        {/* BENTO TILE 1: POLISH SOURCE TEXT */}
        <div className="md:col-span-8 glass-card p-6 flex flex-col justify-between min-h-[240px] transition-all relative">
          <div className="flex justify-between items-start mb-2 border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 font-bold">
                {sourceLang?.code?.split('-')?.[0]?.toUpperCase() || 'PL'}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                TESTO O PARLATO · {sourceLang?.name?.toUpperCase() || 'POLACCO'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 mono flex items-center gap-1.5">
                {isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Mic: {audioLevel}%</span>
                  </>
                ) : (
                  'Microfono inattivo'
                )}
              </span>
              {sourceText && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={handleCopySource}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title={`Copia testo in ${sourceLang?.name || 'originale'}`}
                  >
                    {copiedSource ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onClearTexts}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Pulisci testo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Source Text View & Live Transcription Stream */}
          <div className="flex-1 my-2 relative flex flex-col">
            <textarea
              value={sourceText}
              onChange={(e) => onSourceTextChange(e.target.value)}
              placeholder={`Inizia a parlare in ${sourceLang?.name || 'originale'} dopo aver premuto AVVIA... La trascrizione e traduzione avverranno in automatico.`}
              className="w-full flex-1 bg-transparent text-xl md:text-2xl font-medium leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none min-h-[120px] max-h-[220px]"
            />
            {interimSourceText && (
              <div className="text-emerald-400/90 italic text-base md:text-lg animate-pulse font-mono mt-1 flex items-center gap-1.5">
                <span>🗣️</span>
                <span>{interimSourceText}...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500 mono">
            <span>{sourceText ? `${sourceText.trim().split(/\s+/).length} parole trascritte` : `In attesa di parlato in ${sourceLang?.name || 'originale'}`}</span>
            {isListening && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                AUTOMATICO ATTIVO
              </span>
            )}
          </div>
        </div>

        {/* BENTO TILE 2: ACTION CONTROL TILE (Span 12 or Span 4 on Desktop) */}
        <div className="md:col-span-4 glass-card p-6 flex flex-col justify-between items-center text-center gap-4">
          <div className="w-full flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
              CONTROL PANEL
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Giant Audio Interaction Area */}
          <div className="my-auto flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <div 
                  className="absolute rounded-full border border-emerald-500/40 transition-all duration-100 ease-out pointer-events-none"
                  style={{
                    width: `${100 + audioLevel * 0.9}px`,
                    height: `${100 + audioLevel * 0.9}px`,
                    opacity: Math.max(0.2, audioLevel / 100),
                  }}
                />
              )}

              <button
                onClick={onToggleListening}
                className={`w-28 h-28 rounded-3xl flex flex-col items-center justify-center gap-1.5 font-bold tracking-tight shadow-2xl transition-all duration-300 transform active:scale-95 ${
                  isListening
                    ? 'bg-red-500 text-white shadow-red-950/80 border-2 border-red-400/50 hover:bg-red-600'
                    : 'bg-emerald-500 text-zinc-950 shadow-emerald-950/80 border-2 border-emerald-300 hover:bg-emerald-400'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-8 h-8 text-white animate-pulse" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">STOP</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 text-zinc-950" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">AVVIA</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono mt-1">
              {isListening ? 'Interprete in ascolto continuo' : 'Tocca per avviare l\'ascolto'}
            </p>
          </div>

          {/* Quick Controls & Output Mode Selector */}
          <div className="w-full flex flex-col gap-2 pt-3 border-t border-zinc-800/80">
            {/* Output Mode Switcher */}
            <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 gap-1 w-full">
              <button
                type="button"
                onClick={onToggleAutoTts}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  !enableAutoTts
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Sottotitoli a schermo (nessun disturbo audio)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SOTTOTITOLI</span>
              </button>
              <button
                type="button"
                onClick={onToggleAutoTts}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  enableAutoTts
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Lettura vocale automatica con sintesi"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>VOCE TTS</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onToggleMute}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono border transition-colors flex items-center justify-center gap-1.5 ${
                  isMuted
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'MUTO' : 'MIC ATTIVO'}</span>
              </button>

              {targetText && (
                <button
                  onClick={onRepeatTargetSpeech}
                  className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-mono flex items-center justify-center gap-1"
                  title="Ascolta traduzione ora"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ASCOLTA</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BENTO TILE 3: ITALIAN TARGET TRANSLATION (ACTIVE GLOW BENTO TILE) */}
        <div className="md:col-span-12 glass-card-active p-6 flex flex-col justify-between min-h-[220px] relative transition-all">
          <div className="flex justify-between items-start mb-3 border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                {targetLang?.code?.split('-')?.[0]?.toUpperCase() || 'IT'}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                TARGET · {targetLang?.name?.toUpperCase() || 'ITALIANO'}
              </span>
              <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                !enableAutoTts
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}>
                {!enableAutoTts ? '💬 MODALITÀ SOTTOTITOLI' : '🔊 LETTURA VOCALE'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {targetText && (
                <>
                  <button
                    onClick={onRepeatTargetSpeech}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ASCOLTA</span>
                  </button>
                  <button
                    onClick={handleCopyTarget}
                    className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-950/60 transition-colors"
                    title={`Copia traduzione in ${targetLang?.name || 'italiano'}`}
                  >
                    {copiedTarget ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Output Text */}
          <div className="flex-1 my-2 text-2xl md:text-3xl lg:text-4xl font-semibold leading-relaxed md:leading-tight text-white overflow-y-auto max-h-[240px] pr-1">
            {targetText ? (
              <p className="whitespace-pre-wrap break-words">
                {targetText}
              </p>
            ) : (
              <p className="text-zinc-500 italic text-base md:text-xl font-normal flex items-center h-full">
                &ldquo;{enableAutoTts ? 'La traduzione comparirà qui con sintesi vocale...' : 'La traduzione comparirà qui in modalità sottotitoli senza disturbi audio...'}&rdquo;
              </p>
            )}
          </div>

          {/* Waveform Animation Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-500/20">
            <div className="flex items-end gap-1 h-7">
              <div className={`waveform-bar ${isListening ? 'waveform-anim-1' : 'h-2'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-2' : 'h-4'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-3' : 'h-7'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-4' : 'h-5'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-5' : 'h-3'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-1' : 'h-6'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-2' : 'h-4'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-3' : 'h-7'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-4' : 'h-3'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-5' : 'h-5'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-1' : 'h-7'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-2' : 'h-2'}`} />
              <div className={`waveform-bar ${isListening ? 'waveform-anim-3' : 'h-4'}`} />
            </div>

            <div className="text-[11px] font-mono text-emerald-400">
              Sintesi: {ttsRate}x
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

