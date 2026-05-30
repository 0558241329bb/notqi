import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
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
  
  if (loading) return <div>جاري التحميل...</div>;
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
            <span className="text-5xl border-red-500 block mb-4">⚠️</span>
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
        >
          <h1 className="text-7xl font-black text-blue-600 mb-6 tracking-tighter">نطقي</h1>
          <p className="text-xl text-slate-600 mb-8 font-medium">طوّر نطقك مع الذكاء الاصطناعي</p>
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
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-slate-800 mb-6">تسجيل الدخول</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "تسجيل الدخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600">
          ليس لديك حساب؟ <a href="/register" className="text-blue-600 font-bold hover:underline">إنشاء حساب</a>
        </p>
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
    { id: 'children', label: 'أطفال', icon: '👶' },
    { id: 'students', label: 'طلبة', icon: '🎓' },
    { id: 'adults', label: 'بالغين', icon: '🧑' },
    { id: 'non-native', label: 'غير ناطقين', icon: '🌍' },
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
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 w-full max-w-lg"
      >
        <h2 className="text-3xl font-bold text-slate-800 mb-6">إنشاء حساب جديد</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تأكيد كلمة المرور</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">اختر الفئة</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({...formData, category: cat.id as any})}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                    formData.category === cat.id 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600">
          لديك حساب بالفعل؟ <a href="/login" className="text-blue-600 font-bold hover:underline">تسجيل الدخول</a>
        </p>
      </motion.div>
    </div>
  );
};

