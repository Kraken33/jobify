'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, isValidKeyFormat } from '@/lib/storage/apiKeyStorage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
  onSuccessScanTrigger?: () => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  onKeyUpdated,
  onSuccessScanTrigger,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey() || '');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setErrorMsg('Please enter an OpenAI API key to proceed.');
      return;
    }

    if (!isValidKeyFormat(trimmed)) {
      setErrorMsg('Invalid key format. Must start with sk- and be at least 20 characters.');
      return;
    }

    setStoredApiKey(trimmed);
    onKeyUpdated?.(true);
    onClose();
    if (onSuccessScanTrigger) {
      onSuccessScanTrigger();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>OpenAI API Key Required</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-4">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Scanning and AI evaluation requires your personal OpenAI API Key. It is stored exclusively in your browser&apos;s local storage.
          </p>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              OpenAI API Key (sk-...)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="sk-proj-..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 transition"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Save Key & Scan
          </button>
        </div>
      </div>
    </div>
  );
}

