// src/pages/ProductLibrary.jsx
// All Uploaded Images with PT Names, Creator Tracking & Filters

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Search,
  Trash2,
  Edit,
  User,
  Calendar,
  Sparkles,
  PlusCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function ProductLibrary({
  currentRole,
  onNavigateAdd,
  onNavigateSmartSearch,
}) {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing state
  const [editingImage, setEditingImage] = useState(null);
  const [editPt, setEditPt] = useState('');
  const [ptSuggestions, setPtSuggestions] = useState([]);

  // Deletion modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    imageId: null,
  });

  const isAdmin = currentRole === 'admin';
  const isViewer = currentRole === 'viewer';

  useEffect(() => {
    loadImages();
    loadCategories();
  }, [selectedCategory]);

  async function loadCategories() {
    try {
      const res = await api.getCategories();
      setCategories(res.categories || []);
    } catch (e) {}
  }

  async function loadImages() {
    setLoading(true);
    try {
      const res = await api.getImages({
        search: searchQuery,
        category: selectedCategory,
      });
      setImages(res.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadImages();
  }

  function openEditModal(img) {
    setEditingImage(img);
    setEditPt(img.pt_name);
  }

  async function handlePtSearchChange(val) {
    setEditPt(val);
    if (val.trim().length > 1) {
      const res = await api.searchTaxonomy(val).catch(() => ({ results: [] }));
      setPtSuggestions(res.results || []);
    } else {
      setPtSuggestions([]);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await api.updateImagePt(editingImage.id, editPt.trim());
      setSuccessMessage('Image Product Type updated.');
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingImage(null);
      loadImages();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await api.deleteImage(deleteModal.imageId);
      setSuccessMessage('Image deleted from library.');
      setTimeout(() => setSuccessMessage(''), 3000);
      setDeleteModal({ isOpen: false, imageId: null });
      loadImages();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Classified Image Library</h2>
          <p className="text-xs text-slate-400">
            Browse all uploaded product images and their assigned Walmart Product Types.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isViewer && (
            <button
              onClick={onNavigateAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          )}
          <button
            onClick={onNavigateSmartSearch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Image Search</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {successMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#111726] border border-[#1E293B] flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PT name or category..."
            className="w-full bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-200 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </form>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 w-full sm:w-48 cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Images Grid */}
      <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Library Images</h3>
          <span className="text-xs text-slate-500">{images.length} Images</span>
        </div>

        {images.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No images found matching your search.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {images.map((img) => (
              <div
                key={img.id}
                className="group rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E293B] hover:border-indigo-500/50 transition-all flex flex-col justify-between"
              >
                {/* Image */}
                <div className="aspect-square bg-slate-900 overflow-hidden relative">
                  <img
                    src={img.image_url}
                    alt={img.pt_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-2 left-2 right-2 truncate px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-semibold text-indigo-300 border border-white/10 shadow">
                    {img.pt_name}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 text-[11px] space-y-1">
                  <div className="text-slate-300 font-medium truncate">
                    By {img.uploaded_by_name || 'Admin'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(img.uploaded_at).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#1E293B]/70">
                    {!isViewer ? (
                      <button
                        onClick={() => openEditModal(img)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-[#161F33] transition-colors"
                        title="Edit PT"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Read-only</span>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, imageId: img.id })}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit PT Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111726] border border-[#1E293B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-semibold text-slate-100">Change Walmart Product Type</h3>
              <button onClick={() => setEditingImage(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Walmart Product Type (PT)
                </label>
                <input
                  type="text"
                  required
                  value={editPt}
                  onChange={(e) => handlePtSearchChange(e.target.value)}
                  placeholder="Search 6,980+ PTs..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                {ptSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-[#161F33] border border-[#1E293B] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-[#1E293B]">
                    {ptSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setEditPt(item.name);
                          setPtSuggestions([]);
                        }}
                        className="w-full p-2.5 text-left hover:bg-[#1E293B] text-xs font-semibold text-indigo-300"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingImage(null)}
                  className="px-4 py-2 rounded-lg bg-[#161F33] text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                >
                  Save PT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Image"
        message="Are you sure you want to permanently delete this image from the library?"
        confirmText="Delete"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteModal({ isOpen: false, imageId: null })}
      />
    </div>
  );
}
