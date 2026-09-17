import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Caption } from '../types';
import { TimingEngine } from '../lib/timing';
import {
  Scissors,
  Copy,
  Trash2,
  GitMerge,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  Layers,
} from 'lucide-react';

interface TimelineProps {
  captions: Caption[];
  currentTime: number;
  duration: number;
  selectedCaptionId: string | null;
  onSelectCaption: (id: string) => void;
  onSeek: (time: number) => void;
  onUpdateCaptionTiming: (id: string, newStart: number, newEnd: number) => void;
  onSplitCaption: (id: string, splitTime: number) => void;
  onMergeCaption: (id: string) => void;
  onDuplicateCaption: (id: string) => void;
  onDeleteCaption: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  captions,
  currentTime,
  duration,
  selectedCaptionId,
  onSelectCaption,
  onSeek,
  onUpdateCaptionTiming,
  onSplitCaption,
  onMergeCaption,
  onDuplicateCaption,
  onDeleteCaption,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Pixels per second zoom factor
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(60);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);

  // Dragging state for caption blocks
  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'resize-start' | 'resize-end';
    captionId: string;
    initialX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const totalDuration = Math.max(10, duration || 10);
  const timelineWidth = Math.max(800, totalDuration * pixelsPerSecond + 100);

  // Auto-scroll timeline to keep playhead in view when playing
  useEffect(() => {
    if (containerRef.current && !dragAction) {
      const playheadX = currentTime * pixelsPerSecond;
      const scrollLeft = containerRef.current.scrollLeft;
      const viewWidth = containerRef.current.clientWidth;

      if (playheadX > scrollLeft + viewWidth - 100 || playheadX < scrollLeft) {
        containerRef.current.scrollLeft = Math.max(0, playheadX - 150);
      }
    }
  }, [currentTime, pixelsPerSecond, dragAction]);

  // Handle global mousemove and mouseup for timeline dragging
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingPlayhead && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newTime = Math.max(0, Math.min(totalDuration, offsetX / pixelsPerSecond));
        onSeek(newTime);
        return;
      }

      if (!dragAction) return;

      const deltaX = e.clientX - dragAction.initialX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (dragAction.type === 'move') {
        const duration = dragAction.initialEnd - dragAction.initialStart;
        let newStart = Math.max(0, dragAction.initialStart + deltaTime);
        let newEnd = newStart + duration;
        if (newEnd > totalDuration) {
          newEnd = totalDuration;
          newStart = Math.max(0, newEnd - duration);
        }
        onUpdateCaptionTiming(dragAction.captionId, Number(newStart.toFixed(3)), Number(newEnd.toFixed(3)));
      } else if (dragAction.type === 'resize-start') {
        let newStart = dragAction.initialStart + deltaTime;
        newStart = Math.max(0, Math.min(dragAction.initialEnd - 0.2, newStart));
        onUpdateCaptionTiming(dragAction.captionId, Number(newStart.toFixed(3)), dragAction.initialEnd);
      } else if (dragAction.type === 'resize-end') {
        let newEnd = dragAction.initialEnd + deltaTime;
        newEnd = Math.max(dragAction.initialStart + 0.2, Math.min(totalDuration, newEnd));
        onUpdateCaptionTiming(dragAction.captionId, dragAction.initialStart, Number(newEnd.toFixed(3)));
      }
    },
    [dragAction, isDraggingPlayhead, onSeek, onUpdateCaptionTiming, pixelsPerSecond, totalDuration]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    setDragAction(null);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead || dragAction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, dragAction, handleMouseMove, handleMouseUp]);

  // Click on ruler to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, offsetX / pixelsPerSecond));
    onSeek(newTime);
  };

  // Zoom controls
  const zoomIn = () => setPixelsPerSecond((prev) => Math.min(180, prev + 15));
  const zoomOut = () => setPixelsPerSecond((prev) => Math.max(20, prev - 15));
  const fitZoom = () => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth - 40;
      const calculated = Math.max(20, Math.min(120, w / totalDuration));
      setPixelsPerSecond(calculated);
    }
  };

  // Selected caption
  const selectedCaption = captions.find((c) => c.id === selectedCaptionId) || null;

  // Split selected caption at current playhead
  const handleSplitAtPlayhead = () => {
    if (selectedCaption) {
      if (currentTime > selectedCaption.start + 0.1 && currentTime < selectedCaption.end - 0.1) {
        onSplitCaption(selectedCaption.id, currentTime);
      }
    } else {
      // Find active caption under playhead
      const active = TimingEngine.getActiveCaption(captions, currentTime);
      if (active && currentTime > active.start + 0.1 && currentTime < active.end - 0.1) {
        onSplitCaption(active.id, currentTime);
      }
    }
  };

  // Generate ruler tick marks
  const tickStep = pixelsPerSecond < 35 ? 5 : pixelsPerSecond < 70 ? 2 : 1;
  const tickCount = Math.ceil(totalDuration / tickStep);
  const rulerTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep);

  return (
    <div className="h-44 bg-[#12161B] border-t border-[#252B33] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Timeline Toolbar */}
      <div className="h-9 border-b border-[#252B33] px-3 flex items-center justify-between bg-[#0E1217] shrink-0 text-xs">
        {/* Left: Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#181E25] hover:bg-[#252B33] text-[#CBD5E1] hover:text-white border border-[#252B33] transition-colors"
            title="Split Caption at Playhead (S)"
          >
            <Scissors className="w-3 h-3 text-[#F5B82E]" />
            <span className="hidden sm:inline">Split at Playhead</span>
          </button>

          {selectedCaption && (
            <>
              <button
                onClick={() => onDuplicateCaption(selectedCaption.id)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#181E25] hover:bg-[#252B33] text-[#CBD5E1] hover:text-white border border-[#252B33] transition-colors"
                title="Duplicate Caption"
              >
                <Copy className="w-3 h-3 text-[#3B82F6]" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              <button
                onClick={() => onMergeCaption(selectedCaption.id)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#181E25] hover:bg-[#252B33] text-[#CBD5E1] hover:text-white border border-[#252B33] transition-colors"
                title="Merge with Next Caption"
              >
                <GitMerge className="w-3 h-3 text-[#10B981]" />
                <span className="hidden sm:inline">Merge Next</span>
              </button>

              <button
                onClick={() => onDeleteCaption(selectedCaption.id)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#181E25] hover:bg-[#2D1619] text-[#CBD5E1] hover:text-[#EF4444] border border-[#252B33] transition-colors"
                title="Delete Caption (Del)"
              >
                <Trash2 className="w-3 h-3 text-[#EF4444]" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
        </div>

        {/* Center: Selected caption status */}
        <div className="hidden md:flex items-center gap-2 text-[#8D96A3]">
          {selectedCaption ? (
            <span className="truncate max-w-xs text-[#CBD5E1]">
              <span className="text-[#F5B82E] font-semibold">
                #{captions.findIndex((c) => c.id === selectedCaption.id) + 1}:
              </span>{' '}
              {selectedCaption.text}
            </span>
          ) : (
            <span className="italic">Click a caption block to edit on timeline</span>
          )}
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-1 text-[#8D96A3]">
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-[#181E25] hover:text-white transition-colors"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] w-10 text-center">{Math.round(pixelsPerSecond)}px/s</span>
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-[#181E25] hover:text-white transition-colors"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fitZoom}
            className="p-1 rounded hover:bg-[#181E25] hover:text-white transition-colors ml-1"
            title="Fit to Window"
            aria-label="Fit timeline to window"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive Ruler & Tracks Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0B0D10]"
      >
        <div
          ref={trackRef}
          style={{ width: `${timelineWidth}px` }}
          className="h-full relative select-none"
        >
          {/* 1. Time Ruler Bar */}
          <div
            onClick={handleRulerClick}
            className="h-6 border-b border-[#252B33] bg-[#141A22] relative cursor-pointer"
          >
            {rulerTicks.map((t) => (
              <div
                key={t}
                style={{ left: `${t * pixelsPerSecond}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
              >
                <div className="w-px h-2 bg-[#4A5568]" />
                <span className="text-[9px] font-mono text-[#8D96A3] -mt-0.5 select-none">
                  {TimingEngine.formatRulerTime(t)}
                </span>
              </div>
            ))}
          </div>

          {/* 2. Caption Tracks Layer */}
          <div className="h-24 relative p-1.5 flex flex-col justify-center">
            {captions.map((cap, idx) => {
              const left = cap.start * pixelsPerSecond;
              const width = Math.max(30, (cap.end - cap.start) * pixelsPerSecond);
              const isSelected = cap.id === selectedCaptionId;
              const isActive = currentTime >= cap.start && currentTime <= cap.end;

              return (
                <div
                  key={cap.id}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCaption(cap.id);
                  }}
                  onDoubleClick={() => onSeek(cap.start)}
                  className={`absolute top-3 h-14 rounded-md flex flex-col justify-between p-1.5 cursor-move transition-shadow group ${
                    isSelected
                      ? 'bg-[#2A2312] border-2 border-[#F5B82E] shadow-md shadow-[#F5B82E]/20 z-20'
                      : isActive
                      ? 'bg-[#1E2631] border border-[#3B82F6] z-10'
                      : 'bg-[#181E25] border border-[#252B33] hover:border-[#3B424D] z-0'
                  }`}
                  onMouseDown={(e) => {
                    // Check if clicked resize handles
                    if ((e.target as HTMLElement).dataset.handle) return;
                    setDragAction({
                      type: 'move',
                      captionId: cap.id,
                      initialX: e.clientX,
                      initialStart: cap.start,
                      initialEnd: cap.end,
                    });
                  }}
                >
                  {/* Left Resize Handle */}
                  <div
                    data-handle="start"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragAction({
                        type: 'resize-start',
                        captionId: cap.id,
                        initialX: e.clientX,
                        initialStart: cap.start,
                        initialEnd: cap.end,
                      });
                    }}
                    className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#F5B82E]/30 hover:bg-[#F5B82E] cursor-ew-resize rounded-l-md transition-colors"
                    title="Drag to trim start time"
                  />

                  {/* Caption Content snippet */}
                  <div className="px-2 flex items-center justify-between text-[11px] font-medium text-white truncate pointer-events-none">
                    <span className="text-[#F5B82E] font-bold mr-1">#{idx + 1}</span>
                    <span className="truncate flex-1">{cap.text}</span>
                  </div>

                  {/* Time badges at bottom of block */}
                  <div className="px-2 flex items-center justify-between text-[9px] font-mono text-[#8D96A3] pointer-events-none">
                    <span>{cap.start.toFixed(1)}s</span>
                    <span className="text-[#64748B]">{(cap.end - cap.start).toFixed(1)}s</span>
                    <span>{cap.end.toFixed(1)}s</span>
                  </div>

                  {/* Right Resize Handle */}
                  <div
                    data-handle="end"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragAction({
                        type: 'resize-end',
                        captionId: cap.id,
                        initialX: e.clientX,
                        initialStart: cap.start,
                        initialEnd: cap.end,
                      });
                    }}
                    className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#F5B82E]/30 hover:bg-[#F5B82E] cursor-ew-resize rounded-r-md transition-colors"
                    title="Drag to trim end time"
                  />
                </div>
              );
            })}
          </div>

          {/* 3. Playhead Scrub Needle */}
          <div
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
            className="absolute top-0 bottom-0 w-px bg-[#F5B82E] z-30 pointer-events-none"
          >
            {/* Playhead Top Pin */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingPlayhead(true);
              }}
              className="absolute -top-0.5 -left-2 w-4 h-4 bg-[#F5B82E] rotate-45 pointer-events-auto cursor-ew-resize shadow-md shadow-[#F5B82E]/40"
              title="Drag Playhead Needle"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
