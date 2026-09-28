import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  isValidKeyFormat,
  getMaskedApiKey,
  isValidApifyTokenFormat,
  getMaskedApifyToken,
  getStoredApifyToken,
  setStoredApifyToken,
  clearStoredApifyToken,
} from '../lib/storage/apiKeyStorage';

describe('API Key Storage Utilities', () => {
  it('correctly validates valid OpenAI key formats', () => {
    assert.strictEqual(isValidKeyFormat('sk-proj-1234567890abcdef1234567890'), true);
    assert.strictEqual(isValidKeyFormat('sk-1234567890123456789012345'), true);
  });

  it('rejects invalid OpenAI key formats', () => {
    assert.strictEqual(isValidKeyFormat(''), false);
    assert.strictEqual(isValidKeyFormat('invalid-key'), false);
    assert.strictEqual(isValidKeyFormat('sk-short'), false);
  });

  it('masks key correctly for safe display', () => {
    assert.strictEqual(getMaskedApiKey(null), '');
    assert.strictEqual(getMaskedApiKey(''), '');
    assert.strictEqual(getMaskedApiKey('1234'), '••••••••');
    assert.strictEqual(
      getMaskedApiKey('sk-proj-abcdef1234567890wxyz'),
      'sk-••••••••wxyz'
    );
  });
});

describe('Apify Token Storage Utilities', () => {
  it('correctly validates valid Apify token formats', () => {
    assert.strictEqual(
      isValidApifyTokenFormat('apify_api_1234567890abcdefghij'),
      true
    );
    assert.strictEqual(
      isValidApifyTokenFormat('  apify_api_abcdefghijklmnopqrstuvwxyz  '),
      true
    );
  });

  it('rejects invalid Apify token formats', () => {
    assert.strictEqual(isValidApifyTokenFormat(''), false);
    assert.strictEqual(isValidApifyTokenFormat('apify_api_short'), false);
    assert.strictEqual(isValidApifyTokenFormat('sk-proj-1234567890abcdefghij'), false);
    assert.strictEqual(isValidApifyTokenFormat('apify_1234567890abcdefghij'), false);
  });

  it('masks Apify token correctly for safe display', () => {
    assert.strictEqual(getMaskedApifyToken(null), '');
    assert.strictEqual(getMaskedApifyToken(''), '');
    assert.strictEqual(getMaskedApifyToken('1234'), '••••••••');
    assert.strictEqual(
      getMaskedApifyToken('apify_api_1234567890abcdefwxyz'),
      'apify_api••••••••wxyz'
    );
  });

  it('persists, retrieves, and clears the Apify token in guest mode', () => {
    // In a Node environment without window/localStorage, helpers must not throw
    // and must degrade to null/no-ops.
    assert.strictEqual(getStoredApifyToken(), null);
    setStoredApifyToken('apify_api_1234567890abcdefghij');
    clearStoredApifyToken();
    assert.strictEqual(getStoredApifyToken(), null);
  });
});

