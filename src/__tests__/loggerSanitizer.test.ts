import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeUrl, sanitizeHeaders, truncateSnippet } from '../lib/logger/sanitizer';

describe('Logger Sanitizer', () => {
  it('masks secret query parameters in absolute URLs', () => {
    const raw = 'https://api.apify.com/v2/actor-tasks/job-scraper/runs?token=apify_secret_12345&limit=50';
    const sanitized = sanitizeUrl(raw);
    assert.strictEqual(sanitized, 'https://api.apify.com/v2/actor-tasks/job-scraper/runs?token=***&limit=50');
  });

  it('masks multiple sensitive query parameters with varying casings', () => {
    const raw = 'https://example.com/api?apiKey=secret_key&secret=hidden_value&token=token123&regular=hello';
    const sanitized = sanitizeUrl(raw);
    assert.ok(sanitized.includes('apiKey=***'));
    assert.ok(sanitized.includes('secret=***'));
    assert.ok(sanitized.includes('token=***'));
    assert.ok(sanitized.includes('regular=hello'));
  });

  it('handles relative URLs correctly without corrupting path', () => {
    const raw = '/api/jobs?token=mytoken&page=2';
    const sanitized = sanitizeUrl(raw);
    assert.strictEqual(sanitized, '/api/jobs?token=***&page=2');
  });

  it('masks Bearer tokens in Authorization headers', () => {
    const headers = {
      Authorization: 'Bearer sk-abcdef1234567890',
      'Content-Type': 'application/json',
    };
    const sanitized = sanitizeHeaders(headers);
    assert.strictEqual(sanitized.Authorization, 'Bearer ***');
    assert.strictEqual(sanitized['Content-Type'], 'application/json');
  });

  it('masks known sensitive custom headers (X-API-Key, X-OpenAI-Key, X-Apify-Token)', () => {
    const headers = {
      'X-API-Key': 'secret-api-key-123',
      'x-openai-key': 'sk-openai-secret',
      'X-Apify-Token': 'apify-token-abc',
      Accept: 'application/json',
    };
    const sanitized = sanitizeHeaders(headers);
    assert.strictEqual(sanitized['X-API-Key'], '***');
    assert.strictEqual(sanitized['x-openai-key'], '***');
    assert.strictEqual(sanitized['X-Apify-Token'], '***');
    assert.strictEqual(sanitized.Accept, 'application/json');
  });

  it('handles Headers instance and array representations', () => {
    const headersObj = new Headers();
    headersObj.set('Authorization', 'Bearer 12345');
    headersObj.set('X-Custom', 'visible');

    const sanitized = sanitizeHeaders(headersObj);
    assert.strictEqual(sanitized.authorization, 'Bearer ***');
    assert.strictEqual(sanitized['x-custom'], 'visible');
  });

  it('truncates large content snippet beyond max length', () => {
    const longText = 'a'.repeat(1500);
    const snippet = truncateSnippet(longText, 50);
    assert.strictEqual(snippet.length, 50 + '... [truncated]'.length);
    assert.ok(snippet.endsWith('... [truncated]'));
  });
});
