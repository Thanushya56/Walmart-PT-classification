// src/components/Sidebar.jsx
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Image as ImageIcon,
  UploadCloud,
  Sparkles,
  Tag,
  Users,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import RoleBadge from './RoleBadge';

export default function Sidebar({
  activePage,
  setActivePage,
  currentUser,
  currentRole,
  onSwitchRole,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const isAdmin = currentRole === 'admin';
  const isViewer = currentRole === 'viewer';

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'pt-groups', label: 'PT Groups', icon: Layers, highlight: true },
        { id: 'add-product', label: 'Simple Upload', icon: UploadCloud, badge: isViewer ? 'Locked' : null },
        { id: 'smart-search', label: 'Image Search', icon: Sparkles },
        { id: 'library', label: 'All Images', icon: ImageIcon },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'categories', label: 'Taxonomy Categories', icon: Tag },
        ...(isAdmin ? [{ id: 'team', label: 'Team Management', icon: Users, highlight: true }] : []),
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        ...(isAdmin ? [{ id: 'settings', label: 'Workspace Settings', icon: Settings }] : []),
        { id: 'profile', label: 'My Profile', icon: User },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-[#1E293B] bg-[#0D111A] transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-tight text-white truncate">
                PT Classification
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Walmart Library
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#161F33]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && item.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Section & Account Menu */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0B0F17]">
        {/* Role Switcher Pill */}
        <div className="mb-2">
          {!collapsed ? (
            <div className="relative">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-xs text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Preview Role</span>
                </div>
                <RoleBadge role={currentRole} size="xs" />
              </button>

              {showRoleSwitcher && (
                <div className="absolute bottom-full left-0 mb-2 w-full p-1.5 rounded-lg bg-[#161F33] border border-[#1E293B] shadow-xl space-y-1 z-50">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase">
                    Test Permissions
                  </div>
                  <button
                    onClick={() => {
                      onSwitchRole('admin');
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      currentRole === 'admin'
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-slate-300 hover:bg-[#1E293B]'
                    }`}
                  >
                    <span>Admin</span>
                    <span className="text-[10px] text-slate-400">Owner</span>
                  </button>
                  <button
                    onClick={() => {
                      onSwitchRole('editor');
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      currentRole === 'editor'
                        ? 'bg-emerald-600/20 text-emerald-300'
                        : 'text-slate-300 hover:bg-[#1E293B]'
                    }`}
                  >
                    <span>Editor</span>
                    <span className="text-[10px] text-slate-400">Upload/Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      onSwitchRole('viewer');
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      currentRole === 'viewer'
                        ? 'bg-slate-600/20 text-slate-300'
                        : 'text-slate-300 hover:bg-[#1E293B]'
                    }`}
                  >
                    <span>Viewer</span>
                    <span className="text-[10px] text-slate-400">Read-Only</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <RoleBadge role={currentRole} size="xs" />
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-[#111726] border border-[#1E293B]">
          <img
            src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {currentUser?.full_name || 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {currentUser?.email || 'admin@walmart.com'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
