'use client';

import React, { useState } from 'react';
import { MatchResult } from '@/types';
import {
  ExternalLink,
  Building,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Banknote,
  Wifi,
  Globe,
  Eye,
  CheckCheck,
  X,
} from 'lucide-react';

interface JobCardProps {
  match: MatchResult;
  onDismiss?: (matchId: string) => void;
  onApply?: (match: MatchResult) => void;
  /** When true, hides the "Not for me" dismiss button (e.g. in the Applied tab) */
  hideActions?: boolean;
}

export function JobCard({ match, onDismiss, onApply, hideActions = false }: JobCardProps) {
  const [expanded, setExpanded] = useState(true);
  const { job, evaluation } = match;

  const isApplied = match.status === 'applied';

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
    <div className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:shadow-indigo-950/20">
      {/* Header info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight hover:text-indigo-300 transition">
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
            {isApplied && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                <CheckCheck className="w-3 h-3" /> Applied
              </span>
            )}
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
                {job.salaryRange.max ? ` - ${job.salaryRange.max.toLocaleString()}` : '+'} {job.salaryRange.currency}
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

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* View — opens URL, no state change */}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition"
              title="View job posting"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            {/* Applied — marks as applied, global */}
            {!isApplied ? (
              <button
                type="button"
                onClick={() => onApply?.(match)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-800/20 transition"
                title="Mark as applied"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Applied</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-400 text-xs font-semibold border border-emerald-800/50 cursor-default select-none">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Applied</span>
              </span>
            )}

            {/* Not for me — dismiss (hidden in Applied tab and when already applied) */}
            {!hideActions && !isApplied && (
              <button
                type="button"
                onClick={() => onDismiss?.(match.id)}
                className="inline-flex items-center gap-1 p-1.5 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/60 transition"
                title="Not for me — dismiss this vacancy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

      {/* AI Fit Analysis Accordion */}
      <div className="mt-1 pt-3 border-t border-neutral-800/80">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-xs font-medium text-neutral-400 hover:text-white transition"
        >
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${getScoreBadge(evaluation.score)}`} />
            <span className="font-semibold text-neutral-200">AI Evaluation:</span> {evaluation.verdict}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
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
}
