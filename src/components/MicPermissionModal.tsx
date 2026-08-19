import React from 'react';
import { Mic, ExternalLink, AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<boolean>;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestPermission,
}) => {
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRequesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        setSuccessMsg('Permesso microfono accordato con successo!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg('Permesso ancora negato dal browser.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossibile sbloccare il microfono.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#121215] border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-zinc-100 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Accesso al Microfono Richiesto
            </h2>
            <p className="text-xs text-rose-300 font-mono mt-0.5">
              BROWSER_PERMISSION_NOT_ALLOWED
            </p>
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-4 text-sm text-zinc-300">
          <p className="leading-relaxed">
            Il browser o il contesto dell'applicazione ha bloccato l'accesso al microfono. Per ascoltare e tradurre in tempo reale, è necessario concedere l'autorizzazione audio.
          </p>

          {/* Alert Callout for Iframe */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Se stai usando l'anteprima integrata (iFrame):</span>
            </div>
            <p className="text-amber-200/90 leading-normal pl-5">
              Molti browser bloccano l'uso del microfono all'interno delle anteprime. Aprire l'app in una <strong>nuova scheda</strong> risolve istantaneamente il problema.
            </p>
          </div>

          {/* Quick Guide */}
          <div className="bg-zinc-900/80 rounded-xl p-3.5 border border-zinc-800 space-y-2 text-xs">
            <div className="font-semibold text-zinc-200 uppercase tracking-wider font-mono text-[11px]">
              Come sbloccare manualmente:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-zinc-400">
              <li>
                Clicca sull'icona <strong className="text-zinc-200">Lucchetto 🔒</strong> o sui permessi a sinistra dell'URL del browser.
              </li>
              <li>
                Trova la voce <strong className="text-zinc-200">Microfono</strong> e impostala su <strong className="text-emerald-400">Consenti</strong>.
              </li>
              <li>
                Ricarica la pagina e premi <strong className="text-zinc-200">"Avvia Traduzione"</strong>.
              </li>
            </ul>
          </div>

          {/* Dynamic feedback messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRequesting}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>{isRequesting ? 'Richiesta in corso...' : 'Consenti Microfono Ora'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700 text-zinc-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span>Apri in Nuova Scheda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
