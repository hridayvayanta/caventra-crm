import React, { useState } from 'react';
import { Lead, User } from '../types/crm';
import { X, Building2, Globe, MapPin, Tag, AlertCircle } from 'lucide-react';

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
      websiteCondition: websiteCondition || 'Identified slow TTFB, missing SSL, needs JAMstack modernization.',
      status: 'new',
      priority,
      leadSource: 'Direct Addition',
      verifiedStatus: 'verified',
      assignedTo: assignedTo || null,
      estimatedValue: Number(estimatedValue) || 30000,
      nextFollowUpDate: null,
      lastContactDate: null,
      notes: 'Added directly into CRM pipeline.',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Add New Business Lead</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Health Clinic"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Website URL *</label>
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="Dr. / Mr. / Ms."
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Business Email</label>
              <input
                type="email"
                placeholder="contact@business.com"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Industry</label>
              <input
                type="text"
                placeholder="e.g. Legal, Retail"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Deal Value (₹)</label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Service</label>
              <select
                value={serviceOpportunity}
                onChange={(e) => setServiceOpportunity(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Redesign">Website Redesign</option>
                <option value="Maintenance">Maintenance & SLA</option>
                <option value="Hosting">High-Availability Hosting</option>
                <option value="Security Audit">Security & SSL Audit</option>
                <option value="Speed Optimization">Speed / Core Web Vitals</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assign To</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Website Condition / Identified Problem</label>
            <textarea
              rows={2}
              placeholder="e.g. Non-responsive on mobile devices, broken SSL, 6s load time..."
              value={websiteCondition}
              onChange={(e) => setWebsiteCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
            >
              Add to CRM Pipeline
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
