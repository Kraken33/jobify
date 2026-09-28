'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Trash2, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, isValidKeyFormat } from '@/lib/storage/apiKeyStorage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeyUpdated }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      if (stored) {
        setApiKey(stored);
        setHasExistingKey(true);
      } else {
        setApiKey('');
        setHasExistingKey(false);
      }
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      clearStoredApiKey();
      setHasExistingKey(false);
      onKeyUpdated?.(false);
      onClose();
      return;
    }

    setStoredApiKey(trimmed);
    setHasExistingKey(true);
    setSavedSuccess(true);
    onKeyUpdated?.(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearStoredApiKey();
    setApiKey('');
    setHasExistingKey(false);
    onKeyUpdated?.(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>OpenAI API Key (BYOK)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Your key is stored <strong>locally in your browser</strong>. It is sent directly to OpenAI during match evaluations and never saved to any database.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              API Key (sk-...)
            </label>
            <div className="relative">
              <input
                type={showRawKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSavedSuccess(false);
                }}
                placeholder="sk-proj-..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowRawKey(!showRawKey)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-200"
              >
                {showRawKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {apiKey && !isValidKeyFormat(apiKey) && (
              <p className="flex items-center gap-1 text-amber-400 text-xs mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Standard OpenAI keys usually start with sk-
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-800">
          {hasExistingKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition"
            >
              <Trash2 className="w-4 h-4" />
              Remove Key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Saved
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
