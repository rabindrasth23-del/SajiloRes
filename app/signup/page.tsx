"use client";

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    agreeTerms: false
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

    if (!formData.agreeTerms) {
      setError("You must agree to the terms and conditions.");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
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
              Create an Account
            </h1>
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {success ? (
            <div className="mb-6 p-6 bg-green-50 text-green-800 border border-green-200 rounded-xl text-center">
              <h3 className="font-bold text-lg mb-2">Check your email</h3>
              <p className="text-sm">We've sent a verification link to {formData.email}. Please verify your email to continue.</p>
              <button 
                onClick={() => router.push('/login')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  disabled={loading}
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  required
                />
              </div>

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
                    minLength={6}
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

              {/* Terms & Conditions */}
              <div className="flex items-center justify-between">
                <label className="flex items-start space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    disabled={loading}
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded"
                  />
                  <span>I agree to the Terms of Service and Privacy Policy</span>
                </label>
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
                  "Create Account"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
