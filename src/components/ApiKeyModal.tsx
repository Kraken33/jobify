'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Trash2, X, Eye, EyeOff, ShieldCheck, Bot } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  isValidKeyFormat,
  getStoredApifyToken,
  setStoredApifyToken,
  clearStoredApifyToken,
  isValidApifyTokenFormat,
} from '@/lib/storage/apiKeyStorage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
  onApifyTokenUpdated?: (hasToken: boolean) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeyUpdated, onApifyTokenUpdated }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  const [apifyToken, setApifyToken] = useState('');
  const [showRawApifyToken, setShowRawApifyToken] = useState(false);
  const [apifySavedSuccess, setApifySavedSuccess] = useState(false);
  const [hasExistingApifyToken, setHasExistingApifyToken] = useState(false);

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

      const storedApify = getStoredApifyToken();
      if (storedApify) {
        setApifyToken(storedApify);
        setHasExistingApifyToken(true);
      } else {
        setApifyToken('');
        setHasExistingApifyToken(false);
      }
      setApifySavedSuccess(false);
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

  const handleSaveApifyToken = () => {
    const trimmed = apifyToken.trim();
    if (!trimmed) {
      clearStoredApifyToken();
      setHasExistingApifyToken(false);
      onApifyTokenUpdated?.(false);
      onClose();
      return;
    }

    setStoredApifyToken(trimmed);
    setHasExistingApifyToken(true);
    setApifySavedSuccess(true);
    onApifyTokenUpdated?.(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClearApifyToken = () => {
    clearStoredApifyToken();
    setApifyToken('');
    setHasExistingApifyToken(false);
    onApifyTokenUpdated?.(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>API Keys (BYOK)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-6">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Your keys are stored <strong>locally in your browser</strong>. They are sent directly to the
              respective providers during scans and never saved to any database.
            </p>
          </div>

          {/* OpenAI Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">OpenAI API Key</span>
              {hasExistingKey ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="text-[11px] text-amber-400">Not configured</span>
              )}
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Saved
                  </>
                ) : (
                  'Save OpenAI Key'
                )}
              </button>
              {hasExistingKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Apify Token Section */}
          <div className="pt-5 border-t border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Bot className="w-4 h-4 text-indigo-400" /> Apify API Token
              </span>
              {hasExistingApifyToken ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="text-[11px] text-amber-400">Using sample data</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Token (apify_api_...)
              </label>
              <div className="relative">
                <input
                  type={showRawApifyToken ? 'text' : 'password'}
                  value={apifyToken}
                  onChange={(e) => {
                    setApifyToken(e.target.value);
                    setApifySavedSuccess(false);
                  }}
                  placeholder="apify_api_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowRawApifyToken(!showRawApifyToken)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-200"
                >
                  {showRawApifyToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {apifyToken && !isValidApifyTokenFormat(apifyToken) && (
                <p className="flex items-center gap-1 text-amber-400 text-xs mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Apify tokens usually start with apify_api_
                </p>
              )}
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Used to scrape live JustJoin.it listings. Without a token, Jobify falls back to sample data.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveApifyToken}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                {apifySavedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Saved
                  </>
                ) : (
                  'Save Apify Token'
                )}
              </button>
              {hasExistingApifyToken && (
                <button
                  type="button"
                  onClick={handleClearApifyToken}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
