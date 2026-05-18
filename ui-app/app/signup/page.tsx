'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { API_BASE, storeSession } from '../../lib/api';


export default function SignupPage() {
  const router = useRouter();
  const showDemoCredentials = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setTermsAccepted(checked);
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || 'Account creation failed');
        setIsLoading(false);
        return;
      }
      storeSession(body.token, body.user);
      router.push('/');
    } catch {
      setError('Backend unavailable. Please start the Flask server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fc] font-body flex flex-col relative overflow-hidden">
      {/* Subtle decorative gradient orbs — matching landing page aesthetic */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-100/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-slate-200/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Back link */}
      <div className="relative z-10 px-4 sm:px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-500 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative w-20 h-20 drop-shadow-lg">
              <Image
                src="/logo.svg"
                alt="TradeDocAI Logo"
                width={80}
                height={80}
                className="object-contain brightness-0"
                priority
              />
            </div>
          </motion.div>

          {/* Card */}
          <div className="relative">
            {/* Card body — plain white, matching landing page card style */}
            <div className="relative rounded-[24px] border border-slate-100 bg-white shadow-[0_8px_20px_rgb(0,0,0,0.04)] p-8 sm:p-10">
              {/* Top highlight line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-80" />

              {/* Heading */}
              <div className="text-center mb-8">
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-3 bg-indigo-50 px-4 py-1.5 rounded-full">
                  Get Started
                </span>
                <h1 className="font-display text-2xl sm:text-3xl text-slate-800 mb-2 tracking-tight">
                  Create Account
                </h1>
                <p className="text-sm text-slate-500">Start your TradeDocAI journey today</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSignup} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all duration-200 text-slate-800 placeholder:text-slate-400 text-sm"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all duration-200 text-slate-800 placeholder:text-slate-400 text-sm"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all duration-200 text-slate-800 placeholder:text-slate-400 text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">Minimum 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 transition-all duration-200 text-slate-800 placeholder:text-slate-400 text-sm"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400/30 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-500 cursor-pointer leading-relaxed">
                    I agree to the{' '}
                    <Link href="#" className="text-indigo-500 hover:text-indigo-600 transition-colors">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-indigo-500 hover:text-indigo-600 transition-colors">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 text-sm"
                  whileTap={{ scale: 0.985 }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-400 text-xs">
                    Already have an account?
                  </span>
                </div>
              </div>

              {/* Sign In Link */}
              <Link
                href="/login"
                className="block w-full text-center px-4 py-3 border-2 border-indigo-300/60 text-indigo-500 rounded-xl font-semibold hover:bg-indigo-50/50 transition-all duration-200 text-sm"
              >
                Sign In
              </Link>

              {/* Demo tip */}
              {showDemoCredentials && (
                <motion.div
                  className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm text-indigo-800">
                    <strong>Tip:</strong> Use the demo account (demo@tradedoc.ai) to explore features without creating an account.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
