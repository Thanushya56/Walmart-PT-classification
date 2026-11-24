// src/components/InviteModal.jsx
import React, { useState } from 'react';
import { X, Mail, Check, Copy, AlertCircle, Loader2, ExternalLink, Send, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function InviteModal({ isOpen, onClose, onInvitationSent }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleInvite(openGmailImmediately = true) {
    if (!email.trim()) {
      setError('Please enter a valid Gmail address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.sendInvitation(email.trim(), role);
      setSuccessResult(res);
      if (onInvitationSent) onInvitationSent(res);

      if (openGmailImmediately && res.gmailComposeUrl) {
        window.open(res.gmailComposeUrl, '_blank');
      }
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (successResult?.inviteLink) {
      const fullUrl = window.location.origin + successResult.inviteLink;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleReset() {
    setEmail('');
    setRole('editor');
    setError('');
    setSuccessResult(null);
    onClose();
  }

  const fullInviteUrl = successResult ? window.location.origin + successResult.inviteLink : '';
  const mailtoUrl = successResult
    ? `mailto:${encodeURIComponent(successResult.invitation.email)}?subject=${encodeURIComponent(
        `Invitation to Walmart PT Classification (${successResult.invitation.assigned_role.toUpperCase()})`
      )}&body=${encodeURIComponent(
        `Hi,\n\nYou have been invited to join the Walmart Product Type Classification Library as ${successResult.invitation.assigned_role.toUpperCase()}.\n\nAccept your invitation and sign in with your Gmail here:\n${fullInviteUrl}\n\nNote: This link expires in 7 days.`
      )}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-[#111726] border border-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Invite Teammate via Gmail</h3>
              <p className="text-xs text-slate-400">Send an invitation to join your Walmart PT workspace</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#161F33] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>
                  Invitation created for <strong>{successResult.invitation.email}</strong> as{' '}
                  <strong className="uppercase">{successResult.invitation.assigned_role}</strong>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* 1-Click Send with Gmail */}
                {successResult.gmailComposeUrl && (
                  <a
                    href={successResult.gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send via Gmail Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Send via Default Mail App */}
                <a
                  href={mailtoUrl}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open in Mail App</span>
                </a>
              </div>

              {/* Copyable Link */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-slate-300">Invitation Link (Direct Access)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullInviteUrl}
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Your teammate will click this link, sign in with their Gmail, and immediately join as{' '}
                  <strong className="text-slate-200 uppercase">{successResult.invitation.assigned_role}</strong>.
                </p>
              </div>

              {/* Message preview */}
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B] space-y-1 text-[11px] text-slate-400">
                <span className="text-slate-300 font-medium block">Pre-filled Email Preview:</span>
                <p className="italic">
                  "Hi, You have been invited to join the Walmart Product Type Classification Library as{' '}
                  {successResult.invitation.assigned_role.toUpperCase()}..."
                </p>
              </div>

              <button
                onClick={handleReset}
                className="w-full mt-3 py-2 rounded-lg bg-[#161F33] hover:bg-[#1E293B] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Teammate Gmail Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@gmail.com"
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Assign Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('editor')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      role === 'editor'
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                        : 'bg-[#0B0F17] border-[#1E293B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-emerald-400">EDITOR</span>
                      {role === 'editor' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Upload images, assign PTs & search taxonomy.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('viewer')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      role === 'viewer'
                        ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50'
                        : 'bg-[#0B0F17] border-[#1E293B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-indigo-400">VIEWER</span>
                      {role === 'viewer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Browse PT groups & visual search in read-only mode.
                    </p>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={loading || !email.trim()}
                  onClick={() => handleInvite(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Invite & Send via Gmail</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  disabled={loading || !email.trim()}
                  onClick={() => handleInvite(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] disabled:opacity-50 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Create Invitation Link Only</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
