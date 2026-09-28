'use client';

import React from 'react';
import { Sparkles, Key, CheckCircle2, User, LayoutGrid } from 'lucide-react';
import { getMaskedApiKey } from '@/lib/storage/apiKeyStorage';

interface NavbarProps {
  activeTab: 'matches' | 'profile';
  onTabChange: (tab: 'matches' | 'profile') => void;
  hasApiKey: boolean;
  apiKey: string | null;
  onOpenKeyModal: () => void;
  matchCount?: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  hasApiKey,
  apiKey,
  onOpenKeyModal,
  matchCount = 0,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">Jobify</span>
            <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800/80 text-indigo-300">
              MVP
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-neutral-900 border border-neutral-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onTabChange('matches')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'matches'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Matches</span>
            {matchCount > 0 && (
              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                {matchCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'profile'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </nav>

        {/* BYOK Status & Trigger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenKeyModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              hasApiKey
                ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                : 'bg-indigo-950/60 border-indigo-800 text-indigo-300 hover:bg-indigo-900/60'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {hasApiKey ? getMaskedApiKey(apiKey) : 'Connect OpenAI Key'}
            </span>
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
