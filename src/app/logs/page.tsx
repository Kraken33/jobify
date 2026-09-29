'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { HttpLogEntry } from '@/lib/logger/types';

export default function LogsPage() {
  const [logs, setLogs] = useState<HttpLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProvider !== 'all') params.append('provider', selectedProvider);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedProvider, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all HTTP log history?')) return;
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setActionMessage('Log history cleared.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => (l.status && l.status >= 400) || l.error).length;
    const successes = logs.filter((l) => l.status && l.status >= 200 && l.status < 300 && !l.error).length;
    const avgDuration = total > 0
      ? Math.round(logs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / total)
      : 0;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;

    return { total, errors, successes, avgDuration, successRate };
  }, [logs]);

  const getStatusBadge = (entry: HttpLogEntry) => {
    if (entry.error || (entry.status && entry.status >= 400)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300">
          <XCircle className="w-3.5 h-3.5" />
          {entry.status ? `${entry.status} ${entry.statusText || 'Error'}` : 'Network Error'}
        </span>
      );
    }
    if (entry.status && entry.status >= 200 && entry.status < 300) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {entry.status} OK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 border border-neutral-700 text-neutral-300">
        <Clock className="w-3.5 h-3.5" />
        {entry.status || 'Pending'}
      </span>
    );
  };

  const getProviderBadge = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case 'justjoin':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
            JustJoin.it
          </span>
        );
      case 'arbeitsagentur':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-950 border border-amber-800 text-amber-300">
            Arbeitsagentur
          </span>
        );
      case 'arbeitnow':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
            Arbeitnow
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
            {providerId}
          </span>
        );
    }
  };

  const getDurationColor = (ms: number) => {
    if (ms < 500) return 'text-emerald-400';
    if (ms < 2000) return 'text-amber-400';
    return 'text-rose-400 font-semibold';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Jobify</span>
            </Link>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Outbound HTTP Logger & Inspector
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actionMessage && (
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg animate-fade-in">
                {actionMessage}
              </span>
            )}

            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Live Poll (3s)</span>
            </label>

            <button
              onClick={() => fetchLogs(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/40 border border-rose-900/60 text-rose-300 hover:bg-rose-900/50 hover:text-white transition"
              title="Clear all logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium">Total Captured</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Ring buffer capacity: 200</div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium">Success Rate</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.successRate}%</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{stats.successes} successful requests</div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium">Avg Latency</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.avgDuration} <span className="text-sm font-normal text-neutral-400">ms</span></div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Across recorded events</div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium">Errors / Failures</div>
            <div className={`text-2xl font-bold mt-1 ${stats.errors > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
              {stats.errors}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">4xx, 5xx & timeouts</div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Providers:</span>
            </div>
            {(['all', 'justjoin', 'arbeitsagentur', 'arbeitnow'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProvider(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                  selectedProvider === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {p === 'all' ? 'All Providers' : p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              {(['all', 'success', 'error'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium capitalize transition ${
                    selectedStatus === s
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search URL, method, error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl overflow-hidden shadow-xl">
          {logs.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <Activity className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-neutral-300">No HTTP logs recorded</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Trigger a search scan from the main Jobify dashboard to observe outbound requests to external providers in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/80">
              {logs.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const dateObj = new Date(entry.timestamp);
                const formattedTime = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      fractionalSecondDigits: 3,
                    })
                  : entry.timestamp;

                return (
                  <div key={entry.id} className="transition hover:bg-neutral-900/80">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Left info: expander, method, status, provider */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="text-neutral-500 hover:text-white p-0.5"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider ${
                            entry.method === 'POST'
                              ? 'bg-purple-950 border border-purple-800 text-purple-300'
                              : 'bg-blue-950 border border-blue-800 text-blue-300'
                          }`}
                        >
                          {entry.method}
                        </span>

                        {getStatusBadge(entry)}
                        {getProviderBadge(entry.providerId)}

                        {entry.fallbackUsed && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Fallback Used
                          </span>
                        )}
                      </div>

                      {/* Middle: Sanitized URL */}
                      <div className="flex-1 min-w-0 font-mono text-xs text-neutral-300 truncate" title={entry.url}>
                        {entry.url}
                      </div>

                      {/* Right info: Latency & Timestamp */}
                      <div className="flex items-center gap-4 text-xs shrink-0 font-mono">
                        <span className={getDurationColor(entry.durationMs)}>
                          {entry.durationMs}ms
                        </span>
                        <span className="text-neutral-500">{formattedTime}</span>
                      </div>
                    </div>

                    {/* Expandable Inspector Panel */}
                    {isExpanded && (
                      <div className="bg-neutral-950/90 border-t border-neutral-800/80 p-4 font-mono text-xs space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <span className="text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
                            Request Inspection Details
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(entry.id, JSON.stringify(entry, null, 2));
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
                          >
                            {copiedId === entry.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-[11px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[11px]">Copy JSON</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* URL Details */}
                        <div>
                          <div className="text-neutral-500 text-[11px] mb-1">Sanitized URL:</div>
                          <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800 text-neutral-200 break-all select-all flex items-center justify-between gap-2">
                            <span>{entry.url}</span>
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-500 hover:text-indigo-400 shrink-0"
                              title="Open URL in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Request Headers */}
                        {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
                          <div>
                            <div className="text-neutral-500 text-[11px] mb-1">Sanitized Request Headers:</div>
                            <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800 text-neutral-300 space-y-1">
                              {Object.entries(entry.requestHeaders).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <span className="text-neutral-500">{k}:</span>
                                  <span className="text-neutral-200">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Error info if present */}
                        {entry.error && (
                          <div>
                            <div className="text-rose-400 text-[11px] mb-1 font-semibold">Error Information:</div>
                            <div className="bg-rose-950/40 p-2.5 rounded border border-rose-900/60 text-rose-300">
                              {entry.error}
                            </div>
                          </div>
                        )}

                        {/* Response snippet if present */}
                        {entry.responseSnippet && (
                          <div>
                            <div className="text-neutral-500 text-[11px] mb-1">Response Body Preview:</div>
                            <pre className="bg-neutral-900 p-2.5 rounded border border-neutral-800 text-neutral-300 overflow-x-auto whitespace-pre-wrap">
                              {entry.responseSnippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
