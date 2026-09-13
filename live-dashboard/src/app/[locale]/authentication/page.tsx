"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("Auth");
  const locale = useLocale();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const response = await fetch(`${API_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(t("loginSuccess"));
        setTimeout(() => router.push(`/${locale}/live-map`), 1000);
      } else {
        setError(data.error || t("networkError"));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = isLogin ? "/login" : "/register";
      let payload = isLogin 
        ? (formData.username ? { username: formData.username } : { phone: formData.phone })
        : formData;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      setSuccess(data.message);
      if (isLogin) {
        setTimeout(() => router.push(`/${locale}/live-map`), 1000);
      } else {
        setTimeout(() => {
          setIsLogin(true);
          setFormData({ username: "", phone: "", email: "" });
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">{isLogin ? t("welcomeBack") : "Create Account"}</h2>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700/50">
          
          {/* --- Google Button --- */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-6 bg-white text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 flex items-center justify-center transition-all duration-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
            Sign in with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">Or continue with credentials</span></div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <input name="username" type="text" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white" placeholder="Username" value={formData.username} onChange={handleInputChange} />
              <input name="phone" type="tel" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} />
              {!isLogin && <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white" placeholder="Email" value={formData.email} onChange={handleInputChange} />}
            </div>

            {error && <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-300">{error}</div>}
            {success && <div className="p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-sm text-emerald-300">{success}</div>}

            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 transition-all">
              {loading ? t("processing") : (isLogin ? t("signInBtn") : "Create Account")}
            </button>

            <div className="text-center">
              <button type="button" className="text-sm text-slate-400 hover:text-slate-300 transition-colors" onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}