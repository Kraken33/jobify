'use client';

import React, { useState, useEffect } from 'react';
import { CandidateProfile, SeniorityLevel, WorkMode } from '@/types';
import { Briefcase, Code, MapPin, DollarSign, FileText, Plus, X, Save, Check } from 'lucide-react';

interface ProfileFormProps {
  initialProfile: CandidateProfile;
  onSave: (profile: CandidateProfile) => Promise<void>;
  isSaving?: boolean;
}

const POPULAR_SKILLS = [
  'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python',
  'PostgreSQL', 'Docker', 'AWS', 'GraphQL', 'Tailwind CSS', 'Java', 'Go'
];

export function ProfileForm({ initialProfile, onSave, isSaving = false }: ProfileFormProps) {
  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);
  const [skillInput, setSkillInput] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(profile);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
