import React, { useRef, useState } from 'react';
import { VideoMetadata, CaptionStats, ProjectData } from '../types';
import { Undo2, Redo2, Download, Upload, Sparkles, Film, FileJson, Clock, Archive, Loader2 } from 'lucide-react';
import { ProjectStorage } from '../lib/storage';
import { downloadToolZip } from '../lib/zipExporter';

interface HeaderProps {
  videoMetadata: VideoMetadata | null;
  stats: CaptionStats;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onLoadSample: () => void;
  onSaveProject: () => void;
  onLoadProjectData: (project: ProjectData) => void;
  onExportClick: () => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  videoMetadata,
  stats,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onLoadSample,
  onSaveProject,
  onLoadProjectData,
  onExportClick,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      onToast('info', 'Packaging complete CaptionFlow AI Standalone Tool into .ZIP...');
      await downloadToolZip();
      onToast('success', 'CaptionFlow AI Tool .ZIP downloaded successfully!');
    } catch (err: any) {
      onToast('error', `Failed to generate ZIP: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const project = ProjectStorage.parseProjectJSON(text);
        onLoadProjectData(project);
        onToast('success', `Loaded project: ${project.name}`);
      } catch (err: any) {
        onToast('error', `Failed to load project: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 border-b border-[#252B33] bg-[#12161B] px-4 flex items-center justify-between shrink-0 select-none">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F5B82E] flex items-center justify-center text-[#0B0D10] font-black text-lg shadow-md shadow-[#F5B82E]/20">
          CF
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-tight">CaptionFlow</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#F5B82E]/15 text-[#F5B82E] border border-[#F5B82E]/30">
              AI
            </span>
          </div>
          <span className="text-[11px] text-[#8D96A3] -mt-0.5">Standalone Browser Studio</span>
        </div>

        {/* Video info badge */}
        {videoMetadata && (
          <div className="hidden lg:flex items-center gap-2 ml-4 px-2.5 py-1 rounded-md bg-[#181E25] border border-[#252B33] text-xs text-[#CBD5E1]">
            <Film className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span className="truncate max-w-[140px] font-medium">{videoMetadata.name}</span>
            <span className="text-[#8D96A3]">|</span>
            <span>{videoMetadata.width}x{videoMetadata.height}</span>
            <span className="text-[#8D96A3]">|</span>
            <span>{videoMetadata.duration.toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Quick stats indicator */}
      <div className="hidden md:flex items-center gap-4 text-xs text-[#8D96A3]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#CBD5E1] font-semibold">{stats.totalCaptions}</span>
          <span>captions</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[#CBD5E1] font-semibold">{stats.totalWords}</span>
          <span>words</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#F5B82E]" />
          <span className={`font-semibold ${stats.readingSpeed > 18 ? 'text-[#EF4444]' : 'text-[#CBD5E1]'}`}>
            {stats.readingSpeed} w/s
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center rounded-md bg-[#181E25] border border-[#252B33] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              canUndo ? 'text-white hover:bg-[#252B33]' : 'text-[#4A5568] cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last action"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-[#252B33] mx-0.5" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              canRedo ? 'text-white hover:bg-[#252B33]' : 'text-[#4A5568] cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo last action"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Demo reel 1-click test button */}
        <button
          onClick={onLoadSample}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1B2129] hover:bg-[#252B33] text-xs font-semibold text-[#F5B82E] border border-[#F5B82E]/30 transition-colors"
          title="Synthesize and load a 10s sample video + captions to test immediately"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Demo Reel</span>
        </button>

        {/* Project JSON Save/Load */}
        <div className="flex items-center rounded-md bg-[#181E25] border border-[#252B33] p-0.5">
          <button
            onClick={onSaveProject}
            className="p-1.5 rounded text-xs text-[#CBD5E1] hover:text-white hover:bg-[#252B33] flex items-center gap-1"
            title="Save Project as JSON"
            aria-label="Save Project"
          >
            <FileJson className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="hidden xl:inline">Save</span>
          </button>
          <div className="w-px h-3.5 bg-[#252B33] mx-0.5" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded text-xs text-[#CBD5E1] hover:text-white hover:bg-[#252B33] flex items-center gap-1"
            title="Open Project JSON"
            aria-label="Open Project JSON"
          >
            <Upload className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="hidden xl:inline">Load</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProjectFileChange}
            accept=".json,application/json"
            className="hidden"
          />
        </div>

        {/* Tool ZIP Download */}
        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1B2129] hover:bg-[#252B33] text-xs font-semibold text-[#CBD5E1] hover:text-white border border-[#252B33] transition-colors cursor-pointer"
          title="Download complete tool as standalone .ZIP archive"
        >
          {isZipping ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B82E]" />
          ) : (
            <Archive className="w-3.5 h-3.5 text-[#F5B82E]" />
          )}
          <span>Tool .ZIP</span>
        </button>

        {/* Export action */}
        <button
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F5B82E] hover:bg-[#E5A81E] text-xs font-bold text-[#0B0D10] shadow-sm shadow-[#F5B82E]/20 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 4K</span>
        </button>
      </div>
    </header>
  );
};
