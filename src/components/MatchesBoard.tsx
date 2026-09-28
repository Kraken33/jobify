'use client';

import React, { useState, useMemo } from 'react';
import { MatchResult, SearchSession, ProviderCursor } from '@/types';
import { JobCard } from './JobCard';
import { Sparkles, ArrowUpDown, Filter, AlertCircle, RotateCcw } from 'lucide-react';

interface MatchesBoardProps {
  matches: MatchResult[];
  isLoading: boolean;
  onTriggerScan: () => void;
  hasApiKey: boolean;
  onOpenKeyModal: () => void;
  sessions?: SearchSession[];
  activeSessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  nextCursor?: ProviderCursor | null;
  onResetSession?: () => void;
}

export function MatchesBoard({
  matches,
  isLoading,
  onTriggerScan,
  hasApiKey,
  onOpenKeyModal,
  sessions = [],
  activeSessionId,
  onSessionChange,
  nextCursor,
  onResetSession,
}: MatchesBoardProps) {
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [remoteOnlyFilter, setRemoteOnlyFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'salary'>('score');

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => m.evaluation.score >= minScoreFilter)
      .filter((m) => (!remoteOnlyFilter ? true : m.job.isRemote))
      .sort((a, b) => {
        if (sortBy === 'score') {
          return b.evaluation.score - a.evaluation.score;
        }
        const aSalary = a.job.salaryRange?.max || a.job.salaryRange?.min || 0;
        const bSalary = b.job.salaryRange?.max || b.job.salaryRange?.min || 0;
        return bSalary - aSalary;
      });
  }, [matches, minScoreFilter, remoteOnlyFilter, sortBy]);

  // If nextCursor is explicitly null (after a scan returned no more items), disable "Scan Next Batch"
  // If nextCursor is undefined (initial before any scan), scanning is enabled.
  const isScanDisabled = isLoading || nextCursor === null;

  return (
    <div className="space-y-6">
      {/* Control Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">AI Matched Opportunities</h2>
          </div>
          <div className="text-xs text-neutral-400">
            {sessions.length > 1 ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-neutral-300">Session:</span>
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => onSessionChange?.(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 text-neutral-200 px-2 py-0.5 rounded-lg text-xs focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.skills.slice(0, 2).join(', ')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-0.5">
                <span className="font-medium text-neutral-300">
                  {activeSession?.name || 'Default Search'}
                </span>
                {activeSession?.skills && activeSession.skills.length > 0 && (
                  <span className="text-neutral-500 ml-1.5">
                    • {activeSession.skills.join(', ')}
                  </span>
                )}
              </div>
            )}
            <p className="mt-1">
              {matches.length > 0
                ? `Found ${matches.length} active positions scored by OpenAI for this session`
                : 'Scan JustJoin.it to find and score relevant job opportunities'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onResetSession && (
            <button
              type="button"
              onClick={onResetSession}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700 transition"
              title="Clear matches and reset pagination cursor to scan from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Session
            </button>
          )}

          <button
            type="button"
            onClick={hasApiKey ? onTriggerScan : onOpenKeyModal}
            disabled={isScanDisabled}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning & Scoring with AI...' : 'Scan Next Batch'}
          </button>
        </div>
      </div>

      {!hasApiKey && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">OpenAI API Key Required</p>
            <p className="text-amber-200/80 mt-0.5">
              Connect your OpenAI API key to enable AI fit evaluation and automated scoring.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenKeyModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg shrink-0 transition"
          >
            Connect Key
          </button>
        </div>
      )}

      {/* Filter / Sort bar if matches exist */}
      {matches.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Min Score:</span>
              <select
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 px-2.5 py-1 rounded-lg text-xs focus:outline-none"
              >
                <option value={0}>All Matches</option>
                <option value={60}>60%+ Match</option>
                <option value={75}>75%+ Strong</option>
                <option value={85}>85%+ Top Tier</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-200 transition">
              <input
                type="checkbox"
                checked={remoteOnlyFilter}
                onChange={(e) => setRemoteOnlyFilter(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-800 text-indigo-600 focus:ring-0"
              />
              <span>Remote Only</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'salary')}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 px-2.5 py-1 rounded-lg text-xs focus:outline-none"
            >
              <option value="score">Fit Score (Highest first)</option>
              <option value="salary">Salary (Highest first)</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-5 bg-neutral-800 rounded w-1/3" />
              <div className="h-4 bg-neutral-800/60 rounded w-1/4" />
              <div className="h-16 bg-neutral-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Job Cards List */}
      {!isLoading && filteredMatches.length > 0 && (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <JobCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && (
        <div className="text-center py-16 px-4 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
          <Sparkles className="w-10 h-10 text-indigo-400/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No job matches yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-5">
            Configure your target skills in the Profile tab and click Scan to discover personalized jobs on JustJoin.it.
          </p>
          <button
            type="button"
            onClick={hasApiKey ? onTriggerScan : onOpenKeyModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            Start First Scan
          </button>
        </div>
      )}

      {/* Filter empty state */}
      {!isLoading && matches.length > 0 && filteredMatches.length === 0 && (
        <div className="text-center py-12 px-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-xs text-neutral-400">
          No matches satisfy your filter criteria. Try lowering the minimum match score.
        </div>
      )}
    </div>
  );
}
