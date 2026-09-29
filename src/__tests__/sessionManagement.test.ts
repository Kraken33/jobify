import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { saveSession, loadSessions, deleteSession, createImplicitSession } from "../lib/storage/sessionStorage";
import { saveSessionMatches, loadSessionMatches, clearSessionMatches } from "../lib/storage/matchStorage";
import { CandidateProfile, SearchSession, MatchResult } from "../types";

describe("search sessions and match isolation integration", () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    (global as unknown as { window: unknown; localStorage: unknown }).window = {};
    (global as unknown as { window: unknown; localStorage: unknown }).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    };
  });

  const testProfile: CandidateProfile = {
    id: "profile-100",
    targetRole: "Full Stack Engineer",
    seniority: "senior",
    skills: ["React", "Node.js", "TypeScript"],
    workMode: "remote",
    preferredLocation: "Warsaw",
    experienceSummary: "Experienced engineer",
  };

  const sampleMatch = (id: string, sessionId: string): MatchResult => ({
    id,
    sessionId,
    job: {
      id: "job-" + id,
      provider: "justjoin",
      title: "FullStack Developer",
      company: "Innovate Inc",
      isRemote: true,
      seniority: "senior",
      requiredSkills: ["React", "TypeScript"],
      url: "https://example.com/job/" + id,
    },
    evaluation: {
      score: 90,
      verdict: "Strong Match",
      pros: ["Skills align well"],
      gaps: [],
      summary: "Great candidate fit",
    },
    createdAt: new Date().toISOString(),
  });

  it("creates session with inherited profile parameters", async () => {
    const defaultSession = createImplicitSession(testProfile);
    assert.strictEqual(defaultSession.name, "Default Search");
    assert.strictEqual(defaultSession.targetRole, "Full Stack Engineer");
    assert.deepStrictEqual(defaultSession.skills, testProfile.skills);
    assert.strictEqual(defaultSession.seniority, testProfile.seniority);
    assert.strictEqual(defaultSession.workMode, testProfile.workMode);
  });

  it("saves, lists, and deletes custom search tracks cleanly", async () => {
    const sessionA: SearchSession = {
      id: "session-fullstack",
      profileId: testProfile.id,
      name: "Full Stack Track",
      provider: "justjoin",
      targetRole: "Full Stack Developer",
      skills: ["React", "Node.js"],
      seniority: "mid",
      workMode: "remote",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sessionB: SearchSession = {
      id: "session-javascript",
      profileId: testProfile.id,
      name: "JavaScript Track",
      provider: "justjoin",
      targetRole: "JavaScript Specialist",
      skills: ["JavaScript", "React"],
      seniority: "senior",
      workMode: "hybrid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveSession(sessionA);
    await saveSession(sessionB);

    let loaded = await loadSessions(testProfile.id);
    assert.strictEqual(loaded.length, 2);
    assert.strictEqual(loaded.some((s) => s.id === "session-fullstack"), true);
    assert.strictEqual(loaded.some((s) => s.id === "session-javascript"), true);

    // Delete session A
    await deleteSession("session-fullstack");

    loaded = await loadSessions(testProfile.id);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].id, "session-javascript");
  });

  it("keeps match pools strictly isolated when context switching across sessions", async () => {
    const matchA1 = sampleMatch("m-a-1", "session-fullstack");
    const matchA2 = sampleMatch("m-a-2", "session-fullstack");
    const matchB1 = sampleMatch("m-b-1", "session-javascript");

    await saveSessionMatches("session-fullstack", [matchA1, matchA2]);
    await saveSessionMatches("session-javascript", [matchB1]);

    const activeMatchesForA = await loadSessionMatches("session-fullstack");
    const activeMatchesForB = await loadSessionMatches("session-javascript");

    assert.strictEqual(activeMatchesForA.length, 2);
    assert.strictEqual(activeMatchesForA.map((m) => m.id).includes("m-a-1"), true);
    assert.strictEqual(activeMatchesForA.map((m) => m.id).includes("m-b-1"), false);

    assert.strictEqual(activeMatchesForB.length, 1);
    assert.strictEqual(activeMatchesForB[0].id, "m-b-1");

    // Clear matches for session A on reset
    await clearSessionMatches("session-fullstack");

    const reloadedA = await loadSessionMatches("session-fullstack");
    const reloadedB = await loadSessionMatches("session-javascript");

    assert.strictEqual(reloadedA.length, 0);
    assert.strictEqual(reloadedB.length, 1);
    assert.strictEqual(reloadedB[0].id, "m-b-1");
  });
});
