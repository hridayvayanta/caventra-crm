import React from 'react';
import { ImportRecord } from '../types/crm';
import { FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface ImportHistoryViewProps {
  history: ImportRecord[];
  onOpenImportModal: () => void;
}

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({
  history,
  onOpenImportModal,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Excel & CSV Ingestion Audit History</h3>
          <p className="text-xs text-slate-500">Record of all spreadsheet imports, duplicate skips, and committed writes</p>
        </div>

        <button
          onClick={onOpenImportModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>New Spreadsheet Import</span>
        </button>
      </div>

      {history.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          No spreadsheet imports recorded yet. Click "New Spreadsheet Import" to upload your first file.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Import Timestamp</th>
                <th className="py-3 px-4 text-center">Total Rows</th>
                <th className="py-3 px-4 text-center">Leads Imported</th>
                <th className="py-3 px-4 text-center">Duplicates Skipped</th>
                <th className="py-3 px-4 text-center">Rejected Rows</th>
                <th className="py-3 px-4 text-right">Database Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{record.fileName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(record.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                    {record.totalRows}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                    +{record.importedCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-700">
                    {record.duplicateCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-rose-700">
                    {record.rejectedCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold font-mono uppercase ${
                      record.status === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : record.status === 'partial'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
