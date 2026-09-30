'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CandidateProfile, MatchResult, SearchSession, ProviderCursor } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProfileForm } from '@/components/ProfileForm';
import { MatchesBoard } from '@/components/MatchesBoard';
import { AppliedBoard } from '@/components/AppliedBoard';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { CreateSessionModal } from '@/components/CreateSessionModal';
import {
  loadCandidateProfile,
  saveCandidateProfile,
  DEFAULT_PROFILE,
} from '@/lib/storage/profileStorage';
import { loadSessions, createImplicitSession, saveSession, deleteSession } from '@/lib/storage/sessionStorage';
import { clearCheckpoint } from '@/lib/storage/checkpointStorage';
import {
  loadSessionMatches,
  clearSessionMatches,
  loadAppliedMatches,
  saveAppliedMatch,
  removeAppliedMatch,
  updateMatchStatus,
  updateMatchScore,
} from '@/lib/storage/matchStorage';
import { getStoredApiKey, getStoredApifyToken } from '@/lib/storage/apiKeyStorage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'applied' | 'profile'>('matches');
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, ProviderCursor | null>>({});
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apifyToken, setApifyToken] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [appliedMatches, setAppliedMatches] = useState<MatchResult[]>([]);
  const [newlyFetchedJobIds, setNewlyFetchedJobIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize profile, sessions & key from Supabase storage after client mount
  useEffect(() => {
    setMounted(true);
    const init = async () => {
      try {
        const loadedProfile = await loadCandidateProfile();
        setProfile(loadedProfile);
        const key = getStoredApiKey();
        setApiKey(key);
        setApifyToken(getStoredApifyToken());

        // Load global applied list from Supabase
        const initialApplied = await loadAppliedMatches();
        setAppliedMatches(initialApplied);

        const loadedSessions = await loadSessions(loadedProfile.id);
        if (loadedSessions.length > 0) {
          setSessions(loadedSessions);
          const initialSessionId = loadedSessions[0].id;
          setActiveSessionId(initialSessionId);
          const initialMatches = await loadSessionMatches(initialSessionId);
          setMatches(initialMatches);
        } else {
          const implicit = createImplicitSession(loadedProfile);
          const savedImplicit = await saveSession(implicit);
          setSessions([savedImplicit]);
          setActiveSessionId(savedImplicit.id);
          const initialMatches = await loadSessionMatches(savedImplicit.id);
          setMatches(initialMatches);
        }
      } catch (err) {
        console.error('Failed to initialize storage data:', err);
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

  const handleTriggerScan = useCallback(async (customLimit?: unknown) => {
    const key = getStoredApiKey();
    if (!key) {
      setIsKeyModalOpen(true);
      return;
    }

    const token = getStoredApifyToken();

    setIsLoading(true);
    setErrorMessage(null);

    const currentSessionId = activeSessionId || sessions[0]?.id;
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const providerId = currentSession?.provider || 'justjoin';

    const currentCursor = currentSessionId ? cursors[currentSessionId] : undefined;
    const publishedAtCursor = currentCursor?.publishedAtCursor || null;
    const seenJobIds = matches.map((m) => m.job.id).slice(-500);

    const isUpdateMode = matches.length > 0 || Boolean(publishedAtCursor);
    const scanLimit =
      typeof customLimit === 'number' && !Number.isNaN(customLimit)
        ? customLimit
        : isUpdateMode
        ? 100
        : 20;

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
          providerId,
          sessionId: currentSessionId,
          session: currentSession,
          limit: scanLimit,
          seenJobIds,
          publishedAtCursor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan and match jobs.');
      }

      const returnedMatches: MatchResult[] = data.matches || [];
      const existingIds = new Set(matches.map((m) => m.job.id));
      const newUniqueMatches = returnedMatches.filter((m) => !existingIds.has(m.job.id));
      const newUniqueCount = newUniqueMatches.length;

      if (returnedMatches.length > 0) {
        // Append new matches, avoiding duplicates by job id
        setMatches((prev) => {
          const prevIds = new Set(prev.map((m) => m.job.id));
          const newUnique = returnedMatches.filter((m) => !prevIds.has(m.job.id));
          return [...prev, ...newUnique];
        });
        if (newUniqueMatches.length > 0) {
          const uniqueIds = newUniqueMatches.map((m) => m.job.id);
          setNewlyFetchedJobIds((prev) => Array.from(new Set([...prev, ...uniqueIds])));
        }
      }

      if (currentSessionId && data.nextCursor !== undefined) {
        setCursors((prev) => ({
          ...prev,
          [currentSessionId]: data.nextCursor,
        }));
      }

      setActiveTab('matches');

      if (newUniqueCount > 0) {
        const notice = typeof data.notice === 'string' ? data.notice : null;
        const successText = isUpdateMode
          ? notice
            ? `Successfully updated! Evaluated ${newUniqueCount} new positions. ${notice}`
            : `Successfully updated! Evaluated ${newUniqueCount} new positions!`
          : notice
          ? `Evaluated ${newUniqueCount} new positions. ${notice}`
          : `Successfully evaluated ${newUniqueCount} new positions!`;
        setSuccessMessage(successText);
        setTimeout(() => setSuccessMessage(null), notice ? 7000 : 3500);
      } else {
        const msg =
          data.message ||
          (isUpdateMode
            ? "You're up to date! No new vacancies posted since your last scan."
            : 'There are no new vacancies added.');
        setErrorMessage(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error evaluating jobs';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [profile, activeSessionId, sessions, matches, cursors]);

  const handleDismiss = useCallback(
    async (matchId: string) => {
      const matchItem = matches.find((m) => m.id === matchId || m.job.id === matchId);
      const providerJobId = matchItem?.job.id || matchId;
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId || m.job.id === matchId || (providerJobId && m.job.id === providerJobId)
            ? { ...m, evaluation: { ...m.evaluation, score: 0 } }
            : m
        )
      );
      await updateMatchScore(matchId, 0, providerJobId);
    },
    [matches],
  );

  const handleApply = useCallback(
    async (match: MatchResult) => {
      const appliedMatch = { ...match, status: 'applied' as const };
      // Remove from active matches
      setMatches((prev) => prev.filter((m) => m.id !== match.id && m.job.id !== match.job.id));
      // Add to global applied list
      setAppliedMatches((prev) => {
        const deduplicated = prev.filter((m) => m.job.id !== match.job.id);
        return [appliedMatch, ...deduplicated];
      });
      await saveAppliedMatch(appliedMatch);
    },
    [],
  );

  const handleRemoveFromApplied = useCallback(
    async (matchId: string) => {
      const currentSessionId = activeSessionId || sessions[0]?.id;
      const appliedItem = appliedMatches.find((m) => m.id === matchId || m.job.id === matchId);
      const providerJobId = appliedItem?.job.id || matchId;
      setAppliedMatches((prev) => prev.filter((m) => m.id !== matchId && m.job.id !== providerJobId));
      await removeAppliedMatch(matchId, providerJobId);
      if (currentSessionId) {
        const refreshedMatches = await loadSessionMatches(currentSessionId);
        setMatches(refreshedMatches);
      }
    },
    [activeSessionId, sessions, appliedMatches],
  );

  const handleResetSession = useCallback(async () => {
    const currentSessionId = activeSessionId || sessions[0]?.id;
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    setMatches([]);
    setNewlyFetchedJobIds([]);
    if (currentSessionId) {
      setCursors((prev) => ({
        ...prev,
        [currentSessionId]: null,
      }));
      await clearCheckpoint(currentSessionId, currentSession?.provider || 'justjoin');
      await clearSessionMatches(currentSessionId);
      setSuccessMessage('Session reset. Next scan will fetch from the beginning.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  }, [activeSessionId, sessions]);

  const handleSessionChange = useCallback(async (newSessionId: string) => {
    setActiveSessionId(newSessionId);
    setNewlyFetchedJobIds([]);
    const sessionMatches = await loadSessionMatches(newSessionId);
    setMatches(sessionMatches);
  }, []);

  const handleDeleteSession = useCallback(async (sessionIdToDelete: string) => {
    if (sessions.length <= 1) return;

    const sessionToDelete = sessions.find((s) => s.id === sessionIdToDelete);

    await deleteSession(sessionIdToDelete);
    await clearCheckpoint(sessionIdToDelete, sessionToDelete?.provider || 'justjoin');
    await clearSessionMatches(sessionIdToDelete);

    const remainingSessions = sessions.filter((s) => s.id !== sessionIdToDelete);
    setSessions(remainingSessions);

    if (activeSessionId === sessionIdToDelete) {
      const nextActive = remainingSessions[0];
      setActiveSessionId(nextActive.id);
      setNewlyFetchedJobIds([]);
      const nextMatches = await loadSessionMatches(nextActive.id);
      setMatches(nextMatches);
    }

    setSuccessMessage('Search track deleted successfully.');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [sessions, activeSessionId]);


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
  const activeMatchesCount = matches.filter((m) => !m.status || m.status === 'active').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        matchCount={activeMatchesCount}
        appliedCount={appliedMatches.length}
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
        {activeTab === 'matches' && (
          <MatchesBoard
            profile={profile}
            matches={matches}
            newlyFetchedJobIds={newlyFetchedJobIds}
            isLoading={isLoading}
            onTriggerScan={handleTriggerScan}
            hasApiKey={Boolean(apiKey)}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionChange={handleSessionChange}
            nextCursor={currentCursor}
            onResetSession={handleResetSession}
            onCreateSession={() => setIsCreateSessionOpen(true)}
            onDeleteSession={handleDeleteSession}
            onDismiss={handleDismiss}
            onApply={handleApply}
          />
        )}

        {activeTab === 'applied' && (
          <AppliedBoard
            appliedMatches={appliedMatches}
            onRemoveFromApplied={handleRemoveFromApplied}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileForm
            initialProfile={profile}
            onSave={handleSaveProfile}
            isSaving={isSavingProfile}
            onApiKeyChange={(key) => setApiKey(key)}
            onApifyTokenChange={(token) => setApifyToken(token)}
          />
        )}
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={handleKeyUpdated}
        onSuccessScanTrigger={() => handleTriggerScan()}
      />

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        profile={profile}
        onSessionCreated={async (newSession) => {
          setSessions((prev) => [...prev, newSession]);
          setActiveSessionId(newSession.id);
          setMatches([]);
          setSuccessMessage(`Search track "${newSession.name}" created!`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />
    </div>
  );
}

