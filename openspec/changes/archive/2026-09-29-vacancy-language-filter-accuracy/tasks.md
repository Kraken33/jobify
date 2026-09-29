# Tasks

## 1. Fix `extractSpokenLanguages` heuristic in JustJoinProvider

- [x] 1.1 Change two-letter ISO language code matching (`pl`, `de`, `en`, `fr`, `es`) in the `langNames` map from substring-inclusion to whole-token (word-boundary) matching, so short codes embedded inside longer words (e.g., `playwright`, `TypeScript`) no longer trigger a false-positive language entry. Verify by running the existing `__tests__` suite and by manually asserting that a listing with skill tag `playwright` or `TypeScript` does NOT produce a `Polish` or `English` `spokenLanguages` entry.

- [x] 1.2 Update `extractSpokenLanguages` to always scan the description text for language mentions in parallel with the skill-tag scan, merging results (rather than using description as a fallback only when skill tags yield nothing). Extend the pattern to match natural-language phrases: "fluent in X", "X language required", "communicative X", and Polish phrases like "komunikatywność po angielsku/polsku/niemiecku". Verify that a listing whose description says "Fluent Polish required" (with no skill-tag for Polish) now produces a `Polish` entry in `spokenLanguages`.

- [x] 1.3 Add/extend unit tests in `src/__tests__/` for `extractSpokenLanguages` covering: (a) `pl` skill tag does not produce Polish, (b) description phrase "Fluent Polish required" produces Polish, (c) English B2 from description produces English at B2, (d) description mentioning both English and Polish produces two entries. Verify all new tests pass.

- [x] 1.4 Update `normalizeApifyItem` and `normalizeOffer` in `JustJoinProvider` to merge all available raw tech stack sources (`requiredSkills`, `skills`, `niceToHave`, `techStack`, `tech_stack`, `skills_tags`) into a unified skill array, and stringify full skill object properties (`name`, `title`, `level`, `value`) so that language entries in any tech stack list (e.g., `{ name: 'Polish', level: 'C1' }` in `niceToHave` or `techStack`) are reliably detected. Add a unit test verifying tech stack object language extraction.

## 2. Add spoken-language filter to Apify actor input (JustJoin)

- [x] 2.1 In `JustJoinProvider.buildApifyInput`, map `criteria.spokenLanguages` to a `languages` array of ISO 639-1 codes (English → `en`, Polish → `pl`, German → `de`, Spanish → `es`, French → `fr`) and include it in the actor input when at least one candidate language is present. Verify by inspecting the serialized `buildApifyInput` output in a unit test: when `criteria.spokenLanguages = [{ language: 'English', level: 'B2' }]`, the returned payload contains `languages: ['en']`. When `spokenLanguages` is absent or empty, the `languages` key is omitted.

## 3. Augment LLM prompt with language verification instruction

- [x] 3.1 In `AiMatcherService.evaluateFit`, when `job.spokenLanguages` is absent or empty and `job.description` is non-empty, append the following instruction to the prompt: "If the job description explicitly requires a spoken language that the candidate's profile does not include, list it as a critical gap and reduce the score to reflect the mismatch." Verify by inspecting the constructed prompt string in a unit/integration test: when `spokenLanguages` is undefined on the job, the extra instruction appears; when `spokenLanguages` is populated, it does not.

## 4. Integration verification

- [x] 4.1 Run a scan against the JustJoin fallback pool with a candidate profile that has no Polish (`spokenLanguages: [{ language: 'English', level: 'B2' }]`). Confirm that any fallback listing whose description or skills mention Polish now appears as a Low Match or receives a language gap in the AI evaluation rather than passing through undetected. Document the observed behavior in a brief test note.

- [x] 4.2 Run the full test suite (`npm run test` or equivalent) to confirm no regressions. Verify green.
