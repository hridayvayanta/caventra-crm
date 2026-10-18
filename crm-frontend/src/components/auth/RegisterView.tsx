import React, { useState } from 'react';
import { registerEmployee, validatePasswordPolicy, validatePhone, validateEmail } from '../../services/auth';
import { User } from '../../types/crm';
import { ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onRegistered: (registeredUser: User) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onRegistered,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValidation = validatePasswordPolicy(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill out all registration fields.');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid phone number (8 to 15 digits).');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid business email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    setLoading(true);

    try {
      const res = await registerEmployee({
        fullName,
        phoneNumber,
        email,
        password,
        confirmPassword,
      });

      onRegistered(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      
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
          Employee Registration & Workspace Activation
        </p>
      </div>

      {/* Registration Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8">
          
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Create Employee Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your official details. Account activation requires founder approval.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Full name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aryan Sharma"
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Field 2: Phone number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Phone number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            {/* Field 3: Email address (Login ID) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email address (Login ID) <span className="text-rose-500">*</span>
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

            {/* Field 4: Create password */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Create password <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-9 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Policy Indicators */}
              {password && (
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                  <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${password.length >= 8 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${/[A-Z]/.test(password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${/[0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>One special character (!@#$...)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Field 5: Confirm password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Confirm password <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-9 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Register Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <span>Register</span>
                )}
              </button>
            </div>

          </form>

          {/* Return to Login Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Already registered? Return to sign in</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
