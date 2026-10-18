import React from 'react';
import { Plus, FileSpreadsheet, FolderSync } from 'lucide-react';

interface EmptyStateProps {
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onSyncDrive?: () => void;
  isSyncingDrive?: boolean;
  filterTitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenAddModal,
  onOpenImportModal,
  onSyncDrive,
  isSyncingDrive = false,
  filterTitle,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm my-8">
      
      {/* Official CAVENTRA Monogram Logo */}
      <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mx-auto mb-4">
        <img
          src="./caventra-logo.png"
          alt="CAVENTRA"
          className="h-16 w-auto object-contain"
        />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {filterTitle ? `No leads in "${filterTitle}"` : 'Your CAVENTRA CRM is Ready'}
      </h3>
      <p className="text-slate-500 text-xs max-w-md mx-auto mb-6 leading-relaxed">
        {filterTitle 
          ? `There are currently no prospects assigned to the ${filterTitle} stage.` 
          : 'Sync leads automatically from your connected Google Drive folder, import an Excel file, or register companies manually.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onSyncDrive && (
          <button
            onClick={onSyncDrive}
            disabled={isSyncingDrive}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <FolderSync className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'Syncing...' : 'Sync Google Drive Folder'}</span>
          </button>
        )}

        <button
          onClick={onOpenImportModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import Excel / CSV</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>
      </div>

    </div>
  );
};
