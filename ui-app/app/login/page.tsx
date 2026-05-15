'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, storeSession } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const showDemoCredentials = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || 'Sign in failed');
        setIsLoading(false);
        return;
      }
      storeSession(body.token, body.user);
      router.push('/dashboard');
    } catch {
      setError('Backend unavailable. Please start the Flask server.');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@tradedoc.ai');
    setPassword('demo123');
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">


      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-foreground-secondary">Sign in to your TradeDocAI account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-background"
              />
            </div>

            {/* Password */}
	            <div className="space-y-2">
	              <div className="flex items-center justify-between">
	                <label className="block text-sm font-medium text-foreground">Password</label>
	              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-background"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

	            {showDemoCredentials && (
	              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
	                <p className="text-sm text-blue-900 font-medium mb-2">Demo Mode Active</p>
	                <p className="text-sm text-blue-800 mb-3">
	                  Use the demo account to explore all features:
	                </p>
	                <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 block mb-2">
	                  demo@tradedoc.ai / demo123
	                </code>
	                <button
	                  type="button"
	                  onClick={handleDemoLogin}
	                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
	                >
	                  Auto-fill Demo Credentials
	                </button>
	              </div>
	            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-foreground-secondary">Don&apos;t have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/signup"
            className="block w-full text-center px-4 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors"
          >
            Create Account
          </Link>

          {/* Footer */}
          <p className="text-center text-sm text-foreground-secondary">
            By signing in, you agree to our{' '}
            <Link href="#" className="text-primary hover:text-primary-dark">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-primary hover:text-primary-dark">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
