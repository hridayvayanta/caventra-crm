import React, { useState } from 'react';
import { verifyActivationCode } from '../../services/auth';
import { KeyRound, ShieldAlert, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface ActivationViewProps {
  initialEmail?: string;
  onSwitchToLogin: (successMessage?: string) => void;
}

export const ActivationView: React.FC<ActivationViewProps> = ({
  initialEmail = '',
  onSwitchToLogin,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanEmail) {
      setError('Please provide your registered business email address.');
      return;
    }

    if (!cleanCode) {
      setError('Please enter the activation code provided by your founder.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyActivationCode(cleanEmail, cleanCode);
      setSuccess(res.message);
      setTimeout(() => {
        onSwitchToLogin('Account successfully activated! Please sign in with your email and password.');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800 shadow-md mx-auto mb-3">
          <img
            src="./caventra-logo.png"
            alt="CAVENTRA"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          CAVENTRA CRM
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Founder Approval & One-Time Account Activation
        </p>
      </div>

      {/* Main Activation Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8 space-y-5">
          
          {/* Required Founder Prompt Notice */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-center">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-blue-950">
                Ask your founder for the login code for the CRM.
              </h3>
              <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                This activation code is issued directly by your company founder. The code is needed <strong>only once</strong> to activate your employee account. Once activated, you will log in normally using your password.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Registered Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@caventra.com"
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Activation Code Input */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Founder Activation Code
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Format: XXXX-XXXX</span>
              </div>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. K9X2-M7PQ"
                className="mt-1 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-bold tracking-widest uppercase"
              />
            </div>

            {/* Verify Code Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || Boolean(success)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>
            </div>

          </form>

          {/* Return to Sign In */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onSwitchToLogin()}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Login Screen</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
