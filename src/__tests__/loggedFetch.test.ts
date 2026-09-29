import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { loggedFetch } from '../lib/logger/loggedFetch';
import { getLogEntries, clearLogEntries } from '../lib/logger/logStore';

describe('loggedFetch wrapper', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearLogEntries();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('records successful requests with sanitized URL, status, and duration', async () => {
    globalThis.fetch = async (input, init) => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      });
    };

    const res = await loggedFetch('https://api.example.com/data?token=secret123&page=1', {
      method: 'GET',
      providerId: 'justjoin',
      headers: {
        Authorization: 'Bearer secret_auth_token',
        'User-Agent': 'Jobify/1.0',
      },
    });

    assert.strictEqual(res.status, 200);
    const logs = getLogEntries();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].providerId, 'justjoin');
    assert.strictEqual(logs[0].method, 'GET');
    assert.strictEqual(logs[0].url, 'https://api.example.com/data?token=***&page=1');
    assert.strictEqual(logs[0].status, 200);
    assert.strictEqual(logs[0].requestHeaders?.Authorization, 'Bearer ***');
    assert.strictEqual(logs[0].requestHeaders?.['User-Agent'], 'Jobify/1.0');
    assert.ok(logs[0].durationMs >= 0);
  });

  it('records error status and error message on 4xx/5xx responses', async () => {
    globalThis.fetch = async () => {
      return new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      });
    };

    const res = await loggedFetch('https://api.apify.com/v2/runs', {
      method: 'POST',
      providerId: 'justjoin',
      headers: { 'X-Apify-Token': 'bad_token' },
    });

    assert.strictEqual(res.status, 401);
    const logs = getLogEntries();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].status, 401);
    assert.strictEqual(logs[0].error, 'HTTP 401 Unauthorized');
    assert.strictEqual(logs[0].requestHeaders?.['X-Apify-Token'], '***');
  });

  it('records network exceptions and re-throws the error', async () => {
    globalThis.fetch = async () => {
      throw new Error('ETIMEDOUT: Connection timed out');
    };

    await assert.rejects(
      async () => {
        await loggedFetch('https://rest.arbeitsagentur.de/jobs', {
          providerId: 'arbeitsagentur',
        });
      },
      /Connection timed out/
    );

    const logs = getLogEntries();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].providerId, 'arbeitsagentur');
    assert.strictEqual(logs[0].error, 'ETIMEDOUT: Connection timed out');
    assert.strictEqual(logs[0].status, undefined);
  });
});
