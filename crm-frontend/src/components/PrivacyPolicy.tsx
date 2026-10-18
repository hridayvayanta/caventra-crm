import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            <Shield className="w-4 h-4" />
            Legal Documentation
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-1">
            Effective Date: 18 October 2026 | Version 1.0 | CAVENTRA Technologies
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Overview and Scope
          </h2>
          <p>
            CAVENTRA ("we", "our", or "the Company") operates this internal Customer Relationship Management (CRM) platform to facilitate technical website maintenance, infrastructure development, hosting migration, and security audit services. This Privacy Policy details how we collect, store, process, and protect organizational and business contact data gathered in connection with our sales pipeline.
          </p>
          <p>
            We strictly limit our data collection to legitimate business contact information and technical assessments of publicly accessible web properties. We do not solicit, collect, or store sensitive personal information, payment card data, or consumer browsing profiles within this system.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Categories of Information Processed
          </h2>
          <p>Within this platform, the following data attributes may be captured and maintained:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-800">Public Business Data:</strong> Legal business names, operating domains, commercial street addresses, city, country, and industry classifications.</li>
            <li><strong className="text-slate-800">Corporate Contact Details:</strong> Professional names of designated officers, corporate email addresses, and published switchboard telephone numbers obtained from public business registries or organizational contact pages.</li>
            <li><strong className="text-slate-800">Technical Diagnostic Records:</strong> Public HTTP/HTTPS status headers, Core Web Vitals measurements (LCP, CLS, FID), SSL/TLS certificate validity dates, mobile viewport compliance indicators, and CMS version declarations.</li>
            <li><strong className="text-slate-800">Internal Operational Data:</strong> Activity logs, outreach timestamps, employee assignments, scheduled follow-up dates, and contractual scope notes.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Lawful Basis and Processing Objectives
          </h2>
          <p>
            Data processing within this CRM is conducted pursuant to legitimate business interests under relevant data protection frameworks, including the Digital Personal Data Protection Act (DPDP Act 2023) and Article 6(1)(f) of the General Data Protection Regulation (GDPR).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Evaluating publicly discoverable technical website vulnerabilities to formulate technical remediation proposals.</li>
            <li>Facilitating business-to-business (B2B) communications regarding website maintenance, hosting reliability, and digital infrastructure security.</li>
            <li>Preventing duplicated outreach efforts through domain-level normalization and validation.</li>
            <li>Maintaining accountability records of client communications and service delivery commitments.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            4. Data Retention and Erasure Requests
          </h2>
          <p>
            Prospect records are retained only as long as necessary to evaluate service viability and maintain audit trails. If a business representative requests that their organization be removed from future communications, their record is promptly marked as disqualified or permanently expunged upon formal request.
          </p>
          <p>
            Contact our administrative team at: <span className="font-semibold text-blue-600">privacy@caventra.com</span>
          </p>
        </section>

      </div>
    </div>
  );
};
