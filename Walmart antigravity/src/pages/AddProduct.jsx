// src/pages/AddProduct.jsx
// Simple Upload: Exactly 2 Fields (Product Image + Walmart Product Type)

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Check,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function AddProduct({ currentRole, onNavigatePtGroups }) {
  const [image, setImage] = useState(null);
  const [ptName, setPtName] = useState('');
  const [ptSuggestions, setPtSuggestions] = useState([]);
  const [selectedPt, setSelectedPt] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isViewer = currentRole === 'viewer';

  // Global Ctrl + V image paste listener
  useEffect(() => {
    function handlePaste(e) {
      if (isViewer) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            readImageFile(file);
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isViewer]);

  function readImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    if (isViewer) return;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      readImageFile(file);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      readImageFile(file);
    }
  }

  async function handlePtSearch(query) {
    setPtName(query);
    if (query.trim().length > 1) {
      const res = await api.searchTaxonomy(query).catch(() => ({ results: [] }));
      setPtSuggestions(res.results || []);
    } else {
      setPtSuggestions([]);
      setSelectedPt(null);
    }
  }

  function selectPt(item) {
    setPtName(item.name);
    setSelectedPt(item);
    setPtSuggestions([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewer) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.uploadImage({
        image,
        ptName,
      });

      setSuccess(`Image classified under "${ptName}"! Added to PT group.`);
      setImage(null);
      setPtName('');
      setSelectedPt(null);

      setTimeout(() => {
        setSuccess('');
        if (onNavigatePtGroups) onNavigatePtGroups();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save classification.');
    } finally {
      setLoading(false);
    }
  }

  if (isViewer) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Editor Access Required</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Uploading images and assigning Product Types is restricted to Editors and Admins.
          Your current account role is <strong className="text-slate-300">VIEWER</strong> (Read-Only).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Upload Product Image</h2>
        <p className="text-xs text-slate-400">
          Fast two-field intake: Provide the product image and choose its Walmart Product Type.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Field 1: Product Image (Upload / Paste) */}
        <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>1. Product Image (Upload or Paste) *</span>
            </label>
            <span className="text-[11px] text-indigo-400 font-mono">
              Press Ctrl + V to paste anywhere
            </span>
          </div>

          {!image ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('simpleImageInput').click()}
              className="border-2 border-dashed border-[#1E293B] hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#0B0F17]/50"
            >
              <input
                id="simpleImageInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <UploadCloud className="w-9 h-9 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-200 mb-1">
                Drop your image here, click to browse, or press <strong>Ctrl + V</strong>
              </p>
              <p className="text-[10px] text-slate-500">
                Supports PNG, JPG, WebP. Visual hash is extracted instantly.
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-slate-900 max-h-72 flex items-center justify-center p-2">
              <img
                src={image}
                alt="Upload preview"
                className="max-h-64 rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/75 text-slate-300 hover:text-white transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Field 2: Walmart Product Type (PT) */}
        <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-3">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>2. Walmart Product Type (PT) *</span>
          </label>

          <div className="relative">
            <input
              type="text"
              required
              value={ptName}
              onChange={(e) => handlePtSearch(e.target.value)}
              placeholder="Type to search 6,980+ official Walmart Product Types..."
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />

            {ptSuggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#161F33] border border-[#1E293B] rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[#1E293B]">
                {ptSuggestions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectPt(item)}
                    className="w-full p-2.5 text-left hover:bg-[#1E293B] transition-colors text-xs"
                  >
                    <div className="font-semibold text-indigo-300">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.path}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPt && (
            <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Info className="w-3.5 h-3.5" />
                <span>{selectedPt.name}</span>
              </div>
              {selectedPt.description && (
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedPt.description}
                </p>
              )}
              <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                Path: {selectedPt.path}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !image || !ptName.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
          >
            <span>{loading ? 'Saving...' : 'Save & Classify'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
