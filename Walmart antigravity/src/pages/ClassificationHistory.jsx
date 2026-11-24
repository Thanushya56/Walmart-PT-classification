// src/pages/ClassificationHistory.jsx
import React, { useEffect, useState } from 'react';
import { History, ArrowRight, User, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function ClassificationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await api.getClassificationHistory();
      setHistory(res.history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <span>Classification History & Audit Log</span>
        </h2>
        <p className="text-xs text-slate-400">
          Chronological audit trail of all product type classification decisions and updates.
        </p>
      </div>

      <div className="rounded-xl bg-[#111726] border border-[#1E293B] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Audit Trail Events</h3>
          <span className="text-xs text-slate-500">{history.length} Total Events</span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No classification history events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {history.map((item) => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#161F33]/40 transition-colors">
                <div className="space-y-2">
                  {/* PT Transition */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                      {item.previous_pt_name || 'Unclassified'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                      {item.new_pt_name}
                    </span>
                  </div>

                  {item.change_notes && (
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      {item.change_notes}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{item.changed_by_name || 'System'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
