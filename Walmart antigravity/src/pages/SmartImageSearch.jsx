// src/pages/SmartImageSearch.jsx
// Image Search: Ctrl + V image paste, visual similarity search & display of saved PT

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Layers,
  User,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function SmartImageSearch({ onSelectPt }) {
  const [queryImage, setQueryImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Global Ctrl + V image paste listener
  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            readAndSearchImage(file);
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  function readAndSearchImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgData = e.target.result;
      setQueryImage(imgData);
      performImageSearch(imgData);
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) readAndSearchImage(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) readAndSearchImage(file);
  }

  async function performImageSearch(imgData) {
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await api.searchByImage(imgData);
      setMatches(res.matches || []);
    } catch (err) {
      setError(err.message || 'Image search failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Visual Image Search</span>
        </h2>
        <p className="text-xs text-slate-400">
          Paste (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px]">Ctrl + V</kbd>) any product picture to find exact or visually similar catalog images and see their saved Walmart Product Type.
        </p>
      </div>

      {/* Paste & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('imageSearchInput').click()}
        className="p-8 rounded-2xl border-2 border-dashed border-[#1E293B] hover:border-indigo-500/50 bg-[#111726]/60 transition-all text-center cursor-pointer relative overflow-hidden"
      >
        <input
          id="imageSearchInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Press <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-xs">Ctrl + V</kbd> to Paste
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Or click to browse from device, or drag & drop any image here.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Search Target Preview & Matches */}
      {queryImage && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#111726] border border-[#1E293B] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={queryImage}
                alt="Search query"
                className="w-16 h-16 rounded-lg object-contain bg-slate-900 border border-[#1E293B] flex-shrink-0"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Query Image</span>
                <p className="text-[11px] text-slate-400">
                  Visual features extracted and matched against classified catalog.
                </p>
              </div>
            </div>

            <button
              onClick={() => performImageSearch(queryImage)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161F33] hover:bg-[#1E293B] text-slate-300 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-search</span>
            </button>
          </div>

          {/* Matches List */}
          <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Saved PT Matches</h3>
                <p className="text-xs text-slate-400">
                  {matches.length} matching previously uploaded images with their saved Walmart PT
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Comparing perceptual hashes and finding saved PTs...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No matching images found in the workspace library. Try uploading this image with a new Walmart Product Type.
              </div>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#161F33]/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={m.image_url}
                        alt="Matched Item"
                        className="w-16 h-16 rounded-lg object-contain bg-slate-900 border border-[#1E293B] flex-shrink-0"
                      />

                      <div className="min-w-0 space-y-1">
                        {/* Saved PT prominently displayed */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">Saved PT:</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{m.saved_pt}</span>
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              m.matchType === 'exact'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {m.similarityScore}% {m.matchType.toUpperCase()} MATCH
                          </span>
                        </div>

                        {/* Creator Tracking */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Uploaded by <strong>{m.uploaded_by_name || 'Admin'}</strong></span>
                          </span>
                          {m.uploaded_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(m.uploaded_at).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View in PT Groups */}
                    <button
                      onClick={() => onSelectPt && onSelectPt(m.saved_pt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161F33] hover:bg-[#1E293B] text-xs font-semibold text-indigo-300 transition-colors flex-shrink-0"
                    >
                      <span>View PT Group</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
