'use client';

import React, { useState, useEffect } from 'react';
import { CandidateProfile, SeniorityLevel, WorkMode, SpokenLanguageLevel } from '@/types';
import { Briefcase, Code, MapPin, DollarSign, FileText, Plus, X, Save, Check, Globe, Key, Bot, Eye, EyeOff, Trash2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  isValidKeyFormat,
  getMaskedApiKey,
  getStoredApifyToken,
  setStoredApifyToken,
  clearStoredApifyToken,
  isValidApifyTokenFormat,
  getMaskedApifyToken,
} from '@/lib/storage/apiKeyStorage';

interface ProfileFormProps {
  initialProfile: CandidateProfile;
  onSave: (profile: CandidateProfile) => Promise<void>;
  isSaving?: boolean;
  onApiKeyChange?: (key: string | null) => void;
  onApifyTokenChange?: (token: string | null) => void;
}

const POPULAR_SKILLS = [
  'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python',
  'PostgreSQL', 'Docker', 'AWS', 'GraphQL', 'Tailwind CSS', 'Java', 'Go'
];

export function ProfileForm({
  initialProfile,
  onSave,
  isSaving = false,
  onApiKeyChange,
  onApifyTokenChange,
}: ProfileFormProps) {
  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [langLevel, setLangLevel] = useState<SpokenLanguageLevel>('B2');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // API Key & Token State
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [openaiStatusMsg, setOpenaiStatusMsg] = useState<string | null>(null);

  const [apifyToken, setApifyToken] = useState('');
  const [showApifyToken, setShowApifyToken] = useState(false);
  const [apifyStatusMsg, setApifyStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    setOpenaiKey(getStoredApiKey() || '');
    setApifyToken(getStoredApifyToken() || '');
  }, []);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !profile.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddLanguage = (language: string, level: SpokenLanguageLevel) => {
    const trimmed = language.trim();
    if (!trimmed) return;
    setProfile((prev) => {
      const current = prev.spokenLanguages || [];
      const filtered = current.filter((l) => l.language.toLowerCase() !== trimmed.toLowerCase());
      return {
        ...prev,
        spokenLanguages: [...filtered, { language: trimmed, level }],
      };
    });
    setLangInput('');
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      spokenLanguages: (prev.spokenLanguages || []).filter(
        (l) => l.language.toLowerCase() !== langToRemove.toLowerCase()
      ),
    }));
  };

  const handleSaveOpenaiKey = () => {
    const trimmed = openaiKey.trim();
    if (trimmed) {
      if (!isValidKeyFormat(trimmed)) {
        setOpenaiStatusMsg('Error: Invalid format. Must start with sk- and be at least 20 chars.');
        return;
      }
      setStoredApiKey(trimmed);
      setOpenaiStatusMsg('OpenAI API key saved successfully.');
      onApiKeyChange?.(trimmed);
    } else {
      clearStoredApiKey();
      setOpenaiStatusMsg('OpenAI key cleared.');
      onApiKeyChange?.(null);
    }
    setTimeout(() => setOpenaiStatusMsg(null), 3000);
  };

  const handleClearOpenaiKey = () => {
    clearStoredApiKey();
    setOpenaiKey('');
    setOpenaiStatusMsg('OpenAI key removed.');
    onApiKeyChange?.(null);
    setTimeout(() => setOpenaiStatusMsg(null), 3000);
  };

  const handleSaveApifyToken = () => {
    const trimmed = apifyToken.trim();
    if (trimmed) {
      if (!isValidApifyTokenFormat(trimmed)) {
        setApifyStatusMsg('Error: Invalid token format. Must start with apify_api_ and be at least 20 chars.');
        return;
      }
      setStoredApifyToken(trimmed);
      setApifyStatusMsg('Apify API token saved successfully.');
      onApifyTokenChange?.(trimmed);
    } else {
      clearStoredApifyToken();
      setApifyStatusMsg('Apify token cleared.');
      onApifyTokenChange?.(null);
    }
    setTimeout(() => setApifyStatusMsg(null), 3000);
  };

  const handleClearApifyToken = () => {
    clearStoredApifyToken();
    setApifyToken('');
    setApifyStatusMsg('Apify token removed.');
    onApifyTokenChange?.(null);
    setTimeout(() => setApifyStatusMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(profile);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const hasOpenaiStored = Boolean(getStoredApiKey());
  const hasApifyStored = Boolean(getStoredApifyToken());

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target Role & Seniority */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Target Role & Level</h2>
          </div>
          {showSavedToast && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Saved successfully
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Target Job Title / Role
            </label>
            <input
              type="text"
              required
              value={profile.targetRole}
              onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
              placeholder="e.g. Full Stack Developer, Frontend Engineer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Seniority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['junior', 'mid', 'senior', 'lead'] as SeniorityLevel[]).map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setProfile({ ...profile, seniority: level })}
                  className={`py-2 text-xs font-medium capitalize rounded-xl border transition ${
                    profile.seniority === level
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack & Skills */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-neutral-800 mb-6">
          <Code className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Skills & Technologies</h2>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(skillInput);
                }
              }}
              placeholder="Add a technology (e.g. Next.js, Postgres) and press Enter"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleAddSkill(skillInput)}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Active Skills Tags */}
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 border border-indigo-800/60 text-indigo-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-red-400 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {profile.skills.length === 0 && (
              <p className="text-xs text-neutral-500 italic">No skills added yet. Add your core tech stack above.</p>
            )}
          </div>

          {/* Suggestions */}
          <div className="pt-2">
            <p className="text-xs text-neutral-500 mb-2">Quick add suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter(
                (s) => !profile.skills.some((ps) => ps.toLowerCase() === s.toLowerCase())
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddSkill(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences & Salary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-neutral-800 mb-6">
          <MapPin className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Work Preferences & Salary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Work Mode
            </label>
            <select
              value={profile.workMode}
              onChange={(e) => setProfile({ ...profile, workMode: e.target.value as WorkMode })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize"
            >
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="office">Office / On-site</option>
              <option value="any">Any Work Mode</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Target Location / City
            </label>
            <input
              type="text"
              value={profile.preferredLocation || ''}
              onChange={(e) => setProfile({ ...profile, preferredLocation: e.target.value })}
              placeholder="e.g. Poland, Warsaw, Remote"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center justify-between">
              <span>Min. Expected Salary</span>
              <span className="text-[10px] text-neutral-500">monthly ({profile.salaryCurrency || 'PLN'})</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={profile.minSalary || ''}
                onChange={(e) => setProfile({ ...profile, minSalary: Number(e.target.value) || undefined })}
                placeholder="e.g. 15000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 pl-8"
              />
              <DollarSign className="w-4 h-4 text-neutral-500 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Spoken Languages & CEFR Levels */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-neutral-800 mb-6">
          <Globe className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Spoken Languages & CEFR Gradation</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              placeholder="Language (e.g. German, English, Polish)"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <select
              value={langLevel}
              onChange={(e) => setLangLevel(e.target.value as SpokenLanguageLevel)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'] as SpokenLanguageLevel[]).map((level) => (
                <option key={level} value={level}>
                  {level} {level === 'Native' ? '(Mother tongue)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleAddLanguage(langInput, langLevel)}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Language
            </button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {(profile.spokenLanguages || []).map((lang) => (
              <span
                key={lang.language}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-200"
              >
                <span>{lang.language}</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-900/80 text-emerald-300">
                  {lang.level}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(lang.language)}
                  className="hover:text-red-400 transition ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {(!profile.spokenLanguages || profile.spokenLanguages.length === 0) && (
              <p className="text-xs text-neutral-500 italic">No spoken languages specified yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Inline API Keys & Settings Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-white">API Keys & External Integrations</h2>
              <p className="text-xs text-neutral-400">Stored locally in your browser (`localStorage`). Never saved to backend DB.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* OpenAI API Key */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">OpenAI API Key</span>
                <span className="text-[10px] text-indigo-300 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded-full font-mono">
                  Required for evaluation
                </span>
              </div>
              {hasOpenaiStored && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Active: {getMaskedApiKey(getStoredApiKey())}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 transition"
                  title={showOpenaiKey ? 'Hide key' : 'View key'}
                >
                  {showOpenaiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveOpenaiKey}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Save Key
              </button>

              {hasOpenaiStored && (
                <button
                  type="button"
                  onClick={handleClearOpenaiKey}
                  className="px-3 py-2 bg-neutral-800 hover:bg-red-950/60 hover:border-red-800 text-neutral-300 hover:text-red-300 border border-neutral-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition shrink-0"
                  title="Remove OpenAI Key"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {openaiStatusMsg && (
              <p className={`text-xs flex items-center gap-1 ${openaiStatusMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {openaiStatusMsg.startsWith('Error') ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {openaiStatusMsg}
              </p>
            )}
          </div>

          {/* Apify API Token */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Apify API Token</span>
                <span className="text-[10px] text-amber-300 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full font-mono">
                  Optional for live scrapers
                </span>
              </div>
              {hasApifyStored && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Active: {getMaskedApifyToken(getStoredApifyToken())}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showApifyToken ? 'text' : 'password'}
                  value={apifyToken}
                  onChange={(e) => setApifyToken(e.target.value)}
                  placeholder="apify_api_..."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowApifyToken(!showApifyToken)}
                  className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 transition"
                  title={showApifyToken ? 'Hide token' : 'View token'}
                >
                  {showApifyToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveApifyToken}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Save Token
              </button>

              {hasApifyStored && (
                <button
                  type="button"
                  onClick={handleClearApifyToken}
                  className="px-3 py-2 bg-neutral-800 hover:bg-red-950/60 hover:border-red-800 text-neutral-300 hover:text-red-300 border border-neutral-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition shrink-0"
                  title="Remove Apify Token"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {apifyStatusMsg && (
              <p className={`text-xs flex items-center gap-1 ${apifyStatusMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {apifyStatusMsg.startsWith('Error') ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {apifyStatusMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Experience Summary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-neutral-800 mb-6">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Experience Summary / Bio</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Brief summary of your experience and career highlights (sent to OpenAI for deep match scoring)
          </label>
          <textarea
            rows={4}
            value={profile.experienceSummary}
            onChange={(e) => setProfile({ ...profile, experienceSummary: e.target.value })}
            placeholder="Describe your background, key projects, architectural experience, and what you're looking for..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Profile Preferences'}
        </button>
      </div>
    </form>
  );
}

