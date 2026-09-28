import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  isValidKeyFormat,
  getMaskedApiKey,
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
