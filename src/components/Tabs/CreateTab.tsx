import React, { useRef, useState } from 'react';
import { Caption, SegmentationSettings } from '../../types';
import { SRTParser } from '../../lib/srt';
import { VTTParser } from '../../lib/vtt';
import { CaptionSegmentation } from '../../lib/segmentation';
import {
  Upload,
  FileText,
  Mic,
  FileCode,
  Sparkles,
  Sliders,
  CheckCircle,
  Video as VideoIcon,
} from 'lucide-react';

interface CreateTabProps {
  onVideoFileSelect: (file: File) => void;
  onLoadSampleVideo: () => void;
  onImportCaptions: (newCaptions: Caption[], sourceName: string) => void;
  onOpenAutoCaption: () => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
  videoDuration: number;
}

export const CreateTab: React.FC<CreateTabProps> = ({
  onVideoFileSelect,
  onLoadSampleVideo,
  onImportCaptions,
  onOpenAutoCaption,
  onToast,
  videoDuration,
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const vttInputRef = useRef<HTMLInputElement>(null);

  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [showSegmentSettings, setShowSegmentSettings] = useState(false);

  const [segmentSettings, setSegmentSettings] = useState<SegmentationSettings>({
    maxWords: 5,
    maxChars: 32,
    minDuration: 0.8,
    maxDuration: 4.0,
    readingSpeed: 15,
    mode: 'word',
  });

  // Handle Video File selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoFileSelect(file);
      onToast('success', `Loaded video: ${file.name}`);
    }
    e.target.value = '';
  };

  // Video Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(true);
  };
  const handleDragLeave = () => {
    setIsDraggingVideo(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoFileSelect(file);
      onToast('success', `Loaded video: ${file.name}`);
    } else {
      onToast('error', 'Please drop a valid video file (MP4, WebM, MOV).');
    }
  };

  // Import SRT
  const handleSRTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = SRTParser.parse(text);
        if (parsed.length === 0) {
          onToast('warning', 'No captions found in the SRT file.');
          return;
        }
        onImportCaptions(parsed, file.name);
        onToast('success', `Imported ${parsed.length} captions from SRT.`);
      } catch (err: any) {
        onToast('error', `Failed to parse SRT: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import VTT
  const handleVTTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = VTTParser.parse(text);
        if (parsed.length === 0) {
          onToast('warning', 'No captions found in the VTT file.');
          return;
        }
        onImportCaptions(parsed, file.name);
        onToast('success', `Imported ${parsed.length} captions from WebVTT.`);
      } catch (err: any) {
        onToast('error', `Failed to parse VTT: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Segment pasted transcript
  const handleSegmentTranscript = () => {
    if (!transcriptText.trim()) {
      onToast('warning', 'Please enter or paste transcript text.');
      return;
    }

    const totalDur = videoDuration > 0 ? videoDuration : 15;
    const generated = CaptionSegmentation.segmentTranscript(
      transcriptText,
      totalDur,
      segmentSettings
    );

    if (generated.length === 0) {
      onToast('warning', 'Could not segment transcript. Check text input.');
      return;
    }

    onImportCaptions(generated, 'Pasted Transcript');
    onToast('success', `Generated ${generated.length} timed captions from transcript.`);
    setTranscriptText('');
  };

  return (
    <div className="p-4 flex flex-col gap-5 text-sm text-[#CBD5E1]">
      {/* 1. Upload Video Card */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3]">Video Source</span>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => videoInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDraggingVideo
              ? 'border-[#F5B82E] bg-[#F5B82E]/10 scale-[1.01]'
              : 'border-[#252B33] bg-[#161B22] hover:border-[#3B424D] hover:bg-[#181E25]'
          }`}
        >
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoChange}
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-lg bg-[#1F2630] flex items-center justify-center text-[#F5B82E] mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="font-semibold text-white text-xs mb-1">Click to Upload Video</p>
          <p className="text-[11px] text-[#8D96A3]">or drag and drop MP4, WebM, or MOV</p>
          <span className="text-[10px] text-[#F5B82E] mt-2 font-mono">100% Client-side • Zero Server Upload</span>
        </div>

        {/* Or load sample reel */}
        <button
          onClick={onLoadSampleVideo}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#181E25] hover:bg-[#202832] border border-[#252B33] text-xs font-semibold text-[#F5B82E] transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load Offline Demo Reel (No File Needed)</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 2. Caption Generation Modes */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3]">Caption Generation</span>

        {/* Mode A: Auto Caption via Web Speech */}
        <button
          onClick={onOpenAutoCaption}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#F5B82E]/40 text-left transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F5B82E]/10 border border-[#F5B82E]/30 flex items-center justify-center text-[#F5B82E] group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-[#F5B82E] transition-colors">
                Auto Caption (Speech-to-Text)
              </p>
              <p className="text-[11px] text-[#8D96A3]">
                Transcribe video speech locally via browser recognition
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
            Browser STT
          </span>
        </button>

        {/* Mode B & C: SRT / VTT Import */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => srtInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#3B82F6]/40 text-xs font-semibold text-white transition-all"
          >
            <FileText className="w-4 h-4 text-[#3B82F6]" />
            <span>Import SRT</span>
          </button>
          <input
            type="file"
            ref={srtInputRef}
            onChange={handleSRTChange}
            accept=".srt"
            className="hidden"
          />

          <button
            onClick={() => vttInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#10B981]/40 text-xs font-semibold text-white transition-all"
          >
            <FileCode className="w-4 h-4 text-[#10B981]" />
            <span>Import VTT</span>
          </button>
          <input
            type="file"
            ref={vttInputRef}
            onChange={handleVTTChange}
            accept=".vtt"
            className="hidden"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 3. Mode D: Paste Transcript & Smart Segmentation */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3]">Paste Transcript</span>
          <button
            onClick={() => setShowSegmentSettings(!showSegmentSettings)}
            className="text-[11px] text-[#F5B82E] hover:underline flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>{showSegmentSettings ? 'Hide Settings' : 'Segmentation Rules'}</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={transcriptText}
          onChange={(e) => setTranscriptText(e.target.value)}
          placeholder="Paste raw script or transcript text here (Unicode, Hindi, Gujarati, English supported)..."
          className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#F5B82E] transition-colors resize-none"
        />

        {/* Segmentation Configuration */}
        {showSegmentSettings && (
          <div className="p-3 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col gap-2.5 text-xs animate-fadeIn">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#8D96A3] block mb-1">Max Words / Caption</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={segmentSettings.maxWords}
                  onChange={(e) =>
                    setSegmentSettings({ ...segmentSettings, maxWords: parseInt(e.target.value, 10) || 5 })
                  }
                  className="w-full bg-[#1F2630] border border-[#252B33] rounded p-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8D96A3] block mb-1">Max Characters</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={segmentSettings.maxChars}
                  onChange={(e) =>
                    setSegmentSettings({ ...segmentSettings, maxChars: parseInt(e.target.value, 10) || 32 })
                  }
                  className="w-full bg-[#1F2630] border border-[#252B33] rounded p-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8D96A3] block mb-1">Min Duration (sec)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0.3}
                  max={5}
                  value={segmentSettings.minDuration}
                  onChange={(e) =>
                    setSegmentSettings({ ...segmentSettings, minDuration: parseFloat(e.target.value) || 0.8 })
                  }
                  className="w-full bg-[#1F2630] border border-[#252B33] rounded p-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8D96A3] block mb-1">Max Duration (sec)</label>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  max={10}
                  value={segmentSettings.maxDuration}
                  onChange={(e) =>
                    setSegmentSettings({ ...segmentSettings, maxDuration: parseFloat(e.target.value) || 4.0 })
                  }
                  className="w-full bg-[#1F2630] border border-[#252B33] rounded p-1.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#8D96A3] block mb-1">Segmentation Mode</label>
              <select
                value={segmentSettings.mode}
                onChange={(e) => setSegmentSettings({ ...segmentSettings, mode: e.target.value as any })}
                className="w-full bg-[#1F2630] border border-[#252B33] rounded p-1.5 text-white text-xs outline-none"
              >
                <option value="word">Word Based (Optimal for viral shorts)</option>
                <option value="sentence">Sentence Based (Punctuation breaks)</option>
                <option value="char">Character Based (Fixed width)</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={handleSegmentTranscript}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#F5B82E] hover:bg-[#E5A81E] text-xs font-bold text-[#0B0D10] shadow-sm shadow-[#F5B82E]/20 transition-all cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Segment & Apply Captions</span>
        </button>
      </div>
    </div>
  );
};
