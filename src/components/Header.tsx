import React from 'react';
import {
  Sparkles,
  Settings,
  Share2,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Tv,
  Headphones
} from 'lucide-react';

interface HeaderProps {
  isListening: boolean;
  onOpenSettings: () => void;
  onOpenSummary: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenHeadphoneGuide: () => void;
  onRequestPip: () => void;
  isPipActive: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isListening,
  onOpenSettings,
  onOpenSummary,
  onOpenShare,
  onOpenExport,
  onOpenHeadphoneGuide,
  onRequestPip,
  isPipActive,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#080b11]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
              <Tv className="w-5 h-5 text-cyan-400" />
            </div>
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CHAKEN Sub
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full">
                AI Realtime
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Meeting Subtitles & Live Translation (EN ➔ TH)
            </p>
          </div>
        </div>

        {/* Translation Language Badge */}
        <div className="hidden md:flex items-center bg-slate-900/90 border border-slate-700/60 rounded-full px-3.5 py-1.5 shadow-inner">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            English (Source)
          </span>
          <span className="mx-2 text-slate-500">➔</span>
          <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            ภาษาไทย (แปลสด)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* PiP Floating Window */}
          <button
            onClick={onRequestPip}
            title="Floating Subtitle Window (Always on top of Zoom/Meet)"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-200 ${
              isPipActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Floating PiP</span>
          </button>

          {/* Smart AI Summary */}
          <button
            onClick={onOpenSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 hover:from-indigo-600/50 hover:to-cyan-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">AI Minutes</span>
          </button>

          {/* Share */}
          <button
            onClick={onOpenShare}
            title="Share Live Subtitle Stream"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Export */}
          <button
            onClick={onOpenExport}
            title="Export Subtitles (.SRT / .TXT)"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Headphone Setup Guide */}
          <button
            onClick={onOpenHeadphoneGuide}
            title="ใช้ Headphone (Setup Guide)"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            title="Toggle Conference Presentation Mode"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Settings & Terminology"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
