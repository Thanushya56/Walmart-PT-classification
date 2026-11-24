// src/pages/MyProfile.jsx
// User Profile Editor & Gmail Sign-In

import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CheckCircle2, Save, Image as ImageIcon, Check, LogIn } from 'lucide-react';
import RoleBadge from '../components/RoleBadge';
import { api } from '../services/api';

export default function MyProfile({ currentUser, currentRole, onProfileUpdated }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Gmail Sign-in modal/input
  const [showGmailLogin, setShowGmailLogin] = useState(false);
  const [gmailInput, setGmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setEmail(currentUser.email || '');
      setAvatarUrl(currentUser.avatar_url || '');
    }
  }, [currentUser]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.updateProfile({
        full_name: fullName,
        email: email,
        avatar_url: avatarUrl,
      });

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      if (onProfileUpdated) onProfileUpdated(res.user);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGmailLoginSubmit(e) {
    e.preventDefault();
    if (!gmailInput.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.loginWithGmail(
        gmailInput.trim(),
        nameInput.trim() || gmailInput.split('@')[0],
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(gmailInput.trim())}`
      );

      setSuccess(`Signed in as ${res.user.email} (${res.role.toUpperCase()})`);
      setShowGmailLogin(false);
      setGmailInput('');
      setNameInput('');
      setTimeout(() => setSuccess(''), 3000);
      if (onProfileUpdated) onProfileUpdated(res.user, res.role);
    } catch (err) {
      setError(err.message || 'Gmail login failed.');
    } finally {
      setLoading(false);
    }
  }

  const permissions = {
    admin: [
      'Full workspace dashboard access',
      'Upload images and assign Walmart PTs',
      'Edit or rename PT groups and image classifications',
      'Delete images or entire PT groups',
      'Invite teammates by their Gmail address',
      'Assign & change Editor / Viewer permissions',
      'Remove team members and cancel invitations',
      'Review team activity audit logs with timestamps',
      'Manage workspace settings and security',
    ],
    editor: [
      'Upload product photos & assign Walmart PTs',
      'Paste images for smart visual search (Ctrl + V)',
      'Edit existing PT classifications & rename PT groups',
      'Browse all PT groups and image library',
    ],
    viewer: [
      'Browse all PT groups',
      'View catalog product images',
      'Search Walmart PT names and categories',
      'Paste images (Ctrl + V) for visual search and saved PT lookup',
    ],
  };

  const userPerms = permissions[currentRole?.toLowerCase()] || permissions.viewer;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <span>My Profile & Account</span>
          </h2>
          <p className="text-xs text-slate-400">
            Edit your profile details, connect your Gmail, and inspect active permissions.
          </p>
        </div>

        <button
          onClick={() => setShowGmailLogin(!showGmailLogin)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-semibold text-slate-200 transition-colors"
        >
          <LogIn className="w-4 h-4 text-indigo-400" />
          <span>Sign In With Gmail</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Gmail Login Modal / Dropdown */}
      {showGmailLogin && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
            <Mail className="w-4 h-4" />
            <span>Sign In or Switch Account via Gmail</span>
          </div>
          <p className="text-xs text-slate-400">
            Enter your Gmail address. If this is your main administrator email, you will instantly have full Admin ownership of this workspace.
          </p>
          <form onSubmit={handleGmailLoginSubmit} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Gmail Address *</label>
                <input
                  type="email"
                  required
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGmailLogin(false)}
                className="px-3 py-1.5 rounded-lg bg-[#161F33] text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !gmailInput}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
              >
                {loading ? 'Signing in...' : 'Sign In Now'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Profile Information</span>
          </h3>
          <RoleBadge role={currentRole} />
        </div>

        <div className="flex items-center gap-4">
          <img
            src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128'}
            alt="Avatar"
            className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/40 flex-shrink-0"
          />
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-300 block mb-1">Avatar Image URL</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... image URL or leave default"
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email / Gmail Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Permissions Breakdown */}
      <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Active Permissions ({currentRole?.toUpperCase()})</span>
          </h3>
          <span className="text-[11px] text-slate-500">Enforced by backend RBAC</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {userPerms.map((perm, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
