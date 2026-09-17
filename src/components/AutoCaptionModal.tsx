import React, { useState, useEffect } from 'react';
import { Caption } from '../types';
import { BrowserSpeechRecognitionManager, SPEECH_LANGUAGES } from '../lib/speech';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Play,
  Volume2,
  Clock,
  Languages,
} from 'lucide-react';

interface AutoCaptionModalProps {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  onClose: () => void;
  onCaptionsGenerated: (captions: Caption[]) => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const AutoCaptionModal: React.FC<AutoCaptionModalProps> = ({
  isOpen,
  videoElement,
  onClose,
  onCaptionsGenerated,
  onToast,
}) => {
  const isSupported = BrowserSpeechRecognitionManager.isSupported();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [manager, setManager] = useState<BrowserSpeechRecognitionManager | null>(null);
  const [transcriptChunks, setTranscriptChunks] = useState<
    { text: string; start: number; end: number; words: any[] }[]
  >([]);
  const [interimText, setInterimText] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      if (manager && isListening) {
        manager.stop();
        setIsListening(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRecognition = () => {
    if (!isSupported) {
      onToast('warning', 'Web Speech API is not supported in this browser.');
      return;
    }

    // Reset transcription chunks
    setTranscriptChunks([]);
    setInterimText('');

    const mgr = new BrowserSpeechRecognitionManager({
      language: selectedLanguage,
      onResult: (chunk) => {
        setTranscriptChunks((prev) => [...prev, chunk]);
        setInterimText('');
      },
      onError: (err) => {
        onToast('error', `Speech error: ${err}`);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    setManager(mgr);
    mgr.start();
    setIsListening(true);
    onToast('info', 'Speech recognition active! Play video or speak into microphone.');

    // If video is loaded, also play video so speech can be heard and transcribed
    if (videoElement && videoElement.paused) {
      videoElement.play().catch(() => {});
    }
  };

  const handleStopRecognition = () => {
    if (manager) {
      manager.stop();
      setIsListening(false);
      if (videoElement && !videoElement.paused) {
        videoElement.pause();
      }
    }
  };

  const handleApplyCaptions = () => {
    if (transcriptChunks.length === 0) {
      onToast('warning', 'No transcribed speech to convert to captions.');
      return;
    }

    const newCaptions: Caption[] = transcriptChunks.map((chunk, idx) => ({
      id: `speech-${Date.now()}-${idx}`,
      start: Number(chunk.start.toFixed(2)),
      end: Number(chunk.end.toFixed(2)),
      text: chunk.text,
      words: chunk.words,
      style: 'viral',
      animation: 'pop',
    }));

    onCaptionsGenerated(newCaptions);
    onToast('success', `Created ${newCaptions.length} captions with word-level timings!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-[#12161B] border border-[#252B33] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#252B33] flex items-center justify-between bg-[#161B22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5B82E]/10 border border-[#F5B82E]/30 flex items-center justify-center text-[#F5B82E]">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Auto Caption (Speech-to-Text)</h3>
              <p className="text-[11px] text-[#8D96A3]">Transcribe speech in real-time using browser engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8D96A3] hover:text-white hover:bg-[#1F2630] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-xs text-[#CBD5E1]">
          {isSupported ? (
            <>
              {/* Language selection dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#8D96A3] flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Speech Recognition Language</span>
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isListening}
                  className="w-full bg-[#181E25] border border-[#252B33] rounded-lg p-2.5 text-white text-xs outline-none focus:border-[#F5B82E]"
                >
                  {SPEECH_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Transcription Stream Box */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8D96A3]">Real-time Transcription:</span>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#10B981] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                      Listening...
                    </span>
                  )}
                </div>

                <div className="h-44 bg-[#0E1217] border border-[#252B33] rounded-xl p-3 overflow-y-auto flex flex-col gap-2 font-sans">
                  {transcriptChunks.length === 0 && !interimText ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#64748B]">
                      <Mic className="w-6 h-6 mb-2 opacity-40" />
                      <p>Click "Start Recognition" below.</p>
                      <p className="text-[10px] mt-0.5">Spoken words and timestamps will stream in here.</p>
                    </div>
                  ) : (
                    <>
                      {transcriptChunks.map((chunk, i) => (
                        <div key={i} className="p-2 rounded-lg bg-[#161B22] border border-[#252B33]">
                          <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-[#F5B82E]">
                            <span>
                              {chunk.start.toFixed(1)}s → {chunk.end.toFixed(1)}s
                            </span>
                            <span className="text-[#8D96A3]">{chunk.words.length} words</span>
                          </div>
                          <p className="text-white text-xs font-medium">{chunk.text}</p>
                        </div>
                      ))}
                      {interimText && (
                        <p className="text-[#94A3B8] italic text-xs animate-pulse">
                          {interimText}...
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Start / Stop Toggle */}
              <div className="flex items-center gap-2">
                {!isListening ? (
                  <button
                    onClick={handleStartRecognition}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F5B82E] hover:bg-[#E5A81E] text-[#0B0D10] font-bold text-xs shadow-md shadow-[#F5B82E]/20 transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recognition</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecognition}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs shadow-md shadow-[#EF4444]/20 transition-all cursor-pointer"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>Stop Recognition</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Fallback UI when Web Speech API is not available */
            <div className="p-4 rounded-xl bg-[#2D1619] border border-[#EF4444]/40 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#EF4444] font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Web Speech API is not supported in this browser</span>
              </div>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                Your current browser does not implement the SpeechRecognition interface. You can still use all other caption features:
              </p>
              <ul className="list-disc list-inside text-[11px] text-[#8D96A3] flex flex-col gap-1">
                <li>Import subtitle files (SRT or WebVTT)</li>
                <li>Paste any script or transcript in the "Create" tab</li>
                <li>Add & edit captions manually along the timeline</li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#252B33] bg-[#161B22] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#1F2630] hover:bg-[#283240] text-xs text-[#CBD5E1] transition-colors"
          >
            Cancel
          </button>

          {isSupported && (
            <button
              onClick={handleApplyCaptions}
              disabled={transcriptChunks.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:bg-[#252B33] disabled:text-[#64748B] text-white font-bold text-xs shadow-sm transition-all disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply {transcriptChunks.length} Captions</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
