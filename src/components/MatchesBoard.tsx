'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CandidateProfile, MatchResult, SearchSession, ProviderCursor } from '@/types';
import { JobCard } from './JobCard';
import {
  Sparkles,
  ArrowUpDown,
  Filter,
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2,
  Landmark,
  BarChart3,
  ChevronDown,
  RefreshCw,
  Settings,
} from 'lucide-react';

const PROVIDER_LABELS: Record<string, string> = {
  justjoin: 'JustJoin.it',
  arbeitsagentur: 'Bundesagentur für Arbeit',
  arbeitnow: 'Arbeitnow',
};

interface MatchesBoardProps {
  profile?: CandidateProfile;
  matches: MatchResult[];
  isLoading: boolean;
  onTriggerScan: (limit?: unknown) => void;
  hasApiKey: boolean;
  onOpenKeyModal: () => void;
  sessions?: SearchSession[];
  activeSessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  nextCursor?: ProviderCursor | null;
  onResetSession?: () => void;
  onCreateSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onDismiss?: (matchId: string) => void;
  onApply?: (match: MatchResult) => void;
}

export function MatchesBoard({
  profile,
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
  onCreateSession,
  onDeleteSession,
  onDismiss,
  onApply,
}: MatchesBoardProps) {
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [remoteOnlyFilter, setRemoteOnlyFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'salary'>('score');

  const [batchSize, setBatchSize] = useState<number>(20);
  const [totalVacancies, setTotalVacancies] = useState<number | null>(null);
  const [isFetchingCount, setIsFetchingCount] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState<boolean>(false);
  const [customInputValue, setCustomInputValue] = useState<string>('25');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const providerLabel = useMemo(() => {
    const providerId = activeSession?.provider || 'justjoin';
    return PROVIDER_LABELS[providerId] || providerId;
  }, [activeSession]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTotalVacancies = useCallback(async () => {
    if (!profile) return;
    setIsFetchingCount(true);
    try {
      const response = await fetch('/api/session/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          providerId: activeSession?.provider || 'justjoin',
          sessionId: activeSession?.id,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.totalVacancies === 'number') {
          setTotalVacancies(data.totalVacancies);
        }
      }
    } catch {
      // silently ignore count fetch failure
    } finally {
      setIsFetchingCount(false);
    }
  }, [profile, activeSession]);

  useEffect(() => {
    fetchTotalVacancies();
  }, [activeSessionId, activeSession, fetchTotalVacancies]);

  // Active matches: exclude dismissed and applied
  const activeMatches = useMemo(() => {
    return matches.filter((m) => !m.status || m.status === 'active');
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return activeMatches
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
  }, [activeMatches, minScoreFilter, remoteOnlyFilter, sortBy]);

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
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-neutral-400">Track:</span>
              {sessions.length > 1 ? (
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => onSessionChange?.(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 text-neutral-200 px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.skills.slice(0, 3).join(', ')})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-neutral-200">
                    {activeSession?.name || 'Default Search'}
                  </span>
                  {activeSession?.skills && activeSession.skills.length > 0 && (
                    <span className="text-neutral-500">
                      • {activeSession.skills.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              )}

              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-[11px] font-medium text-neutral-300"
                title="Job provider queried by this search track"
              >
                <Landmark className="w-3 h-3 text-indigo-300" />
                {providerLabel}
              </span>

              {onCreateSession && (
                <button
                  type="button"
                  onClick={onCreateSession}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition"
                  title="Create a new search track"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Track
                </button>
              )}

              {onDeleteSession && sessions.length > 1 && activeSession && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete track "${activeSession.name}"?`)) {
                      onDeleteSession(activeSession.id);
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-neutral-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/60 rounded-lg text-xs transition"
                  title="Delete current search track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              {matches.length > 0
                ? `Found ${activeMatches.length} active position${activeMatches.length !== 1 ? 's' : ''} scored by OpenAI for this session`
                : `Scan ${providerLabel} to find and score relevant job opportunities`}
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

          {/* Total Vacancies & Prefetch Batch Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition"
              title="View total matching vacancies and configure prefetch batch size"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {isFetchingCount
                  ? '...'
                  : totalVacancies !== null
                  ? `${totalVacancies} Jobs`
                  : 'Total Jobs'}{' '}
                <span className="text-neutral-400 font-normal">({batchSize}/batch)</span>
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400 ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-2.5 py-2 bg-neutral-800/60 rounded-xl mb-2">
                  <div>
                    <span className="text-[11px] text-neutral-400 block font-medium">
                      Total Matching Vacancies
                    </span>
                    <span className="text-sm font-bold text-white">
                      {isFetchingCount ? (
                        <span className="text-neutral-400 text-xs font-normal">Counting...</span>
                      ) : totalVacancies !== null ? (
                        `${totalVacancies} active postings`
                      ) : (
                        'Unknown'
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchTotalVacancies()}
                    disabled={isFetchingCount}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition"
                    title="Refresh vacancy count"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingCount ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Prefetch Batch Size
                </div>

                {[5, 10, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setBatchSize(preset);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-medium transition ${
                      batchSize === preset
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{preset} jobs / batch</span>
                    {batchSize === preset && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </button>
                ))}

                <div className="border-t border-neutral-800 my-1.5" />

                {/* Last Item: Set Custom Amount */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomInputOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Set Custom Batch Amount...</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => (hasApiKey ? onTriggerScan(batchSize) : onOpenKeyModal())}
            disabled={isScanDisabled}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning & Scoring with AI...' : `Scan Batch (${batchSize})`}
          </button>
        </div>
      </div>

      {isCustomInputOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-semibold text-white">Custom Batch Prefetch Limit</h3>
            <p className="text-xs text-neutral-400">
              Enter the number of job postings to evaluate with AI per scan batch (1–100).
            </p>
            <input
              type="number"
              min={1}
              max={100}
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomInputOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(customInputValue, 10);
                  if (!isNaN(val) && val > 0) {
                    setBatchSize(Math.min(100, Math.max(1, val)));
                    setIsCustomInputOpen(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                Set Limit
              </button>
            </div>
          </div>
        </div>
      )}

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
      {activeMatches.length > 0 && (
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
            <JobCard
              key={match.id}
              match={match}
              onDismiss={onDismiss}
              onApply={onApply}
            />
          ))}
        </div>
      )}

      {/* Empty State — no matches at all */}
      {!isLoading && activeMatches.length === 0 && matches.length === 0 && (
        <div className="text-center py-16 px-4 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
          <Sparkles className="w-10 h-10 text-indigo-400/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No job matches yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-5">
            Configure your target skills in the Profile tab and click Scan to discover personalized jobs on{' '}
            {providerLabel}.
          </p>
          <button
            type="button"
            onClick={() => (hasApiKey ? onTriggerScan() : onOpenKeyModal())}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            Start First Scan
          </button>
        </div>
      )}

      {/* Empty State — all dismissed/applied */}
      {!isLoading && activeMatches.length === 0 && matches.length > 0 && (
        <div className="text-center py-12 px-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-xs text-neutral-400">
          All matches have been actioned. Scan for new opportunities or reset the session.
        </div>
      )}

      {/* Filter empty state */}
      {!isLoading && activeMatches.length > 0 && filteredMatches.length === 0 && (
        <div className="text-center py-12 px-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-xs text-neutral-400">
          No matches satisfy your filter criteria. Try lowering the minimum match score.
        </div>
      )}
    </div>
  );
}

