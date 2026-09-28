"use client";

import React, { useState, useEffect } from "react";
import { CandidateProfile, SearchSession, SeniorityLevel, WorkMode } from "@/types";
import { saveSession } from "@/lib/storage/sessionStorage";
import { X, Sparkles, Plus, Check } from "lucide-react";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile;
  onSessionCreated: (session: SearchSession) => void;
}

const POPULAR_SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python",
  "PostgreSQL", "Docker", "AWS", "GraphQL", "Tailwind CSS", "Java", "Go"
];

export function CreateSessionModal({
  isOpen,
  onClose,
  profile,
  onSessionCreated,
}: CreateSessionModalProps) {
  const [inheritFromProfile, setInheritFromProfile] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string>("");
  const [seniority, setSeniority] = useState<SeniorityLevel>("mid");
  const [workMode, setWorkMode] = useState<WorkMode>("remote");
  const [location, setLocation] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inheritFromProfile) {
      setName(profile.targetRole ? profile.targetRole + " Track" : "New Track");
      setSkills(profile.skills || []);
      setSeniority(profile.seniority || "mid");
      setWorkMode(profile.workMode || "remote");
      setLocation(profile.preferredLocation || "");
    } else {
      setName("");
      setSkills([]);
      setSeniority("mid");
      setWorkMode("remote");
      setLocation("");
    }
  }, [inheritFromProfile, profile]);

  if (!isOpen) return null;

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please provide a name for this search track.");
      return;
    }

    if (skills.length === 0) {
      setError("Please add at least one target skill.");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

      const now = new Date().toISOString();
      const newSession: SearchSession = {
        id,
        profileId: profile.id,
        name: trimmedName,
        provider: "justjoin",
        skills,
        seniority,
        workMode,
        location: location.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await saveSession(newSession);
      onSessionCreated(saved);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create search track.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">New Search Track</h2>
        </div>
        <p className="text-xs text-neutral-400 mb-6">
          Set up a dedicated session with distinct skills, seniority, and filters.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-white block">Inherit from Profile</span>
              <span className="text-[11px] text-neutral-400">
                Pre-fill fields using your active candidate profile
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inheritFromProfile}
                onChange={(e) => setInheritFromProfile(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Track Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Full Stack Track, JavaScript Specialist"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              Skills & Tech Stack <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                placeholder="Type a skill and hit Enter..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-neutral-500 mb-1.5">Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 6).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAddSkill(skill)}
                    className="text-[11px] px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Seniority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["junior", "mid", "senior", "lead"] as SeniorityLevel[]).map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setSeniority(level)}
                  className={"py-2 text-xs font-medium capitalize rounded-xl border transition " +
                    (seniority === level
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                      : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200")}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="office">Office</option>
                <option value="any">Any Mode</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Preferred Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Warsaw, Remote"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? "Creating..." : "Create Track"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
