// src/pages/Categories.jsx
import React, { useEffect, useState } from 'react';
import { Tag, Layers, Search } from 'lucide-react';
import { api } from '../services/api';

export default function Categories({ onSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await api.getCategories();
      setCategories(res.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = categories.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-400" />
          <span>Walmart Taxonomy Categories</span>
        </h2>
        <p className="text-xs text-slate-400">
          Official top-level retail categories organizing all Walmart Product Types.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-[#111726] border border-[#1E293B]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories (e.g. Electronics, Health & Beauty, Toys)..."
          className="w-full bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((cat) => (
          <div
            key={cat}
            className="p-4 rounded-xl bg-[#111726] border border-[#1E293B] hover:border-indigo-500/50 hover:bg-[#161F33]/50 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Tag className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">{cat}</span>
            </div>
            <span className="text-[10px] text-slate-500">Retail Department</span>
          </div>
        ))}
      </div>
    </div>
  );
}
