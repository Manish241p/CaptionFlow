import React, { useState, useMemo } from 'react';
import { Caption } from '../../types';
import { TimingEngine } from '../../lib/timing';
import { CaptionSegmentation } from '../../lib/segmentation';
import {
  Search,
  Scissors,
  Copy,
  Trash2,
  GitMerge,
  ArrowUp,
  ArrowDown,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';

interface EditTabProps {
  captions: Caption[];
  selectedCaptionId: string | null;
  currentTime: number;
  readingSpeedThreshold: number;
  onSelectCaption: (id: string) => void;
  onUpdateCaptionText: (id: string, newText: string) => void;
  onUpdateCaptionTiming: (id: string, newStart: number, newEnd: number) => void;
  onSplitCaption: (id: string, splitTime: number) => void;
  onMergeCaption: (id: string) => void;
  onDuplicateCaption: (id: string) => void;
  onDeleteCaption: (id: string) => void;
  onReorderCaption: (fromIndex: number, toIndex: number) => void;
  onAddCaptionAtCurrentTime: () => void;
  onApplyCleanedCaptions: (newCaptions: Caption[], actionName: string) => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const EditTab: React.FC<EditTabProps> = ({
  captions,
  selectedCaptionId,
  currentTime,
  readingSpeedThreshold,
  onSelectCaption,
  onUpdateCaptionText,
  onUpdateCaptionTiming,
  onSplitCaption,
  onMergeCaption,
  onDuplicateCaption,
  onDeleteCaption,
  onReorderCaption,
  onAddCaptionAtCurrentTime,
  onApplyCleanedCaptions,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Check for overlaps
  const overlapIssues = useMemo(() => {
    return CaptionSegmentation.detectOverlaps(captions);
  }, [captions]);

  // Filter captions by search query (text or caption index number)
  const filteredCaptions = useMemo(() => {
    if (!searchQuery.trim()) return captions;
    const query = searchQuery.toLowerCase().trim();
    return captions.filter((c, idx) => {
      const matchIndex = (idx + 1).toString() === query;
      const matchText = c.text.toLowerCase().includes(query);
      return matchIndex || matchText;
    });
  }, [captions, searchQuery]);

  // Quality tool handlers
  const handleAutoBreak = () => {
    const cleaned = CaptionSegmentation.autoBreakLines(captions);
    onApplyCleanedCaptions(cleaned, 'Auto Break Lines');
    onToast('success', 'Balanced long caption lines automatically.');
  };

  const handleRemoveDoubleSpaces = () => {
    const cleaned = CaptionSegmentation.removeDoubleSpaces(captions);
    onApplyCleanedCaptions(cleaned, 'Remove Double Spaces');
    onToast('success', 'Trimmed redundant spaces.');
  };

  const handleFixPunctuation = () => {
    const cleaned = CaptionSegmentation.fixPunctuation(captions);
    onApplyCleanedCaptions(cleaned, 'Fix Punctuation');
    onToast('success', 'Capitalized sentences and adjusted punctuation.');
  };

  const handleNormalize = () => {
    const cleaned = CaptionSegmentation.normalizeCaptions(captions);
    onApplyCleanedCaptions(cleaned, 'Normalize Captions');
    onToast('success', 'Normalized caption word timings.');
  };

  const handleFixOverlaps = () => {
    const fixed = CaptionSegmentation.fixOverlaps(captions);
    onApplyCleanedCaptions(fixed, 'Fix Overlaps');
    onToast('success', `Resolved ${overlapIssues.length} overlapping caption timings.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full select-none text-xs text-[#CBD5E1] overflow-hidden">
      {/* Top Search & Quality Bar */}
      <div className="p-3 border-b border-[#252B33] bg-[#12161B] flex flex-col gap-2 shrink-0">
        {/* Search input + Add button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#8D96A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions by text or #..."
              className="w-full bg-[#181E25] border border-[#252B33] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#F5B82E]"
            />
          </div>
          <button
            onClick={onAddCaptionAtCurrentTime}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5B82E] hover:bg-[#E5A81E] text-[#0B0D10] font-bold text-xs shadow-sm transition-all"
            title="Add Caption at Current Video Time"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Quality tools row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="flex items-center gap-1 text-[11px] text-[#F5B82E] hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            <span>{showQualityMenu ? 'Hide Quality Tools' : 'Quality Tools'}</span>
          </button>
          <span className="text-[11px] text-[#8D96A3]">
            {filteredCaptions.length} of {captions.length} captions
          </span>
        </div>

        {/* Quality tools sub-panel */}
        {showQualityMenu && (
          <div className="p-2.5 rounded-lg bg-[#181E25] border border-[#252B33] flex flex-wrap gap-1.5 animate-fadeIn">
            <button
              onClick={handleAutoBreak}
              className="px-2 py-1 rounded bg-[#202832] hover:bg-[#283240] text-[11px] text-[#CBD5E1] transition-colors"
            >
              Auto Break
            </button>
            <button
              onClick={handleRemoveDoubleSpaces}
              className="px-2 py-1 rounded bg-[#202832] hover:bg-[#283240] text-[11px] text-[#CBD5E1] transition-colors"
            >
              Remove Double Spaces
            </button>
            <button
              onClick={handleFixPunctuation}
              className="px-2 py-1 rounded bg-[#202832] hover:bg-[#283240] text-[11px] text-[#CBD5E1] transition-colors"
            >
              Fix Punctuation
            </button>
            <button
              onClick={handleNormalize}
              className="px-2 py-1 rounded bg-[#202832] hover:bg-[#283240] text-[11px] text-[#CBD5E1] transition-colors"
            >
              Normalize
            </button>
          </div>
        )}

        {/* Overlap warning banner */}
        {overlapIssues.length > 0 && (
          <div className="p-2 rounded-lg bg-[#2A1618] border border-[#EF4444]/40 flex items-center justify-between text-[#FCA5A5] text-[11px]">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
              <span>{overlapIssues.length} timing overlap(s) detected</span>
            </div>
            <button
              onClick={handleFixOverlaps}
              className="px-2 py-0.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-[10px] transition-colors"
            >
              Fix Overlaps
            </button>
          </div>
        )}
      </div>

      {/* Caption List Container */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filteredCaptions.length === 0 ? (
          <div className="text-center py-10 text-[#8D96A3]">
            <p>No captions found.</p>
            <p className="text-[11px] mt-1">Import SRT, auto-caption or add a caption.</p>
          </div>
        ) : (
          filteredCaptions.map((caption) => {
            const originalIndex = captions.findIndex((c) => c.id === caption.id);
            const isSelected = caption.id === selectedCaptionId;
            const isActive = currentTime >= caption.start && currentTime <= caption.end;
            const duration = Math.max(0.1, caption.end - caption.start);
            const wordCount = caption.text.trim().split(/\s+/).filter(Boolean).length;
            const wordsPerSec = Number((wordCount / duration).toFixed(1));
            const isSpeedHigh = wordsPerSec > readingSpeedThreshold;

            return (
              <div
                key={caption.id}
                onClick={() => onSelectCaption(caption.id)}
                className={`p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#1D222A] border-[#F5B82E] shadow-md shadow-[#F5B82E]/10'
                    : isActive
                    ? 'bg-[#181E25] border-[#3B82F6]'
                    : 'bg-[#14181F] border-[#252B33] hover:border-[#343C47]'
                }`}
              >
                {/* Header: Index, Timings & Duration */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#F5B82E] text-xs">
                      #{originalIndex + 1}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" title="Currently Active in Video" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    {/* Start time input */}
                    <div className="flex items-center gap-1 bg-[#1F2630] px-1.5 py-0.5 rounded border border-[#252B33]">
                      <span className="text-[#8D96A3] text-[9px]">IN</span>
                      <input
                        type="text"
                        defaultValue={TimingEngine.formatTime(caption.start)}
                        onBlur={(e) => {
                          const parsed = TimingEngine.parseTimeString(e.target.value);
                          if (!isNaN(parsed) && parsed >= 0) {
                            onUpdateCaptionTiming(caption.id, parsed, Math.max(parsed + 0.2, caption.end));
                          }
                        }}
                        className="w-16 bg-transparent text-white outline-none text-center"
                      />
                    </div>
                    <span>→</span>
                    {/* End time input */}
                    <div className="flex items-center gap-1 bg-[#1F2630] px-1.5 py-0.5 rounded border border-[#252B33]">
                      <span className="text-[#8D96A3] text-[9px]">OUT</span>
                      <input
                        type="text"
                        defaultValue={TimingEngine.formatTime(caption.end)}
                        onBlur={(e) => {
                          const parsed = TimingEngine.parseTimeString(e.target.value);
                          if (!isNaN(parsed) && parsed > caption.start) {
                            onUpdateCaptionTiming(caption.id, caption.start, parsed);
                          }
                        }}
                        className="w-16 bg-transparent text-white outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* Reading speed tag */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isSpeedHigh
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                        : 'bg-[#252B33] text-[#8D96A3]'
                    }`}
                    title={isSpeedHigh ? `High reading speed: ${wordsPerSec} words/sec` : `Reading speed: ${wordsPerSec} words/sec`}
                  >
                    {wordsPerSec} w/s
                  </span>
                </div>

                {/* Multiline Text Area */}
                <textarea
                  rows={2}
                  value={caption.text}
                  onChange={(e) => onUpdateCaptionText(caption.id, e.target.value)}
                  className="w-full bg-[#1A2028] border border-[#252B33] rounded-lg p-2 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#F5B82E] transition-colors resize-y leading-relaxed font-sans"
                  placeholder="Enter caption text..."
                />

                {/* Word Chips Breakdown */}
                {caption.words && caption.words.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto p-1 bg-[#101419] rounded-md border border-[#252B33]/50">
                    {caption.words.map((w, wIdx) => {
                      const isWordActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={wIdx}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            isWordActive
                              ? 'bg-[#F5B82E] text-[#0B0D10] font-bold'
                              : 'bg-[#181E25] text-[#CBD5E1] border border-[#252B33]'
                          }`}
                          title={`[${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s] (${w.timingType || 'estimated'})`}
                        >
                          {w.text}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons: Split, Duplicate, Merge, Reorder, Delete */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#252B33]/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const midTime = caption.start + duration / 2;
                        onSplitCaption(caption.id, midTime);
                      }}
                      className="px-2 py-1 rounded bg-[#1F2630] hover:bg-[#283240] text-[11px] text-[#CBD5E1] flex items-center gap-1 transition-colors"
                      title="Split caption in half"
                    >
                      <Scissors className="w-3 h-3 text-[#F5B82E]" />
                      <span>Split</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateCaption(caption.id);
                      }}
                      className="px-2 py-1 rounded bg-[#1F2630] hover:bg-[#283240] text-[11px] text-[#CBD5E1] flex items-center gap-1 transition-colors"
                      title="Duplicate caption"
                    >
                      <Copy className="w-3 h-3 text-[#3B82F6]" />
                      <span>Duplicate</span>
                    </button>

                    {originalIndex < captions.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergeCaption(caption.id);
                        }}
                        className="px-2 py-1 rounded bg-[#1F2630] hover:bg-[#283240] text-[11px] text-[#CBD5E1] flex items-center gap-1 transition-colors"
                        title="Merge with next caption"
                      >
                        <GitMerge className="w-3 h-3 text-[#10B981]" />
                        <span>Merge</span>
                      </button>
                    )}
                  </div>

                  {/* Reorder and Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (originalIndex > 0) onReorderCaption(originalIndex, originalIndex - 1);
                      }}
                      disabled={originalIndex === 0}
                      className="p-1 rounded bg-[#1F2630] hover:bg-[#283240] disabled:opacity-30 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (originalIndex < captions.length - 1)
                          onReorderCaption(originalIndex, originalIndex + 1);
                      }}
                      disabled={originalIndex === captions.length - 1}
                      className="p-1 rounded bg-[#1F2630] hover:bg-[#283240] disabled:opacity-30 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCaption(caption.id);
                      }}
                      className="p-1 rounded bg-[#1F2630] hover:bg-[#2D1619] text-[#EF4444] transition-colors ml-1"
                      title="Delete Caption"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
