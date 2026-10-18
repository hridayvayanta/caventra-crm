import React from 'react';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle, Database } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            <Shield className="w-4 h-4 text-sky-400" />
            Legal Documentation
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            Effective Date: 18 October 2026 | Version 1.0 | CAVENTRA Technologies
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
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
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            2. Categories of Information Processed
          </h2>
          <p>Within this platform, the following data attributes may be captured and maintained:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
            <li><strong className="text-neutral-200">Public Business Data:</strong> Legal business names, operating domains, commercial street addresses, city, country, and industry classifications.</li>
            <li><strong className="text-neutral-200">Corporate Contact Details:</strong> Professional names of designated officers, corporate email addresses, and published switchboard telephone numbers obtained from public business registries or organizational contact pages.</li>
            <li><strong className="text-neutral-200">Technical Diagnostic Records:</strong> Public HTTP/HTTPS status headers, Core Web Vitals measurements (LCP, CLS, FID), SSL/TLS certificate validity dates, mobile viewport compliance indicators, and CMS version declarations.</li>
            <li><strong className="text-neutral-200">Internal Operational Data:</strong> Activity logs, outreach timestamps, employee assignments, scheduled follow-up dates, and contractual scope notes.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            3. Lawful Basis and Processing Objectives
          </h2>
          <p>
            Data processing within this CRM is conducted pursuant to legitimate business interests under relevant data protection frameworks, including the Digital Personal Data Protection Act (DPDP Act 2023) and Article 6(1)(f) of the General Data Protection Regulation (GDPR). Specifically:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Evaluating publicly discoverable technical website vulnerabilities to formulate technical remediation proposals.</li>
            <li>Facilitating business-to-business (B2B) communications regarding website maintenance, hosting reliability, and digital infrastructure security.</li>
            <li>Preventing duplicated outreach efforts through domain-level normalization and validation.</li>
            <li>Maintaining accountability records of client communications and service delivery commitments.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            4. Data Storage, Security, and Subprocessors
          </h2>
          <p>
            CAVENTRA utilizes enterprise-grade, encrypted infrastructure to host and manage CRM data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
            <li><strong className="text-neutral-200">Edge API and Database:</strong> Cloudflare D1 serverless SQL and Cloudflare Workers, protected by encrypted environmental secrets and parameterized query enforcement.</li>
            <li><strong className="text-neutral-200">Access Governance:</strong> Role-based access control (RBAC) restricting administrative actions, deletions, and configuration rights strictly to authenticated company leadership.</li>
            <li><strong className="text-neutral-200">Zero Commercial Sale:</strong> We never sell, lease, monetize, or disclose prospect or client records to external advertising networks or data brokers under any circumstances.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-200">
            5. Data Retention and Erasure Requests
          </h2>
          <p>
            Prospect records are retained only as long as necessary to evaluate service viability and maintain audit trails. If a business representative requests that their organization be removed from future communications, their record is promptly marked as disqualified or permanently expunged upon formal request.
          </p>
          <p>
            To submit an inquiry or exercise rights of access, rectification, or deletion, contact our administrative team at:
            <br />
            <span className="font-mono text-sky-400">privacy@caventra.com</span>
          </p>
        </section>

      </div>
    </div>
  );
};
