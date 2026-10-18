import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, CheckSquare } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white mb-6 border border-neutral-800 bg-neutral-900 px-3 py-1.5 rounded transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 space-y-8">
        
        {/* Header */}
        <div className="border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            <FileText className="w-4 h-4 text-sky-400" />
            Legal Documentation
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Terms and Conditions</h1>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            Effective Date: 18 October 2026 | Version 1.0 | CAVENTRA Technologies
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            1. Acceptance of Terms
          </h2>
          <p>
            These Terms and Conditions govern the access, administration, and internal usage of the CAVENTRA Customer Relationship Management (CRM) application. By accessing or interacting with this software, authorized employees, contractors, and administrative officers agree to be bound by these provisions in their entirety.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            2. Authorized Use and Account Confidentiality
          </h2>
          <p>
            Access to this system is restricted solely to verified personnel authorized by CAVENTRA management. Users are subject to the following obligations:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
            <li><strong className="text-neutral-200">Credential Integrity:</strong> Users must maintain the absolute confidentiality of their account credentials and API tokens. Sharing authentication keys or session tokens with non-authorized third parties is strictly prohibited.</li>
            <li><strong className="text-neutral-200">Confidentiality of Records:</strong> All commercial lead data, client audit logs, diagnostic reports, and deal values stored within this CRM constitute proprietary trade secrets of CAVENTRA. Exfiltration, unauthorized export, or external publication of records is a violation of employment agreements and applicable commercial secrecy laws.</li>
            <li><strong className="text-neutral-200">Role-Based Compliance:</strong> Employees may only access and modify records assigned to their direct portfolio or authorized by supervisory administrative personnel.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            3. Automated Lead Ingestion and Technical Assessments
          </h2>
          <p>
            The platform utilizes automated discovery mechanisms to evaluate public digital infrastructure. In using this data, operators must comply with standard commercial outreach standards:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Outreach must accurately reflect factual technical observations (e.g., certificate statuses, measurable load metrics) without misrepresentation or exaggeration.</li>
            <li>Unsolicited mass spam communications are strictly prohibited. Outreach must be targeted, professional, and relevant to the recipient's website maintenance, hosting, or digital security posture.</li>
            <li>Opt-out requests or "Do Not Contact" requests must be processed immediately by updating the prospect's status to "Disqualified / Lost" with an explicit exclusion log.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            4. Intellectual Property
          </h2>
          <p>
            All custom interface designs, codebases, workflows, schema architectures, and proprietary algorithms implemented within the CAVENTRA CRM are the exclusive intellectual property of CAVENTRA Technologies. No user or licensee acquires any title or ownership interest by accessing the platform.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            5. Limitation of Liability and Modifications
          </h2>
          <p>
            This CRM software is deployed on a zero-cost serverless architecture utilizing distributed cloud services (GitHub Pages, Cloudflare D1/Workers). While engineered for high availability and zero-loss deduplication, CAVENTRA does not warrant that third-party cloud edge nodes will be entirely free from latency or maintenance windows. CAVENTRA reserves the right to modify these terms at any time with prior administrative notice.
          </p>
          <p className="pt-2 text-neutral-400">
            Inquiries regarding these terms should be directed to:
            <br />
            <span className="font-mono text-sky-400">legal@caventra.com</span>
          </p>
        </section>

      </div>
    </div>
  );
};
