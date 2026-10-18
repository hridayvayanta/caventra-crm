import React, { useState } from 'react';
import { loginUser } from '../../services/auth';
import { User } from '../../types/crm';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, UserPlus, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
  onSwitchToActivation: (email?: string) => void;
  initialMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onSwitchToRegister,
  onSwitchToActivation,
  initialMessage = null,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(initialMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser(cleanEmail, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.code === 'PENDING_ACTIVATION') {
        onSwitchToActivation(cleanEmail);
        return;
      }
      setError(err.message || 'Login failed. Please verify your credentials.');
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
          Web Infrastructure & Business Pipeline
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8 space-y-5">
          
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Sign In to Your Workspace</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your registered business email and password.
            </p>
          </div>

          {/* Success Banner */}
          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
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

            {/* Field 2: Password with Show/Hide Control */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-9 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

          </form>

          {/* Action Links: Register or Enter Activation Code */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register as an employee</span>
            </button>

            <button
              onClick={() => onSwitchToActivation(email)}
              className="text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter activation code</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
