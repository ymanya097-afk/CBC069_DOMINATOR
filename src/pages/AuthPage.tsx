import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, KeyRound, UserPlus, LogIn, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../lib/api.ts';

type AuthTab = 'login' | 'register' | 'join';

export const AuthPage: React.FC = () => {
  const { login, register, joinFamily } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form (Admin creates family)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFamilyName, setRegFamilyName] = useState('');

  // Join form (Member joins family with code)
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // Forgot Password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'verify' | 'new_password'>('verify');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword, rememberMe);
      success('Welcome back to House Hub', 'Logged In');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await register(regName, regEmail, regPassword, regFamilyName);
      success('Household created successfully', 'Welcome Admin');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await joinFamily(joinCode, joinName, joinEmail, joinPassword);
      success('Joined household successfully', 'Welcome');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join family');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      if (forgotStep === 'verify') {
        const res = await apiRequest('/api/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: forgotEmail })
        });
        setForgotStep('new_password');
      } else {
        const res = await apiRequest('/api/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword })
        });
        setForgotSuccessMsg(res.message);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep('verify');
          setForgotSuccessMsg(null);
          setLoginEmail(forgotEmail);
          setActiveTab('login');
        }, 1800);
      }
    } catch (err: any) {
      toastError(err.message || 'Reset failed');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#1C2638] flex flex-col justify-center items-center p-4 antialiased">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[6px] bg-[#4F94E8] text-[#FFFFFF] font-heading font-bold text-lg mb-2 shadow-xs">
            H
          </div>
          <h1 className="font-heading font-semibold text-2xl text-[#1E2430] dark:text-[#FFFFFF] tracking-tight">
            HOUSE HUB
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 mt-1 font-sans">
            Smart Family Task Manager
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] shadow-xs overflow-hidden">
          {/* Tab Navigation */}
          <div className="grid grid-cols-3 border-b border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#4F94E8]/8 dark:bg-[#FFFFFF]/5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-heading font-medium transition-colors border-b-2 ${
                activeTab === 'login'
                  ? 'border-[#4F94E8] text-[#1E2430] dark:text-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#1C2638]'
                  : 'border-transparent text-[#6B7280] dark:text-[#FFFFFF]/70 hover:text-[#1E2430] dark:hover:text-[#FFFFFF]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-heading font-medium transition-colors border-b-2 ${
                activeTab === 'register'
                  ? 'border-[#4F94E8] text-[#1E2430] dark:text-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#1C2638]'
                  : 'border-transparent text-[#6B7280] dark:text-[#FFFFFF]/70 hover:text-[#1E2430] dark:hover:text-[#FFFFFF]'
              }`}
            >
              New Family
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-heading font-medium transition-colors border-b-2 ${
                activeTab === 'join'
                  ? 'border-[#4F94E8] text-[#1E2430] dark:text-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#1C2638]'
                  : 'border-transparent text-[#6B7280] dark:text-[#FFFFFF]/70 hover:text-[#1E2430] dark:hover:text-[#FFFFFF]'
              }`}
            >
              Join with Code
            </button>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-[4px] bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 border-l-2 border-l-[#4F94E8] dark:border-l-[#4F94E8] text-[#1E2430] dark:text-[#FFFFFF] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#1E2430] dark:text-[#FFFFFF]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotEmail(loginEmail);
                      }}
                      className="text-[11px] text-[#6B7280] dark:text-[#FFFFFF]/70 hover:text-[#4F94E8] dark:hover:text-[#FFFFFF] underline font-sans"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-[#E5E7EB] text-[#4F94E8] accent-[#4F94E8] focus:ring-0"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-[4px] bg-[#4F94E8] hover:bg-[#3F83D8] text-[#FFFFFF] font-heading font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER (CREATE FAMILY & ADMIN) */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Family / Household Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regFamilyName}
                    onChange={e => setRegFamilyName(e.target.value)}
                    placeholder="e.g. Chen Household"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Your Name (Family Admin)
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Choose secure password"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-[4px] bg-[#4F94E8] hover:bg-[#3F83D8] text-[#FFFFFF] font-heading font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{loading ? 'Creating Household...' : 'Create Family & Admin Account'}</span>
                </button>
              </form>
            )}

            {/* TAB 3: JOIN WITH CODE */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Family Join Code
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    className="w-full px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                  <span className="text-[10px] text-[#6B7280] dark:text-[#FFFFFF]/70 mt-0.5 block">
                    Ask your Family Admin for the household join code.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={joinEmail}
                    onChange={e => setJoinEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={joinPassword}
                    onChange={e => setJoinPassword(e.target.value)}
                    placeholder="Choose password"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8] dark:focus:border-[#7DB6F0]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-[4px] bg-[#4F94E8] hover:bg-[#3F83D8] text-[#FFFFFF] font-heading font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? 'Joining Household...' : 'Join Household'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Forgot Password Modal */}
        <AnimatePresence>
          {showForgotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141C2B]/60">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-sm text-[#1E2430] dark:text-[#FFFFFF]">
                    Reset Account Password
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotStep('verify');
                      setForgotSuccessMsg(null);
                    }}
                    className="text-[#6B7280] hover:text-[#1E2430] dark:text-[#FFFFFF]/50 dark:hover:text-[#FFFFFF] text-xs font-mono"
                  >
                    Close
                  </button>
                </div>

                {forgotSuccessMsg ? (
                  <div className="py-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-[#4F94E8] dark:text-[#FFFFFF] mx-auto mb-2" />
                    <p className="text-xs text-[#1E2430] dark:text-[#FFFFFF] font-medium">
                      {forgotSuccessMsg}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-3">
                    {forgotStep === 'verify' ? (
                      <>
                        <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 font-sans">
                          Enter your account email to verify identity and proceed to reset.
                        </p>
                        <div>
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            placeholder="your-email@example.com"
                            className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="w-full py-2 px-3 rounded-[4px] bg-[#4F94E8] text-[#FFFFFF] text-xs font-heading font-medium hover:bg-[#3F83D8]"
                        >
                          {forgotLoading ? 'Verifying...' : 'Verify Email'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70">
                          Email verified. Enter your new password below.
                        </p>
                        <div>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={forgotNewPassword}
                            onChange={e => setForgotNewPassword(e.target.value)}
                            placeholder="Enter new password (min 6 chars)"
                            className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="w-full py-2 px-3 rounded-[4px] bg-[#4F94E8] text-[#FFFFFF] text-xs font-heading font-medium hover:bg-[#3F83D8]"
                        >
                          {forgotLoading ? 'Updating...' : 'Set New Password'}
                        </button>
                      </>
                    )}
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
