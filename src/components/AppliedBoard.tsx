'use client';

import React, { useState, useMemo } from 'react';
import { MatchResult } from '@/types';
import {
  CheckSquare,
  Building,
  MapPin,
  Sparkles,
  ExternalLink,
  Eye,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Banknote,
  Wifi,
  Globe,
} from 'lucide-react';

interface AppliedBoardProps {
  appliedMatches: MatchResult[];
  onRemoveFromApplied: (matchId: string) => void;
}

export function AppliedBoard({ appliedMatches, onRemoveFromApplied }: AppliedBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'title' | 'company'>('score');
  const [expandedMatchIds, setExpandedMatchIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMatchIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const filteredApplied = useMemo(() => {
    return appliedMatches
      .filter((m) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
          m.job.title.toLowerCase().includes(query) ||
          m.job.company.toLowerCase().includes(query) ||
          m.job.requiredSkills.some((s) => s.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return b.evaluation.score - a.evaluation.score;
        }
        if (sortBy === 'company') {
          return a.job.company.localeCompare(b.job.company);
        }
        return a.job.title.localeCompare(b.job.title);
      });
  }, [appliedMatches, searchTerm, sortBy]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80';
    if (score >= 60) return 'text-indigo-300 bg-indigo-950/70 border-indigo-800/80';
    if (score >= 40) return 'text-amber-400 bg-amber-950/70 border-amber-800/80';
    return 'text-rose-400 bg-rose-950/70 border-rose-800/80';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-indigo-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Applied Applications Tracker</h2>
          </div>
          <p className="text-xs text-neutral-400">
            {appliedMatches.length > 0
              ? `Tracking ${appliedMatches.length} job application${appliedMatches.length !== 1 ? 's' : ''} across all your search tracks.`
              : 'Keep track of all your submitted applications in one place.'}
          </p>
        </div>

        {appliedMatches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-mono">
              {appliedMatches.length} Applied
            </span>
          </div>
        )}
      </div>

      {/* Search & Sort Bar */}
      {appliedMatches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applied jobs by role, company, skill..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 self-end sm:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'title' | 'company')}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
            >
              <option value="score">Match Score (Highest)</option>
              <option value="title">Job Title</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
      )}

      {/* Applied Cards List */}
      {filteredApplied.length > 0 && (
        <div className="space-y-4">
          {filteredApplied.map((match) => {
            const { job, evaluation } = match;
            const isExpanded = expandedMatchIds[match.id] !== false; // Default expanded

            return (
              <div
                key={match.id}
                className="bg-neutral-900/90 border border-emerald-900/30 hover:border-emerald-800/50 rounded-2xl p-5 shadow-lg transition-all duration-200"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800/80">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {job.title}
                      </h3>
                      {job.isRemote && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
                          <Wifi className="w-3 h-3" /> Remote
                        </span>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 uppercase tracking-wide">
                        {job.seniority}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                        <CheckSquare className="w-3 h-3 text-emerald-400" /> Applied
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-0.5">
                      <span className="flex items-center gap-1 text-neutral-300 font-medium">
                        <Building className="w-3.5 h-3.5 text-neutral-500" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                        {job.city || (job.isRemote ? 'Remote' : 'Poland')}
                      </span>
                      {job.salaryRange && (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                          {job.salaryRange.min?.toLocaleString()}
                          {job.salaryRange.max ? ` - ${job.salaryRange.max.toLocaleString()}` : '+'}{' '}
                          {job.salaryRange.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fit score badge & actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${getScoreColor(
                        evaluation.score
                      )}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{evaluation.score}% Match</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition"
                        title="View original job posting"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Job</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>

                      <button
                        type="button"
                        onClick={() => onRemoveFromApplied(match.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-300 border border-neutral-700 hover:border-red-800/80 text-xs font-medium transition"
                        title="Remove from Applied status back to active matches"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tech & Language Tags */}
                <div className="flex flex-wrap gap-1.5 py-3">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.spokenLanguages &&
                    job.spokenLanguages.map((lang) => (
                      <span
                        key={lang.language}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-medium"
                      >
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span>{lang.language}</span>
                        <span className="px-1 text-[9px] uppercase font-bold rounded bg-emerald-900 text-emerald-200">
                          {lang.level}
                        </span>
                      </span>
                    ))}
                </div>

                {/* AI Evaluation Accordion */}
                <div className="mt-1 pt-3 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => toggleExpand(match.id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-neutral-400 hover:text-white transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${getScoreBadge(evaluation.score)}`} />
                      <span className="font-semibold text-neutral-200">AI Evaluation:</span>{' '}
                      {evaluation.verdict}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/70 text-xs">
                      {evaluation.summary && (
                        <p className="text-neutral-300 leading-relaxed italic">&ldquo;{evaluation.summary}&rdquo;</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Pros */}
                        {evaluation.pros.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                            </span>
                            <ul className="space-y-1 text-neutral-300">
                              {evaluation.pros.map((pro, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-emerald-500 font-bold">•</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Gaps */}
                        {evaluation.gaps.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Skill Gaps / Notes
                            </span>
                            <ul className="space-y-1 text-neutral-300">
                              {evaluation.gaps.map((gap, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-amber-500 font-bold">•</span>
                                  <span>{gap}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {appliedMatches.length === 0 && (
        <div className="text-center py-16 px-4 bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
          <CheckSquare className="w-10 h-10 text-emerald-400/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No applications tracked yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
            When you mark job matches as Applied from the Matches tab, they will be organized here cleanly.
          </p>
        </div>
      )}

      {appliedMatches.length > 0 && filteredApplied.length === 0 && (
        <div className="text-center py-12 px-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-xs text-neutral-400">
          No applied positions match your search query &quot;{searchTerm}&quot;.
        </div>
      )}
    </div>
  );
}
