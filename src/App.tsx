import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TranslationView } from './components/TranslationView';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { InstallPrompt } from './components/InstallPrompt';
import { AudioDevice, AudioSettings, TranslationItem, TranslationState } from './types';
import {
  getAudioInputDevices,
  enableBackgroundStandbyProtection,
  disableBackgroundStandbyProtection,
  speakItalianText,
  stopSpeechSynthesis,
  blobToBase64,
} from './utils/audioUtils';

// Fallback interface for Web Speech Recognition API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function App() {
  // App State
  const [isListening, setIsListening] = useState(false);
  const [state, setState] = useState<TranslationState>('idle');
  const [polishText, setPolishText] = useState('');
  const [interimPolishText, setInterimPolishText] = useState('');
  const [italianText, setItalianText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Settings & Devices
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [settings, setSettings] = useState<AudioSettings>({
    selectedDeviceId: '',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    enableAutoTts: true,
    ttsRate: 1.0,
    ttsPitch: 0.95,
    selectedVoiceURI: '',
    geminiVoiceName: 'Aoede',
    useGeminiTts: false,
    translationEngine: 'gemini-flash',
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // History Log
  const [history, setHistory] = useState<TranslationItem[]>([]);

  // Refs for speech recognition, media recorder, audio analyzer and timers
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const translateDebounceTimerRef = useRef<any>(null);
  const lastProcessedTextRef = useRef<string>('');

  // Refresh audio devices list
  const refreshDevices = useCallback(async () => {
    const list = await getAudioInputDevices();
    setDevices(list);
    // Auto select bluetooth device if found and no device manually set
    if (!settings.selectedDeviceId) {
      const btDevice = list.find((d) => d.isBluetooth);
      if (btDevice) {
        setSettings((prev) => ({ ...prev, selectedDeviceId: btDevice.deviceId }));
      }
    }
  }, [settings.selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Find active selected device object
  const activeDevice = devices.find((d) => d.deviceId === settings.selectedDeviceId) || null;

  // Handle Translate Call to Server
  const handleTranslateText = useCallback(
    async (textToTranslate: string) => {
      if (!textToTranslate.trim() || textToTranslate === lastProcessedTextRef.current) {
        return;
      }

      lastProcessedTextRef.current = textToTranslate;
      setState('processing');

      try {
        const recentHistoryTexts = history.slice(-3).map((h) => `${h.originalText} => ${h.translatedText}`);

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToTranslate,
            contextHistory: recentHistoryTexts,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Errore nella chiamata di traduzione');
        }

        const translation = data.translation || '';
        setItalianText(translation);

        // Add to history
        const newItem: TranslationItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: Date.now(),
          originalText: textToTranslate,
          translatedText: translation,
          isFinal: true,
        };

        setHistory((prev) => [newItem, ...prev]);

        // Trigger Auto TTS if enabled
        if (settings.enableAutoTts && translation) {
          setState('speaking');

          if (settings.useGeminiTts) {
            // Gemini TTS API
            try {
              const ttsRes = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: translation,
                  voiceName: settings.geminiVoiceName || 'Aoede'
                }),
              });
              const ttsData = await ttsRes.json();
              if (ttsData.success && ttsData.audioBase64) {
                const audio = new Audio(`data:audio/wav;base64,${ttsData.audioBase64}`);
                audio.playbackRate = settings.ttsRate;
                audio.onended = () => setState(isListening ? 'listening' : 'idle');
                audio.play();
                return;
              }
            } catch (err) {
              console.warn('Fallback a WebSpeech locale:', err);
            }
          }

          // Default WebSpeech
          speakItalianText(
            translation,
            settings.ttsRate,
            settings.ttsPitch,
            settings.selectedVoiceURI,
            () => setState('speaking'),
            () => setState(isListening ? 'listening' : 'idle')
          );
        } else {
          setState(isListening ? 'listening' : 'idle');
        }
      } catch (err: any) {
        console.error('Errore traduzione:', err);
        setErrorMsg(err.message || 'Errore di traduzione');
        setState('error');
      }
    },
    [history, isListening, settings.enableAutoTts, settings.ttsRate, settings.ttsPitch, settings.selectedVoiceURI, settings.geminiVoiceName, settings.useGeminiTts]
  );

  // Setup Web Speech Recognition for Polish
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setPolishText((prev) => {
              const newFull = prev ? `${prev} ${finalTranscript}` : finalTranscript;
              // Trigger translation on finalized phrase
              clearTimeout(translateDebounceTimerRef.current);
              translateDebounceTimerRef.current = setTimeout(() => {
                handleTranslateText(newFull);
              }, 400);
              return newFull;
            });
            setInterimPolishText('');
          } else if (interimTranscript) {
            setInterimPolishText(interimTranscript);
            // Debounce trigger on interim pause
            clearTimeout(translateDebounceTimerRef.current);
            translateDebounceTimerRef.current = setTimeout(() => {
              setPolishText((prev) => {
                const combined = prev ? `${prev} ${interimTranscript}` : interimTranscript;
                handleTranslateText(combined);
                return combined;
              });
              setInterimPolishText('');
            }, 1200);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition warning:', event.error);
          if (event.error === 'no-speech') return;
          if (event.error === 'not-allowed') {
            setErrorMsg('Permesso microfono negato.');
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          // Restart continuously if still listening
          if (isListening) {
            try {
              recognition.start();
            } catch {
              // Ignore if already active
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn('Inizializzazione SpeechRecognition fallita:', err);
      }
    }

    // Fallback: Web Audio MediaRecorder streaming chunk to server
    setupMediaRecorderFallback();
  }, [handleTranslateText, isListening]);

  // Audio Visualizer setup
  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);

      audioContextRef.current = audioCtx;
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Audio analyzer non avviato:', e);
    }
  }, []);

  // MediaRecorder Fallback when Web Speech API isn't present
  const setupMediaRecorderFallback = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          ...(settings.selectedDeviceId ? { deviceId: { exact: settings.selectedDeviceId } } : {}),
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setupAudioAnalyzer(stream);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && isListening) {
          const base64 = await blobToBase64(e.data);
          setState('processing');

          try {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: 'audio/webm;codecs=opus',
              }),
            });
            const data = await res.json();
            if (data.success && data.translation) {
              setItalianText(data.translation);
              if (settings.enableAutoTts) {
                speakItalianText(data.translation, settings.ttsRate);
              }
            }
          } catch (err) {
            console.error('Errore audio chunk translation:', err);
          } finally {
            setState('listening');
          }
        }
      };

      recorder.start(4000); // Record in 4-second continuous windows
    } catch (err) {
      console.error('Impossibile accedere al microfono:', err);
      setErrorMsg('Impossibile accedere al microfono. Controllare i permessi del browser.');
      setIsListening(false);
    }
  }, [settings, setupAudioAnalyzer, isListening]);

  // Toggle Listening Session
  const handleToggleListening = () => {
    if (isListening) {
      // STOP
      setIsListening(false);
      setState('idle');
      disableBackgroundStandbyProtection();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      stopSpeechSynthesis();
    } else {
      // START
      setIsListening(true);
      setState('listening');
      setErrorMsg(null);
      enableBackgroundStandbyProtection();
      startSpeechRecognition();
    }
  };

  // Mute / Unmute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle enabled
      });
    }
  };

  // Clear display texts
  const handleClearTexts = () => {
    setPolishText('');
    setInterimPolishText('');
    setItalianText('');
    lastProcessedTextRef.current = '';
    setErrorMsg(null);
  };

  // Re-play last Italian speech
  const handleRepeatItalianSpeech = () => {
    if (italianText) {
      speakItalianText(italianText, settings.ttsRate, settings.ttsPitch, settings.selectedVoiceURI);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disableBackgroundStandbyProtection();
      stopSpeechSynthesis();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <Header
        isListening={isListening}
        activeDevice={activeDevice}
        historyCount={history.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main View */}
      <main className="flex-1 flex flex-col">
        <TranslationView
          isListening={isListening}
          state={state}
          polishText={polishText}
          interimPolishText={interimPolishText}
          italianText={italianText}
          audioLevel={audioLevel}
          isMuted={isMuted}
          ttsRate={settings.ttsRate}
          onToggleListening={handleToggleListening}
          onToggleMute={handleToggleMute}
          onClearTexts={handleClearTexts}
          onRepeatItalianSpeech={handleRepeatItalianSpeech}
          errorMsg={errorMsg}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        devices={devices}
        onUpdateSettings={(newPartial) => setSettings((prev) => ({ ...prev, ...newPartial }))}
        onRefreshDevices={refreshDevices}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={() => setHistory([])}
        ttsRate={settings.ttsRate}
        ttsPitch={settings.ttsPitch}
        selectedVoiceURI={settings.selectedVoiceURI}
      />

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
}
