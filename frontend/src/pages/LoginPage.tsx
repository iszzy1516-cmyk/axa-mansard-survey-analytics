import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChartLine, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import logoUrl from '../assets/axa-logo.svg';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('d.okafor');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    const to = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      if (!remember) {
        // Session-only persistence: cleared when the tab closes.
        window.addEventListener('beforeunload', () => {
          localStorage.removeItem('axa_token');
          localStorage.removeItem('axa_role');
          localStorage.removeItem('axa_full_name');
          localStorage.removeItem('axa_email');
        });
      }
      const to = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full">
      {/* Left brand panel */}
      <div className="relative hidden w-[42%] overflow-hidden bg-axa md:flex md:flex-col">
        <div className="flex items-center gap-4 px-10 pt-10">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-2">
            <img src={logoUrl} alt="AXA" className="h-full w-full" />
          </span>
          <span className="text-[26px] font-bold text-white">AXA Mansard</span>
        </div>
        <div className="flex flex-1 flex-col justify-center px-10">
          <ChartLine size={40} className="text-green-400" strokeWidth={1.75} />
          <p className="mt-6 max-w-sm text-[28px] font-semibold leading-snug text-white">
            Survey insights, monitored with confidence.
          </p>
        </div>
        <p className="px-10 pb-8 text-xs text-blue-200/70">
          © 2026 AXA Mansard Insurance PLC · Survey Call Analytics
        </p>
        {/* decorative rings, matching the mockup */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full border-[28px] border-white/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-24 h-[420px] w-[420px] rounded-full border-[30px] border-white/5"
        />
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h2 className="text-[26px] font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Sign in to continue to Survey Call Analytics
            </p>

            <form onSubmit={onSubmit} className="mt-9 space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="d.okafor"
                    className="input-base py-2.5 pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-base py-2.5 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-axa-primary focus:ring-axa-primary"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-[13px] font-medium text-axa-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>
          </div>
        </div>
        <p className="pb-6 text-center text-xs text-gray-400">
          Privacy Policy · Terms of Use · Help Center
        </p>
      </div>
    </div>
  );
}
