// src/pages/PtGroups.jsx
// Automatic PT Grouping with Full Edit/Delete Capabilities for PTs and Images

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Search,
  User,
  Calendar,
  Image as ImageIcon,
  ArrowRight,
  X,
  Trash2,
  Edit,
  Tag,
  Check,
  FolderEdit,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function PtGroups({ currentRole }) {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group Details & Image Viewer
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Edit Single Image PT Modal
  const [editingImage, setEditingImage] = useState(null);
  const [newImagePtName, setNewImagePtName] = useState('');
  const [imagePtSuggestions, setImagePtSuggestions] = useState([]);

  // Rename Entire PT Group Modal
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupPtSuggestions, setGroupPtSuggestions] = useState([]);

  // Confirm Modals
  const [deleteImageModal, setDeleteImageModal] = useState({
    isOpen: false,
    imageId: null,
  });

  const [deleteGroupModal, setDeleteGroupModal] = useState({
    isOpen: false,
    ptName: '',
  });

  const isAdmin = currentRole === 'admin';
  const isViewer = currentRole === 'viewer';

  useEffect(() => {
    loadPtGroups();
    loadCategories();
  }, []);

  async function loadPtGroups() {
    setLoading(true);
    try {
      const res = await api.getPtGroups();
      setGroups(res.groups || []);
      if (activeGroup) {
        const refreshed = (res.groups || []).find(g => g.pt_name === activeGroup.pt_name);
        if (refreshed) setActiveGroup(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.getCategories();
      setCategories(res.categories || []);
    } catch (e) {}
  }

  // Search PT autocomplete
  async function handleSearchPt(query, isForGroup = false) {
    if (isForGroup) {
      setNewGroupName(query);
      if (query.trim().length > 1) {
        const res = await api.searchTaxonomy(query).catch(() => ({ results: [] }));
        setGroupPtSuggestions(res.results || []);
      } else {
        setGroupPtSuggestions([]);
      }
    } else {
      setNewImagePtName(query);
      if (query.trim().length > 1) {
        const res = await api.searchTaxonomy(query).catch(() => ({ results: [] }));
        setImagePtSuggestions(res.results || []);
      } else {
        setImagePtSuggestions([]);
      }
    }
  }

  // Submit PT edit for single image
  async function handleUpdateImagePt(e) {
    e.preventDefault();
    if (!editingImage || !newImagePtName.trim()) return;
    try {
      await api.updateImagePt(editingImage.id, newImagePtName.trim());
      setEditingImage(null);
      setNewImagePtName('');
      loadPtGroups();
    } catch (err) {
      alert(err.message);
    }
  }

  // Submit rename for entire PT Group
  async function handleRenameGroup(e) {
    e.preventDefault();
    if (!renamingGroup || !newGroupName.trim()) return;
    try {
      await api.renamePtGroup(renamingGroup.pt_name, newGroupName.trim());
      setRenamingGroup(null);
      setNewGroupName('');
      loadPtGroups();
    } catch (err) {
      alert(err.message);
    }
  }

  // Delete image
  async function handleDeleteImageConfirm() {
    if (!deleteImageModal.imageId) return;
    try {
      await api.deleteImage(deleteImageModal.imageId);
      setDeleteImageModal({ isOpen: false, imageId: null });
      loadPtGroups();
    } catch (err) {
      alert(err.message);
    }
  }

  // Delete entire PT Group
  async function handleDeleteGroupConfirm() {
    if (!deleteGroupModal.ptName) return;
    try {
      await api.deletePtGroup(deleteGroupModal.ptName);
      setDeleteGroupModal({ isOpen: false, ptName: '' });
      if (activeGroup?.pt_name === deleteGroupModal.ptName) {
        setActiveGroup(null);
      }
      loadPtGroups();
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredGroups = groups.filter((g) => {
    const matchSearch =
      !search ||
      g.pt_name.toLowerCase().includes(search.toLowerCase()) ||
      g.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || g.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Automatic PT Grouping</span>
        </h2>
        <p className="text-xs text-slate-400">
          All images with the same Walmart Product Type appear under one group. Edit or delete any image or PT group below.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#111726] border border-[#1E293B] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PT groups or categories..."
            className="w-full bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-200 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 w-full sm:w-56 cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 rounded-xl bg-[#111726] border border-[#1E293B]">
          No PT groups found. Use <strong>Simple Upload</strong> to add images with Walmart Product Types.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div
              key={group.pt_name}
              className="rounded-2xl bg-[#111726] border border-[#1E293B] overflow-hidden shadow-sm"
            >
              {/* Group Header Banner with Edit & Delete Controls */}
              <div className="p-5 border-b border-[#1E293B] bg-[#0D111A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <span>{group.pt_name}</span>
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                      {group.imageCount} {group.imageCount === 1 ? 'Image' : 'Images'}
                    </span>
                    {group.category && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Category: {group.category}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Group created by <strong>{group.created_by_name || 'Admin'}</strong></span>
                    <span>•</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(group.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Group Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isViewer && (
                    <button
                      onClick={() => {
                        setRenamingGroup(group);
                        setNewGroupName(group.pt_name);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-slate-300 transition-colors"
                      title="Rename PT Group across all images"
                    >
                      <FolderEdit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rename Group</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => setDeleteGroupModal({ isOpen: true, ptName: group.pt_name })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 transition-colors"
                      title="Delete entire PT Group and its images"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Group</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveGroup(group)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-sm"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Group Images Grid */}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {group.images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E293B] hover:border-indigo-500/50 transition-all flex flex-col"
                  >
                    {/* Image Thumbnail */}
                    <div
                      onClick={() => setSelectedImage(img)}
                      className="aspect-square w-full overflow-hidden bg-slate-900 cursor-pointer relative"
                    >
                      <img
                        src={img.image_url}
                        alt={img.pt_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {/* Prominent PT Name Pill on image */}
                      <div className="absolute top-2 left-2 right-2 truncate px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-[10px] font-semibold text-indigo-300 border border-white/10 shadow">
                        {img.pt_name}
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between text-[11px] space-y-1">
                      <div className="truncate text-slate-300 font-medium" title={img.uploaded_by_name}>
                        By {img.uploaded_by_name || 'Admin'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(img.uploaded_at).toLocaleDateString()}
                      </div>

                      {/* Image Action Buttons */}
                      <div className="pt-2 flex items-center justify-between border-t border-[#1E293B]/70">
                        {!isViewer && (
                          <button
                            onClick={() => {
                              setEditingImage(img);
                              setNewImagePtName(img.pt_name);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-[#161F33] transition-colors"
                            title="Edit image PT"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => setDeleteImageModal({ isOpen: true, imageId: img.id })}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-auto"
                            title="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Entire PT Group Modal */}
      {renamingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111726] border border-[#1E293B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FolderEdit className="w-4 h-4 text-indigo-400" />
                <span>Rename PT Group</span>
              </h3>
              <button onClick={() => setRenamingGroup(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Renaming <strong>{renamingGroup.pt_name}</strong> will update the Product Type across all <strong>{renamingGroup.imageCount}</strong> images in this group.
            </p>

            <form onSubmit={handleRenameGroup} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  New Walmart Product Type (PT)
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => handleSearchPt(e.target.value, true)}
                  placeholder="Search 6,980+ Walmart PTs..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                {groupPtSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-[#161F33] border border-[#1E293B] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-[#1E293B]">
                    {groupPtSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setNewGroupName(item.name);
                          setGroupPtSuggestions([]);
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
                  onClick={() => setRenamingGroup(null)}
                  className="px-4 py-2 rounded-lg bg-[#161F33] text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                >
                  Rename Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Single Image PT Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111726] border border-[#1E293B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>Edit Image Product Type</span>
              </h3>
              <button onClick={() => setEditingImage(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateImagePt} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Walmart Product Type (PT)
                </label>
                <input
                  type="text"
                  required
                  value={newImagePtName}
                  onChange={(e) => handleSearchPt(e.target.value, false)}
                  placeholder="Search 6,980+ PTs..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                {imagePtSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-[#161F33] border border-[#1E293B] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-[#1E293B]">
                    {imagePtSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setNewImagePtName(item.name);
                          setImagePtSuggestions([]);
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

      {/* Delete Image Modal */}
      <ConfirmModal
        isOpen={deleteImageModal.isOpen}
        title="Delete Image"
        message="Are you sure you want to permanently delete this image from the library?"
        confirmText="Delete"
        danger={true}
        onConfirm={handleDeleteImageConfirm}
        onClose={() => setDeleteImageModal({ isOpen: false, imageId: null })}
      />

      {/* Delete Entire PT Group Modal */}
      <ConfirmModal
        isOpen={deleteGroupModal.isOpen}
        title={`Delete PT Group: ${deleteGroupModal.ptName}`}
        message={`Are you sure you want to permanently delete the entire PT group "${deleteGroupModal.ptName}" and ALL of its classified images? This action cannot be undone.`}
        confirmText="Delete Entire Group"
        danger={true}
        onConfirm={handleDeleteGroupConfirm}
        onClose={() => setDeleteGroupModal({ isOpen: false, ptName: '' })}
      />
    </div>
  );
}
