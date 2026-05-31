import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactPlayer from 'react-player';
import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import confetti from 'canvas-confetti';

const getApiUrl = () => {
  const isCapacitor = typeof window !== 'undefined' && (
    (window as any).Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !window.location.port) ||
    (window.location.hostname === 'localhost' && window.location.pathname.includes('android_asset'))
  );

  if (isCapacitor) {
    return (import.meta as any).env?.VITE_API_URL || 'https://notqi.onrender.com';
  }
  return '';
};

export const API_URL = getApiUrl();

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatArabicDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="natqi-gradient min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-white/80 font-bold">جارٍ التحميل...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

class GlobalErrorBoundary extends Component<any, any> {
  public state = { hasError: false };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full">
            <div className="text-red-500 flex justify-center mb-4">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">حدث خطأ غير متوقع. يرجى المحاولة مجدداً.</h2>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">إعادة تحميل الصفحة</button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const isChildren = user?.category === 'children';

  return (
    <GlobalErrorBoundary>
      <div className={cn("min-h-screen transition-colors duration-500", isChildren ? "text-2xl *:leading-loose" : "text-base")}>
        <div className="md:pr-64 pb-20 md:pb-0 min-h-screen flex flex-col" dir="rtl">
          {children}
        </div>
      </div>
    </GlobalErrorBoundary>
  );
}

