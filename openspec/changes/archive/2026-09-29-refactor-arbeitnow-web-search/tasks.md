# Tasks

## 1. Web Search Query & Parsing Implementation

- [x] 1.1 Implement web search URL builder in `ArbeitnowProvider.ts` to serialize keywords and language tags into `https://www.arbeitnow.com/?search={keywords}&tags={tags}&sort_by=relevance&page={page}` and verify URL formatting
- [x] 1.2 Implement HTML parser in `ArbeitnowProvider.ts` to extract job cards (`data-job-item-link="true"`, titles, company, location, tags, detail URLs) and verify parsing against live HTML structure
- [x] 1.3 Update `getJobCount` on `ArbeitnowProvider` to extract total search result count from web search pages when criteria are present and verify count extraction

## 2. Testing & Verification

- [x] 2.1 Update unit tests in `src/__tests__/arbeitnowProvider.test.ts` to cover HTML web search parsing, criteria serialization, and fallback behavior
- [x] 2.2 Execute provider unit test suite (`npm test`) and verify all tests pass cleanly

