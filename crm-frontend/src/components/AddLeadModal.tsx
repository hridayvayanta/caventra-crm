import React, { useState } from 'react';
import { Lead, User } from '../types/crm';
import { X, Building2 } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => void;
  users: User[];
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  users,
}) => {
  if (!isOpen) return null;

  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [industry, setIndustry] = useState('Healthcare');
  const [serviceOpportunity, setServiceOpportunity] = useState<Lead['serviceOpportunity']>('Redesign');
  const [websiteCondition, setWebsiteCondition] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('40000');
  const [priority, setPriority] = useState<Lead['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !website) return;

    onAddLead({
      businessName,
      website,
      contactName: contactName || null,
      businessEmail: businessEmail || null,
      businessPhone: businessPhone || null,
      city: city || 'Mumbai',
      country,
      industry,
      serviceOpportunity,
      websiteCondition: websiteCondition || 'Identified slow TTFB latency, missing SSL certificate, or outdated layout.',
      status: 'new',
      priority,
      leadSource: 'Manual Direct Record',
      verificationLevel: 'verified',
      assignedTo: assignedTo || null,
      estimatedValue: Number(estimatedValue) || 30000,
      nextFollowUpDate: null,
      lastContactDate: null,
      notes: 'Record added directly into CRM database.',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider">New Prospect Registration</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Health Clinic"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Website URL *</label>
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Contact Officer</label>
              <input
                type="text"
                placeholder="Primary decision maker"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Corporate Email</label>
              <input
                type="email"
                placeholder="inquiries@business.com"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Industry</label>
              <input
                type="text"
                placeholder="e.g. Legal, Retail"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Valuation (₹)</label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Target Service</label>
              <select
                value={serviceOpportunity}
                onChange={(e) => setServiceOpportunity(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              >
                <option value="Redesign">Website Redesign</option>
                <option value="Maintenance">Maintenance & Retainer</option>
                <option value="Hosting">Hosting Infrastructure</option>
                <option value="Security Audit">Security & SSL Audit</option>
                <option value="Speed Optimization">Speed Optimization</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">Technical Assessment Summary</label>
            <textarea
              rows={2}
              placeholder="Factual diagnostic observation (e.g. non-responsive viewport, expired SSL, slow TTFB)..."
              value={websiteCondition}
              onChange={(e) => setWebsiteCondition(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-neutral-700 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
            >
              Register Record
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
