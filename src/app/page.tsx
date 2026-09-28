'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CandidateProfile, MatchResult } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProfileForm } from '@/components/ProfileForm';
import { MatchesBoard } from '@/components/MatchesBoard';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import {
  loadCandidateProfile,
  saveCandidateProfile,
  DEFAULT_PROFILE,
} from '@/lib/storage/profileStorage';
import { getStoredApiKey } from '@/lib/storage/apiKeyStorage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'profile'>('matches');
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize profile & key from local/Supabase storage after client mount
  useEffect(() => {
    setMounted(true);
    const init = async () => {
      try {
        const loadedProfile = await loadCandidateProfile();
        setProfile(loadedProfile);
        const key = getStoredApiKey();
        setApiKey(key);
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

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': key,
        },
        body: JSON.stringify({
          profile,
          providerId: 'justjoin',
          limit: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan and match jobs.');
      }

      setMatches(data.matches || []);
      setActiveTab('matches');

      if (data.matches?.length > 0) {
        setSuccessMessage(`Successfully evaluated ${data.matches.length} positions!`);
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
  }, [profile]);

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
      />
    </div>
  );
}
