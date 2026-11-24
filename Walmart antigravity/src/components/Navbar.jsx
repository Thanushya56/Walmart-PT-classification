// src/components/Navbar.jsx
import React from 'react';
import { Search, Bell, Plus, Shield, Users } from 'lucide-react';
import RoleBadge from './RoleBadge';

export default function Navbar({
  title,
  subtitle,
  currentRole,
  onOpenInvite,
  searchQuery,
  setSearchQuery,
  onNavigateAddProduct,
}) {
  const isAdmin = currentRole === 'admin';
  const isViewer = currentRole === 'viewer';

  return (
    <header className="h-16 px-6 border-b border-[#1E293B] bg-[#0D111A]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      {/* Title & Breadcrumbs */}
      <div>
        <h1 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative w-64 hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search products or PTs..."
            className="w-full bg-[#161F33] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-400 pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Current Role Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111726] border border-[#1E293B]">
          <span className="text-[11px] text-slate-400 font-medium">Role:</span>
          <RoleBadge role={currentRole} size="xs" />
        </div>

        {/* Action Buttons based on role */}
        {isAdmin && onOpenInvite && (
          <button
            onClick={onOpenInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161F33] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-slate-200 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Invite</span>
          </button>
        )}

        {!isViewer && onNavigateAddProduct && (
          <button
            onClick={onNavigateAddProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        )}
      </div>
    </header>
  );
}
