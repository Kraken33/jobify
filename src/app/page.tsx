'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CandidateProfile, MatchResult, SearchSession, ProviderCursor } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProfileForm } from '@/components/ProfileForm';
import { MatchesBoard } from '@/components/MatchesBoard';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import {
  loadCandidateProfile,
  saveCandidateProfile,
  DEFAULT_PROFILE,
} from '@/lib/storage/profileStorage';
import { loadSessions, createImplicitSession, saveSession } from '@/lib/storage/sessionStorage';
import { clearCheckpoint } from '@/lib/storage/checkpointStorage';
import { getStoredApiKey, getStoredApifyToken } from '@/lib/storage/apiKeyStorage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'profile'>('matches');
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, ProviderCursor | null>>({});
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apifyToken, setApifyToken] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize profile, sessions & key from local/Supabase storage after client mount
  useEffect(() => {
    setMounted(true);
    const init = async () => {
      try {
        const loadedProfile = await loadCandidateProfile();
        setProfile(loadedProfile);
        const key = getStoredApiKey();
        setApiKey(key);
        setApifyToken(getStoredApifyToken());

        const loadedSessions = await loadSessions(loadedProfile.id);
        if (loadedSessions.length > 0) {
          setSessions(loadedSessions);
          setActiveSessionId(loadedSessions[0].id);
        } else {
          const implicit = createImplicitSession(loadedProfile);
          setSessions([implicit]);
          setActiveSessionId(implicit.id);
          await saveSession(implicit);
        }
      } catch (err) {
        console.error('Failed to initialize local data:', err);
      }
    };
    init();
  }, []);

  const handleKeyUpdated = (hasKey: boolean) => {
    const key = getStoredApiKey();
    setApiKey(key);
    if (hasKey) {
      setSuccessMessage('OpenAI API key saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleApifyTokenUpdated = (hasToken: boolean) => {
    setApifyToken(getStoredApifyToken());
    if (hasToken) {
      setSuccessMessage('Apify token saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSaveProfile = async (updated: CandidateProfile) => {
    setIsSavingProfile(true);
    try {
      const saved = await saveCandidateProfile(updated);
      setProfile(saved);
      setSuccessMessage('Profile preferences saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage('Failed to save profile.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTriggerScan = useCallback(async () => {
    const key = getStoredApiKey();
    if (!key) {
      setIsKeyModalOpen(true);
      return;
    }

    const token = getStoredApifyToken();

    setIsLoading(true);
    setErrorMessage(null);

    const currentSessionId = activeSessionId || sessions[0]?.id;

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': key,
          ...(token ? { 'X-Apify-Token': token } : {}),
        },
        body: JSON.stringify({
          profile,
          providerId: 'justjoin',
          sessionId: currentSessionId,
          limit: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan and match jobs.');
      }

      const returnedMatches: MatchResult[] = data.matches || [];
      if (returnedMatches.length > 0) {
        // Append new matches, avoiding duplicates by job id
        setMatches((prev) => {
          const existingIds = new Set(prev.map((m) => m.job.id));
          const newUnique = returnedMatches.filter((m) => !existingIds.has(m.job.id));
          return [...prev, ...newUnique];
        });
      }

      if (currentSessionId && data.nextCursor !== undefined) {
        setCursors((prev) => ({
          ...prev,
          [currentSessionId]: data.nextCursor,
        }));
      }

      setActiveTab('matches');

      if (returnedMatches.length > 0) {
        setSuccessMessage(`Successfully evaluated ${returnedMatches.length} positions!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else if (data.message) {
        setErrorMessage(data.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error evaluating jobs';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [profile, activeSessionId, sessions]);

  const handleResetSession = useCallback(async () => {
    const currentSessionId = activeSessionId || sessions[0]?.id;
    setMatches([]);
    if (currentSessionId) {
      setCursors((prev) => ({
        ...prev,
        [currentSessionId]: null,
      }));
      await clearCheckpoint(currentSessionId, 'justjoin');
      setSuccessMessage('Session reset. Next scan will fetch from the beginning.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  }, [activeSessionId, sessions]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400 text-sm animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span>Loading Jobify...</span>
        </div>
      </div>
    );
  }

  const currentCursor = activeSessionId ? cursors[activeSessionId] : undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        hasApiKey={Boolean(apiKey)}
        apiKey={apiKey}
        hasApifyToken={Boolean(apifyToken)}
        apifyToken={apifyToken}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        matchCount={matches.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Banner Alert Toasts */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'matches' ? (
          <MatchesBoard
            matches={matches}
            isLoading={isLoading}
            onTriggerScan={handleTriggerScan}
            hasApiKey={Boolean(apiKey)}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionChange={(sId) => setActiveSessionId(sId)}
            nextCursor={currentCursor}
            onResetSession={handleResetSession}
          />
        ) : (
          <ProfileForm
            initialProfile={profile}
            onSave={handleSaveProfile}
            isSaving={isSavingProfile}
          />
        )}
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={handleKeyUpdated}
        onApifyTokenUpdated={handleApifyTokenUpdated}
      />
    </div>
  );
}
