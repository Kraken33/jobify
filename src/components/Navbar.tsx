'use client';

import React from 'react';
import { Sparkles, User, LayoutGrid, CheckSquare } from 'lucide-react';

interface NavbarProps {
  activeTab: 'matches' | 'applied' | 'profile';
  onTabChange: (tab: 'matches' | 'applied' | 'profile') => void;
  matchCount?: number;
  appliedCount?: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  matchCount = 0,
  appliedCount = 0,
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
            onClick={() => onTabChange('applied')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'applied'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Applied</span>
            {appliedCount > 0 && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                {appliedCount}
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
      </div>
    </header>
  );
}

