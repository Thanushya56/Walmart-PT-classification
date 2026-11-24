// src/pages/TeamManagement.jsx
import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Edit3,
  Eye,
  Mail,
  MoreVertical,
  Trash2,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import RoleBadge from '../components/RoleBadge';
import InviteModal from '../components/InviteModal';
import ConfirmModal from '../components/ConfirmModal';

export default function TeamManagement({ currentRole, currentUser }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [copiedToken, setCopiedToken] = useState(null);

  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadTeamData();
    }
  }, [isAdmin]);

  async function loadTeamData() {
    setLoading(true);
    setError('');
    try {
      const [membersRes, invitesRes, statsRes] = await Promise.all([
        api.getMembers(),
        api.getInvitations(),
        api.getWorkspaceStats(),
      ]);
      setMembers(membersRes.members || []);
      setInvitations(invitesRes.invitations || []);
      setStats(statsRes.stats);
    } catch (err) {
      setError(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeRole(memberId, newRole) {
    try {
      await api.updateMemberRole(memberId, newRole);
      setSuccessMessage(`Member role successfully changed to ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadTeamData();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleRemoveMemberClick(member) {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${member.full_name || member.email} from this workspace? Their access will be revoked immediately. Previous classification logs will be preserved.`,
      onConfirm: async () => {
        try {
          await api.removeMember(member.id);
          setSuccessMessage(`Team member ${member.email} removed from workspace.`);
          setTimeout(() => setSuccessMessage(''), 3000);
          loadTeamData();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  }

  async function handleCancelInvitation(invitationId) {
    try {
      await api.cancelInvitation(invitationId);
      setSuccessMessage('Invitation cancelled.');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadTeamData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResendInvitation(invitationId) {
    try {
      const res = await api.resendInvitation(invitationId);
      setSuccessMessage(`Invitation resent to ${res.invitation.email}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadTeamData();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopyInviteLink(inv) {
    const token = inv.raw_token || inv.invitation_token_hash;
    const link = `${window.location.origin}/accept-invitation?token=${token}&email=${encodeURIComponent(inv.email)}&workspaceId=${inv.workspace_id}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function handleOpenGmailCompose(inv) {
    const token = inv.raw_token || inv.invitation_token_hash;
    const link = `${window.location.origin}/accept-invitation?token=${token}&email=${encodeURIComponent(inv.email)}&workspaceId=${inv.workspace_id}`;
    const subject = `Invitation to Walmart PT Classification Workspace (${inv.assigned_role.toUpperCase()})`;
    const mailBody = `Hi,\n\nYou have been invited to join the Walmart Product Type Classification Library as ${inv.assigned_role.toUpperCase()}.\n\nAccept your invitation and sign in with your Gmail here:\n${link}\n\nNote: This invitation is restricted to ${inv.email} and expires in 7 days.`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inv.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
    window.open(gmailUrl, '_blank');
  }

  if (!isAdmin) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Admin Access Required</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Team Management and teammate invitation workflows are restricted to workspace Admins.
          You are currently signed in with the <strong className="text-slate-300">{currentRole.toUpperCase()}</strong> role.
        </p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Members', value: stats?.totalMembers ?? members.length, icon: Users, color: 'text-indigo-400' },
    { label: 'Active Editors', value: stats?.totalEditors ?? 0, icon: Edit3, color: 'text-emerald-400' },
    { label: 'Active Viewers', value: stats?.totalViewers ?? 0, icon: Eye, color: 'text-slate-400' },
    {
      label: 'Pending Invitations',
      value: invitations.filter((i) => i.status === 'pending').length,
      icon: Mail,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Team Management & Access Control</h2>
          <p className="text-xs text-slate-400">
            Invite teammates, manage roles (Editor / Viewer), and oversee workspace permissions.
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
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

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-200">
            &times;
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="p-4 rounded-xl bg-[#111726] border border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">{c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Active Workspace Members</h3>
            <p className="text-xs text-slate-400">Teammates with active access to this workspace</p>
          </div>
          <span className="text-xs text-slate-500">{members.length} Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0D111A]">
                <th className="px-6 py-3 table-header">Member</th>
                <th className="px-6 py-3 table-header">Email</th>
                <th className="px-6 py-3 table-header">Assigned Role</th>
                <th className="px-6 py-3 table-header">Joined</th>
                <th className="px-6 py-3 table-header">Status</th>
                <th className="px-6 py-3 table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-xs">
              {members.map((m) => {
                const isSelf = m.user_id === currentUser?.id;
                const isOnlyAdmin = m.role === 'admin' && members.filter((x) => x.role === 'admin').length <= 1;

                return (
                  <tr key={m.id} className="hover:bg-[#161F33]/40 transition-colors">
                    {/* Member Profile */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
                          alt={m.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-[#1E293B]"
                        />
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{m.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-3.5 text-slate-300 font-mono text-[11px]">{m.email}</td>

                    {/* Role */}
                    <td className="px-6 py-3.5">
                      <RoleBadge role={m.role} size="xs" />
                    </td>

                    {/* Join Date */}
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 text-right">
                      {m.role !== 'admin' ? (
                        <div className="inline-flex items-center gap-2">
                          {/* Role Toggle Dropdown */}
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.id, e.target.value)}
                            className="bg-[#0B0F17] border border-[#1E293B] text-[11px] text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveMemberClick(m)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Workspace Owner</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Section */}
      <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Pending & Previous Invitations</h3>
            <p className="text-xs text-slate-400">
              Teammates invited by email who have not yet accepted
            </p>
          </div>
          <span className="text-xs text-slate-500">{invitations.length} Total</span>
        </div>

        {invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending invitations. Click <strong>Invite Member</strong> above to add colleagues.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0D111A]">
                  <th className="px-6 py-3 table-header">Recipient Email</th>
                  <th className="px-6 py-3 table-header">Assigned Role</th>
                  <th className="px-6 py-3 table-header">Invited Date</th>
                  <th className="px-6 py-3 table-header">Expires At</th>
                  <th className="px-6 py-3 table-header">Status</th>
                  <th className="px-6 py-3 table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#161F33]/40 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-200">{inv.email}</td>
                    <td className="px-6 py-3.5">
                      <RoleBadge role={inv.assigned_role} size="xs" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                          inv.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : inv.status === 'accepted'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <span className="capitalize">{inv.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {inv.status === 'pending' && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenGmailCompose(inv)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Send / Open in Gmail Web"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyInviteLink(inv)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Copy Invitation Link"
                          >
                            {copiedToken === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleResendInvitation(inv.id)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Cancel invitation"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvitationSent={() => loadTeamData()}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
