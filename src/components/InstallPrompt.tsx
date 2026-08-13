import React from 'react';
import { Download, X, Headphones } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowBanner(false);
      });
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto glass-card-active border-emerald-500/50 bg-zinc-950/90 p-4 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
          <Headphones className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-mono font-bold text-zinc-100 uppercase">Installa VoxLink PWA</h4>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Aggiungi alla Home per traduzione a schermo spento con auricolari Bluetooth.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1 hover:bg-emerald-400 transition-colors shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          INSTALLA
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

