import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Caption,
  BrandKit,
  SafeZonePreset,
  TabType,
  VideoMetadata,
  ToastMessage,
  CaptionStats,
  StylePresetId,
  CaptionStyle,
  AnimationType,
  ProjectData,
} from './types';
import { Header } from './components/Header';
import { VideoPreview } from './components/VideoPreview';
import { Timeline } from './components/Timeline';
import { CreateTab } from './components/Tabs/CreateTab';
import { EditTab } from './components/Tabs/EditTab';
import { StyleTab } from './components/Tabs/StyleTab';
import { AnimateTab } from './components/Tabs/AnimateTab';
import { BrandTab } from './components/Tabs/BrandTab';
import { ExportTab } from './components/Tabs/ExportTab';
import { SettingsTab } from './components/Tabs/SettingsTab';
import { AutoCaptionModal } from './components/AutoCaptionModal';
import { ToastContainer } from './components/Toast';
import { ProjectStorage } from './lib/storage';
import { BrandManager } from './lib/brand';
import { TimingEngine } from './lib/timing';
import { getStylePreset } from './lib/styles';
import { createDemoVideoBlob, DEMO_SAMPLE_CAPTIONS } from './lib/demoVideo';
import {
  PlusCircle,
  Edit3,
  Palette,
  Sparkles,
  Shield,
  Download,
  Settings,
} from 'lucide-react';

