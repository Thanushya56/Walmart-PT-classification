// src/pages/WorkspaceSettings.jsx
import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  HardDrive,
  Users,
  Check,
  AlertCircle,
  Lock,
  Database,
  Layers,
  Save,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function WorkspaceSettings({ currentRole, currentUser }) {
  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [name, setName] = useState('');
  const [allowViewerExport, setAllowViewerExport] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  async function loadSettings() {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.getWorkspaceSettings(),
        api.getWorkspaceStats(),
      ]);
      const ws = settingsRes.workspace;
      setWorkspace(ws);
      setName(ws?.name || '');
      setAllowViewerExport(ws?.settings?.allow_viewer_export || false);
      setExpiryDays(ws?.settings?.invitation_expiry_days || 7);
      setStats(statsRes.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateWorkspaceSettings({
        name,
        settings: {
          allow_viewer_export: allowViewerExport,
          invitation_expiry_days: Number(expiryDays),
        },
      });
      setSuccess('Workspace settings updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Admin Control Panel Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Workspace infrastructure, quotas, and security configuration can only be accessed by the Workspace Owner / Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Admin Workspace Control Panel</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure multi-tenant workspace policies, storage quotas, role settings, and cloud security.
        </p>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Workspace Identity */}
        <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Workspace Identity & Ownership</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Workspace Slug / ID
              </label>
              <input
                type="text"
                disabled
                value={workspace?.slug || 'walmart-retail-classification'}
                className="w-full bg-[#0B0F17]/50 border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-200 font-medium block">Workspace Owner:</span>
              <span className="text-[11px] text-slate-400">{currentUser?.email || 'admin@walmart.com'}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-medium">
              Primary Administrator
            </span>
          </div>
        </div>

        {/* Quotas & Storage */}
        <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Storage & Indexing Metrics</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
              <span className="text-[11px] text-slate-400 block mb-1">Total Classified Items</span>
              <span className="text-lg font-bold text-white">{stats?.totalProducts ?? 0}</span>
            </div>
            <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
              <span className="text-[11px] text-slate-400 block mb-1">Product Images Indexed</span>
              <span className="text-lg font-bold text-white">{stats?.totalImages ?? 0}</span>
            </div>
            <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
              <span className="text-[11px] text-slate-400 block mb-1">Storage Consumed</span>
              <span className="text-lg font-bold text-indigo-400">{stats?.storageUsedMB ?? 0} MB / 5120 MB</span>
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Security & Data Governance Policies</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B] cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowViewerExport}
                onChange={(e) => setAllowViewerExport(e.target.checked)}
                className="mt-0.5 rounded border-[#1E293B] bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Allow Viewers to Export Product Data
                </span>
                <span className="text-[11px] text-slate-400">
                  When disabled, only Editors and Admins can download CSV datasets or backup archives.
                </span>
              </div>
            </label>

            <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Invitation Expiry Window
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Number of days an email invitation token remains valid.
                  </span>
                </div>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="bg-[#161F33] border border-[#1E293B] text-xs text-slate-200 rounded px-2.5 py-1"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (Standard)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-300 block">
                  Active Admin Account Protection
                </span>
                <span className="text-[11px] text-slate-300">
                  Database trigger `prevent_last_admin_removal` actively guards your workspace. The only administrator account cannot be demoted or deleted.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Workspace Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
