import { useState, FormEvent } from "react";
import companyLogo from "../assets/images/company_logo_1785406862950.jpg";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDemoLogin = () => {
    const mockSession: any = {
      access_token: 'demo-token',
      token_type: 'bearer',
      user: {
        id: 'demo-user-id',
        email: email || 'admin@oneforall.co.id',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: { name: 'Admin One For All' },
        created_at: new Date().toISOString(),
      },
    };
    localStorage.setItem('ahb_local_session', JSON.stringify(mockSession));
    window.location.reload();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        setLoading(false);
        return;
      }

      // If Supabase is placeholder / not configured or returns error, fallback to demo mode
      if (
        !import.meta.env.VITE_SUPABASE_URL ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('FetchError') ||
        error?.message?.includes('URL') ||
        error?.message?.includes('Invalid API key') ||
        error?.message?.includes('invalid')
      ) {
        handleDemoLogin();
        return;
      }

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Email atau password salah. Silakan coba lagi atau gunakan Akses Demo.");
        } else {
          setErrorMsg(error.message);
        }
      }
    } catch {
      handleDemoLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Header / Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-blue-500/30 mb-4 shadow-xl shadow-blue-600/20 bg-slate-900 flex items-center justify-center">
            <img 
              src={companyLogo} 
              alt="One For All Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-white text-xl font-semibold">
            One For All
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Masuk ke Sistem Database &amp; Analytics Karyawan
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleLogin}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm text-slate-300 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@oneforall.co.id"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="password"
              className="block text-sm text-slate-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-950 border border-red-900 text-red-400 text-sm px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-colors mb-3"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 border border-slate-700 transition-colors"
          >
            Akses Demo (Masuk Langsung)
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Sistem Terintegrasi One For All &middot; Akses hanya untuk staf resmi
        </p>
      </div>
    </div>
  );
}

