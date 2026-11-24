// src/pages/Overview.jsx
import React, { useEffect, useState } from 'react';
import {
  Layers,
  Users,
  Image as ImageIcon,
  UploadCloud,
  Sparkles,
  UserPlus,
  ArrowRight,
  Clock,
  Shield,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import RoleBadge from '../components/RoleBadge';

export default function Overview({
  currentRole,
  onNavigate,
  onOpenInvite,
}) {
  const [stats, setStats] = useState(null);
  const [recentImages, setRecentImages] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentRole === 'admin';
  const isViewer = currentRole === 'viewer';

  useEffect(() => {
    loadData();
  }, [currentRole]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, imagesRes] = await Promise.all([
        api.getWorkspaceStats(),
        api.getImages(),
      ]);
      setStats(statsRes.stats);
      setRecentImages((imagesRes.images || []).slice(0, 6));

      if (isAdmin) {
        const logsRes = await api.getActivityLogs().catch(() => ({ logs: [] }));
        setActivityLogs((logsRes.logs || []).slice(0, 8));
      }
    } catch (e) {
      console.error('Failed to load overview data', e);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      label: 'Classified Images',
      value: stats?.totalImages ?? 0,
      icon: ImageIcon,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      subtext: 'Catalog reference photos',
    },
    {
      label: 'Walmart PT Groups',
      value: stats?.totalPTGroups ?? 0,
      icon: Layers,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      subtext: 'Automatically grouped by PT',
    },
    {
      label: 'Team Members',
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      subtext: `${stats?.totalEditors ?? 0} Editors · ${stats?.totalViewers ?? 0} Viewers`,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Workspace Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111726] to-[#161F33] border border-[#1E293B] shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-3">
            <RoleBadge role={currentRole} size="xs" />
            <span>Walmart Product Type Classification Workspace</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl mb-2">
            PT Classification Reference Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            Upload product photos with 2-field simplicity (Image + Walmart PT), automatically group by Product Type, and use Ctrl + V visual image matching against previous classifications.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!isViewer && (
              <button
                onClick={() => onNavigate('add-product')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Image & PT</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('smart-search')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-200 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Image Search (Ctrl + V)</span>
            </button>

            {isAdmin && (
              <button
                onClick={onOpenInvite}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Teammate</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight mb-1">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-400">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Images with PT and Creator */}
        <div className="lg:col-span-2 rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Recent Classifications</h3>
              <p className="text-xs text-slate-400">Latest product images and assigned Walmart PTs</p>
            </div>
            <button
              onClick={() => onNavigate('pt-groups')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <span>View PT Groups</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recentImages.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-xs text-slate-400">
                No images uploaded yet.
              </div>
            ) : (
              recentImages.map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E293B] p-2 space-y-2"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900 relative">
                    <img
                      src={img.image_url}
                      alt={img.pt_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 right-2 truncate px-2 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-indigo-300 border border-white/10 shadow">
                      {img.pt_name}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium truncate">
                    By {img.uploaded_by_name || 'Admin'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(img.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Team Activity Logs with Timestamps */}
        <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#1E293B]">
            <h3 className="text-sm font-semibold text-slate-100">
              {isAdmin ? 'Team Activity Log' : 'Classification Guide'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAdmin ? 'Uploads, PT changes, and team events with timestamps' : 'Walmart PT reference quick tips'}
            </p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {isAdmin ? (
              activityLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No activity logged yet.</div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B] text-xs">
                    <div className="flex items-center justify-between font-medium mb-1">
                      <span className="text-indigo-400 capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      By <strong>{log.actor_name || 'System'}</strong>
                    </p>
                    {log.details?.pt_name && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        PT: {log.details.pt_name}
                      </p>
                    )}
                    {log.details?.recipient_email && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Invited: {log.details.recipient_email} ({log.details.assigned_role})
                      </p>
                    )}
                  </div>
                ))
              )
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <h4 className="font-semibold text-slate-200 mb-1">Ctrl + V Visual Search</h4>
                  <p className="text-[11px] text-slate-400">
                    Paste any product screenshot directly into Image Search to find exact or similar items and their saved PT.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                  <h4 className="font-semibold text-slate-200 mb-1">Automatic PT Grouping</h4>
                  <p className="text-[11px] text-slate-400">
                    All images with the same Walmart Product Type appear together automatically under one PT Group.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
