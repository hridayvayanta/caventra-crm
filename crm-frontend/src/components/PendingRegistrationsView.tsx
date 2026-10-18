import React, { useState } from 'react';
import { User } from '../types/crm';
import { 
  generateActivationCode, 
  revokeActivationCode 
} from '../services/auth';
import { 
  UserCheck, 
  KeyRound, 
  Copy, 
  Check, 
  AlertTriangle, 
  X, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  UserX,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';

interface PendingRegistrationsViewProps {
  allUsers: User[];
  currentUser: User;
  onRefresh?: () => void;
}

export const PendingRegistrationsView: React.FC<PendingRegistrationsViewProps> = ({
  allUsers,
  currentUser,
  onRefresh,
}) => {
  const [activeGeneratedCode, setActiveGeneratedCode] = useState<{
    code: string;
    employeeName: string;
    employeeEmail: string;
    expiresAt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFounder = currentUser.role === 'founder' || currentUser.role === 'admin';

  // Filter pending vs active vs suspended users
  const pendingEmployees = allUsers.filter(u => u.status === 'pending_activation');
  const activeEmployees = allUsers.filter(u => u.status === 'active' && u.role === 'employee');
  const suspendedEmployees = allUsers.filter(u => u.status === 'suspended' || u.status === 'disabled');

  const handleGenerateCode = async (employee: User) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setProcessingId(employee.id);

    try {
      const res = await generateActivationCode(employee, currentUser);
      setActiveGeneratedCode({
        code: res.plainCode,
        employeeName: employee.name,
        employeeEmail: employee.email,
        expiresAt: res.expiresAt,
      });
      setStatusMessage(`Activation code generated for ${employee.name}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate code.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (employee: User) => {
    if (!window.confirm(`Revoke activation code for ${employee.name}? Any issued code will become invalid immediately.`)) {
      return;
    }

    setProcessingId(employee.id);
    setErrorMessage(null);

    try {
      await revokeActivationCode(employee.id, currentUser);
      setStatusMessage(`Activation code revoked for ${employee.name}.`);
      if (activeGeneratedCode?.employeeEmail === employee.email) {
        setActiveGeneratedCode(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke code.');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = () => {
    if (!activeGeneratedCode) return;
    navigator.clipboard.writeText(activeGeneratedCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Pending Employee Registrations</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  {pendingEmployees.length} Awaiting Approval
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review employee sign-ups and issue single-use activation codes. Codes are hashed (SHA-256) and never stored in plaintext.
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh List</span>
            </button>
          )}
        </div>

        {!isFounder && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Unauthorized: Only company founders and administrators are permitted to generate activation codes.</span>
          </div>
        )}

        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Generated Code Reveal Modal / Banner */}
      {activeGeneratedCode && (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in fade-in duration-200 border border-blue-800">
          <button
            onClick={() => setActiveGeneratedCode(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider font-mono">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Single-Use Activation Code Generated</span>
            </div>

            <h3 className="text-lg font-bold text-white">
              Deliver Privately to {activeGeneratedCode.employeeName}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Communicate this code to <strong>{activeGeneratedCode.employeeEmail}</strong> via your private internal channel (WhatsApp, Signal, phone, or direct message).
            </p>

            {/* Code Box */}
            <div className="flex items-center gap-3 pt-2">
              <div className="bg-black/50 border border-blue-500/40 px-5 py-3 rounded-xl font-mono text-2xl font-extrabold tracking-widest text-emerald-400 select-all shadow-inner">
                {activeGeneratedCode.code}
              </div>

              <button
                onClick={copyToClipboard}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Expires: {new Date(activeGeneratedCode.expiresAt).toLocaleTimeString()} ({new Date(activeGeneratedCode.expiresAt).toLocaleDateString()})</span>
              </div>
              <span>•</span>
              <span className="text-amber-300 font-semibold">
                Will never be displayed again after closing this card.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table: Pending Employees */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Awaiting Founder Approval ({pendingEmployees.length})</h3>
            <p className="text-xs text-slate-500">Employees who completed the registration form and need an activation code</p>
          </div>
        </div>

        {pendingEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-1">
            <p className="font-bold text-slate-700">No Pending Employee Registrations</p>
            <p>When a team member fills out the registration form, their profile will appear here for your review and code generation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Founder Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Full Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          {emp.initials}
                        </div>
                        <span>{emp.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.phoneNumber || 'Not provided'}</span>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(emp.registeredAt || emp.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Activation Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Activation
                      </span>
                    </td>

                    {/* Action: Generate Activation Code */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleGenerateCode(emp)}
                        disabled={processingId === emp.id || !isFounder}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        title="Generate a 24-hour single-use activation code"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{processingId === emp.id ? 'Generating...' : 'Generate Code'}</span>
                      </button>

                      <button
                        onClick={() => handleRevoke(emp)}
                        disabled={processingId === emp.id || !isFounder}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                        title="Revoke pending code"
                      >
                        <span>Revoke</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Employees List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Active Authorized Employees ({activeEmployees.length})</h3>
            <p className="text-xs text-slate-500">Employees who have completed one-time founder activation and have full workspace access</p>
          </div>
        </div>

        {activeEmployees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No activated employee accounts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Activated On</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          {emp.initials}
                        </div>
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{emp.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{emp.phoneNumber || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {emp.activatedAt ? new Date(emp.activatedAt).toLocaleString() : 'Active'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{emp.activatedBy || 'Founder'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
