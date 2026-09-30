import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  UserCheck,
  Building2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, verifyOtp, isAuthenticated, role } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA OTP Modal state for HOD
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);

  // Forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotInput, setForgotInput] = useState<string>('');
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'STUDENT') navigate('/student/dashboard');
      else if (role === 'TEACHER') navigate('/teacher/dashboard');
      else if (role === 'HOD_ADMIN') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  // Set default hint based on URL query param (e.g. ?role=student)
  const roleHint = searchParams.get('role');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your identifier and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(username.trim(), password);

      if (res.require_otp && res.temp_user_id) {
        // HOD 2FA Flow
        setTempUserId(res.temp_user_id);
        setShowOtpModal(true);
      } else if (res.role) {
        // Direct Login
        if (res.role === 'STUDENT') navigate('/student/dashboard');
        else if (res.role === 'TEACHER') navigate('/teacher/dashboard');
        else if (res.role === 'HOD_ADMIN') navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserId || !otpCode.trim()) return;

    setOtpLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp(tempUserId, otpCode.trim());
      setShowOtpModal(false);
      if (res.role === 'HOD_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Quick fill helper for pairing and test runs
  const fillCredentials = (type: 'student' | 'teacher' | 'hod') => {
    setErrorMessage(null);
    if (type === 'student') {
      setUsername('2024CSE001');
      setPassword('Password@123');
    } else if (type === 'teacher') {
      setUsername('prof.amit@college.edu');
      setPassword('Password@123');
    } else if (type === 'hod') {
      setUsername('hod.cse@college.edu');
      setPassword('Password@123');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#F5F9FF] to-white">
      <div className="w-full max-w-md">
        {/* AttendX Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-attendx-navy items-center justify-center text-white mb-3 shadow-md">
            <ShieldCheck className="w-7 h-7 text-attendx-cyan" />
          </div>
          <h2 className="text-2xl font-extrabold text-attendx-navy tracking-tight">
            Sign In to Attend<span className="text-attendx-blue">X</span>
          </h2>
          <p className="text-xs text-attendx-muted mt-1">
            Role is securely determined by the backend system.
          </p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="mb-5 bg-white p-3 rounded-2xl border border-attendx-border shadow-sm">
          <p className="text-[11px] font-semibold text-attendx-muted text-center mb-2">
            Quick Fill Test Accounts:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('student')}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-attendx-blue hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('teacher')}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-attendx-success hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Teacher
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('hod')}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              HOD
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="attendx-card p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-attendx-danger text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-attendx-text mb-1.5">
                Email / Registration Number / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-attendx-muted">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 2024CSE001 or name@college.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-attendx-border text-sm text-attendx-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-attendx-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-attendx-text">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-attendx-blue hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-attendx-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-attendx-border text-sm text-attendx-text placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-attendx-blue focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full attendx-btn-primary py-3 text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link 
              to="/verify" 
              className="text-xs font-semibold text-attendx-blue hover:underline"
            >
              Looking to scan an attendance QR code directly? Click here.
            </Link>
          </div>
        </div>
      </div>

      {/* HOD 2FA OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-attendx-lg border border-attendx-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <button 
                onClick={() => setShowOtpModal(false)}
                className="p-1 rounded-lg text-attendx-muted hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-attendx-navy">
              HOD Two-Factor Verification
            </h3>
            <p className="text-xs text-attendx-muted mt-1 leading-relaxed">
              Enter your 6-digit administrative security code to complete authentication. (Default demo OTP: <span className="font-bold text-attendx-navy">123456</span>)
            </p>

            <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-xl border border-attendx-border text-attendx-navy focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-bold"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-1/2 attendx-btn-secondary text-xs py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length < 4}
                  className="w-1/2 inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-sm disabled:opacity-50 text-xs"
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-attendx-lg border border-attendx-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-attendx-navy">Password Assistance</h3>
              <button 
                onClick={() => { setShowForgotPassword(false); setForgotSubmitted(false); }}
                className="p-1 rounded-lg text-attendx-muted hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-attendx-success mx-auto" />
                <p className="text-xs text-attendx-text leading-relaxed">
                  If an account matches your details, password reset instructions have been routed to your registered departmental administrator.
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setForgotSubmitted(false); }}
                  className="attendx-btn-primary text-xs w-full py-2.5 mt-2"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setForgotSubmitted(true); }} className="space-y-4">
                <p className="text-xs text-attendx-muted leading-relaxed">
                  Enter your college email or registration number. Your departmental administrator will process your credentials verification.
                </p>
                <input
                  type="text"
                  required
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  placeholder="e.g. 2024CSE001 or prof@college.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-attendx-border text-xs text-attendx-text focus:outline-none focus:ring-2 focus:ring-attendx-blue"
                />
                <button
                  type="submit"
                  className="w-full attendx-btn-primary text-xs py-2.5"
                >
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
