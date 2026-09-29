import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  addLogEntry,
  getLogEntries,
  clearLogEntries,
  setLogStoreCapacity,
  getLogStoreStats,
} from '../lib/logger/logStore';

describe('Log Store Ring Buffer', () => {
  beforeEach(() => {
    clearLogEntries();
    setLogStoreCapacity(200);
  });

  it('records log entries and retrieves them newest first', () => {
    addLogEntry({
      providerId: 'arbeitsagentur',
      method: 'GET',
      url: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?page=1',
      durationMs: 120,
      status: 200,
    });

    addLogEntry({
      providerId: 'justjoin',
      method: 'POST',
      url: 'https://api.apify.com/v2/acts/scraper/runs',
      durationMs: 340,
      status: 201,
    });

    const logs = getLogEntries();
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].providerId, 'justjoin');
    assert.strictEqual(logs[1].providerId, 'arbeitsagentur');
  });

  it('enforces maximum ring buffer capacity by dropping oldest entries', () => {
    setLogStoreCapacity(3);

    addLogEntry({ providerId: 'p1', method: 'GET', url: 'https://example.com/1', durationMs: 10 });
    addLogEntry({ providerId: 'p2', method: 'GET', url: 'https://example.com/2', durationMs: 20 });
    addLogEntry({ providerId: 'p3', method: 'GET', url: 'https://example.com/3', durationMs: 30 });
    addLogEntry({ providerId: 'p4', method: 'GET', url: 'https://example.com/4', durationMs: 40 });

    const logs = getLogEntries();
    assert.strictEqual(logs.length, 3);
    assert.strictEqual(logs[0].providerId, 'p4');
    assert.strictEqual(logs[1].providerId, 'p3');
    assert.strictEqual(logs[2].providerId, 'p2');
  });

  it('filters entries by provider ID case-insensitively', () => {
    addLogEntry({ providerId: 'arbeitnow', method: 'GET', url: 'https://arbeitnow.com/api/job-board-api', durationMs: 80, status: 200 });
    addLogEntry({ providerId: 'justjoin', method: 'POST', url: 'https://api.apify.com/v2/runs', durationMs: 200, status: 200 });
    addLogEntry({ providerId: 'arbeitnow', method: 'GET', url: 'https://arbeitnow.com/api/jobs/2', durationMs: 90, status: 200 });

    const arbeitnowLogs = getLogEntries({ provider: 'Arbeitnow' });
    assert.strictEqual(arbeitnowLogs.length, 2);
    assert.strictEqual(arbeitnowLogs[0].providerId, 'arbeitnow');
    assert.strictEqual(arbeitnowLogs[1].providerId, 'arbeitnow');

    const justjoinLogs = getLogEntries({ provider: 'JUSTJOIN' });
    assert.strictEqual(justjoinLogs.length, 1);
  });

  it('filters entries by status category (success vs error)', () => {
    addLogEntry({ providerId: 'p1', method: 'GET', url: 'https://api.com/ok', durationMs: 50, status: 200 });
    addLogEntry({ providerId: 'p2', method: 'GET', url: 'https://api.com/bad', durationMs: 60, status: 404, error: 'Not Found' });
    addLogEntry({ providerId: 'p3', method: 'GET', url: 'https://api.com/fail', durationMs: 70, status: 500 });
    addLogEntry({ providerId: 'p4', method: 'GET', url: 'https://api.com/network-err', durationMs: 80, error: 'Network timeout' });

    const successLogs = getLogEntries({ statusCategory: 'success' });
    assert.strictEqual(successLogs.length, 1);
    assert.strictEqual(successLogs[0].url, 'https://api.com/ok');

    const errorLogs = getLogEntries({ statusCategory: 'error' });
    assert.strictEqual(errorLogs.length, 3);
  });

  it('filters entries by search query across url, provider, and error', () => {
    addLogEntry({ providerId: 'arbeitsagentur', method: 'GET', url: 'https://rest.arbeitsagentur.de/jobs', durationMs: 50 });
    addLogEntry({ providerId: 'justjoin', method: 'GET', url: 'https://apify.com/dataset', durationMs: 60, error: 'Rate limit exceeded' });

    const matchedUrl = getLogEntries({ search: 'arbeitsagentur' });
    assert.strictEqual(matchedUrl.length, 1);

    const matchedError = getLogEntries({ search: 'rate limit' });
    assert.strictEqual(matchedError.length, 1);
  });

  it('clears log buffer completely', () => {
    addLogEntry({ providerId: 'p1', method: 'GET', url: 'https://example.com', durationMs: 10 });
    assert.strictEqual(getLogStoreStats().count, 1);

    clearLogEntries();
    assert.strictEqual(getLogStoreStats().count, 0);
    assert.strictEqual(getLogEntries().length, 0);
  });
});
