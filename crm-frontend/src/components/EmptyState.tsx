import React from 'react';
import { Plus, Sparkles, Building2, PhoneCall } from 'lucide-react';

interface EmptyStateProps {
  onOpenAddModal: () => void;
  onTriggerHarvest: () => void;
  isHarvesting: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenAddModal,
  onTriggerHarvest,
  isHarvesting,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm my-8">
      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
        <Building2 className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        Your pipeline is clean and ready
      </h3>
      <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
        There are currently no leads in the CRM. You can add a business lead manually, or run the automatic search to find real companies needing website development or security.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add First Lead</span>
        </button>

        <button
          onClick={onTriggerHarvest}
          disabled={isHarvesting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm border border-slate-300 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 text-blue-600 ${isHarvesting ? 'animate-spin' : ''}`} />
          <span>{isHarvesting ? 'Searching Web...' : 'Find Leads Automatically'}</span>
        </button>
      </div>
    </div>
  );
};