export default function App() {
  // Video and playback state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Captions state
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<Caption[][]>([]);
  const [future, setFuture] = useState<Caption[][]>([]);

  // Brand Kit
  const [brandKit, setBrandKit] = useState<BrandKit>(BrandManager.loadBrand());

  // Safe Zone Settings
  const [safeZone, setSafeZone] = useState<SafeZonePreset>('9:16');
  const [safeMarginX, setSafeMarginX] = useState<number>(10);
  const [safeMarginY, setSafeMarginY] = useState<number>(12);
  const [readingSpeedThreshold, setReadingSpeedThreshold] = useState<number>(18);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('create');

  // Modals & Toasts
  const [isAutoCaptionOpen, setIsAutoCaptionOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add toast helper
  const addToast = useCallback((type: 'success' | 'info' | 'warning' | 'error', text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update captions with undo history tracking
  const updateCaptionsWithHistory = useCallback(
    (newCaptions: Caption[]) => {
      setHistory((prev) => [...prev.slice(-30), captions]);
      setFuture([]);
      setCaptions(newCaptions);
    },
    [captions]
  );

  // Undo handler
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [captions, ...prev]);
    setCaptions(previous);
    addToast('info', 'Undo');
  }, [history, captions, addToast]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, captions]);
    setCaptions(next);
    addToast('info', 'Redo');
  }, [future, captions, addToast]);

  // Handle Video File selection
  const handleVideoFile = useCallback((file: File) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Read metadata via temporary video element
    const tempVid = document.createElement('video');
    tempVid.preload = 'metadata';
    tempVid.onloadedmetadata = () => {
      const dur = tempVid.duration || 10;
      setDuration(dur);
      setVideoMetadata({
        name: file.name,
        duration: dur,
        width: tempVid.videoWidth || 1280,
        height: tempVid.videoHeight || 720,
        fps: 30,
        size: file.size,
      });
      setCurrentTime(0);
    };
    tempVid.src = url;
  }, [videoUrl]);

  // Load offline demo sample video & captions
  const handleLoadSample = useCallback(async () => {
    addToast('info', 'Generating dynamic demo reel with canvas & audio synth...');
    try {
      const { url } = await createDemoVideoBlob();
      setVideoUrl(url);
      setDuration(10);
      setVideoMetadata({
        name: 'CaptionFlow_Demo_Reel.webm',
        duration: 10,
        width: 1280,
        height: 720,
        fps: 30,
        size: 512000,
      });
      setCaptions(DEMO_SAMPLE_CAPTIONS);
      setSelectedCaptionId(DEMO_SAMPLE_CAPTIONS[0].id);
      setActiveTab('edit');
      addToast('success', 'Loaded demo reel! Hit Space or Play to preview captions.');
    } catch (err: any) {
      addToast('error', `Failed to generate demo reel: ${err.message}`);
    }
  }, [addToast]);

  // Video play/pause toggle
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek video to timestamp
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(duration, time));
      setCurrentTime(video.currentTime);
    } else {
      setCurrentTime(time);
    }
  }, [duration]);

  // Caption operations
  const handleSelectCaption = useCallback((id: string) => {
    setSelectedCaptionId(id);
    // Seek video to caption start
    const cap = captions.find((c) => c.id === id);
    if (cap) {
      handleSeek(cap.start);
    }
  }, [captions, handleSeek]);

  const handleUpdateCaptionText = useCallback(
    (id: string, newText: string) => {
      const updated = captions.map((c) => {
        if (c.id !== id) return c;
        const words = TimingEngine.estimateWordTimings(newText, c.start, c.end);
        return { ...c, text: newText, words };
      });
      setCaptions(updated);
    },
    [captions]
  );

  const handleUpdateCaptionTiming = useCallback(
    (id: string, newStart: number, newEnd: number) => {
      const updated = captions.map((c) => {
        if (c.id !== id) return c;
        const words = TimingEngine.estimateWordTimings(c.text, newStart, newEnd);
        return { ...c, start: newStart, end: newEnd, words };
      });
      updateCaptionsWithHistory(updated);
    },
    [captions, updateCaptionsWithHistory]
  );

  const handleSplitCaption = useCallback(
    (id: string, splitTime: number) => {
      const idx = captions.findIndex((c) => c.id === id);
      if (idx === -1) return;

      const target = captions[idx];
      if (splitTime <= target.start + 0.1 || splitTime >= target.end - 0.1) {
        addToast('warning', 'Cannot split at boundaries.');
        return;
      }

      const words = target.text.trim().split(/\s+/).filter(Boolean);
      const mid = Math.max(1, Math.floor(words.length / 2));
      const text1 = words.slice(0, mid).join(' ');
      const text2 = words.slice(mid).join(' ');

      const cap1: Caption = {
        ...target,
        id: `cap-${Date.now()}-1`,
        end: Number(splitTime.toFixed(2)),
        text: text1,
        words: TimingEngine.estimateWordTimings(text1, target.start, splitTime),
      };

      const cap2: Caption = {
        ...target,
        id: `cap-${Date.now()}-2`,
        start: Number(splitTime.toFixed(2)),
        text: text2,
        words: TimingEngine.estimateWordTimings(text2, splitTime, target.end),
      };

      const newCaptions = [...captions.slice(0, idx), cap1, cap2, ...captions.slice(idx + 1)];
      updateCaptionsWithHistory(newCaptions);
      setSelectedCaptionId(cap2.id);
      addToast('success', 'Split caption into two.');
    },
    [captions, updateCaptionsWithHistory, addToast]
  );

  const handleMergeCaption = useCallback(
    (id: string) => {
      const idx = captions.findIndex((c) => c.id === id);
      if (idx === -1 || idx >= captions.length - 1) return;

      const current = captions[idx];
      const next = captions[idx + 1];
      const mergedText = `${current.text} ${next.text}`;

      const merged: Caption = {
        ...current,
        id: `cap-${Date.now()}`,
        end: next.end,
        text: mergedText,
        words: TimingEngine.estimateWordTimings(mergedText, current.start, next.end),
      };

      const newCaptions = [...captions.slice(0, idx), merged, ...captions.slice(idx + 2)];
      updateCaptionsWithHistory(newCaptions);
      setSelectedCaptionId(merged.id);
      addToast('success', 'Merged with next caption.');
    },
    [captions, updateCaptionsWithHistory, addToast]
  );

  const handleDuplicateCaption = useCallback(
    (id: string) => {
      const target = captions.find((c) => c.id === id);
      if (!target) return;

      const dur = target.end - target.start;
      const newStart = Number(target.end.toFixed(2));
      const newEnd = Number((target.end + dur).toFixed(2));

      const duplicated: Caption = {
        ...target,
        id: `cap-${Date.now()}`,
        start: newStart,
        end: newEnd,
        words: TimingEngine.estimateWordTimings(target.text, newStart, newEnd),
      };

      const newCaptions = [...captions, duplicated].sort((a, b) => a.start - b.start);
      updateCaptionsWithHistory(newCaptions);
      setSelectedCaptionId(duplicated.id);
      addToast('success', 'Duplicated caption.');
    },
    [captions, updateCaptionsWithHistory, addToast]
  );

  const handleDeleteCaption = useCallback(
    (id: string) => {
      const newCaptions = captions.filter((c) => c.id !== id);
      updateCaptionsWithHistory(newCaptions);
      if (selectedCaptionId === id) {
        setSelectedCaptionId(newCaptions[0]?.id || null);
      }
      addToast('info', 'Deleted caption.');
    },
    [captions, selectedCaptionId, updateCaptionsWithHistory, addToast]
  );

  const handleReorderCaption = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= captions.length || toIdx >= captions.length) return;
      const reordered = [...captions];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      updateCaptionsWithHistory(reordered);
    },
    [captions, updateCaptionsWithHistory]
  );

  const handleAddCaptionAtCurrentTime = useCallback(() => {
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(duration, currentTime + 2.5).toFixed(2));
    const newCap: Caption = {
      id: `cap-${Date.now()}`,
      start,
      end,
      text: 'New Caption',
      words: TimingEngine.estimateWordTimings('New Caption', start, end),
      style: 'viral',
      animation: 'pop',
    };

    const newCaptions = [...captions, newCap].sort((a, b) => a.start - b.start);
    updateCaptionsWithHistory(newCaptions);
    setSelectedCaptionId(newCap.id);
    addToast('success', 'Added new caption at playhead.');
  }, [currentTime, duration, captions, updateCaptionsWithHistory, addToast]);

  // Style Operations
  const handleApplyStylePreset = useCallback(
    (presetId: StylePresetId, applyToAll: boolean) => {
      const preset = getStylePreset(presetId);
      const updated = captions.map((c) => {
        if (applyToAll || c.id === selectedCaptionId) {
          return {
            ...c,
            style: presetId,
            customStyle: { ...preset },
          };
        }
        return c;
      });
      updateCaptionsWithHistory(updated);
    },
    [captions, selectedCaptionId, updateCaptionsWithHistory]
  );

  const handleUpdateStyleProperty = useCallback(
    <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K], applyToAll: boolean) => {
      const updated = captions.map((c) => {
        if (applyToAll || c.id === selectedCaptionId) {
          return {
            ...c,
            customStyle: {
              ...(c.customStyle || getStylePreset((c.style as StylePresetId) || 'viral')),
              [key]: value,
            },
          };
        }
        return c;
      });
      updateCaptionsWithHistory(updated);
    },
    [captions, selectedCaptionId, updateCaptionsWithHistory]
  );

  // Animation Operations
  const handleApplyAnimation = useCallback(
    (animation: AnimationType, scope: 'selected' | 'current' | 'all') => {
      const updated = captions.map((c) => {
        if (scope === 'all' || (scope === 'selected' && c.id === selectedCaptionId)) {
          return { ...c, animation };
        }
        return c;
      });
      updateCaptionsWithHistory(updated);
    },
    [captions, selectedCaptionId, updateCaptionsWithHistory]
  );

  // Apply Brand Kit to captions
  const handleApplyBrandKit = useCallback(() => {
    const updated = captions.map((c) => ({
      ...c,
      customStyle: {
        ...(c.customStyle || {}),
        textColor: brandKit.textColor,
        highlightColor: brandKit.accentColor,
        fontFamily: brandKit.fontFamily,
        fontWeight: brandKit.fontWeight,
      },
    }));
    updateCaptionsWithHistory(updated);
    addToast('success', 'Applied brand kit styling to all captions!');
  }, [captions, brandKit, updateCaptionsWithHistory, addToast]);

  // Save Project JSON
  const handleSaveProject = useCallback(() => {
    const project = ProjectStorage.createProjectData({
      name: videoMetadata ? `CaptionFlow_${videoMetadata.name.replace(/\.[^/.]+$/, '')}` : 'CaptionFlow_Project',
      captions,
      brandKit,
      safeZone,
      safeMarginX,
      safeMarginY,
    });
    ProjectStorage.downloadProjectJSON(project, `${project.name}.json`);
    addToast('success', `Saved project JSON!`);
  }, [videoMetadata, captions, brandKit, safeZone, safeMarginX, safeMarginY, addToast]);

  // Load Project Data from JSON
  const handleLoadProjectData = useCallback((data: ProjectData) => {
    setCaptions(data.captions);
    if (data.brandKit) setBrandKit(data.brandKit);
    if (data.settings) {
      setSafeZone(data.settings.safeZone);
      setSafeMarginX(data.settings.safeMarginX);
      setSafeMarginY(data.settings.safeMarginY);
    }
    if (data.captions.length > 0) {
      setSelectedCaptionId(data.captions[0].id);
    }
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }
      // Arrow Left: Step -0.1s
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTime - 0.1);
      }
      // Arrow Right: Step +0.1s
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + 0.1);
      }
      // Ctrl/Cmd + Z: Undo
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S: Save Project
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        handleSaveProject();
      }
      // Delete: Delete selected caption
      else if (e.code === 'Delete' && selectedCaptionId) {
        e.preventDefault();
        handleDeleteCaption(selectedCaptionId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    handleSeek,
    handleUndo,
    handleRedo,
    handleSaveProject,
    handleDeleteCaption,
    currentTime,
    selectedCaptionId,
  ]);

  // Calculate statistics
  const stats: CaptionStats = {
    totalCaptions: captions.length,
    totalWords: captions.reduce((acc, c) => acc + (c.words?.length || c.text.split(/\s+/).filter(Boolean).length), 0),
    totalDuration: captions.reduce((acc, c) => acc + (c.end - c.start), 0),
    readingSpeed: TimingEngine.calculateReadingSpeed(captions),
  };

  const selectedCaption = captions.find((c) => c.id === selectedCaptionId) || null;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'edit', label: 'Edit', icon: Edit3 },
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'animate', label: 'Animate', icon: Sparkles },
    { id: 'brand', label: 'Brand', icon: Shield },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0D10] text-[#CBD5E1] overflow-hidden">
      {/* Top Application Header */}
      <Header
        videoMetadata={videoMetadata}
        stats={stats}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onLoadSample={handleLoadSample}
        onSaveProject={handleSaveProject}
        onLoadProjectData={handleLoadProjectData}
        onExportClick={() => setActiveTab('export')}
        onToast={addToast}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Area: Video Stage & Interactive Timeline */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#252B33] bg-[#0B0D10]">
          {/* Video Preview Canvas Stage */}
          <VideoPreview
            videoUrl={videoUrl}
            videoRef={videoRef}
            videoMetadata={videoMetadata}
            captions={captions}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            safeZone={safeZone}
            safeMarginX={safeMarginX}
            safeMarginY={safeMarginY}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onLoadSample={handleLoadSample}
            onUploadClick={() => setActiveTab('create')}
          />

          {/* Interactive Timeline Track */}
          <Timeline
            captions={captions}
            currentTime={currentTime}
            duration={duration}
            selectedCaptionId={selectedCaptionId}
            onSelectCaption={handleSelectCaption}
            onSeek={handleSeek}
            onUpdateCaptionTiming={handleUpdateCaptionTiming}
            onSplitCaption={handleSplitCaption}
            onMergeCaption={handleMergeCaption}
            onDuplicateCaption={handleDuplicateCaption}
            onDeleteCaption={handleDeleteCaption}
          />
        </div>

        {/* Right Sidebar: Tabs & Inspector Panels */}
        <div className="w-80 md:w-96 lg:w-[420px] shrink-0 flex flex-col bg-[#12161B] overflow-hidden">
          {/* Tab Navigation Header */}
          <div className="flex items-center border-b border-[#252B33] bg-[#0E1217] overflow-x-auto no-scrollbar shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'text-[#F5B82E] border-[#F5B82E] bg-[#161B22]'
                      : 'text-[#8D96A3] border-transparent hover:text-[#CBD5E1] hover:bg-[#14181F]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto bg-[#12161B]">
            {activeTab === 'create' && (
              <CreateTab
                onVideoFileSelect={handleVideoFile}
                onLoadSampleVideo={handleLoadSample}
                onImportCaptions={(newCaps, source) => {
                  updateCaptionsWithHistory(newCaps);
                  if (newCaps.length > 0) setSelectedCaptionId(newCaps[0].id);
                  setActiveTab('edit');
                }}
                onOpenAutoCaption={() => setIsAutoCaptionOpen(true)}
                onToast={addToast}
                videoDuration={duration}
              />
            )}

            {activeTab === 'edit' && (
              <EditTab
                captions={captions}
                selectedCaptionId={selectedCaptionId}
                currentTime={currentTime}
                readingSpeedThreshold={readingSpeedThreshold}
                onSelectCaption={handleSelectCaption}
                onUpdateCaptionText={handleUpdateCaptionText}
                onUpdateCaptionTiming={handleUpdateCaptionTiming}
                onSplitCaption={handleSplitCaption}
                onMergeCaption={handleMergeCaption}
                onDuplicateCaption={handleDuplicateCaption}
                onDeleteCaption={handleDeleteCaption}
                onReorderCaption={handleReorderCaption}
                onAddCaptionAtCurrentTime={handleAddCaptionAtCurrentTime}
                onApplyCleanedCaptions={(cleaned, action) => {
                  updateCaptionsWithHistory(cleaned);
                }}
                onToast={addToast}
              />
            )}

            {activeTab === 'style' && (
              <StyleTab
                selectedCaption={selectedCaption}
                onApplyStylePreset={handleApplyStylePreset}
                onUpdateStyleProperty={handleUpdateStyleProperty}
                onToast={addToast}
              />
            )}

            {activeTab === 'animate' && (
              <AnimateTab
                selectedCaption={selectedCaption}
                onApplyAnimation={handleApplyAnimation}
                onToast={addToast}
              />
            )}

            {activeTab === 'brand' && (
              <BrandTab
                brandKit={brandKit}
                onUpdateBrandKit={(updated) => setBrandKit(updated)}
                onApplyBrandKitToCaptions={handleApplyBrandKit}
                onToast={addToast}
              />
            )}

            {activeTab === 'export' && (
              <ExportTab
                captions={captions}
                brandKit={brandKit}
                safeZone={safeZone}
                safeMarginX={safeMarginX}
                safeMarginY={safeMarginY}
                videoRef={videoRef}
                videoMetadata={videoMetadata}
                onToast={addToast}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                safeZone={safeZone}
                safeMarginX={safeMarginX}
                safeMarginY={safeMarginY}
                readingSpeedThreshold={readingSpeedThreshold}
                onUpdateSafeZone={(preset) => setSafeZone(preset)}
                onUpdateSafeMarginX={(val) => setSafeMarginX(val)}
                onUpdateSafeMarginY={(val) => setSafeMarginY(val)}
                onUpdateReadingSpeedThreshold={(val) => setReadingSpeedThreshold(val)}
                onResetProject={() => {
                  setCaptions([]);
                  setSelectedCaptionId(null);
                  addToast('info', 'Captions reset.');
                }}
                onClearAllStorage={() => {
                  ProjectStorage.clearAll();
                  setCaptions([]);
                  setSelectedCaptionId(null);
                  setBrandKit(BrandManager.getDefaultBrandKit());
                  addToast('info', 'Cleared all local storage data.');
                }}
                onToast={addToast}
              />
            )}
          </div>
        </div>
      </div>

      {/* Auto Caption Web Speech API Modal */}
      <AutoCaptionModal
        isOpen={isAutoCaptionOpen}
        videoElement={videoRef.current}
        onClose={() => setIsAutoCaptionOpen(false)}
        onCaptionsGenerated={(newCaps) => {
          updateCaptionsWithHistory(newCaps);
          if (newCaps.length > 0) setSelectedCaptionId(newCaps[0].id);
          setActiveTab('edit');
        }}
        onToast={addToast}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