// Splash Screen
const Splash = () => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center p-12 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full mx-4"
      >
        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2 }}
           className="flex flex-col items-center justify-center mb-6"
        >
          <img src="/logo.PNG" alt="نطقي" className="h-28 w-auto object-contain mb-4 rounded-2xl" referrerPolicy="no-referrer" />
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">نطقي</h1>
          <p className="text-lg text-slate-500 mt-2 font-medium">طوّر نطقك مع الذكاء الاصطناعي</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4"
        >
          <button onClick={() => navigate('/login')} className="w-full py-4 bg-[#3736ff] text-white rounded-2xl font-bold text-center shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#030101]">تسجيل الدخول</button>
          <button onClick={() => navigate('/register')} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-center hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98]">إنشاء حساب</button>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Login Screen
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        try {
          login(data.token, data.user);
          navigate('/home');
        } catch (loginErr: any) {
          setError('خطأ في حفظ البيانات: ' + loginErr.message);
        }
      } else {
        setError(data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      console.error("Login catch error:", err);
      setError(err?.message || 'تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="natqi-gradient min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 bg-white/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card-light p-8 rounded-3xl shadow-2xl w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <img src="/logo.PNG" alt="نطقي" className="h-20 w-auto object-contain mb-3 rounded-2xl mx-auto" referrerPolicy="no-referrer" />
          <h2 className="text-2xl font-black text-slate-800">مرحباً بك في نطقي</h2>
          <p className="text-slate-500 text-sm mt-1">سجّل دخولك لمتابعة تعلّمك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white text-slate-800 placeholder:text-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white text-slate-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="text-red-500 shrink-0" size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 natqi-gradient text-white rounded-xl font-black text-lg shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>تسجيل الدخول <span>←</span></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            ليس لديك حساب؟{' '}
            <a href="/register" className="text-violet-600 font-black hover:underline">أنشئ حساباً الآن</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Register Screen
const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    category: 'adults' as const
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const categories = [
    { id: 'children', label: 'أطفال', icon: <Baby size={32} className="text-emerald-500" /> },
    { id: 'students', label: 'طلبة', icon: <GraduationCap size={32} className="text-indigo-500" /> },
    { id: 'adults', label: 'بالغين', icon: <User size={32} className="text-amber-500" /> },
    { id: 'non-native', label: 'غير ناطقين', icon: <Globe size={32} className="text-rose-500" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        try {
          login(data.token, data.user);
          navigate('/home');
        } catch (loginErr: any) {
          console.error("Login save error:", loginErr);
          setError('خطأ في حفظ البيانات: ' + loginErr.message);
        }
      } else {
        setError(data.error || 'حدث خطأ أثناء التسجيل');
      }
    } catch (err: any) {
      console.error("Register component fetch error:", err);
      setError('تعذّر الاتصال بالخادم. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="natqi-gradient min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-white/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 bg-white/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-light p-8 rounded-3xl shadow-2xl w-full max-w-lg z-10 my-8"
      >
        <div className="text-center mb-6">
          <img src="/logo.PNG" alt="نطقي" className="h-20 w-auto object-contain mb-3 rounded-2xl mx-auto" referrerPolicy="no-referrer" />
          <h2 className="text-2xl font-black text-slate-800">إنشاء حساب جديد</h2>
          <p className="text-slate-500 text-sm mt-1">تعلّم النطق الصحيح مع الذكاء الاصطناعي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
              <input
                type="text"
                required
                placeholder="أحمد محمد"
                className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                required
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">اختر فئتك</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({...formData, category: cat.id as any})}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 cursor-pointer",
                    formData.category === cat.id
                      ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-200"
                      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50"
                  )}
                >
                  <div className="p-1">{cat.icon}</div>
                  <span className={cn("text-sm font-bold", formData.category === cat.id ? "text-violet-700" : "text-slate-600")}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="text-red-500 shrink-0" size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 natqi-gradient text-white rounded-xl font-black text-lg shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب →"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-500 text-sm">
          لديك حساب؟{' '}
          <a href="/login" className="text-violet-600 font-black hover:underline">سجّل الدخول</a>
        </p>
      </motion.div>
    </div>
  );
};

import { Bell, Settings, Mic, Book, Video, BarChart3, ChevronLeft, StopCircle, RefreshCw, Volume2, Globe, Lightbulb, Play, Pause, RotateCcw, Search, FileText, ExternalLink, Calendar, User, Users, X, Lock, LogOut, CheckCircle2, XCircle, Trash2, Sparkles, Award, Trophy, Flame, TrendingUp, TrendingDown, ArrowRight, MessageSquare, AlertTriangle, Baby, GraduationCap, Target, BookOpen, Inbox, UserCheck, Music, Edit3, Gauge, Pin, Rocket, Smile } from 'lucide-react';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/home', label: 'الرئيسية', icon: <Globe size={24} /> },
    { id: 'training', path: '/training', label: 'تدريب', icon: <Mic size={24} /> },
    { id: 'progress', path: '/progress', label: 'تقدمي', icon: <BarChart3 size={24} /> },
    { id: 'settings', path: '/settings', label: 'إعدادات', icon: <Settings size={24} /> },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed right-0 top-0 natqi-gradient shadow-2xl py-8 px-4 z-50 overflow-y-auto">
        {/* Subtle decoration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-white/5 rounded-b-[4rem] pointer-events-none" />

        <div 
          onClick={() => navigate('/home')}
          className="flex flex-col items-center gap-2 mb-12 cursor-pointer hover:opacity-80 transition-opacity relative z-10"
        >
          <img src="/logo.PNG" alt="نطقي" className="h-14 w-auto object-contain rounded-xl" referrerPolicy="no-referrer" />
          <h1 className="text-2xl font-black text-white">نطقي</h1>
        </div>

        <div className="flex flex-col gap-2 flex-1 relative z-10">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all text-lg",
                  isActive
                    ? "bg-white text-violet-700 shadow-lg"
                    : "text-white/75 hover:bg-white/15 hover:text-white"
                )}
                aria-label={item.label}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative z-10 mt-8 glass-card rounded-2xl p-4 text-center">
          <p className="text-white/60 text-xs font-bold">نطقي © 2026</p>
          <p className="text-white/40 text-[10px] mt-1">منصة النطق الذكي</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white z-50 shadow-[0_-4px_30px_rgba(124,58,237,0.12)] border-t border-violet-100">
        <div className="flex justify-around items-center px-2 py-2 pb-safe">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-2xl transition-all min-w-[60px]",
                  isActive
                    ? "text-violet-600 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive ? "natqi-gradient text-white shadow-md shadow-violet-300" : ""
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-[10px] font-black mt-1",
                  isActive ? "text-violet-600" : "text-slate-400"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

// Home Screen
const Home = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);

  const isChildren = user?.category === 'children';
  const isNonNative = user?.category === 'non-native';

  useEffect(() => {
    if (!user?.category) {
      navigate('/register');
      return;
    }

    const fetchSuggestion = async () => {
      try {
        const res = await fetch(API_URL + `/api/exercises/suggest?category=${user.category}&level=${user.level}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        setSuggestion(data);
      } catch (err) {
        console.error("Failed to fetch suggestion", err);
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [user, navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.name.split(' ')[0] || '';
    
    if (hour < 12) return `صباح الخير، ${firstName}`;
    if (hour < 18) return `مساء الخير، ${firstName}`;
    return `مرحباً، ${firstName}`;
  };

  const getEnglishGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Hello";
  };

  const features = [
    { 
      id: 'training', 
      title: 'تدريب صوتي', 
      desc: 'حسّن نطقك من خلال التكرار والتحليل الذكي', 
      icon: <Mic className="text-blue-500" size={32} />, 
      path: '/training',
      color: 'bg-blue-50' 
    },
    { 
      id: 'library', 
      title: 'مكتبة المحتوى', 
      desc: 'شاهد الفيديوهات التدريبية والمواد التعليمية', 
      icon: <Video className="text-violet-500" size={32} />, 
      path: '/library',
      color: 'bg-violet-50' 
    },
    { 
      id: 'progress', 
      title: 'متابعة الأداء', 
      desc: 'احصاءات وتقارير ذكية لتقدمك في التدريب', 
      icon: <BarChart3 className="text-emerald-500" size={32} />, 
      path: '/progress',
      color: 'bg-emerald-50' 
    },
    { 
      id: 'settings', 
      title: 'الإعدادات', 
      desc: 'تخصيص الحساب ومستوى التدريب المفضل', 
      icon: <Settings className="text-amber-500" size={32} />, 
      path: '/settings',
      color: 'bg-amber-50' 
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-28 md:pb-8 md:pt-8 space-y-6">

        {/* Hero Header */}
        <section className="natqi-gradient rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-violet-400/30">
          <div className="absolute top-[-40px] left-[-40px] w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-white/8 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "font-black text-white",
                    isChildren ? "text-3xl" : "text-2xl md:text-3xl"
                  )}
                >
                  {getGreeting()}
                  {isChildren && (
                    <motion.span
                      animate={{ rotate: [0, 20, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="inline-block mr-2"
                    >
                      <Smile size={32} className="inline text-amber-300" />
                    </motion.span>
                  )}
                </motion.h2>
                {isNonNative && (
                  <p className="text-white/70 italic text-sm">{getEnglishGreeting()}, {user?.name.split(' ')[0]}</p>
                )}
                <p className="text-white/75 text-sm font-medium">استمر في التعلم — مستوى: {user?.level || 'مبتدئ'}</p>
              </div>
              <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-white shadow-inner">
                <Target size={24} />
              </div>
            </div>

            {/* Today suggestion mini */}
            <div className="mt-6 glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="text-white/60 text-xs font-bold block mb-1 flex items-center gap-1">
                  <Sparkles size={12} className="shrink-0 text-amber-300" /> اقتراح اليوم
                </span>
                <p className="text-white font-bold text-sm leading-snug">
                  {loadingSuggestion
                    ? "جارٍ التحميل..."
                    : suggestion?.title || "ابدأ رحلتك اليوم"}
                </p>
              </div>
              <button
                onClick={() => navigate(`/training${suggestion ? `?id=${suggestion.id}` : ''}`)}
                className="shrink-0 px-4 py-2 bg-white text-violet-700 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow"
              >
                ابدأ ←
              </button>
            </div>
          </div>
        </section>

        {/* Quick Stats Row */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { icon: <Trophy size={22} className="text-amber-500 mx-auto" />, label: 'مستواك', value: user?.level === 'advanced' ? 'متقدم' : user?.level === 'intermediate' ? 'متوسط' : 'مبتدئ' },
            { icon: <Target size={22} className="text-rose-500 mx-auto" />, label: 'هدفك', value: user?.goal === 'fluency' ? 'طلاقة' : user?.goal === 'letters' ? 'الحروف' : 'نطق' },
            { icon: <Calendar size={22} className="text-blue-500 mx-auto" />, label: 'اليوم', value: new Date().toLocaleDateString('ar', { weekday: 'short' }) },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 text-center border border-violet-50 shadow-sm flex flex-col justify-between items-center h-24"
            >
              <div className="mb-0.5">{stat.icon}</div>
              <p className="text-[10px] text-slate-400 font-bold">{stat.label}</p>
              <p className="text-slate-800 font-black text-sm mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </section>

        {/* Features Grid */}
        <section>
          <h3 className="text-slate-700 font-black text-lg mb-4 px-1">الأقسام الرئيسية</h3>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => navigate(feature.path)}
                className={cn(
                  "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group",
                  idx === 0 && "col-span-2 md:col-span-1"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm",
                  feature.color,
                  isChildren && "animate-bounce"
                )}>
                  {feature.icon}
                </div>
                <h4 className="text-base font-black text-slate-800">{feature.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed mt-1">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Main CTA */}
        <section>
          <motion.button
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            onClick={() => navigate('/training')}
            className="w-full py-5 natqi-gradient rounded-[2rem] text-white text-xl font-black shadow-2xl shadow-violet-400/40 flex items-center justify-center gap-3 hover:brightness-110 transition-all focus:ring-4 focus:ring-violet-300 focus:outline-none"
            aria-label="ابدأ التمرين الآن"
          >
            <Mic size={24} className="shrink-0" />
            <span>ابدأ التمرين الآن</span>
          </motion.button>
        </section>
      </main>

      <footer className="p-8 text-center text-slate-400 text-sm">
        نطقي &copy; 2026 - منصتك الذكية لتعلم النطق العربي الصحيح
      </footer>
    </div>
  );
};

// Progress Screen
const Progress = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [insights, setInsights] = useState<{
    insights: string[];
    streakDays: number;
    trend: 'improving' | 'declining' | 'stable';
    bestScore: number;
    totalAttempts: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProgress = async () => {
      try {
        const res = await fetch(API_URL + `/api/progress/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    const fetchInsights = async () => {
      if (!user?.id || !token) return;
      try {
        const res = await fetch(API_URL + `/api/progress/${user.id}/insights`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
        }
      } catch {}
    };

    fetchProgress();
    fetchInsights();
  }, [user, token]);

  const navigate = useNavigate();

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-2xl text-slate-500 gap-3"><div className="w-6 h-6 border-4 border-slate-300 border-t-primary rounded-full animate-spin"></div> جارٍ التحميل...</div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Navbar />
      <div className="text-center space-y-3 p-8">
        <Rocket size={56} className="text-violet-500 mx-auto animate-bounce mb-2" />
        <h2 className="text-2xl font-black text-slate-800">لم تبدأ تدريباتك بعد</h2>
        <p className="text-slate-500">أكمل تمريناتك الأولى لترى إحصائياتك هنا</p>
        <button 
          onClick={() => navigate('/training')} 
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 mx-auto justify-center hover:scale-105 active:scale-95 transition-all shadow"
        >
          <span>ابدأ التمرين الآن</span>
          <Mic size={18} />
        </button>
      </div>
    </div>
  );

  const { stats, attempts, chartData } = data;

  const getMotivation = () => {
    if (chartData?.length < 2) return "ابدأ التدريب لتتبع تقدمك!";
    // Filter out zero scores for trend analysis if needed, but here we just take last non-zero days or just last 2 from chart
    const last2 = chartData?.filter((d: any) => d.score > 0).slice(-2);
    if (last2?.length < 2) return "حافظ على استمرارية التدريب للوصول للقمة!";
    if (last2[1].score > last2[0].score) return "أداؤك في تحسن مستمر!";
    if (last2[1].score === last2[0].score) return "حافظ على هذا المستوى!";
    return "لا تستسلم، التدريب يصنع الفارق!";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        <header className="space-y-1">
            <h2 className="text-3xl font-black text-slate-800">إحصائيات التقدم</h2>
            <p className="text-slate-500 font-medium text-lg">{getMotivation()}</p>
        </header>

        {/* سلسلة الأيام المتواصلة */}
        {insights && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                <Flame size={28} />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-bold">سلسلة التدريب</p>
                <p className="text-3xl font-black text-slate-800 tracking-tight">
                  {insights.streakDays} <span className="text-lg font-medium text-slate-500">يوم</span>
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                {insights.trend === 'improving' ? <TrendingUp size={28} /> : insights.trend === 'declining' ? <TrendingDown size={28} /> : <ArrowRight size={28} />}
              </div>
              <div>
                <p className="text-slate-400 text-sm font-bold">الاتجاه</p>
                <p className={cn(
                  "text-xl font-black tracking-tight",
                  insights.trend === 'improving' ? 'text-green-600' : 
                  insights.trend === 'declining' ? 'text-red-500' : 'text-slate-600'
                )}>
                  {insights.trend === 'improving' ? 'تحسّن' : insights.trend === 'declining' ? 'تراجع' : 'مستقر'}
                </p>
              </div>
            </div>
            
            {/* رسائل تحفيزية */}
            {insights.insights.length > 0 && (
              <div className="bg-gradient-to-l from-blue-50 to-purple-50 p-4 rounded-3xl border border-blue-100 col-span-2 md:col-span-1">
                <p className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5 justify-end">
                  <MessageSquare size={16} />
                  <span>رسائلك</span>
                </p>
                {insights.insights.slice(0, 2).map((insight, i) => (
                  <p key={i} className="text-sm text-blue-700">{insight}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
                <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner"><Trophy size={28} /></div>
                <div>
                   <p className="text-slate-400 text-sm font-bold">أفضل نتيجة</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.bestScore}%</p>
                </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner"><BarChart3 size={28} /></div>
                <div>
                   <p className="text-slate-400 text-sm font-bold">متوسط النتائج</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.averageScore}%</p>
                </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner"><CheckCircle2 size={28} /></div>
                <div>
                   <p className="text-slate-400 text-sm font-bold">عدد التمارين</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.totalAttempts}</p>
                </div>
            </motion.div>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
            <h3 className="text-xl font-bold text-slate-800 mb-10 px-2">مستوى النطق اليومي (آخر ٧ أيام)</h3>
            <div className="h-[320px] w-full">
                {stats?.totalAttempts < 1 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-medium">لا توجد بيانات كافية لعرض الرسم البياني</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="dayName" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                domain={[0, 100]} 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                                dx={-5}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <Tooltip 
                                cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', direction: 'rtl' }}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#3b82f6" 
                                strokeWidth={5} 
                                fillOpacity={1} 
                                fill="url(#colorScore)"
                                animationDuration={2000}
                                name="أفضل درجة"
                                activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>

        {/* Recent Attempts */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">آخر المحاولات</h3>
                <button className="text-primary font-bold text-sm hover:underline">عرض الكل</button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {attempts?.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 text-slate-400 font-medium">
                        لم تقم بأي تمارين بعد. ابدأ أول تمرين لك الآن!
                    </div>
                ) : (
                    attempts?.slice(0, 5).map((a: any, idx: number) => (
                        <motion.div 
                            key={a.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-inner",
                                    a.score >= 80 ? "bg-emerald-50 text-emerald-600" : a.score >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                )}>
                                    {a.score}
                                </div>
                                <div className="text-right flex-1">
                                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1">تمرين النطق</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{formatArabicDate(a.attemptDate?.toDate?.() || a.attemptDate)}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-slate-400 font-bold mb-1 uppercase">الأخطاء</span>
                                    <span className="font-black text-slate-700">{JSON.parse(a.mistakesJson || '[]').length}</span>
                                </div>
                                <button className="w-10 h-10 bg-slate-50 hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-center text-primary">
                                    <ChevronLeft size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>

        {/* التحديات الأسبوعية */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-6">تحديات هذا الأسبوع</h3>
          <div className="space-y-4">
            {[
              { 
                title: '5 تمارين يومياً', 
                current: Math.min(stats?.totalAttempts || 0, 5), 
                target: 5, 
                icon: <Target size={18} className="text-rose-500" />
              },
              { 
                title: 'احصل على 80% في تمرين', 
                current: stats?.bestScore >= 80 ? 1 : 0, 
                target: 1, 
                icon: <Award size={18} className="text-amber-500" />
              },
              { 
                title: '3 أيام متواصلة', 
                current: Math.min(insights?.streakDays || 0, 3), 
                target: 3, 
                icon: <Flame size={18} className="text-orange-500" />
              }
            ].map((challenge, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">{challenge.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700">{challenge.title}</span>
                    <span className="text-sm text-slate-500">{challenge.current}/{challenge.target}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        challenge.current >= challenge.target ? 'bg-green-500' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(100, (challenge.current / challenge.target) * 100)}%` }}
                    />
                  </div>
                </div>
                {challenge.current >= challenge.target && (
                  <span className="text-green-500 text-xl">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// Training Screen
const Training = () => {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'display' | 'recording' | 'analyzing' | 'results'>('display');
  const [error, setError] = useState('');
  const [micError, setMicError] = useState('');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showTips, setShowTips] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const maxVolumeRef = useRef<number>(0);
  const [recognizedText, setRecognizedText] = useState('');
  const recognitionRef = useRef<any>(null);

  const [sessionProgress, setSessionProgress] = useState({
    attempts: 0,
    totalScore: 0,
    bestScore: 0
  });

  const updateSession = (score: number) => {
    setSessionProgress(prev => ({
      attempts: prev.attempts + 1,
      totalScore: prev.totalScore + score,
      bestScore: Math.max(prev.bestScore, score)
    }));
  };

  const getStarRating = (score: number): { stars: number; color: string; label: string } => {
    if (score >= 90) return { stars: 5, color: 'text-amber-500', label: 'ممتاز' };
    if (score >= 75) return { stars: 4, color: 'text-green-500', label: 'جيد جداً' };
    if (score >= 60) return { stars: 3, color: 'text-blue-500', label: 'جيد' };
    if (score >= 40) return { stars: 2, color: 'text-orange-500', label: 'مقبول' };
    return { stars: 1, color: 'text-red-500', label: 'يحتاج تحسين' };
  };

  const loadNewExercise = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setExercise(null);
    setStep('display');
    setAnalysisResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    try {
      const res = await fetch(API_URL + `/api/exercises/suggest?category=${user.category}&level=${user.level}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data && !data.error) setExercise(data);
      else setError('لم يتم العثور على تمرين مناسب');
    } catch {
      setError('حدث خطأ أثناء تحميل التمرين');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    const exId = searchParams.get('id');
    const fetchExercise = async () => {
      try {
        const url = API_URL + (exId 
          ? `/api/exercises/suggest?id=${exId}`
          : `/api/exercises/suggest?category=${user?.category}&level=${user?.level}`);
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data) setExercise(data);
        else setError('لم يتم العثور على تمرين مناسب');
      } catch (err) {
        setError('حدث خطأ أثناء تحميل التمرين');
      } finally {
        setLoading(false);
      }
    };
    fetchExercise();
  }, [searchParams, user, navigate]);

  // Professional Audio Visualization - Waveform
  const startCanvasAnimation = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const analyser = analyserRef.current;
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    let smoothedData = new Float32Array(bufferLength);
    const smoothingFactor = 0.85;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const primaryColor = getComputedStyle(document.body).getPropertyValue('--app-primary').trim() || '#3b82f6';

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Smooth the waveform
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        smoothedData[i] = smoothedData[i] * smoothingFactor + val * (1 - smoothingFactor);
      }

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw center line
      ctx.strokeStyle = primaryColor + '20';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.stroke();

      // Draw waveform
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const sliceWidth = rect.width / bufferLength;
      let x = 0;
      const centerY = rect.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        const v = smoothedData[i];
        const y = centerY + v * (rect.height / 2.2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw fill gradient under waveform
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, primaryColor + '40');
      gradient.addColorStop(0.5, primaryColor + '10');
      gradient.addColorStop(1, primaryColor + '00');
      ctx.fillStyle = gradient;
      ctx.lineTo(rect.width, centerY);
      ctx.lineTo(0, centerY);
      ctx.closePath();
      ctx.fill();
    };
    draw();
  }, []);

  // Handle canvas animation when entering recording state
  useEffect(() => {
    if (step === 'recording' && isRecording && canvasRef.current) {
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        startCanvasAnimation();
      }, 50);
      return () => {
        clearTimeout(timer);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [step, isRecording, startCanvasAnimation]);

  const startRecording = async () => {
    try {
      // Professional audio constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          channelCount: { ideal: 1 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Start Speech Recognition Fallback
      setRecognizedText('');
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'ar-SA';
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
             setRecognizedText(prev => prev + ' ' + finalTranscript);
          }
        };
        try { recognitionRef.current.start(); } catch(e){}
      }

      // Professional audio processing chain
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx({ sampleRate: 48000 });
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.smoothingTimeConstant = 0.8;

          const source = audioContextRef.current.createMediaStreamSource(stream);

          // High-pass filter to remove rumble
          const highPass = audioContextRef.current.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.value = 80;

          // Compressor for consistent levels
          const compressor = audioContextRef.current.createDynamicsCompressor();
          compressor.threshold.value = -24;
          compressor.knee.value = 30;
          compressor.ratio.value = 12;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.25;

          // Gain node for final level control
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.gain.value = 1.2;

          // Connect chain: source -> highPass -> compressor -> gain -> analyser
          source.connect(highPass);
          highPass.connect(compressor);
          compressor.connect(gainNodeRef.current);
          gainNodeRef.current.connect(analyserRef.current);

          // Volume monitoring
          const volumeAnalyser = audioContextRef.current.createAnalyser();
          volumeAnalyser.fftSize = 64;
          gainNodeRef.current.connect(volumeAnalyser);
          maxVolumeRef.current = 0;

          const monitorVolume = () => {
            if (!isRecording) return;
            const data = new Uint8Array(volumeAnalyser.frequencyBinCount);
            volumeAnalyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            const currentVol = Math.min(100, avg * 1.5);
            setVolumeLevel(currentVol);
            if (currentVol > maxVolumeRef.current) {
               maxVolumeRef.current = currentVol;
            }
            animationFrameRef.current = requestAnimationFrame(monitorVolume);
          };
          monitorVolume();
        }
      } catch (err) {
        console.warn("AudioContext init failed, using CSS fallback", err);
      }

      // High quality MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 256000,
        mimeType: mimeType || undefined
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const finalMime = mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: finalMime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms for smoother recording
      setIsRecording(true);
      setStep('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) {
            // Use timeout to ensure stopRecording is called outside the state update
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                stopRecording();
              }
            }, 0);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setMicError('يرجى تفعيل الميكروفون للمتابعة في متصفحك أو استخدام التطبيق مباشرة.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setVolumeLevel(0);
    clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const playPreview = () => {
    if (!audioUrl) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPlayingPreview(false);
      return;
    }
    const audio = new Audio(audioUrl);
    previewAudioRef.current = audio;
    audio.onended = () => {
      setIsPlayingPreview(false);
      previewAudioRef.current = null;
    };
    audio.play();
    setIsPlayingPreview(true);
  };

  const submitRecording = () => {
    if (audioBlob) {
      analyzeAudio(audioBlob);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const analyzeAudio = async (blob: Blob) => {
    if (!exercise) {
      console.error("No exercise loaded");
      setStep('display');
      return;
    }
    setStep('analyzing');
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('exerciseId', exercise.id);
    formData.append('userId', user?.id || '');
    formData.append('text', exercise.text);
    formData.append('recognizedText', recognizedText.trim());

    try {
      const res = await fetch(API_URL + '/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      setAnalysisResult(data);
      updateSession(data.score);
      setStep('results');
      if (data.score >= 70 && user?.category === 'children') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحليل الصوت');
      setStep('display');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speakText = (text: string, speed = 1) => {
    if (!('speechSynthesis' in window)) {
      alert('متصفحك لا يدعم خاصية النطق');
      return;
    }
    
    // Strip Tashkeel (Arabic diacritics) as some local TTS engines fail to pronounce them
    // and just output silence.
    const cleanText = text.replace(/[\u0617-\u061A\u064B-\u0652]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.rate = Math.max(0.1, Math.min(2, speed));
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('ar'))
      || voices.find(v => v.name.includes('Male') || v.name.includes('Natural'));
    if (arabicVoice) utterance.voice = arabicVoice;

    // Small delay helps prevent cancel() from blocking the subsequent speak()
    window.speechSynthesis.cancel();
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const playAudio = async (url: string, text: string, speed = 1) => {
    // If no specific audio url, generate Google Translate TTS url which is usually more reliable
    // than the local browser's TTS for Arabic.
    if (!url || url.includes('soundjay.com') || url.includes('beep')) {
      const gTTSUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`;
      try {
        const audio = new Audio(gTTSUrl);
        audio.playbackRate = speed;
        audio.onerror = () => speakText(text, speed);
        await audio.play().catch(() => speakText(text, speed));
      } catch (e) {
        speakText(text, speed);
      }
      return;
    }
    
    try {
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onerror = () => speakText(text, speed);
      await audio.play().catch(() => speakText(text, speed));
    } catch (e) {
      speakText(text, speed);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-2xl text-slate-500 gap-3"><div className="w-6 h-6 border-4 border-slate-300 border-t-primary rounded-full animate-spin"></div> جارٍ التحميل...</div>;

  if (!exercise && step === 'display') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold">جارٍ تحميل التمرين...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-6 pb-28 md:pb-8">

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800">التدريب الصوتي</h2>
          <p className="text-slate-500 text-sm mt-1">سجّل صوتك وتلقَّ تحليلاً فورياً بالذكاء الاصطناعي</p>
        </div>

        {/* Microphone Error Alert */}
        {micError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-800 text-sm mb-1">تعذر الوصول للميكروفون</h3>
              <p className="text-red-600 text-xs">{micError}</p>
            </div>
            <button onClick={() => setMicError('')} className="text-red-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Session Progress Bar */}
        {sessionProgress.attempts > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 border border-violet-50 shadow-sm flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>المحاولات: {sessionProgress.attempts}</span>
                <span>أفضل: {sessionProgress.bestScore}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full natqi-gradient rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(sessionProgress.bestScore, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-center text-amber-500">
              <Trophy size={20} />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-bold">جارٍ تحميل التمرين...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-bold mb-4">{error}</p>
            <button onClick={loadNewExercise} className="px-6 py-3 natqi-gradient text-white rounded-xl font-bold">
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && exercise && (
          <AnimatePresence mode="wait">
          {/* ── STEP: DISPLAY ── */}
          {step === 'display' && (
            <motion.div 
              key="display" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              className="space-y-4"
            >
              <div className="bg-white rounded-3xl p-6 border border-violet-50 shadow-sm text-right">
                <div className="flex items-center gap-2 mb-4 justify-end">
                  <span className="px-3 py-1 natqi-gradient text-white rounded-full text-xs font-black">{exercise.category}</span>
                  <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-bold">{exercise.level}</span>
                  {exercise.difficulty && <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold">صعوبة: {exercise.difficulty}/5</span>}
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{exercise.title}</h3>
                {exercise.description && <p className="text-slate-500 text-sm mb-4 leading-relaxed">{exercise.description}</p>}

                <div className="natqi-gradient-soft rounded-2xl p-5 border border-violet-100">
                  <p className="text-slate-800 text-2xl font-bold leading-loose text-center">{exercise.text}</p>
                  {exercise.text_translation && (
                    <p className="text-slate-500 text-sm mt-3 pt-3 border-t border-violet-100 italic text-center">{exercise.text_translation}</p>
                  )}
                </div>

                {exercise.tips && (
                  <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 justify-end items-start">
                    <p className="text-amber-700 text-sm font-medium flex-1 text-right">{exercise.tips}</p>
                    <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  </div>
                )}
              </div>

              <button
                onClick={startRecording}
                className="w-full py-5 natqi-gradient rounded-[2rem] text-white text-xl font-black shadow-2xl shadow-violet-400/40 flex items-center justify-center gap-3 hover:brightness-110 transition-all"
              >
                <Mic size={28} /> ابدأ التسجيل
              </button>
              <button 
                onClick={loadNewExercise} 
                className="w-full py-3 bg-white border-2 border-violet-100 text-violet-700 rounded-2xl font-bold hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> تمرين آخر
              </button>
            </motion.div>
          )}

          {/* ── STEP: RECORDING ── */}
          {step === 'recording' && (
            <motion.div 
              key="recording" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="space-y-4 text-center"
            >
              <div className="bg-white rounded-3xl p-6 border border-violet-50 shadow-sm">
                <p className="text-slate-700 text-2xl font-bold leading-loose text-center mb-4">{exercise.text}</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-violet-50 shadow-sm flex flex-col items-center gap-6">
                {/* Waveform Canvas */}
                <div className="w-full h-20 bg-slate-50 rounded-2xl overflow-hidden border border-violet-100 relative">
                  <canvas ref={canvasRef} className="w-full h-full" />
                  {/* Volume indicator */}
                  {isRecording && (
                    <div className="absolute bottom-2 right-3 flex items-center gap-2">
                      <div className="flex gap-0.5 h-4 items-end">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-violet-600 rounded-full transition-all duration-75"
                            style={{
                              height: `${Math.min(100, Math.max(15, volumeLevel * (i + 1) / 4))}%`,
                              opacity: volumeLevel > (i * 12) ? 1 : 0.3
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300")} />
                  <span className="font-mono text-2xl font-black text-slate-700">
                    {formatTime(recordingTime)}
                  </span>
                </div>

                {/* Big Mic Button */}
                {!isRecording && !audioUrl && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={startRecording}
                    className="w-24 h-24 natqi-gradient rounded-full flex items-center justify-center shadow-2xl shadow-violet-500/50"
                  >
                    <Mic size={40} className="text-white" />
                  </motion.button>
                )}

                {isRecording && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={stopRecording}
                    className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-400/50 animate-pulse"
                  >
                    <StopCircle size={40} className="text-white" />
                  </motion.button>
                )}

                {audioUrl && !isRecording && (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2 bg-violet-50 rounded-2xl p-3">
                      <button onClick={playPreview} className="w-10 h-10 natqi-gradient rounded-xl flex items-center justify-center text-white">
                        {isPlayingPreview ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <span className="text-slate-600 text-sm font-bold flex-1">معاينة التسجيل ({recordingTime}ث)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={discardRecording} 
                        className="py-3 border-2 border-red-100 text-red-500 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} /> إعادة تسجيل
                      </button>
                      <button 
                        onClick={submitRecording} 
                        className="py-3 natqi-gradient text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-400/30 hover:brightness-110 transition-all"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>تحليل الصوت</span>
                          <Sparkles size={16} />
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP: ANALYZING ── */}
          {step === 'analyzing' && (
            <motion.div 
              key="analyzing" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative w-28 h-28">
                <div className="absolute inset-0 natqi-gradient rounded-full opacity-20 animate-ping" />
                <div className="absolute inset-2 natqi-gradient rounded-full opacity-40 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="relative w-full h-full natqi-gradient rounded-full flex items-center justify-center shadow-2xl shadow-violet-400/40">
                  <Sparkles size={40} className="text-white animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 px-6">
                <p className="text-slate-800 font-black text-xl">جارٍ استخراج النتائج...</p>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                   نقوم بتقييم نطقك حالياً ومقارنته بمخارج الحروف الصحيحة.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2,3,4].map(i => (
                  <motion.div 
                    key={i} 
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1, 
                      repeat: Infinity, 
                      delay: i * 0.15 
                    }}
                    className="w-2.5 h-2.5 natqi-gradient rounded-full" 
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP: RESULTS ── */}
          {step === 'results' && analysisResult && (() => {
            const { stars, color, label } = getStarRating(analysisResult.score);
            return (
              <motion.div 
                key="results" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Score Card */}
                <div className="natqi-gradient rounded-3xl p-6 text-center relative overflow-hidden shadow-2xl shadow-violet-400/30">
                  <div className="absolute top-[-30px] right-[-30px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <p className="text-white/80 text-sm font-bold mb-2">نتيجة التحليل</p>
                  <div className="text-7xl font-black text-white mb-2">{analysisResult.score}%</div>
                  <div className={cn("text-2xl font-bold mb-2", color.replace('text-', 'text-white/'))}>
                    {'★'.repeat(stars)}{'☆'.repeat(5 - stars)} <span className="text-white/90 text-lg">{label}</span>
                  </div>
                  <p className="text-white/95 text-sm max-w-md mx-auto leading-relaxed mt-2">{analysisResult.feedback}</p>
                </div>

                {/* Detailed Scores */}
                {analysisResult.breakdown && (
                  <div className="bg-white rounded-3xl p-5 border border-violet-50 shadow-sm text-right">
                    <h4 className="font-black text-slate-800 mb-4 text-sm">التقييم التفصيلي</h4>
                    {Object.entries(analysisResult.breakdown).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-slate-500 font-bold w-20 shrink-0 text-right">{
                          key === 'pronunciation' ? 'النطق' : key === 'fluency' ? 'الطلاقة' : key === 'accuracy' ? 'الدقة' : key
                        }</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full natqi-gradient rounded-full"
                          />
                        </div>
                        <span className="text-xs font-black text-violet-700 w-8 text-left">{val}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mistake Tips */}
                {analysisResult.mistakes?.length > 0 && (
                  <div className="bg-amber-50 rounded-2xl p-5 space-y-3 text-right">
                    <h4 className="font-bold text-amber-850 flex items-center gap-2 justify-end text-sm">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>كلمات تحتاج انتباهك</span>
                    </h4>
                    {analysisResult.mistakes.map((mistake: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-amber-100 flex flex-col text-right">
                        <div className="flex items-center gap-3 mb-2 justify-end">
                          {mistake.severity === 'major' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">صعب</span>
                          )}
                          <span className="text-lg font-black text-amber-700 font-arabic">{mistake.word}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{mistake.tip}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text with errors */}
                <div className="bg-white rounded-3xl p-5 border border-violet-50 shadow-sm text-right">
                  <h4 className="font-black text-slate-800 mb-3 text-sm">النص مع إبراز الأخطاء</h4>
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-4 text-2xl font-bold leading-relaxed" dir="rtl">
                    {exercise.text.split(' ').map((word: string, i: number) => {
                      const isMistake = analysisResult.mistakes?.some((m: any) => m.word === word);
                      return (
                        <span 
                          key={i} 
                          className={cn(
                            "relative group px-2 py-1 rounded-xl transition-colors cursor-help",
                            isMistake 
                              ? "bg-red-50 text-red-500 border border-red-100/50 line-through decoration-red-300" 
                              : "bg-green-50 text-green-700 border border-green-100/50"
                          )}
                        >
                          {word}
                          {isMistake && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block z-20">
                              <div className="bg-slate-850 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                                النطق الصحيح: {word}
                              </div>
                            </div>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Recognized text */}
                {recognizedText && (
                  <div className="bg-white rounded-3xl p-5 border border-violet-50 shadow-sm text-right">
                    <h4 className="font-black text-slate-800 mb-2 text-sm">ما تم التعرف عليه:</h4>
                    <p className="text-slate-600 text-base leading-loose text-center">{recognizedText}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 text-right">
                  {exercise.audio_correct_url && (
                    <button
                      onClick={() => playAudio(exercise.audio_correct_url, exercise.text)}
                      className="py-4 bg-white border-2 border-violet-100 text-violet-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-violet-50 transition-all col-span-2"
                    >
                      <Volume2 size={20} /> استمع للنطق الصحيح
                    </button>
                  )}
                  {user?.category === 'non-native' && exercise.audio_correct_url && (
                    <button
                      onClick={() => playAudio(exercise.audio_correct_url, exercise.text, 0.75)}
                      className="py-4 bg-white border-2 border-violet-100 text-violet-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-violet-50 transition-all col-span-2 italic"
                    >
                      <Gauge size={16} className="text-violet-500 shrink-0" />
                      <span>نطق بطيء (0.75x)</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setStep('display'); setAnalysisResult(null); setAudioUrl(null); setRecordingTime(0); }}
                    className="py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} /> إعادة
                  </button>
                  <button 
                    onClick={loadNewExercise} 
                    className="py-4 natqi-gradient text-white rounded-2xl font-black shadow-lg shadow-violet-400/30 hover:brightness-110 transition-all flex items-center justify-center"
                  >
                    التالي ←
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      )}
      </main>
    </div>
  );
};

// Library Lesson Metadata & Outlines
const LESSON_DETAILS: Record<string, {
  makharij: string[];
  tips: string[];
  duration: string;
  sourceTeacher: string;
  drills: string[];
}> = {
  "5U_wP8FWeu0": {
    makharij: ["الحلق (الأقاصي والوسطى)", "الجهر والهمس", "أعضاء النطق الرئيسية"],
    tips: [
      "دقق في حركة اللسان والفك السفلي أثناء استعراض مخارج الشفتين والحلق.",
      "تجنب النبر الزائد في نهاية نطق الحروف الساكنة لمنع حدوث قلقلة غير مطلوبة.",
      "استمع لنفس الحرف وأعد المحاكاة ثلاث مرات على الأقل وبصوتٍ مرتفع ونقي."
    ],
    duration: "18:45",
    sourceTeacher: "فضيلة الدكتور أيمن رشدي سويد",
    drills: ["ء", "هـ", "ع", "ح", "غ", "خ"]
  },
  "FSmS_P7WizE": {
    makharij: ["الحروف الهجائية البسيطة", "مخارج الشفتين واللسان للأطفال", "الحركات القصيرة"],
    tips: [
      "حفز طفلك على الملاحظة البصرية لحركة الفم ومحاكاتها بتأنٍ ودقة.",
      "احرص على تكرار الحرف خلف المعلم في الفيديو لترسيخ نبرته الصوتية.",
      "يُفضل التدريب في بيئة هادئة وبدون أي تشويش لتعزيز التمييز السمعي للأطفال."
    ],
    duration: "12:10",
    sourceTeacher: "أستاذ النطق السليم للأطفال",
    drills: ["ب", "ت", "ث", "ج", "د"]
  },
  "fA8H49A0gDk": {
    makharij: ["Arabic Throat Letters (الجمباز الصوتي)", "Phonetic Disambiguation", "Tongue Placement"],
    tips: [
      "Pay close attention to vocal cord constriction for the deep 'ع' and Arabic 'ح' sounds.",
      "Heavy letters (Mufakhama) push the sound upward to the roof of your mouth; try to mimic this echo.",
      "Practice contrasting similar-sounding light vs heavy consonants to build strong auditory recognition."
    ],
    duration: "15:20",
    sourceTeacher: "Arabic Articulation Masterclass",
    drills: ["ع", "ح", "ق", "ط", "ض"]
  },
  "xLWe9x4wshU": {
    makharij: ["أحكام النون الساكنة والتنوين", "مخرج الخيشوم وغنة الإدغام المكتملة", "مخارج الحروف الحلقية"],
    tips: [
      "الغنة تخرج بكامل رنينها من تجويف الأنف (الخيشوم)؛ تأكد من سد الأنف جزئياً للتأكد من المخرج.",
      "لاحظ انسياب الحروف اللينة والصوت الفصيح للتلاوة بدون أي تكلف أو صعوبة.",
      "شاهد طريقة تصفية الأحرف المتتابعة وطبق النماذج فوراً بالمدرب الذكي."
    ],
    duration: "21:40",
    sourceTeacher: "الشيخ المفيد لأحكام التلاوة والتجويد",
    drills: ["ن", "م", "ت", "د", "ط"]
  },
  "-Ysh_eS2w34": {
    makharij: ["صفات الاستعلاء والانخفاض", "الحروف المفخمة (خص ضغط قظ)", "الترقيق الفصيح للنون والألف"],
    tips: [
      "ارتفاع مؤخرة اللسان هو السر الأساسي لتفخيم الحروف السبعة مثل الصاد والضاد.",
      "انتبه لعدم تفخيم الحروف المجاورة للحرف المفخم (مثل التاء في كلمة 'بسطت').",
      "تدرب على الاستماع الفارق والعميق لترسيخ اللكنة العربية الفصحى الفخرية."
    ],
    duration: "14:15",
    sourceTeacher: "خبير وموجه مخارج الحروف العربية",
    drills: ["خ", "ص", "ض", "غ", "ط", "ق", "ظ"]
  },
  "H0g_pB8nZlU": {
    makharij: ["مخارج الحروف التفاعلية التمهيدية", "ربط الكلمة بالصوت للأطفال", "المدود الطويلة والقصيرة"],
    tips: [
      "دع الطفل يربط مخارج المقاطع بالرسم التعبيري الجذاب والملون المعروض.",
      "ساعد الطفل في تلمس حنجرته ليدرك الاهتزازات الطبيعية للحروف المجهورة.",
      "شجع الطفل على فتح تطبيق التدريب التفاعلي لينال نجوم التقييم الممتعة."
    ],
    duration: "09:35",
    sourceTeacher: "سرديات وكرتون مخارج الحروف الشيق",
    drills: ["أ", "ب", "ت", "ث", "ج", "ح", "خ"]
  }
};

// Tool to safely check and extract the YouTube video ID from various formats
const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Library Screen
// Video Player Component to handle stable playback during transitions
const VideoPlayerModal = ({ video, item, onClose }: { video: string, item: any, onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h4 className="text-white font-black">{item?.title}</h4>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20">✕</button>
        </div>
        <div className="aspect-video bg-black flex items-center justify-center relative">
          <div className="w-full h-full relative group">
            {video.includes('youtube') || video.includes('youtu.be') ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${(() => {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = video.match(regExp);
                  return (match && match[2].length >= 11) ? match[2].substring(0, 11) : video.split('embed/')[1]?.split('?')[0] || '';
                })()}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            ) : (
              <div className="w-full h-full">
                {(() => {
                  const Player = ReactPlayer as any;
                  return (
                    <Player 
                      key={video}
                      url={video} 
                      width="100%" 
                      height="100%" 
                      controls 
                      playing 
                      onError={(e: any) => {
                        console.error("ReactPlayer Error:", e);
                      }}
                    />
                  );
                })()}
              </div>
            )}
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-white flex items-center gap-2 pointer-events-none">
               <ExternalLink size={12} />
               <span className="hover:underline">المشغل المباشر</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Library = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // High fidelity play states
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [playerServer, setPlayerServer] = useState<'nocookie' | 'standard'>('standard');
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');

  // Admin States
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [adminSaving, setAdminSaving] = useState(false);

  const tabs = [
    { id: 'all', label: 'الكل' },
    { id: 'children', label: 'الأطفال' },
    { id: 'students', label: 'الطلبة' },
    { id: 'adults', label: 'البالغين' },
  ];

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL + `/api/library?category=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [activeTab]);

  const handleAdminDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة بشكل نهائي؟')) return;
    try {
      const res = await fetch(API_URL + `/api/library/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) fetchLibrary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminSave = async (e: any) => {
    e.preventDefault();
    setAdminSaving(true);
    try {
      const method = editFormData.id ? 'PUT' : 'POST';
      const url = editFormData.id ? `/api/library/${editFormData.id}` : `/api/library`;
      
      let finalData = { ...editFormData };
      if (finalData.type === 'video' && finalData.url && finalData.url.includes('youtube.com/watch')) {
          const vId = getYoutubeId(finalData.url);
          if (vId) {
             finalData.url = `https://www.youtube-nocookie.com/embed/${vId}`;
          }
      }

      const res = await fetch(API_URL + url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalData)
      });
      if (res.ok) {
        setIsEditing(false);
        setEditFormData({});
        fetchLibrary();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error occurred: ' + err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
  <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
    <Navbar />
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-28 md:pb-8 space-y-5">

      {/* Header */}
      <div className="natqi-gradient rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-violet-400/25">
        <div className="absolute top-[-40px] left-[-40px] w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">المكتبة التعليمية</h2>
            <p className="text-white/70 text-sm mt-1">بث مرئي ومسموع لمناهج علم مخارج الحروف العربية</p>
          </div>
          <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-white/95 shadow-inner">
            <BookOpen size={24} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="ابحث عن درس أو نص..."
          className="w-full pr-12 pl-4 py-4 bg-white border-2 border-violet-100 rounded-2xl shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 transition-all text-slate-800"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "natqi-gradient text-white shadow-md shadow-violet-300"
                : "bg-white text-slate-500 border-2 border-slate-100 hover:border-violet-200"
            )}
          >
            {tab.label}
          </button>
        ))}
        {user && user.role === 'admin' && (
          <button
            onClick={() => { setEditFormData({}); setIsEditing(true); }}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm shrink-0 hover:bg-slate-700 transition-all"
          >
            + إضافة
          </button>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-3xl" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-violet-50">
          <div className="text-slate-300 flex justify-center mb-4"><Inbox size={48} /></div>
          <p className="text-slate-500 font-bold">لا توجد مواد متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-3xl border border-violet-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group"
            >
              {/* Thumbnail / Type indicator */}
              {item.thumbnail ? (
                <div 
                  className="aspect-video relative overflow-hidden cursor-pointer"
                  onClick={() => {
                    if ((item.file_type || item.type) === 'video') {
                      setSelectedVideo(item.file_url || item.url);
                      setSelectedItem(item);
                    }
                  }}
                >
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                  {(item.file_type || item.type) === 'video' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                        <Play size={24} className="text-white fill-white translate-x-[2px]" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-2 natqi-gradient" />
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm transition-colors group-hover:bg-violet-50 group-hover:border-violet-100">
                    {(item.file_type || item.type) === 'video' ? (
                      <Video size={20} className="text-violet-600" />
                    ) : (item.file_type || item.type) === 'audio' ? (
                      <Music size={20} className="text-sky-600" />
                    ) : (
                      <FileText size={20} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="text-right flex-1">
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-wide">
                      {item.category === 'children' ? 'للأطفال' : item.category === 'students' ? 'للطلبة' : item.category === 'adults' ? 'للبالغين' : item.category === 'non-native' ? 'لغير الناطقين' : (item.category || item.file_type || item.type)}
                    </span>
                    <h4 className="text-slate-800 font-black text-sm leading-snug">{item.title}</h4>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditFormData(item); setIsEditing(true); }} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-all"><Edit3 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleAdminDelete(item.id); }} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2 text-right">{item.description}</p>
                )}

                {(item.file_type || item.type) === 'video' ? (
                  <button
                    onClick={() => { setSelectedVideo(item.file_url || item.url); setSelectedItem(item); }}
                    className="w-full py-2.5 natqi-gradient text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>مشاهدة الفيديو</span>
                  </button>
                ) : (
                  <a
                    href={item.file_url || item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-violet-50 text-violet-700 rounded-xl font-bold text-sm hover:bg-violet-100 transition-all flex items-center justify-center gap-2 border border-violet-100"
                  >
                    <ExternalLink size={14} /> فتح / تحميل
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Modal - keep internal content stable during exit transitions */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal 
            video={selectedVideo} 
            item={selectedItem} 
            onClose={() => { setSelectedVideo(null); setSelectedItem(null); }} 
          />
        )}
      </AnimatePresence>

      {/* Admin Edit Modal - keep all existing form logic, update container styling only */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">{editFormData.id ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200">✕</button>
              </div>
              <form onSubmit={handleAdminSave} className="space-y-4 text-right">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">العنوان:</label>
                  <input
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all"
                    value={editFormData.title || ''}
                    onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">التصنيف والفئة العمرية:</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all bg-white"
                    value={editFormData.category || ''}
                    onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                  >
                    <option value="">-- اختر الفئة --</option>
                    <option value="children">الأطفال</option>
                    <option value="students">الطلبة والمناهج</option>
                    <option value="adults">البالغين</option>
                    <option value="non-native">الناطقين بغيرها</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">نوع المادة:</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all bg-white"
                    value={editFormData.type || ''}
                    onChange={e => setEditFormData({...editFormData, type: e.target.value})}
                  >
                    <option value="">-- اختر النوع --</option>
                    <option value="video">فيديو (يوتيوب)</option>
                    <option value="pdf">كتاب أو ملزمة (PDF) رابـط</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الرابط:</label>
                  <input
                    required dir="ltr"
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all text-left"
                    value={editFormData.url || ''}
                    onChange={e => setEditFormData({...editFormData, url: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الوصف التحليلي:</label>
                  <textarea
                    required rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all"
                    value={editFormData.description || ''}
                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">رابط الصورة المصغرة (Thumbnail URL):</label>
                  <input
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-100 focus:border-violet-400 outline-none transition-all text-left"
                    value={editFormData.thumbnail || ''}
                    onChange={e => setEditFormData({...editFormData, thumbnail: e.target.value})}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
                  <button type="submit" disabled={adminSaving} className="flex-1 py-3 natqi-gradient text-white rounded-xl font-black disabled:opacity-60">
                    {adminSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  </div>
  );
};


// Live Sessions Screen
const Sessions = () => {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(API_URL + '/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleBook = async (sessionId: string) => {
    setBookingLoading(sessionId);
    try {
      const res = await fetch(API_URL + '/api/sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, userId: user?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setShowSuccessModal(true);
        fetchSessions();
      } else {
        alert(data.error || 'حدث خطأ أثناء الحجز');
      }
    } catch (err) {
      alert('تعذّر الاتصال بالخادم');
    } finally {
      setBookingLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-28 md:pb-8 space-y-5">

        {/* Header */}
        <div className="natqi-gradient rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-violet-400/25">
          <div className="absolute top-[-40px] left-[-40px] w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">الجلسات المباشرة</h2>
              <p className="text-white/70 text-sm mt-1">احجز جلسة مع مدرب متخصص لتصحيح نطقك ومخارج الحروف بشكل مباشر</p>
            </div>
            <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-white/95 shadow-inner">
              <Users size={24} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-center gap-3 text-slate-400 font-bold py-12">
               <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"></div>
               جارٍ تحميل الجلسات التدريبية المتاحة...
            </div>
            {[1,2].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-white rounded-3xl border border-violet-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group flex flex-col md:flex-row items-center p-6 gap-6"
              >
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <UserCheck size={36} />
                </div>

                <div className="flex-1 text-center md:text-right space-y-3">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
                      session.remaining > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      <span>{session.remaining > 0 ? 'متاح للجلسة' : 'ممتلئ تماماً'}</span>
                      {session.remaining > 0 ? <CheckCircle2 size={12} className="shrink-0" /> : <Lock size={12} className="shrink-0" />}
                    </span>
                    <span className="px-2.5 py-1 bg-violet-50 text-violet-600 rounded-lg text-xs font-black flex items-center gap-1">
                      {session.category === 'children' && (
                        <span className="flex items-center gap-1 font-black">فئة الأطفال <Baby size={12} className="shrink-0" /></span>
                      )}
                      {session.category === 'students' && (
                        <span className="flex items-center gap-1 font-black">فئة الطلاب <GraduationCap size={12} className="shrink-0" /></span>
                      )}
                      {session.category === 'adults' && (
                        <span className="flex items-center gap-1 font-black">فئة البالغين <User size={12} className="shrink-0" /></span>
                      )}
                      {session.category === 'non-native' && (
                        <span className="flex items-center gap-1 font-black">الناطقين لغير العربية <Globe size={12} className="shrink-0" /></span>
                      )}
                      {!['children', 'students', 'adults', 'non-native'].includes(session.category) && <span>{session.category}</span>}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 leading-snug">{session.title}</h3>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 text-slate-500 font-bold text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                      <User size={14} className="text-violet-500" />
                      <span>المدرب: {session.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                      <Calendar size={14} className="text-violet-500" />
                      <span>{formatDate(session.datetime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                      <Users size={14} className="text-violet-500" />
                      <span>متبقي {session.remaining} مقاعد</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0">
                  <button 
                    onClick={() => handleBook(session.id)}
                    disabled={session.remaining <= 0 || bookingLoading === session.id}
                    className={cn(
                      "w-full md:w-40 py-3 rounded-2xl font-black text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100",
                      session.remaining > 0 ? "natqi-gradient text-white shadow-violet-200 hover:brightness-110" : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    )}
                  >
                    {bookingLoading === session.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : session.remaining > 0 ? 'حجز مقعد الآن' : 'مكتمل'}
                  </button>
                </div>
              </motion.div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-violet-50">
                <div className="text-slate-350 flex justify-center mb-4"><Calendar size={48} /></div>
                <p className="text-slate-500 font-bold">لا توجد جلسات مباشرة مجدولة حالياً</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 font-sans">تم الحجز بنجاح!</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                سيصلك رابط الانضمام للجلسة عبر البريد الإلكتروني قبل الموعد بـ 15 دقيقة.
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 natqi-gradient text-white rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-violet-200"
              >
                رائع، شكراً
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Screen
const SettingsPage = () => {
  const { user, token, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Preferences state
  const [settingsData, setSettingsData] = useState({
    category: user?.category || 'adults',
    level: user?.level || 'beginner',
    goal: user?.goal || 'pronunciation',
    language_pref: user?.language_pref || 'arabic_native',
    mic_sensitivity: (user as any)?.mic_sensitivity || 70
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Mic test logic
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [recordingLevel, setRecordingLevel] = useState(0);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setErrorMsg('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(API_URL + '/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (res.ok) {
        updateProfile(data);
        setSuccessMsg('تم تحديث الملف الشخصي بنجاح');
        setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء التحديث');
      }
    } catch (err) {
      setErrorMsg('تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(API_URL + '/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsData)
      });
      const data = await res.json();
      if (res.ok) {
        updateProfile(data);
        setSuccessMsg('تم حفظ الإعدادات بنجاح');
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء حفظ الإعدادات');
      }
    } catch (err) {
      setErrorMsg('تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const runMicTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setRecordingLevel(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let maxVolume = 0;
      const startTime = Date.now();
      
      const checkVolume = () => {
        if (Date.now() - startTime > 5000) {
          stream.getTracks().forEach(t => t.stop());
          audioContext.close();
          setIsTesting(false);
          setTestResult(maxVolume > 20 ? 'success' : 'fail');
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setRecordingLevel(Math.min(100, average * 2));
        if (average > maxVolume) maxVolume = average;
        
        requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (err) {
      setIsTesting(false);
      setTestResult('fail');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-28 md:pb-8 space-y-5">

        {/* Header */}
        <div className="natqi-gradient rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-violet-400/25">
          <div className="absolute top-[-40px] left-[-40px] w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">إعدادات المنصة</h2>
              <p className="text-white/70 text-sm mt-1">تخصيص ملفك الشخصي وإعدادات الصوت وهدف التعلم</p>
            </div>
            <button 
              onClick={() => logout()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 hover:text-white text-white/90 border border-white/25 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-violet-100 shadow-sm max-w-md">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'profile' ? "natqi-gradient text-white shadow-md shadow-violet-200" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            الملف الشخصي
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'preferences' ? "natqi-gradient text-white shadow-md shadow-violet-200" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            تفضيلات التطبيق
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white p-6 md:p-8 rounded-3xl border border-violet-100 shadow-sm space-y-6 text-right"
            >
              <form onSubmit={handleProfileSave} className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-violet-500 font-black text-sm border-b border-slate-100 pb-2">
                    <User size={18} /> المعلومات الأساسية
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all bg-white"
                        value={profileData.name}
                        onChange={e => setProfileData({...profileData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all bg-white"
                        value={profileData.email}
                        onChange={e => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-violet-500 font-black text-sm border-b border-slate-100 pb-2">
                    <Lock size={18} /> تغيير كلمة المرور
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور الحالية</label>
                      <input 
                        type="password" 
                        placeholder="اتركها فارغة إذا لم ترد التغيير"
                        className="w-full px-4 py-3 rounded-xl border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all bg-white text-right placeholder:text-slate-400 placeholder:text-xs"
                        value={profileData.currentPassword}
                        onChange={e => setProfileData({...profileData, currentPassword: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                        <input 
                          type="password" 
                          className="w-full px-4 py-3 rounded-xl border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all bg-white text-right"
                          value={profileData.newPassword}
                          onChange={e => setProfileData({...profileData, newPassword: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                        <input 
                          type="password" 
                          className="w-full px-4 py-3 rounded-xl border border-violet-100 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all bg-white text-right"
                          value={profileData.confirmPassword}
                          onChange={e => setProfileData({...profileData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-10 py-3 natqi-gradient text-white rounded-xl font-black transition-all hover:brightness-110 disabled:opacity-50 active:scale-95 shadow-md shadow-violet-200"
                >
                  {loading ? 'جارٍ الحفظ...' : 'حفظ كافه التعديلات'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="preferences"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white p-6 md:p-8 rounded-3xl border border-violet-200 shadow-sm space-y-6 text-right"
            >
              {/* Language Pref */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-800 pr-1">تفضيل اللغة</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setSettingsData({...settingsData, language_pref: 'arabic_native'})}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-right flex items-center justify-between gap-4",
                      settingsData.language_pref === 'arabic_native' ? "border-violet-400 bg-violet-50/50" : "border-slate-100 hover:border-violet-200"
                    )}
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">عربي (ناطق أصلي)</p>
                      <p className="text-xs text-slate-400">للذين لغتهم الأم هي العربية ويريدون تحسين نطقهم</p>
                    </div>
                    <Globe className={cn("shrink-0", settingsData.language_pref === 'arabic_native' ? "text-violet-500" : "text-slate-200")} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSettingsData({...settingsData, language_pref: 'arabic_non_native'})}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-right flex items-center justify-between gap-4",
                      settingsData.language_pref === 'arabic_non_native' ? "border-violet-400 bg-violet-50/50" : "border-slate-100 hover:border-violet-200"
                    )}
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">عربي لغير الناطقين</p>
                      <p className="text-xs text-slate-400">لمتعلمي العربية كلغة ثانية من جميع أنحاء العالم</p>
                    </div>
                    <Globe className={cn("shrink-0", settingsData.language_pref === 'arabic_non_native' ? "text-violet-500" : "text-slate-200")} />
                  </button>
                </div>
              </div>

              {/* Level Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-800 pr-1">مستوى النطق</label>
                <div className="flex gap-2">
                  {['beginner', 'intermediate', 'advanced'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSettingsData({...settingsData, level: lvl})}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
                        settingsData.level === lvl ? "natqi-gradient text-white shadow-md shadow-violet-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {lvl === 'beginner' ? 'مبتدئ' : lvl === 'intermediate' ? 'متوسط' : 'متقدم'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-800 pr-1">هدفي الأساسي</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {[
                    { id: 'pronunciation', label: 'تصحيح ومتابعة النطق' },
                    { id: 'letters', label: 'تعلم مخارج الحروف والصفات' },
                    { id: 'fluency', label: 'تحسين الطلاقة والتلاوة' }
                  ].map(goal => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSettingsData({...settingsData, goal: goal.id})}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
                        settingsData.goal === goal.id ? "bg-slate-800 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector (Syncs theme) */}
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-800 pr-1">الفئة المستهدفة</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   {[
                     { id: 'children', label: 'الأطفال', color: 'bg-emerald-50 text-emerald-600' },
                     { id: 'students', label: 'الطلبة', color: 'bg-indigo-50 text-indigo-600' },
                     { id: 'adults', label: 'البالغين', color: 'bg-amber-50 text-amber-600' },
                     { id: 'non-native', label: 'غير ناطقين بي العربية', color: 'bg-rose-50 text-rose-600' }
                   ].map(cat => (
                     <button
                       key={cat.id}
                       type="button"
                       onClick={() => setSettingsData({...settingsData, category: cat.id as any})}
                       className={cn(
                         "py-3 rounded-[1.25rem] font-bold transition-all text-sm border-2",
                         settingsData.category === cat.id ? "border-violet-400 bg-violet-50/50" : "border-transparent bg-slate-50 hover:bg-slate-100"
                       )}
                     >
                       <span className={cn("px-2 py-0.5 rounded-md text-[10px] block mb-1 font-black", cat.color)}>{cat.id === 'children' ? 'أطفال' : cat.id === 'students' ? 'طلبة' : cat.id === 'adults' ? 'بالغين' : 'أجانب'}</span>
                       {cat.label}
                     </button>
                   ))}
                </div>
              </div>

              {/* Mic Settings */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 pr-1">حساسية الميكروفون المعتمدة</label>
                  <span className="text-violet-600 font-black text-lg">{settingsData.mic_sensitivity}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  value={settingsData.mic_sensitivity}
                  onChange={e => setSettingsData({...settingsData, mic_sensitivity: parseInt(e.target.value)})}
                />
                 
                 <div className="flex flex-col md:flex-row items-center gap-4">
                    <button 
                      type="button"
                      onClick={runMicTest}
                      disabled={isTesting}
                      className="w-full md:w-auto px-6 py-3 bg-violet-50 text-violet-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-violet-100 transition-all disabled:opacity-50"
                    >
                      <Mic size={18} /> {isTesting ? 'جاري الفحص السمعي...' : 'اختبار التقاط الميكروفون'}
                    </button>
                    
                    {isTesting && (
                      <div className="flex-1 w-full bg-slate-100 h-8 rounded-lg overflow-hidden relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${recordingLevel}%` }}
                          className="h-full bg-violet-500 shadow-lg shadow-violet-500/50"
                        />
                      </div>
                    )}

                    {testResult && (
                      <div className={cn(
                        "flex items-center gap-2 font-bold text-sm",
                        testResult === 'success' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {testResult === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        {testResult === 'success' ? 'تم فحص الميكروفون بنجاح وثبات التقاط الصوت' : 'لم يتم اكتشاف صوت، من فضلك تحقق من سماح المتصفح'}
                      </div>
                    )}
                 </div>
              </div>

              <div className="pt-4">
                <button 
                  type="button"
                  onClick={handleSettingsSave}
                  disabled={loading}
                  className="w-full md:w-auto px-10 py-3 natqi-gradient text-white rounded-xl font-black transition-all hover:brightness-110 disabled:opacity-50 active:scale-95 shadow-md shadow-violet-200"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ كافه التفضيلات التفضيلية'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Notifications */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-2xl flex items-center gap-3"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition-colors"><X size={14}/></button>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-2xl flex items-center gap-3"
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition-colors"><X size={14}/></button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const Placeholder = ({ name }: { name: string }) => (
  <div className="p-8 flex items-center justify-center h-screen">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <h1 className="text-4xl font-bold text-slate-800">{name}</h1>
      <p className="text-slate-500 text-lg">قريباً إن شاء الله</p>
    </motion.div>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}
