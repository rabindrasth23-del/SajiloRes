"use client";

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw new Error("Invalid email or password. Please try again.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex">
      {/* Left Panel - Image Section */}
      <div className="hidden md:block flex-1 relative overflow-hidden">
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="absolute inset-0">
          <img
            src="https://cdn.21st.dev/assets/mirror/0d/0d205a1a31d40e927885b0ec5f603407caa10585b5bc6e8b08240402c7417e86.png"
            alt="Brand Asset"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="flex-1 flex items-center justify-center bg-white relative">
        {/* Mobile Back Button */}
        <div className="md:hidden absolute top-6 left-6 z-10">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="w-full max-w-md p-8">
          <div className="mb-8 mt-6 md:mt-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                disabled={loading}
                value={formData.email}
                onChange={handleInputChange}
                placeholder="responder@example.com"
                className="w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  disabled={loading}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="rememberMe"
                  disabled={loading}
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-colors flex justify-center items-center h-[52px] disabled:opacity-70"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6 hidden">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Social Buttons (Hidden for now as no OAuth is setup) */}
            <div className="hidden grid-cols-2 gap-4">
              {/* ... Omitted for brevity since standard email auth is used in this app ... */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
