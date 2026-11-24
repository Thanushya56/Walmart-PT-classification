// src/pages/ImportExport.jsx
import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  Check,
  AlertCircle,
  FileText,
  Lock,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function ImportExport({ currentRole }) {
  const [fileContent, setFileContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importStatus, setImportStatus] = useState(null);
  const [error, setError] = useState('');

  const isViewer = currentRole === 'viewer';
  const isAdmin = currentRole === 'admin';

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileContent(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setError('CSV file appears empty or missing data rows.');
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 2) {
        rows.push({
          productName: cols[0],
          ptName: cols[1],
          categoryName: cols[2] || 'Unassigned',
          classificationNotes: cols[3] || 'Imported via bulk CSV',
        });
      }
    }

    setParsedRows(rows);
    setError('');
  }

  async function handleExecuteImport() {
    if (isViewer) return;
    setParsing(true);
    setError('');

    try {
      const res = await api.bulkUpload(parsedRows);
      setImportStatus(res);
    } catch (err) {
      setError(err.message || 'Bulk import failed.');
    } finally {
      setParsing(false);
    }
  }

  async function handleExport() {
    try {
      const res = await api.exportData();
      const products = res.products || [];

      // Convert to CSV
      const headers = ['Product ID', 'Product Name', 'Walmart PT', 'Category', 'Notes', 'Classified At'];
      const csvLines = [headers.join(',')];

      for (const p of products) {
        const row = [
          `"${p.id}"`,
          `"${(p.product_name || '').replace(/"/g, '""')}"`,
          `"${(p.pt_name || '').replace(/"/g, '""')}"`,
          `"${(p.category_name || '').replace(/"/g, '""')}"`,
          `"${(p.classification_notes || '').replace(/"/g, '""')}"`,
          `"${p.created_at}"`,
        ];
        csvLines.push(row.join(','));
      }

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `walmart_pt_classified_products_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
          <span>Import / Export Classification Data</span>
        </h2>
        <p className="text-xs text-slate-400">
          Bulk import products via CSV or export existing classification datasets.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Export Section */}
      <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Export Classification Library</h3>
            <p className="text-xs text-slate-400">
              Download all classified products, assigned PTs, categories, and timestamps as CSV.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="p-6 rounded-xl bg-[#111726] border border-[#1E293B] space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Bulk Product Import</span>
            {isViewer && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Restricted (Editor / Admin Only)
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400">
            Upload a CSV containing: <code>Product Name, Product Type, Category, Notes</code>
          </p>
        </div>

        {!isViewer ? (
          <>
            <div
              onClick={() => document.getElementById('csvFileInput').click()}
              className="border-2 border-dashed border-[#1E293B] hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#0B0F17]/50"
            >
              <input
                id="csvFileInput"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-200 mb-1">
                Click to browse or drop CSV file here
              </p>
              <p className="text-[10px] text-slate-500">
                UTF-8 encoded CSV. Headers will be automatically mapped.
              </p>
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    Parsed {parsedRows.length} valid product entries from CSV
                  </span>
                  <button
                    onClick={handleExecuteImport}
                    disabled={parsing}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                  >
                    {parsing ? 'Importing...' : `Import ${parsedRows.length} Products`}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-[#1E293B] bg-[#0B0F17] p-2 text-xs font-mono text-slate-300 space-y-1">
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <div key={i} className="truncate">
                      {i + 1}. {r.productName} &rarr; <span className="text-indigo-400">{r.ptName}</span>
                    </div>
                  ))}
                  {parsedRows.length > 10 && (
                    <div className="text-slate-500 italic pt-1">
                      ...and {parsedRows.length - 10} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {importStatus && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>
                  Successfully imported <strong>{importStatus.successCount}</strong> products into your workspace.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B] text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              Bulk product ingestion is restricted to workspace Editors and Admins.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
