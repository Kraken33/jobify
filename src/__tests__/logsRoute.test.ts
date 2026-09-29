import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../app/api/logs/route';
import { addLogEntry, clearLogEntries } from '../lib/logger/logStore';
import { HttpLogEntry } from '../lib/logger/types';

describe('/api/logs Route Handlers', () => {
  beforeEach(() => {
    clearLogEntries();
  });

  it('GET /api/logs returns array of log entries newest first', async () => {
    addLogEntry({
      providerId: 'arbeitsagentur',
      method: 'GET',
      url: 'https://rest.arbeitsagentur.de/jobs',
      durationMs: 45,
      status: 200,
    });

    addLogEntry({
      providerId: 'justjoin',
      method: 'POST',
      url: 'https://api.apify.com/v2/runs',
      durationMs: 120,
      status: 201,
    });

    const req = new NextRequest('http://localhost:3000/api/logs');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body: HttpLogEntry[] = await res.json();
    assert.strictEqual(body.length, 2);
    assert.strictEqual(body[0].providerId, 'justjoin');
    assert.strictEqual(body[1].providerId, 'arbeitsagentur');
  });

  it('GET /api/logs?provider=arbeitnow filters results by provider', async () => {
    addLogEntry({ providerId: 'arbeitnow', method: 'GET', url: 'https://arbeitnow.com/api', durationMs: 50, status: 200 });
    addLogEntry({ providerId: 'justjoin', method: 'POST', url: 'https://apify.com/runs', durationMs: 100, status: 200 });

    const req = new NextRequest('http://localhost:3000/api/logs?provider=arbeitnow');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body: HttpLogEntry[] = await res.json();
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].providerId, 'arbeitnow');
  });

  it('DELETE /api/logs clears the buffer and subsequent GET returns empty array', async () => {
    addLogEntry({ providerId: 'arbeitnow', method: 'GET', url: 'https://arbeitnow.com', durationMs: 20 });

    const deleteRes = await DELETE();
    assert.strictEqual(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.strictEqual(deleteBody.success, true);

    const getReq = new NextRequest('http://localhost:3000/api/logs');
    const getRes = await GET(getReq);
    const getBody: HttpLogEntry[] = await getRes.json();
    assert.strictEqual(getBody.length, 0);
  });
});
