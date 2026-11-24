// src/components/RoleBadge.jsx
import React from 'react';
import { ShieldCheck, Edit3, Eye } from 'lucide-react';

export default function RoleBadge({ role, size = 'sm' }) {
  const r = (role || 'viewer').toLowerCase();

  const configs = {
    admin: {
      label: 'Admin',
      icon: ShieldCheck,
      classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    },
    editor: {
      label: 'Editor',
      icon: Edit3,
      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    viewer: {
      label: 'Viewer',
      icon: Eye,
      classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    },
  };

  const config = configs[r] || configs.viewer;
  const Icon = config.icon;
  const sizeClasses = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.classes} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
}
