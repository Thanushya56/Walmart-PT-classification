// src/pages/AcceptInvitation.jsx
// Teammate Invitation Acceptance & Gmail Sign-In Onboarding

import React, { useEffect, useState } from 'react';
import { Mail, Check, AlertCircle, Loader2, ArrowRight, Layers, Shield, User, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import RoleBadge from '../components/RoleBadge';

export default function AcceptInvitation({ onAccepted }) {
  const [params, setParams] = useState({ token: '', email: '', workspaceId: '' });
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [acceptedData, setAcceptedData] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    const email = urlParams.get('email') || '';
    const workspaceId = urlParams.get('workspaceId') || 'ws_walmart_main';

    setParams({ token, email, workspaceId });

    if (email) {
      const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setFullName(defaultName);
    }

    if (token && email) {
      verifyToken(workspaceId, email, token);
    } else {
      setVerifying(false);
      setError('Missing invitation token or email. Please check your invitation link.');
    }
  }, []);

  async function verifyToken(workspaceId, email, token) {
    setVerifying(true);
    try {
      const res = await api.verifyInvitation(workspaceId, email, token);
      if (res.valid) {
        setInvitationInfo(res.invitation);
      } else {
        setError('Invitation is invalid or has expired.');
      }
    } catch (err) {
      setError(err.message || 'Invitation is invalid or has expired.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleAcceptAndLogin(e) {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.trim())}`;
      const res = await api.acceptInvitation(params.workspaceId, params.email, params.token, {
        fullName: fullName.trim(),
        avatarUrl,
      });

      setSuccess(true);
      setAcceptedData(res);

      setTimeout(() => {
        if (onAccepted) {
          onAccepted(res.user, res.role || res.member?.role);
        } else {
          window.location.href = '/';
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  }

  const role = invitationInfo?.assigned_role || 'editor';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0F17] text-slate-100">
      <div className="w-full max-w-lg p-8 rounded-2xl bg-[#111726] border border-[#1E293B] shadow-2xl space-y-6">
        {/* Brand / Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold text-white tracking-tight">Walmart PT Classification</h1>
            <p className="text-xs text-slate-400">Collaborative Product Taxonomy Workspace</p>
          </div>
        </div>

        {verifying ? (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400">Verifying your invitation...</p>
          </div>
        ) : error ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong className="block font-semibold">Unable to Accept Invitation</strong>
                <span className="text-rose-300/90">{error}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Please request a new invitation from your workspace administrator or check that you opened the full link.
            </p>
          </div>
        ) : success ? (
          <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Welcome, {acceptedData?.user?.full_name || 'Teammate'}!</h3>
              <p className="text-xs text-emerald-300/90 mt-1">
                You have joined the workspace as an <strong className="text-emerald-400 uppercase">{acceptedData?.role || role}</strong>.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Launching workspace dashboard...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Invitation Banner */}
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Assigned Role:</span>
                <RoleBadge role={role} size="sm" />
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                {role === 'editor' ? (
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    ✨ <strong>Editor Access:</strong> You can upload product images, assign Walmart Product Types, search taxonomy, and match images.
                  </p>
                ) : (
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    👁️ <strong>Viewer Access:</strong> You can browse all PT groups, view classifications, and perform perceptual visual searches in read-only mode.
                  </p>
                )}
              </div>
            </div>

            {/* Login / Onboarding Form */}
            <form onSubmit={handleAcceptAndLogin} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Your Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Your Gmail Address</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified Invitee
                  </span>
                </label>
                <input
                  type="email"
                  readOnly
                  value={params.email}
                  className="w-full bg-[#0B0F17]/60 border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all focus:outline-none cursor-not-allowed"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading || !params.token || !params.email}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                )}
                <span>Sign In with Gmail & Join Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-slate-500 text-center">
              By joining, your account will be linked to this workspace as an authorized teammate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
