'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ⚠️ REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM CONSOLE ⚠️
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAob-x5QJQjyEbsMkDEtlAMGtvKF7yQx3U",
  authDomain: "safesphere-6a748.firebaseapp.com",
  projectId: "safesphere-6a748",
  storageBucket: "safesphere-6a748.firebasestorage.app",
  messagingSenderId: "698506609430",
  appId: "1:698506609430:web:1b522540a8f4014bfe0637",
  measurementId: "G-J890Z64RR9"
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', dateOfBirth: '', aadhaarNumber: '', phone: '', pathType: 'normal'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const t = useTranslations("Auth");
  const locale = useLocale();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // Send token to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('Google Login successful! Redirecting...');
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => router.push(`/${locale}/simulator`), 1500);
      } else {
        setError(data.error || 'Google login failed on server');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Sign-In closed or failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = isLogin ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/auth/login` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/auth/register`;
      const payload = isLogin ? { username: formData.username, password: formData.password } : formData;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          setSuccess('Login successful! Redirecting...');
          localStorage.setItem('user', JSON.stringify(data.user));
          setTimeout(() => router.push(`/${locale}/simulator`), 1500);
        } else {
          setSuccess('Registration successful. Please login.');
          setTimeout(() => {
            setIsLogin(true);
            setFormData({ username: '', email: '', password: '', dateOfBirth: '', aadhaarNumber: '', phone: '', pathType: 'normal' });
          }, 2000);
        }
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 w-full max-w-md z-10 border border-slate-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">{isLogin ? t("welcomeBack") : t("createAccount")}</h2>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative flex bg-slate-700 p-1 rounded-lg">
            <button onClick={() => setIsLogin(true)} className={`px-6 py-2 rounded-md transition-all ${isLogin ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>{t("login")}</button>
            <button onClick={() => setIsLogin(false)} className={`px-6 py-2 rounded-md transition-all ${!isLogin ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>{t("register")}</button>
          </div>
        </div>

        {error && <div className="mb-6 p-3 bg-red-400/10 border border-red-400/30 rounded-lg text-red-300 text-sm">{error}</div>}
        {success && <div className="mb-6 p-3 bg-emerald-400/10 border border-emerald-400/30 rounded-lg text-emerald-300 text-sm">{success}</div>}

        {/* --- Google Button --- */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-6 bg-white text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 flex items-center justify-center transition-all duration-200"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
          {t("signInWithGoogle")}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">{t("orContinueWith")}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3" placeholder={t("email")} required />
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3" required />
              </div>
              <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="w-full bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3" placeholder={t("aadhaar")} required pattern="[0-9]{12}" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3" placeholder={t("phone")} required pattern="[0-9]{10}" />
              
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-center p-3 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-300 cursor-pointer">
                  <input type="radio" name="pathType" value="normal" checked={formData.pathType === 'normal'} onChange={handleChange} className="mr-2" /> {t("normal")}
                </label>
                <label className="flex items-center justify-center p-3 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-300 cursor-pointer">
                  <input type="radio" name="pathType" value="anomaly" checked={formData.pathType === 'anomaly'} onChange={handleChange} className="mr-2" /> {t("anomaly")}
                </label>
              </div>
            </>
          )}
          
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3" placeholder={t("username")} required />
          
          <div className="relative">
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-700/60 border border-slate-600 rounded-lg text-white p-3 pr-10" placeholder={t("password")} required minLength={6} />
            <button type="button" className="absolute right-3 top-3 text-slate-400" onClick={() => setShowPassword(!showPassword)}>{showPassword ? t("hide") : t("show")}</button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 transition-all">
            {loading ? t("processing") : (isLogin ? t("signIn") : t("createAccount"))}
          </button>
        </form>

        <div className="mt-6 text-center text-slate-400">
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300">
            {isLogin ? t("noAccount") : t("haveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}