import { Bell, Settings, Mic, Book, Video, BarChart3, ChevronLeft, StopCircle, RefreshCw, Volume2, Globe, Lightbulb, Play, Pause, RotateCcw, Search, FileText, Video as VideoIcon, ExternalLink, Calendar, User, Users, X, Lock, LogOut, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

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
      <aside className="hidden md:flex flex-col w-64 h-screen fixed right-0 top-0 bg-white border-l border-slate-100 py-8 px-4 z-50 shadow-xl overflow-y-auto">
        <h1 
          className="text-3xl font-black text-primary mb-12 text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/home')}
        >
          نطقي
        </h1>
        <div className="flex flex-col gap-2 flex-1">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button 
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all text-lg",
                  isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
                )}
                aria-label={item.label}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 z-50 px-2 py-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button 
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-xl transition-all",
                  isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                )}
                aria-label={item.label}
              >
                {item.icon}
                <span className="text-[10px] font-bold mt-1">{item.label}</span>
              </button>
            )
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
      title: 'المكتبة', 
      desc: 'مجموعة واسعة من النصوص والقصص التدريبية', 
      icon: <Book className="text-emerald-500" size={32} />, 
      path: '/library',
      color: 'bg-emerald-50'
    },
    { 
      id: 'sessions', 
      title: 'حصص مباشرة', 
      desc: 'تواصل مع معلمين متخصصين لتصحيح نطقك', 
      icon: <Video className="text-purple-500" size={32} />, 
      path: '/sessions',
      color: 'bg-purple-50'
    },
    { 
      id: 'progress', 
      title: 'تقدمي', 
      desc: 'تابع إحصائياتك وشاهد تطور مستواك', 
      icon: <BarChart3 className="text-orange-500" size={32} />, 
      path: '/progress',
      color: 'bg-orange-50'
    },
  ];

  const isChildren = user?.category === 'children';
  const isNonNative = user?.category === 'non-native';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        {/* Header Section */}
        <section className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "font-black text-slate-800",
              isChildren ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
            )}
          >
            {getGreeting()}
            {isChildren && <motion.span 
              animate={{ rotate: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mr-2"
            >👋</motion.span>}
          </motion.h2>
          {isNonNative && (
            <p className="text-slate-400 italic text-sm">{getEnglishGreeting()}, {user?.name.split(' ')[0]}</p>
          )}
        </section>

        {/* Suggestion Section */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4 text-center md:text-right">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold">اقتراح اليوم</span>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">
                {loadingSuggestion ? "جارٍ التحميل..." : suggestion?.title || "ابدأ رحلتك اليوم"}
              </h3>
              <div className="text-slate-600 max-w-md mx-auto md:mx-0">
                {loadingSuggestion ? <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4 mx-auto md:mx-0"></div> : suggestion?.description || "تدرب على نطق الكلمات الشائعة لتحسين مهاراتك بشكل أسرع."}
              </div>
              <button 
                onClick={() => navigate(`/training${suggestion ? `?id=${suggestion.id}` : ''}`)}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 inline-flex items-center gap-2"
              >
                ابدأ الآن <ChevronLeft size={20} />
              </button>
            </div>
            
            <div className="w-48 h-48 md:w-64 md:h-64 bg-slate-50 rounded-2xl flex items-center justify-center relative overflow-hidden">
               {isChildren ? (
                 <motion.div
                   animate={{ y: [0, -10, 0] }}
                   transition={{ repeat: Infinity, duration: 3 }}
                   className="text-8xl"
                 >
                   🚀
                 </motion.div>
               ) : (
                 <Mic size={80} className="text-primary opacity-20" />
               )}
               {/* Abstract deco */}
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(feature.path)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", feature.color, isChildren && "animate-bounce")}>
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Main CTA */}
        <section className="py-8">
          <motion.button
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            onClick={() => navigate('/training')}
            className="w-full py-6 md:py-8 bg-primary rounded-[2.5rem] text-white text-2xl md:text-3xl font-black shadow-2xl shadow-primary/40 flex items-center justify-center gap-4 hover:brightness-110 transition-all focus:ring-4 focus:ring-primary/20 focus:outline-none"
            aria-label="ابدأ التمرين الآن"
          >
            <span>🎙️</span>
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
        <span className="text-6xl">🚀</span>
        <h2 className="text-2xl font-black text-slate-800">لم تبدأ تدريباتك بعد</h2>
        <p className="text-slate-500">أكمل تمريناتك الأولى لترى إحصائياتك هنا</p>
        <button 
          onClick={() => navigate('/training')} 
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold"
        >
          ابدأ التمرين الآن 🎙️
        </button>
      </div>
    </div>
  );

  const { stats, attempts, chartData } = data;

  const getMotivation = () => {
    if (chartData?.length < 2) return "ابدأ التدريب لتتبع تقدمك! 🚀";
    // Filter out zero scores for trend analysis if needed, but here we just take last non-zero days or just last 2 from chart
    const last2 = chartData?.filter((d: any) => d.score > 0).slice(-2);
    if (last2?.length < 2) return "حافظ على استمرارية التدريب للوصول للقمة! 🎯";
    if (last2[1].score > last2[0].score) return "أداؤك في تحسن مستمر! 🎉";
    if (last2[1].score === last2[0].score) return "حافظ على هذا المستوى! 💪";
    return "لا تستسلم، التدريب يصنع الفارق! 🌟";
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
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl">
                🔥
              </div>
              <div>
                <p className="text-slate-400 text-sm font-bold">سلسلة التدريب</p>
                <p className="text-3xl font-black text-slate-800 tracking-tight">
                  {insights.streakDays} <span className="text-lg font-medium text-slate-500">يوم</span>
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
                {insights.trend === 'improving' ? '📈' : insights.trend === 'declining' ? '📉' : '➡️'}
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
                <p className="text-sm font-bold text-blue-800 mb-2">💬 رسائلك</p>
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
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
                <div>
                   <p className="text-slate-400 text-sm font-bold">أفضل نتيجة</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.bestScore}%</p>
                </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">📊</div>
                <div>
                   <p className="text-slate-400 text-sm font-bold">متوسط النتائج</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{stats?.averageScore}%</p>
                </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl">✅</div>
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
                icon: '🎯' 
              },
              { 
                title: 'احصل على 80% في تمرين', 
                current: stats?.bestScore >= 80 ? 1 : 0, 
                target: 1, 
                icon: '⭐' 
              },
              { 
                title: '3 أيام متواصلة', 
                current: Math.min(insights?.streakDays || 0, 3), 
                target: 3, 
                icon: '🔥' 
              }
            ].map((challenge, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-2xl">{challenge.icon}</span>
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

          const monitorVolume = () => {
            if (!isRecording) return;
            const data = new Uint8Array(volumeAnalyser.frequencyBinCount);
            volumeAnalyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            setVolumeLevel(Math.min(100, avg * 1.5));
            requestAnimationFrame(monitorVolume);
          };
          monitorVolume();

          startCanvasAnimation();
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
        // Don't auto-analyze - let user preview first
        setStep('display');
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms for smoother recording
      setIsRecording(true);
      setStep('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert('يرجى تفعيل الميكروفون للمتابعة');
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {sessionProgress.attempts > 0 && (
        <div className="flex items-center justify-center gap-4 p-3 bg-blue-50 text-sm max-w-4xl mx-auto w-full rounded-b-2xl mb-4">
          <span className="text-blue-700 font-bold">
            جلستك: {sessionProgress.attempts} محاولة
          </span>
          <span className="text-blue-600">
            متوسط: {Math.round(sessionProgress.totalScore / sessionProgress.attempts)}%
          </span>
          <span className="text-blue-600">
            أفضل: {sessionProgress.bestScore}%
          </span>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        <AnimatePresence mode="wait">
          {/* STEP 1 & 2: Display & Recording */}
          {(step === 'display' || step === 'recording') && (
            <motion.div 
              key="exercise"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8 text-center"
            >
              <div className="flex justify-center gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{exercise.category}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{exercise.level}</span>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-slate-800 leading-tight">
                  {exercise.text}
                </h2>
                {user?.category === 'non-native' && (
                  <p className="text-xl text-slate-400 font-medium">{exercise.text_translation}</p>
                )}
              </div>

              {/* Tips Section */}
              <div className="max-w-md mx-auto">
                <button 
                  onClick={() => setShowTips(!showTips)}
                  className="flex items-center gap-2 mx-auto text-primary font-bold hover:bg-primary/5 px-4 py-2 rounded-lg transition-all"
                >
                  <Lightbulb size={18} />
                  نصائح النطق
                </button>
                <AnimatePresence>
                  {showTips && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm leading-relaxed border border-yellow-100">
                        {exercise.tips}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recording UI */}
              <div className="pt-12 space-y-6">
                {step === 'recording' && (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-md mx-auto">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-24 rounded-2xl bg-slate-50 border border-slate-100"
                      />
                      {/* Volume indicator */}
                      <div className="absolute bottom-2 right-3 flex items-center gap-2">
                        <div className="flex gap-0.5 h-4 items-end">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-primary rounded-full transition-all duration-75"
                              style={{
                                height: `${Math.min(100, Math.max(15, volumeLevel * (i + 1) / 4))}%`,
                                opacity: volumeLevel > (i * 12) ? 1 : 0.3
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-2xl font-mono text-primary font-bold">{formatTime(recordingTime)}</p>
                    {volumeLevel < 10 && recordingTime > 2 && (
                      <p className="text-xs text-amber-500 font-medium">🔇 الصوت ضعيف جداً، حاول التحدث بصوت أعلى</p>
                    )}
                    {volumeLevel > 85 && (
                      <p className="text-xs text-red-500 font-medium">🔊 الصوت مرتفع جداً، قد يحدث تشويه</p>
                    )}
                  </div>
                )}

                {/* Preview after recording */}
                {audioUrl && !isRecording && step !== 'analyzing' && step !== 'results' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-100 p-4 max-w-md mx-auto space-y-3"
                  >
                    <p className="text-sm font-bold text-slate-600">🎧 معاينة التسجيل</p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={playPreview}
                        className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        {isPlayingPreview ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={submitRecording}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                      >
                        إرسال للتحليل
                      </button>
                      <button
                        onClick={discardRecording}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                      >
                        إعادة التسجيل
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-center gap-8">
                  {step === 'recording' ? (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={stopRecording}
                      className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/30"
                    >
                      <StopCircle size={40} />
                    </motion.button>
                  ) : (
                    !audioUrl && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        onClick={startRecording}
                        className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30"
                      >
                        <Mic size={40} />
                      </motion.button>
                    )
                  )}
                </div>
                {!audioUrl && (
                  <p className="text-slate-400 font-medium">
                    {step === 'recording' ? "اضغط للإيقاف عند الانتهاء" : "اضغط على الميكروفون للبدء"}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Analyzing */}
          {step === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[60vh] flex flex-col items-center justify-center space-y-6"
            >
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">جارٍ تحليل صوتك...</h2>
            </motion.div>
          )}

          {/* STEP 4: Results */}
          {step === 'results' && analysisResult && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row items-center gap-12 justify-center">
                {/* Star Rating */}
                {(() => {
                  const rating = getStarRating(analysisResult.score);
                  return (
                    <div className="text-center space-y-3">
                      <div className={cn("text-6xl font-black", rating.color)}>
                        {analysisResult.score}%
                      </div>
                      <div className="flex justify-center gap-1" dir="ltr">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={cn("text-4xl", s <= rating.stars ? rating.color : 'text-slate-200')}>
                            ★
                          </span>
                        ))}
                      </div>
                      <p className={cn("font-bold text-xl", rating.color)}>{rating.label}</p>
                    </div>
                  );
                })()}

                <div className="max-w-md space-y-4 text-center md:text-right">
                  <h3 className="text-3xl font-bold text-slate-800">تحليل الأداء</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">{analysisResult.feedback}</p>
                </div>
              </div>

              {/* Mistake Tips */}
              {analysisResult?.mistakes?.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-5 space-y-3">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2">
                    <span>⚠️</span> كلمات تحتاج انتباهك
                  </h4>
                  {analysisResult.mistakes.map((mistake: any, i: number) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-amber-100 flex flex-col text-right">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-black text-amber-700 font-arabic">{mistake.word}</span>
                        {mistake.severity === 'major' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">صعب</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{mistake.tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Text with Mistake Highlighting */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 text-4xl md:text-5xl font-bold">
                  {exercise.text.split(' ').map((word: string, idx: number) => {
                    const isMistake = analysisResult.mistakes.some((m: any) => m.word === word);
                    return (
                      <span 
                        key={idx} 
                        className={cn(
                          "relative group transition-colors",
                          isMistake ? "text-red-500 underline decoration-wavy decoration-red-300 underline-offset-8" : "text-slate-800"
                        )}
                      >
                        {word}
                        {isMistake && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block z-20">
                            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                              النطق الصحيح: {word}
                            </div>
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => playAudio(exercise.audio_correct_url, exercise.text)}
                  className="w-full py-4 bg-slate-50 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  <Volume2 /> استمع للنطق الصحيح
                </button>

                {user?.category === 'non-native' && (
                  <button
                    onClick={() => playAudio(exercise.audio_correct_url, exercise.text, 0.75)}
                    className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100 italic"
                  >
                    🐢 نطق بطيء
                  </button>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setStep('display');
                      setAnalysisResult(null);
                    }}
                    className="py-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-2 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <RotateCcw size={20} /> إعادة
                  </button>
                  <button 
                    onClick={loadNewExercise}
                    className="py-4 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xl"
                  >
                    التالي <ChevronLeft />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// Library Screen
const Library = () => {
  const { user, token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const tabs = [
    { id: 'all', label: 'الكل' },
    { id: 'children', label: 'الأطفال' },
    { id: 'students', label: 'الطلبة' },
    { id: 'adults', label: 'البالغين' },
  ];

  useEffect(() => {
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
    fetchLibrary();
  }, [activeTab]);

  const filteredItems = items.filter(item => 
    item.title.includes(searchQuery) || item.description.includes(searchQuery)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        <header className="space-y-6">
          <h2 className="text-3xl font-black text-slate-800">المكتبة التعليمية</h2>
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto w-full md:w-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                    activeTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="ابحث عن نص أو فيديو..."
                className="w-full pr-12 pl-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-6 flex flex-col pt-8">
            <div className="flex items-center justify-center gap-3 text-slate-400 font-bold mb-6">
               <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
               جارٍ التحميل...
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-3xl" />)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col"
                >
                  <div className="h-40 bg-slate-100 relative group overflow-hidden">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.type === 'video' ? <Play className="text-white fill-white" size={48} /> : <FileText className="text-white" size={48} />}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black text-slate-800 uppercase">
                        {item.type === 'video' ? 'فيديو' : 'PDF'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[10px] font-black tracking-widest text-primary uppercase mb-2 block">{item.category}</span>
                    <h4 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">{item.description}</p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-50">
                      {item.type === 'video' ? (
                        <button 
                          onClick={() => setSelectedVideo(item.url)}
                          className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Play size={16} fill="white" /> مشاهدة
                        </button>
                      ) : (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-slate-100 transition-all"
                        >
                          <ExternalLink size={16} /> تحميل
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-bold text-xl">لا توجد نتائج تطابق بحثك</p>
          </div>
        )}
      </main>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-8 right-8 text-white hover:rotate-90 transition-transform"
            >
              <X size={40} />
            </button>
            <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
              <iframe 
                src={selectedVideo} 
                className="w-full h-full" 
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
        <header className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800">الجلسات المباشرة</h2>
          <p className="text-slate-500 font-medium">احجز جلسة مع مدرب متخصص لتحسين نطقك بشكل مباشر</p>
        </header>

        {loading ? (
          <div className="space-y-6 flex flex-col pt-8">
            <div className="flex items-center justify-center gap-3 text-slate-400 font-bold mb-6">
               <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
               جارٍ التحميل...
            </div>
            {[1,2].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 group hover:shadow-xl transition-all"
              >
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner shrink-0">
                  👨‍🏫
                </div>

                <div className="flex-1 text-center md:text-right space-y-4">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                     <span className={cn(
                       "px-3 py-1 rounded-full text-xs font-black",
                       session.remaining > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                     )}>
                       {session.remaining > 0 ? 'متاح' : 'ممتلئ'}
                     </span>
                     <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold font-mono uppercase tracking-tighter">
                       {session.category}
                     </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-800">{session.title}</h3>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-6 text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-primary" />
                      <span>{session.instructor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-primary" />
                      <span className="text-sm">{formatDate(session.datetime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-primary" />
                      <span className="text-sm">متبقي {session.remaining} مقاعد</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  <button 
                    onClick={() => handleBook(session.id)}
                    disabled={session.remaining <= 0 || bookingLoading === session.id}
                    className={cn(
                      "w-full md:w-40 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
                      session.remaining > 0 ? "bg-primary text-white shadow-primary/30 hover:scale-105" : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    )}
                  >
                    {bookingLoading === session.id ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : session.remaining > 0 ? 'حجز مقعد' : 'ممتلئ'}
                  </button>
                </div>
              </motion.div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm text-slate-400 font-bold">
                لا توجد جلسات مجدولة حالياً، يرجى المحاولة لاحقاً
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
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-2xl font-black text-slate-800">تم الحجز بنجاح!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                سيصلك رابط الانضمام للجلسة عبر البريد الإلكتروني قبل الموعد بـ 15 دقيقة.
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
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
        setSuccessMsg('✅ تم تحديث الملف الشخصي بنجاح');
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
        setSuccessMsg('✅ تم حفظ الإعدادات بنجاح');
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
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">الإعدادات</h2>
            <p className="text-slate-500 font-medium">إدارة حسابك وتفضيلات التطبيق</p>
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all w-fit"
          >
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </header>

        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm max-w-md">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-3 rounded-2xl font-bold transition-all",
              activeTab === 'profile' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            الملف الشخصي
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={cn(
              "flex-1 py-3 rounded-2xl font-bold transition-all",
              activeTab === 'preferences' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50"
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8"
            >
              <form onSubmit={handleProfileSave} className="space-y-8">
                <section className="space-y-6">
                   <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest border-b border-slate-50 pb-2">
                     <User size={14} /> المعلومات الأساسية
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block pr-2">الاسم الكامل</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                          value={profileData.name}
                          onChange={e => setProfileData({...profileData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block pr-2">البريد الإلكتروني</label>
                        <input 
                          type="email" 
                          className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                          value={profileData.email}
                          onChange={e => setProfileData({...profileData, email: e.target.value})}
                        />
                      </div>
                   </div>
                </section>

                <section className="space-y-6">
                   <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest border-b border-slate-50 pb-2">
                     <Lock size={14} /> تغيير كلمة المرور
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block pr-2">كلمة المرور الحالية</label>
                        <input 
                          type="password" 
                          placeholder="اتركها فارغة إذا لم ترد التغيير"
                          className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                          value={profileData.currentPassword}
                          onChange={e => setProfileData({...profileData, currentPassword: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 block pr-2">كلمة المرور الجديدة</label>
                          <input 
                            type="password" 
                            className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            value={profileData.newPassword}
                            onChange={e => setProfileData({...profileData, newPassword: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 block pr-2">تأكيد كلمة المرور الجديدة</label>
                          <input 
                            type="password" 
                            className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
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
                  className="w-full md:w-auto px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 shadow-b hover:bg-black transition-all disabled:opacity-50 active:scale-95"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10"
            >
              {/* Language Pref */}
              <div className="space-y-4">
                <label className="text-lg font-black text-slate-800 pr-2">تفضيل اللغة</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                    onClick={() => setSettingsData({...settingsData, language_pref: 'arabic_native'})}
                    className={cn(
                      "p-6 rounded-3xl border-2 transition-all text-right flex items-center justify-between gap-4",
                      settingsData.language_pref === 'arabic_native' ? "border-primary bg-primary/5" : "border-slate-50 hover:border-slate-200"
                    )}
                   >
                     <div className="space-y-1">
                        <p className="font-bold text-slate-800">عربي (ناطق أصلي)</p>
                        <p className="text-xs text-slate-400">للذين لغتهم الأم هي العربية ويريدون تحسين نطقهم</p>
                     </div>
                     <Globe className={cn(settingsData.language_pref === 'arabic_native' ? "text-primary" : "text-slate-200")} />
                   </button>
                   <button 
                    onClick={() => setSettingsData({...settingsData, language_pref: 'arabic_non_native'})}
                    className={cn(
                       "p-6 rounded-3xl border-2 transition-all text-right flex items-center justify-between gap-4",
                       settingsData.language_pref === 'arabic_non_native' ? "border-primary bg-primary/5" : "border-slate-50 hover:border-slate-200"
                    )}
                   >
                     <div className="space-y-1">
                        <p className="font-bold text-slate-800">عربي لغير الناطقين</p>
                        <p className="text-xs text-slate-400">لمتعلمي العربية كلغة ثانية من جميع أنحاء العالم</p>
                     </div>
                     <Globe className={cn(settingsData.language_pref === 'arabic_non_native' ? "text-primary" : "text-slate-200")} />
                   </button>
                </div>
              </div>

              {/* Level Selector */}
              <div className="space-y-4">
                <label className="text-lg font-black text-slate-800 pr-2">مستوى النطق</label>
                <div className="flex gap-2">
                   {['beginner', 'intermediate', 'advanced'].map(lvl => (
                     <button
                       key={lvl}
                       onClick={() => setSettingsData({...settingsData, level: lvl})}
                       className={cn(
                         "flex-1 py-4 rounded-2xl font-bold transition-all text-sm",
                         settingsData.level === lvl ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                       )}
                     >
                       {lvl === 'beginner' ? 'مبتدئ' : lvl === 'intermediate' ? 'متوسط' : 'متقدم'}
                     </button>
                   ))}
                </div>
              </div>

              {/* Goal Selector */}
              <div className="space-y-4">
                <label className="text-lg font-black text-slate-800 pr-2">هدفي الأساسي</label>
                <div className="flex flex-col sm:flex-row gap-2">
                   {[
                     { id: 'pronunciation', label: 'تصحيح النطق' },
                     { id: 'letters', label: 'تعلم الحروف' },
                     { id: 'fluency', label: 'تحسين الطلاقة' }
                   ].map(goal => (
                     <button
                       key={goal.id}
                       onClick={() => setSettingsData({...settingsData, goal: goal.id})}
                       className={cn(
                         "flex-1 py-4 rounded-2xl font-bold transition-all text-sm",
                         settingsData.goal === goal.id ? "bg-slate-900 text-white shadow-xl" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                       )}
                     >
                       {goal.label}
                     </button>
                   ))}
                </div>
              </div>

              {/* Category Selector (Syncs theme) */}
              <div className="space-y-4">
                <label className="text-lg font-black text-slate-800 pr-2">الفئة المستهدفة</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   {[
                     { id: 'children', label: 'أطفال', color: 'bg-emerald-50 text-emerald-600' },
                     { id: 'students', label: 'طلبة', color: 'bg-indigo-50 text-indigo-600' },
                     { id: 'adults', label: 'بالغين', color: 'bg-amber-50 text-amber-600' },
                     { id: 'non-native', label: 'أجانب', color: 'bg-rose-50 text-rose-600' }
                   ].map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => setSettingsData({...settingsData, category: cat.id as any})}
                       className={cn(
                         "py-4 rounded-2xl font-bold transition-all text-sm border-2",
                         settingsData.category === cat.id ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:bg-slate-100"
                       )}
                     >
                       <span className={cn("px-2 py-1 rounded-lg text-[10px] block mb-1 uppercase font-black", cat.color)}>{cat.id}</span>
                       {cat.label}
                     </button>
                   ))}
                </div>
              </div>

              {/* Mic Settings */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                 <div className="flex items-center justify-between">
                    <label className="text-lg font-black text-slate-800 pr-2">حساسية الميكروفون</label>
                    <span className="text-primary font-black text-xl">{settingsData.mic_sensitivity}%</span>
                 </div>
                 <input 
                    type="range" min="0" max="100" 
                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    value={settingsData.mic_sensitivity}
                    onChange={e => setSettingsData({...settingsData, mic_sensitivity: parseInt(e.target.value)})}
                 />
                 
                 <div className="flex flex-col md:flex-row items-center gap-4">
                    <button 
                      onClick={runMicTest}
                      disabled={isTesting}
                      className="w-full md:w-auto px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      <Mic size={20} /> {isTesting ? 'جاري الاختبار...' : '🎤 اختبار الميكروفون'}
                    </button>
                    
                    {isTesting && (
                      <div className="flex-1 w-full bg-slate-100 h-10 rounded-xl overflow-hidden relative">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${recordingLevel}%` }}
                          className="h-full bg-blue-500 shadow-lg shadow-blue-500/50"
                         />
                      </div>
                    )}

                    {testResult && (
                      <div className={cn(
                        "flex items-center gap-2 font-bold",
                        testResult === 'success' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {testResult === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        {testResult === 'success' ? 'تم التقاط الصوت بنجاح' : 'لم يتم اكتشاف صوت، تحقق من الإعدادات'}
                      </div>
                    )}
                 </div>
              </div>

              <button 
                onClick={handleSettingsSave}
                disabled={loading}
                className="w-full md:w-fit px-16 py-5 bg-primary text-white rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
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
              {successMsg}
              <button onClick={() => setSuccessMsg('')} className="bg-white/20 p-1 rounded-full"><X size={14}/></button>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-2xl flex items-center gap-3"
            >
              {errorMsg}
              <button onClick={() => setErrorMsg('')} className="bg-white/20 p-1 rounded-full"><X size={14}/></button>
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
