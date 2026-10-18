import React, { useState } from 'react';
import { loginUser, activateAndLoginEmployee } from '../../services/auth';
import { User } from '../../types/crm';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  KeyRound, 
  X,
  ShieldCheck 
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
  initialMessage?: string | null;
  initialPendingEmail?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onSwitchToRegister,
  initialMessage = null,
  initialPendingEmail = null,
}) => {
  const [email, setEmail] = useState(initialPendingEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(initialMessage);

  // In-line confirmation code popup state
  const [showCodeModal, setShowCodeModal] = useState(Boolean(initialPendingEmail));
  const [pendingUserEmail, setPendingUserEmail] = useState(initialPendingEmail || '');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Handle standard login submit
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
      // Founders & active employees gain direct access immediately!
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.code === 'PENDING_ACTIVATION') {
        // Pop up the confirmation code option right here on screen!
        setPendingUserEmail(cleanEmail);
        setModalPassword(password);
        setConfirmationCode('');
        setCodeError(null);
        setShowCodeModal(true);
        return;
      }
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle confirmation code submission in the popup
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const cleanCode = confirmationCode.trim().toUpperCase();
    const targetEmail = (pendingUserEmail || email).trim();
    const targetPassword = modalPassword || password;

    if (!targetEmail) {
      setCodeError('Please enter your registered email address.');
      return;
    }

    if (!cleanCode) {
      setCodeError('Please enter the confirmation code provided by your founder.');
      return;
    }

    if (!targetPassword) {
      setCodeError('Please enter your account password.');
      return;
    }

    setCodeLoading(true);

    try {
      // Verify code and immediately log in to grant access to the CRM
      const res = await activateAndLoginEmployee(targetEmail, targetPassword, cleanCode);
      setShowCodeModal(false);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setCodeError(err.message || 'Invalid confirmation code. Please check with your founder.');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] relative">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm mx-auto mb-3">
          <img
            src="./caventra-logo.png"
            alt="CAVENTRA"
            className="h-16 sm:h-20 w-auto object-contain"
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

          {/* Action Links */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register as an employee</span>
            </button>

            <button
              onClick={() => {
                setPendingUserEmail(email.trim());
                setShowCodeModal(true);
              }}
              className="text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter confirmation code</span>
            </button>
          </div>

        </div>
      </div>

      {/* POP-UP OPTION FOR CONFIRMATION CODE */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative animate-in zoom-in-95 duration-150">
            
            {/* Close button */}
            <button
              onClick={() => setShowCodeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prompt Notice Box */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-blue-950">
                  Ask your founder for the login code for the CRM.
                </h3>
                <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                  This activation code is issued directly by your company founder. The code is needed <strong>only once</strong> to activate your employee account. Once entered, you will gain access to the CRM.
                </p>
              </div>
            </div>

            {/* Error Message inside modal */}
            {codeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{codeError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              
              {/* Registered Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={pendingUserEmail}
                  onChange={(e) => setPendingUserEmail(e.target.value)}
                  placeholder="name@caventra.com"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Account Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="Enter your registered password"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Confirmation Code Input (Confidential: Zero Mention of the Code Value!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Enter the confirmation code
                </label>
                <input
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="Enter confirmation code"
                  className="mt-1 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-bold tracking-widest uppercase"
                />
              </div>

              {/* Verify & Enter CRM Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={codeLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {codeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying & Accessing CRM...</span>
                    </>
                  ) : (
                    <span>Verify & Access CRM</span>
                  )}
                </button>
              </div>

            </form>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel and return to sign in
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
