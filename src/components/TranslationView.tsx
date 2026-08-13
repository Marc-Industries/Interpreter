import React from 'react';
import { Mic, MicOff, Volume2, Copy, Trash2, Check } from 'lucide-react';
import { TranslationState } from '../types';

interface TranslationViewProps {
  isListening: boolean;
  state: TranslationState;
  polishText: string;
  interimPolishText: string;
  italianText: string;
  audioLevel: number;
  isMuted: boolean;
  ttsRate: number;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onClearTexts: () => void;
  onRepeatItalianSpeech: () => void;
  errorMsg: string | null;
}

export const TranslationView: React.FC<TranslationViewProps> = ({
  isListening,
  state,
  polishText,
  interimPolishText,
  italianText,
  audioLevel,
  isMuted,
  ttsRate,
  onToggleListening,
  onToggleMute,
  onClearTexts,
  onRepeatItalianSpeech,
  errorMsg,
}) => {
  const [copiedPolish, setCopiedPolish] = React.useState(false);
  const [copiedItalian, setCopiedItalian] = React.useState(false);

  const handleCopyPolish = () => {
    if (polishText) {
      navigator.clipboard.writeText(polishText);
      setCopiedPolish(true);
      setTimeout(() => setCopiedPolish(false), 2000);
    }
  };

  const handleCopyItalian = () => {
    if (italianText) {
      navigator.clipboard.writeText(italianText);
      setCopiedItalian(true);
      setTimeout(() => setCopiedItalian(false), 2000);
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
        <div className="glass-card p-4 border-rose-500/50 bg-rose-950/40 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <span className="mono">{errorMsg}</span>
          <button 
            onClick={onClearTexts} 
            className="text-rose-400 hover:text-rose-200 text-xs font-mono underline shrink-0"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* BENTO GRID CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">

        {/* BENTO TILE 1: POLISH SOURCE TEXT (Span 12 or Span 8 on Desktop) */}
        <div className="md:col-span-8 glass-card p-6 flex flex-col justify-between min-h-[200px] transition-all relative">
          <div className="flex justify-between items-start mb-3 border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 font-bold">
                PL
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                SOURCE · POLACCO
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 mono">
                {isListening ? `Audio Level: ${audioLevel}%` : 'Mic Paused'}
              </span>
              {polishText && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyPolish}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Copia testo polacco"
                  >
                    {copiedPolish ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onClearTexts}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Cancella testo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 my-2 text-xl md:text-2xl font-medium leading-relaxed text-zinc-200 overflow-y-auto max-h-[220px] pr-1">
            {polishText || interimPolishText ? (
              <p className="whitespace-pre-wrap break-words">
                {polishText}
                {interimPolishText && (
                  <span className="text-emerald-400/80 italic ml-1 animate-pulse font-normal">
                    {interimPolishText}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-zinc-500 italic text-sm md:text-base flex items-center h-full">
                &ldquo;Cześć, jak się masz? Awiuj interpretera aby rozpocząć trascrizione...&rdquo;
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500 mono">
            <span>{polishText ? `${polishText.trim().split(/\s+/).length} parole trascritte` : 'In attesa di parlato'}</span>
            {isListening && (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                STREAMING
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

          {/* Quick Controls */}
          <div className="w-full flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
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

            {italianText && (
              <button
                onClick={onRepeatItalianSpeech}
                className="py-2 px-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-emerald-400 hover:bg-zinc-700 text-xs font-mono flex items-center justify-center gap-1"
                title="Riascolta traduzione"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>SPEECH</span>
              </button>
            )}
          </div>
        </div>

        {/* BENTO TILE 3: ITALIAN TARGET TRANSLATION (ACTIVE GLOW BENTO TILE) */}
        <div className="md:col-span-12 glass-card-active p-6 flex flex-col justify-between min-h-[220px] relative transition-all">
          <div className="flex justify-between items-start mb-3 border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                IT
              </span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                TARGET · ITALIANO
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 mono uppercase font-semibold">
                {italianText ? 'Traduzione Disponibile' : 'In Corso'}
              </span>
              {italianText && (
                <button
                  onClick={handleCopyItalian}
                  className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-950/60 transition-colors"
                  title="Copia traduzione italiana"
                >
                  {copiedItalian ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Main Output Text */}
          <div className="flex-1 my-2 text-2xl md:text-3xl lg:text-4xl font-semibold leading-relaxed md:leading-tight text-white overflow-y-auto max-h-[240px] pr-1">
            {italianText ? (
              <p className="whitespace-pre-wrap break-words">
                {italianText}
              </p>
            ) : (
              <p className="text-zinc-500 italic text-base md:text-xl font-normal flex items-center h-full">
                &ldquo;La traduzione in italiano comparirà qui in tempo reale con sintesi vocale...&rdquo;
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

