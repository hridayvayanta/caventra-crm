import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to CRM Dashboard</span>
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
            <FileText className="w-4 h-4" />
            Legal Documentation
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Terms and Conditions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Effective Date: 18 October 2026 | Version 1.0 | CAVENTRA Technologies
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Acceptance of Terms
          </h2>
          <p>
            These Terms and Conditions govern the access, administration, and internal usage of the CAVENTRA Customer Relationship Management (CRM) application. By accessing or interacting with this software, authorized employees, contractors, and administrative officers agree to be bound by these provisions in their entirety.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Authorized Use and Account Confidentiality
          </h2>
          <p>
            Access to this system is restricted solely to verified personnel authorized by CAVENTRA management. Users are subject to the following obligations:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-800">Credential Integrity:</strong> Users must maintain the absolute confidentiality of their account credentials and API tokens. Sharing authentication keys with non-authorized third parties is strictly prohibited.</li>
            <li><strong className="text-slate-800">Confidentiality of Records:</strong> All commercial lead data, client audit logs, diagnostic reports, and deal values stored within this CRM constitute proprietary business information of CAVENTRA. Exfiltration, unauthorized export, or external publication of records is strictly prohibited.</li>
            <li><strong className="text-slate-800">Role-Based Compliance:</strong> Employees may only access and modify records assigned to their portfolio or authorized by supervisory administrative personnel.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Commercial Outreach Standards
          </h2>
          <p>
            In conducting outreach to prospective clients, team members must adhere to professional standards:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Outreach must accurately reflect factual technical observations (e.g., certificate status, mobile responsiveness) without misrepresentation.</li>
            <li>Unsolicited mass spam communications are strictly prohibited. Outreach must be targeted, professional, and relevant.</li>
            <li>Opt-out requests must be honored immediately by setting the status to "Not Interested".</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            4. Inquiries
          </h2>
          <p className="text-slate-600">
            Direct legal or compliance inquiries to: <span className="font-semibold text-blue-600">legal@caventra.com</span>
          </p>
        </section>

      </div>
    </div>
  );
};
