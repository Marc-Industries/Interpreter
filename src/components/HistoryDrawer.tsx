import React from 'react';
import { X, Volume2, Download, Trash2, History as HistoryIcon, Search, Copy, Check } from 'lucide-react';
import { TranslationItem } from '../types';
import { speakItalianText } from '../utils/audioUtils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TranslationItem[];
  onClearHistory: () => void;
  ttsRate: number;
  ttsPitch?: number;
  selectedVoiceURI?: string;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  ttsRate,
  ttsPitch = 0.95,
  selectedVoiceURI,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const filteredHistory = history.filter(
    (item) =>
      item.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translatedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyItem = (item: TranslationItem) => {
    const text = `Polacco: ${item.originalText}\nItaliano: ${item.translatedText}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportTxt = () => {
    if (history.length === 0) return;
    const content = history
      .map(
        (item) =>
          `[${new Date(item.timestamp).toLocaleTimeString()}]\nPL: ${item.originalText}\nIT: ${item.translatedText}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traduzione_sessione_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0A0A0B]/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card border border-zinc-700/60 bg-zinc-950/90 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight font-mono">
              CRONOLOGIA SESSIONE ({history.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Cerca trascrizioni o traduzioni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder-zinc-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              onClick={handleExportTxt}
              disabled={history.length === 0}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ESPORTA TXT
            </button>

            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/50 disabled:opacity-50 text-rose-400 font-mono font-bold flex items-center gap-1.5 border border-zinc-800 hover:border-rose-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              SVUOTA
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs font-mono italic">
              {history.length === 0
                ? 'Nessun testo registrato nella sessione corrente.'
                : 'Nessun risultato corrisponde alla ricerca.'}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2 hover:border-zinc-700 transition-colors relative group"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speakItalianText(item.translatedText, ttsRate, ttsPitch, selectedVoiceURI)}
                      className="p-1 rounded text-emerald-400 hover:bg-zinc-800 transition-colors"
                      title="Ascolta in Italiano"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyItem(item)}
                      className="p-1 rounded text-zinc-400 hover:bg-zinc-800 transition-colors"
                      title="Copia blocco"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-zinc-300 font-medium leading-relaxed">
                    <span className="text-zinc-500 font-mono font-bold mr-1.5">PL:</span>
                    {item.originalText}
                  </div>
                  <div className="text-emerald-300 font-semibold leading-relaxed">
                    <span className="text-emerald-500 font-mono font-bold mr-1.5">IT:</span>
                    {item.translatedText}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

