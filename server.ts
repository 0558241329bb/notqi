import 'dotenv/config';
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

// TODO: Upgrade to Firebase Admin SDK for production security
// Current: Client SDK with open rules (DEV ONLY)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, setDoc, doc, getDoc, orderBy, limit, setLogLevel } from "firebase/firestore";
// AI Studio fallback support
import fileFirebaseConfig from "./firebase-applet-config.json";

const isProd = process.env.NODE_ENV === 'production';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || (fileFirebaseConfig as any).apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || (fileFirebaseConfig as any).authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || (fileFirebaseConfig as any).projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (fileFirebaseConfig as any).storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || (fileFirebaseConfig as any).messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || (fileFirebaseConfig as any).appId,
};

// تحقق من المتغيرات الضرورية عند بدء التشغيل
const requiredEnvVars = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => {
  if (!isProd && v !== 'JWT_SECRET' && v !== 'FIREBASE_PROJECT_ID' && v !== 'FIREBASE_API_KEY') return false; // In dev, we use fallback config
  if (!isProd && v === 'FIREBASE_API_KEY' && firebaseConfig.apiKey) return false;
  if (!isProd && v === 'FIREBASE_PROJECT_ID' && firebaseConfig.projectId) return false;
  return !process.env[v] && !firebaseConfig[v.replace('FIREBASE_', '').replace(/_([a-z])/g, (g: string) => g[1].toUpperCase()) as keyof typeof firebaseConfig];
});

if (isProd && missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

setLogLevel("error");

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const withTimeout = <T>(promise: Promise<T>, ms: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request Timeout: Server could not reach Firebase")), ms))
  ]);
};

const JWT_SECRET = process.env.JWT_SECRET || "natqi-super-secret";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// قاعدة بيانات أخطاء النطق العربي الشائعة
const ARABIC_PHONETIC_RULES = {
  // أحرف متشابهة في النطق
  confusable_pairs: [
    { chars: ['س', 'ص'], tips: 'السين حرف مرقق يخرج من بين الأسنان. الصاد مفخّم يخرج من طرف اللسان مع الأسنان العليا.' },
    { chars: ['ط', 'ت'], tips: 'الطاء مفخّمة تخرج من طرف اللسان والأسنان العليا مع التفخيم. التاء مرققة بدون تفخيم.' },
    { chars: ['ذ', 'ز', 'ظ'], tips: 'الذال تخرج من طرف اللسان بين الأسنان بدون تفخيم. الظاء مثلها مع التفخيم.' },
    { chars: ['ح', 'هـ'], tips: 'الحاء تخرج من وسط الحلق مع احتكاك. الهاء تخرج من أقصى الحلق برفق.' },
    { chars: ['ع', 'ء'], tips: 'العين تخرج من وسط الحلق مع ضغط. الهمزة تخرج من أقصى الحلق بانقطاع.' },
    { chars: ['غ', 'خ'], tips: 'الغين تخرج من أقصى الحلق مع اهتزاز. الخاء تخرج من أقصى الحلق باحتكاك.' },
    { chars: ['ق', 'ك'], tips: 'القاف تخرج من أقصى اللسان مع الحنك اللين. الكاف تخرج من وسط اللسان مع الحنك.' },
    { chars: ['ض', 'د'], tips: 'الضاد تخرج من حافة اللسان مع الأضراس العليا مع التفخيم. الداد مرققة من طرف اللسان.' },
  ],
  
  // حروف صعبة على غير الناطقين
  difficult_for_non_native: ['ع', 'غ', 'ح', 'خ', 'ق', 'ض', 'ظ', 'ذ', 'ث'],
  
  // أوزان أهمية الحروف
  letter_difficulty: {
    'ض': 1.5, 'ظ': 1.5, 'ع': 1.4, 'غ': 1.4, 'ح': 1.3, 'خ': 1.3,
    'ق': 1.3, 'ذ': 1.2, 'ث': 1.2, 'ص': 1.2, 'ط': 1.2
  } as Record<string, number>,
  
  // قاموس التشكيل المشترك
  diacritics_patterns: {
    tanwin_fath: 'ً', tanwin_kasr: 'ٍ', tanwin_damm: 'ٌ',
    shadda: 'ّ', sukun: 'ْ'
  }
};

// تحليل الأخطاء الصوتية التفصيلي
function analyzePhoneticErrors(targetWord: string, recognizedWord: string): { 
  hasError: boolean; 
  tip: string; 
  severity: 'minor' | 'major';
} {
  const normTarget = normalizeArabic(targetWord);
  const normRecognized = normalizeArabic(recognizedWord);
  
  if (normTarget === normRecognized) return { hasError: false, tip: '', severity: 'minor' };
  
  // فحص الأحرف الصعبة في الكلمة المستهدفة
  for (const pair of ARABIC_PHONETIC_RULES.confusable_pairs) {
    for (const char of pair.chars) {
      if (normTarget.includes(char) && !normRecognized.includes(char)) {
        // المستخدم لم ينطق الحرف الصعب بشكل صحيح
        const isDifficult = ARABIC_PHONETIC_RULES.difficult_for_non_native.includes(char);
        return {
          hasError: true,
          tip: pair.tips,
          severity: isDifficult ? 'major' : 'minor'
        };
      }
    }
  }
  
  return {
    hasError: true,
    tip: 'ركّز على مخرج الحرف وحاول النطق ببطء أكثر',
    severity: 'minor'
  };
}

// Helper to extract retry delay in milliseconds on 429 rate limit
function getRetryDelay(err: any): number {
  if (!err) return 3000;
  
  // Try to parse from err.details or err.error.details
  try {
    const details = err.details || (err.error && err.error.details);
    if (Array.isArray(details)) {
      const retryInfo = details.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
      if (retryInfo && typeof retryInfo.retryDelay === 'string') {
        const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
        if (!isNaN(seconds)) {
          return Math.ceil(seconds * 1000);
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Try to parse from message string if standard message has "Please retry in X.XXs."
  try {
    const msg = err.message || (err.error && err.error.message) || (typeof err === 'string' ? err : '');
    const match = msg.match(/Please retry in (\d+(\.\d+)?)s/i);
    if (match && match[1]) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds)) {
        return Math.ceil(seconds * 1000);
      }
    }
  } catch (e) {
    // ignore
  }

  return 3000; // default to 3 seconds for 429
}

// Check if an error represents a 429 / RESOURCE_EXHAUSTED rate limit
function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || (err.error && err.error.status);
  const code = err.code || (err.error && err.error.code);
  const errMsg = String(err.message || (err.error && err.error.message) || "").toUpperCase();
  const errStr = JSON.stringify(err).toUpperCase();
  
  return (
    status === 'RESOURCE_EXHAUSTED' || 
    code === 429 || 
    errMsg.includes('429') || 
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('QUOTA') ||
    errStr.includes('429') || 
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('QUOTA')
  );
}

// Fallback logic for when Gemini fails (offline or rate limit)
function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // Remove punctuation
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

// خوارزمية Levenshtein المحسّنة مع الأوزان العربية
function arabicWeightedLevenshtein(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const c1 = s1[i - 1];
      const c2 = s2[j - 1];
      
      // حساب تكلفة الاستبدال مع مراعاة التشابه الصوتي
      let substitutionCost = 1;
      if (c1 === c2) {
        substitutionCost = 0;
      } else {
        // تحقق من الأحرف المتشابهة صوتياً
        const isPhoneticallySimilar = ARABIC_PHONETIC_RULES.confusable_pairs.some(
          pair => pair.chars.includes(c1) && pair.chars.includes(c2)
        );
        if (isPhoneticallySimilar) substitutionCost = 0.5; // خصم لأنها متقاربة
        
        // مراعاة صعوبة الحرف
        const difficulty = ARABIC_PHONETIC_RULES.letter_difficulty[c1] || 1;
        substitutionCost *= difficulty;
      }
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost
      );
    }
  }
  return matrix[len1][len2];
}

// دالة التحليل الرئيسية المحسّنة
function advancedArabicFallbackAnalysis(targetText: string, recognizedText: string) {
  const normTarget = normalizeArabic(targetText).split(' ').filter(w => w);
  const rawTargetWords = targetText.replace(/[\u064B-\u065F]/g, '').split(' ').filter(w => w);
  const normRecognized = normalizeArabic(recognizedText).split(' ').filter(w => w);
  
  if (!recognizedText || normRecognized.length === 0) {
    return {
      score: 0,
      mistakes: rawTargetWords.slice(0, 3).map(w => ({ 
        word: w, 
        tip: 'لم يتم التعرف على هذه الكلمة. تحدث بصوت أعلى وأوضح.',
        severity: 'major'
      })),
      feedback: 'لم يتم التعرف على صوتك. تأكد من وضوح الميكروفون والتحدث في مكان هادئ.',
      phonetic_score: 0,
      completeness_score: 0
    };
  }
  
  const mistakes: any[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let matchedWords = 0;
  
  for (let i = 0; i < normTarget.length; i++) {
    const tWord = normTarget[i];
    // وزن الكلمة بناءً على صعوبة حروفها
    const wordWeight = [...tWord].reduce((acc, char) => {
      return acc + (ARABIC_PHONETIC_RULES.letter_difficulty[char] || 1);
    }, 0) / tWord.length;
    
    totalWeight += wordWeight;
    
    // إيجاد أفضل تطابق في النص المُتعرَّف عليه
    let bestSim = 0;
    let bestMatchWord = '';
    
    for (const rWord of normRecognized) {
      const maxLen = Math.max(tWord.length, rWord.length);
      if (maxLen === 0) continue;
      const dist = arabicWeightedLevenshtein(tWord, rWord);
      const sim = Math.max(0, (maxLen - dist) / maxLen);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatchWord = rWord;
      }
    }
    
    totalWeightedScore += bestSim * wordWeight;
    
    if (bestSim >= 0.85) {
      matchedWords++;
    } else if (bestSim < 0.7) {
      const errorAnalysis = analyzePhoneticErrors(tWord, bestMatchWord);
      mistakes.push({
        word: rawTargetWords[i] || tWord,
        tip: errorAnalysis.tip,
        severity: errorAnalysis.severity
      });
    }
  }
  
  const phonetic_score = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  const completeness_score = normTarget.length > 0 ? (matchedWords / normTarget.length) * 100 : 0;
  
  // حساب الدرجة النهائية
  const finalScore = Math.round(phonetic_score * 0.7 + completeness_score * 0.3);
  const clampedScore = Math.min(100, Math.max(0, finalScore));
  
  let feedback = '';
  if (clampedScore >= 90) {
    feedback = 'ممتاز! نطقك رائع واحترافي، استمر بهذا المستوى الرفيع!';
  } else if (clampedScore >= 75) {
    feedback = 'جيد جداً! نطقك واضح مع بعض أخطاء بسيطة يمكن تحسينها بالتدريب.';
  } else if (clampedScore >= 60) {
    feedback = 'محاولة جيدة! ركز على الكلمات المُشار إليها وستتحسن بسرعة.';
  } else if (clampedScore >= 40) {
    feedback = 'تحتاج مزيداً من التدريب. استمع للنموذج الصحيح وكرر عدة مرات.';
  } else {
    feedback = 'لا تستسلم! التدريب المستمر هو الطريق للإتقان. حاول مجدداً ببطء أكثر.';
  }
  
  return { 
    score: clampedScore, 
    mistakes: mistakes.slice(0, 5), // أقصى 5 أخطاء
    feedback,
    phonetic_score: Math.round(phonetic_score),
    completeness_score: Math.round(completeness_score)
  };
}

// نظام توصية ذكي يعمل بدون AI خارجي
async function smartExerciseRecommendation(
  exercisePool: any[], 
  userId: string, 
  category: string, 
  level: string
): Promise<any> {
  
  // جلب آخر 10 محاولات للمستخدم
  let recentAttempts: any[] = [];
  try {
    const attemptsRef = collection(db, "attempts");
    const q = query(attemptsRef, where("userId", "==", userId), limit(10));
    const snap = await getDocs(q);
    recentAttempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {}
  
  // استخراج التمارين التي جرّبها مؤخراً
  const recentExerciseIds = new Set(recentAttempts.map((a: any) => a.exerciseId));
  
  // حساب متوسط الأداء في كل تمرين
  const exerciseScores: Record<string, number[]> = {};
  recentAttempts.forEach((attempt: any) => {
    if (!exerciseScores[attempt.exerciseId]) exerciseScores[attempt.exerciseId] = [];
    exerciseScores[attempt.exerciseId].push(attempt.score || 0);
  });
  
  const avgScore = recentAttempts.length > 0
    ? recentAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / recentAttempts.length
    : 50;

  // نظام الأوزان الذكي
  const scoredExercises = exercisePool.map(exercise => {
    let weight = 100; // نقطة الانطلاق
    
    // 1. ترجيح التنويع: تمارين لم يجرّبها مؤخراً لها أولوية
    if (recentExerciseIds.has(exercise.id)) {
      weight -= 30; // تخفيض للتمارين المكررة
    }
    
    // 2. ترجيح مستوى الصعوبة بناءً على أداء المستخدم
    const levelMap: Record<string, number> = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
    const exerciseDifficulty = levelMap[exercise.level] || 1;
    const userPerformanceLevel = avgScore >= 80 ? 2 : avgScore >= 50 ? 1 : 0;
    
    // اقترح تمارين أصعب قليلاً إذا كان يؤدي جيداً
    const difficultyMatch = Math.abs(exerciseDifficulty - (userPerformanceLevel + 1));
    weight -= difficultyMatch * 15;
    
    // 3. ترجيح أداء المستخدم في هذا التمرين تحديداً
    const exerciseHistory = exerciseScores[exercise.id];
    if (exerciseHistory && exerciseHistory.length > 0) {
      const exerciseAvg = exerciseHistory.reduce((a: number, b: number) => a + b, 0) / exerciseHistory.length;
      if (exerciseAvg < 60) {
        weight += 20; // أولوية للتمارين التي أخفق فيها — يحتاج تدريب
      } else if (exerciseAvg > 85) {
        weight -= 10; // تمرين أتقنه — لا يحتاج تكرار
      }
    }
    
    // 4. مطابقة الفئة والمستوى
    if (exercise.category === category) weight += 25;
    if (exercise.level === level) weight += 20;
    
    return { exercise, weight: Math.max(0, weight) };
  });
  
  // اختيار بناءً على الأوزان مع عشوائية طفيفة (لمنع التنبؤية)
  const totalWeight = scoredExercises.reduce((sum, e) => sum + e.weight, 0);
  
  if (totalWeight === 0) {
    return exercisePool[Math.floor(Math.random() * exercisePool.length)];
  }
  
  let random = Math.random() * totalWeight;
  for (const { exercise, weight } of scoredExercises) {
    random -= weight;
    if (random <= 0) return exercise;
  }
  
  return exercisePool[exercisePool.length - 1]; // fallback آمن
}

// Helper for calling Gemini with automatic retries and model fallbacks (e.g. if 503 or 429 are encountered)
async function generateContentWithFallbackAndRetry(
  params: {
    contents: any;
    config?: any;
  },
  models: string[] = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"]
): Promise<any> {
  let lastError: any = null;
  
  for (const modelName of models) {
    const attempts = 3; // Retry up to 3 times per model
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`Calling Gemini API via ${modelName} - attempt ${attempt}/${attempts}`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini generation failed for model ${modelName} on attempt ${attempt}:`, err?.message || err);
        
        // If we hit a rate limit (429 / RESOURCE_EXHAUSTED):
        if (isRateLimitError(err)) {
          console.warn(`Rate limit / Quota exceeded for model ${modelName} (429/RESOURCE_EXHAUSTED). Moving to next model.`);
          break; // Break the attempt loop, moving to the next model in the outer loop
        }
        
        // If we get a 503 (Service Unavailable) or 500 (Internal Error), wait briefly and retry or try fallback
        if (attempt < attempts) {
          const backoffDelay = attempt * 1500;
          console.log(`Temporary error (500/503). Retrying in ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }
  }
  throw lastError || new Error("Gemini API call failed across all fallback models");
}

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(bodyParser.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'natqi-session-secret',
    resave: false,
    saveUninitialized: false, // تغيير من true لـfalse
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // منع JavaScript من الوصول
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  }));

  const verifyToken = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).userId = (decoded as any).userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  const analyzeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per window
    message: { error: "لقد تجاوزت الحد المسموح من الطلبات، يرجى المحاولة بعد دقيقة" }
  });

  // Auth Routes
  app.post("/api/auth/register", [
    body('name').trim().escape().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('category').trim().escape()
  ], async (req: express.Request, res: express.Response) => {
    console.log("POST /api/auth/register request received");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation failed:", errors.array());
      return res.status(400).json({ error: "بيانات غير صالحة" });
    }
    try {
      const { name, email, password, category } = req.body;
      
      console.log("Checking if user exists for:", email);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      console.log("Querying firestore...");
      const querySnapshot = await withTimeout(getDocs(q));
      console.log("Query completed.");
      
      if (!querySnapshot.empty) {
        console.log("User already exists:", email);
        return res.status(400).json({ error: "البريد الإلكتروني موجود بالفعل" });
      }

      console.log("Hashing password...");
      const passwordHash = await bcrypt.hash(password, 10);
      console.log("Password hashed.");
      
      const userData = {
        name,
        email,
        passwordHash,
        category,
        level: "beginner",
        goal: "pronunciation",
        language_pref: "arabic_native",
        mic_sensitivity: 70,
        createdAt: serverTimestamp()
      };

      console.log("Adding user doc...");
      const docRef = await withTimeout(addDoc(usersRef, userData));
      console.log("User doc added with ID:", docRef.id);
      
      const user = {
        id: docRef.id,
        name,
        email,
        category,
        level: "beginner",
        goal: "pronunciation",
        language_pref: "arabic_native",
        mic_sensitivity: 70,
      };

      console.log("Signing JWT...");
      const token = jwt.sign({ userId: docRef.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log("Sending success response.");
      res.status(201).json({ token, user });
    } catch (error) {
      console.error("Detailed registration error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الحساب" });
    }
  });

  app.post("/api/auth/login", [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ], async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "بيانات غير صالحة" });
    try {
      const { email, password } = req.body;
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await withTimeout(getDocs(q));
      
      if (querySnapshot.empty) {
        return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      const isPasswordValid = await bcrypt.compare(password, userData.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      const user = {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        category: userData.category,
        level: userData.level || "beginner",
        goal: userData.goal || "pronunciation",
        language_pref: userData.language_pref || "arabic_native",
        mic_sensitivity: userData.mic_sensitivity || 70,
      };

      const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({ token, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  app.put("/api/user/profile", verifyToken, [
    body('name').optional().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('currentPassword').optional(),
    body('newPassword').optional()
  ], async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "بيانات غير صالحة" });
    try {
      const { userId } = (req as any);
      const { name, email, currentPassword, newPassword } = req.body;
      
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
      const userData = userSnap.data();

      if (email && email !== userData.email) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const emailSnap = await getDocs(q);
        if (!emailSnap.empty) return res.status(400).json({ error: "البريد الإلكتروني موجود بالفعل" });
      }

      let updatedData: any = { name, email };

      if (newPassword) {
        const isPasswordValid = await bcrypt.compare(currentPassword, userData.passwordHash);
        if (!isPasswordValid) return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
        updatedData.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      await setDoc(userRef, { ...userData, ...updatedData });
      
      const updatedUserSnap = await getDoc(userRef);
      const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() };
      delete (updatedUser as any).passwordHash;

      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث الملف الشخصي" });
    }
  });

  app.put("/api/user/settings", verifyToken, [
    body('level').optional().trim().escape(),
    body('goal').optional().trim().escape(),
    body('language_pref').optional().trim().escape(),
    body('mic_sensitivity').optional().isInt(),
    body('category').optional().trim().escape()
  ], async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "بيانات غير صالحة" });
    try {
      const { userId } = (req as any);
      const { level, goal, language_pref, mic_sensitivity, category } = req.body;
      
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });

      const updatedData = { level, goal, language_pref, mic_sensitivity, category };
      await setDoc(userRef, { ...userSnap.data(), ...updatedData });
      
      const updatedUserSnap = await getDoc(userRef);
      const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() };
      delete (updatedUser as any).passwordHash;

      res.json(updatedUser);
    } catch (error) {
       console.error("Settings update error:", error);
       res.status(500).json({ error: "حدث خطأ أثناء حفظ الإعدادات" });
    }
  });

  // Seed Exercises if collection is empty
  const seedExercises = async (force = false) => {
    try {
      const exercisesRef = collection(db, "exercises");
      const libraryRef = collection(db, "library_items");
      const sessionsRef = collection(db, "live_sessions");

      const exSnapshot = await getDocs(exercisesRef);
      if (exSnapshot.empty || force) {
        const samples = [
          // ========= فئة الأطفال — مستوى مبتدئ =========
          {
            title: "حروف المد الثلاثة",
            text: "أَنَا أُحِبُّ أُمِّي وَأَبِي",
            level: "beginner", category: "children",
            description: "تمرين على حروف المد والحركات الأساسية",
            text_translation: "I love my mother and father",
            tips: "انطق كل حركة بوضوح: الفتحة للألف، الضمة للواو، الكسرة للياء",
            audio_correct_url: ""
          },
          {
            title: "الحروف الشمسية والقمرية",
            text: "الشَّمْسُ تُشْرِقُ فِي الصَّبَاحِ",
            level: "beginner", category: "children",
            description: "الفرق بين ال الشمسية وال القمرية",
            text_translation: "The sun rises in the morning",
            tips: "عندما تأتي ال قبل حرف شمسي، تندغم اللام في الحرف الذي يليها. هنا الشمس = اش-شمس",
            audio_correct_url: ""
          },
          {
            title: "سورة الفاتحة — الآية الأولى",
            text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
            level: "beginner", category: "children",
            description: "حفظ ونطق البسملة بشكل صحيح",
            text_translation: "In the name of Allah, the Most Gracious, the Most Merciful",
            tips: "اللام في لفظ الجلالة (الله) مفخّمة بعد الفتحة والضمة، مرققة بعد الكسرة",
            audio_correct_url: ""
          },
          {
            title: "أرقام بالعربية",
            text: "وَاحِدٌ اثْنَانِ ثَلَاثَةٌ أَرْبَعَةٌ خَمْسَةٌ",
            level: "beginner", category: "children",
            description: "نطق الأرقام من 1 إلى 5 بالعربية الفصحى",
            text_translation: "One, two, three, four, five",
            tips: "انتبه للتنوين في آخر كل كلمة، وللثاء في 'اثنان' و'ثلاثة'",
            audio_correct_url: ""
          },
          
          // ========= فئة الأطفال — مستوى متوسط =========
          {
            title: "مزدوج السين والصاد",
            text: "سَارَ سَمِيرٌ إِلَى سُوقِ الصَّبَاحِ",
            level: "intermediate", category: "children",
            description: "التمييز بين السين والصاد في سياق واحد",
            text_translation: "Samir walked to the morning market",
            tips: "السين مرققة والهواء يخرج بين الأسنان بدون صوت. الصاد مفخمة مع رفع مؤخرة اللسان",
            audio_correct_url: ""
          },
          
          // ========= فئة البالغين — مستوى مبتدئ =========
          {
            title: "تحية الإسلام",
            text: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ",
            level: "beginner", category: "adults",
            description: "نطق التحية الإسلامية الكاملة بشكل صحيح",
            text_translation: "Peace, mercy, and blessings of Allah be upon you",
            tips: "العين في 'عليكم' تخرج من وسط الحلق مع ضغط. اجعل صوتها مميزاً وليس هاءً",
            audio_correct_url: ""
          },
          {
            title: "حرف الضاد — صوت العرب",
            text: "الضَّبَابُ يُغَطِّي الضِّفَافَ الخَضْرَاءَ",
            level: "beginner", category: "adults",
            description: "إتقان حرف الضاد المميز للغة العربية",
            text_translation: "The fog covers the green banks",
            tips: "الضاد يخرج من حافة اللسان اليمنى أو اليسرى مع الأضراس العليا مع التفخيم. هذا الحرف فريد بالعربية",
            audio_correct_url: ""
          },
          {
            title: "الحروف الحلقية",
            text: "عَلَّمَ الإِنْسَانَ مَا لَمْ يَعْلَمْ",
            level: "beginner", category: "adults",
            description: "تدريب على نطق الحروف الحلقية: العين والهمزة",
            text_translation: "He taught man what he did not know",
            tips: "العين حرف حلقي يحتاج ضغطاً في وسط الحلق. الهمزة انقطاع هوائي من أقصى الحلق",
            audio_correct_url: ""
          },
          {
            title: "الغين والخاء",
            text: "خَيْرُ الكَلَامِ مَا قَلَّ وَدَلَّ",
            level: "intermediate", category: "adults",
            description: "الفرق بين الغين والخاء في الاستخدام",
            text_translation: "The best speech is that which is concise and meaningful",
            tips: "الخاء تخرج من أقصى الحلق باحتكاك بدون اهتزاز. الغين مثلها مع اهتزاز الوترين الصوتيين",
            audio_correct_url: ""
          },
          
          // ========= فئة الطلاب =========
          {
            title: "مثل عربي فصيح — النجاح",
            text: "مَنْ جَدَّ وَجَدَ وَمَنْ زَرَعَ حَصَدَ",
            level: "beginner", category: "students",
            description: "مثل عربي عن العمل والمثابرة",
            text_translation: "He who strives shall succeed, he who plants shall harvest",
            tips: "ركّز على تشديد الدال في 'جدَّ' وتشديد الدال في 'وجد'. كل حرف مشدد ينطق مرتين",
            audio_correct_url: ""
          },
          {
            title: "آية قرآنية — الحجرات",
            text: "يَا أَيُّهَا الَّذِينَ آمَنُوا اجْتَنِبُوا كَثِيرًا مِنَ الظَّنِّ",
            level: "intermediate", category: "students",
            description: "تلاوة آية كريمة مع مراعاة التجويد",
            text_translation: "O you who have believed, avoid much suspicion",
            tips: "الظاء في 'الظن' مفخّمة تخرج كالذال مع التفخيم. 'آمنوا' مدّها بمقدار حركتين",
            audio_correct_url: ""
          },
          {
            title: "خطبة جمعة — مقطع",
            text: "إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ",
            level: "intermediate", category: "students",
            description: "تدريب على خطابة بمستوى رفيع",
            text_translation: "Indeed, all praise is for Allah. We praise Him, seek His help and forgiveness.",
            tips: "ركّز على النون المشددة في 'إن' والتشديد في 'الله'. كلمة 'نستغفره' فيها غين وفاء ومواضع دقيقة",
            audio_correct_url: ""
          },
          {
            title: "حديث نبوي شريف",
            text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
            level: "advanced", category: "students",
            description: "نطق الحديث النبوي الأول من الصحيحين",
            text_translation: "Indeed, deeds are by intentions, and for each person what he intended",
            tips: "النية في 'النيات' لها ياء مشددة. 'امرئ' همزة في الوسط تحتاج انقطاعاً هوائياً واضحاً",
            audio_correct_url: ""
          },
          
          // ========= فئة غير الناطقين =========
          {
            title: "التحيات اليومية الأساسية",
            text: "صَبَاحُ الخَيْرِ، كَيْفَ حَالُكَ؟",
            level: "beginner", category: "non-native",
            description: "تحية الصباح والسؤال عن الحال",
            text_translation: "Good morning, how are you?",
            tips: "الخاء في 'الخير' تخرج من أقصى الحلق مثل حرف 'ch' في الألمانية (Bach). لا تعوّضها بحرف 'k'",
            audio_correct_url: ""
          },
          {
            title: "التعريف بالنفس",
            text: "اسْمِي كَارِيم، أَنَا أَتَعَلَّمُ الْعَرَبِيَّةَ",
            level: "beginner", category: "non-native",
            description: "جملة تعريفية أساسية للمبتدئين",
            text_translation: "My name is Karim, I am learning Arabic",
            tips: "الهمزة في 'أنا' و'أتعلم' تبدأ من أقصى الحلق بانقطاع. لا تبدأ الكلمة بدونها",
            audio_correct_url: ""
          },
          {
            title: "الأرقام والتسوق",
            text: "كَمِ الثَّمَنُ؟ هَذَا غَالٍ جِدًّا",
            level: "intermediate", category: "non-native",
            description: "لغة التسوق والتفاوض بالعربية",
            text_translation: "How much is the price? This is very expensive",
            tips: "الثاء في 'الثمن' مثل 'th' في الإنجليزية (think). الغين في 'غالٍ' صوت عميق من الحلق",
            audio_correct_url: ""
          },
          {
            title: "وصف الطعام",
            text: "الطَّعَامُ لَذِيذٌ جِدًّا، شُكْرًا جَزِيلًا",
            level: "beginner", category: "non-native",
            description: "التعبير عن التقدير والشكر",
            text_translation: "The food is very delicious, thank you very much",
            tips: "الطاء في 'الطعام' مفخّمة — أعلى صوتاً من التاء العادية. الجيم في 'جزيلاً' جيم مصرية أو جيم فصحى حسب التقطير",
            audio_correct_url: ""
          }
        ];
        for (const s of samples) {
          await addDoc(exercisesRef, { ...s, createdAt: serverTimestamp() });
        }
      }

      const libSnapshot = await getDocs(libraryRef);
      if (libSnapshot.empty) {
        const libSamples = [
          {
            title: "أساسيات مخارج الحروف العربية",
            description: "شرح علمي لمخارج الحروف الـ17 ومواضعها",
            category: "adults", type: "video",
            url: "https://www.youtube.com/embed/Rty9oEFkVGk",
            thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"
          },
          {
            title: "تعليم الحروف للأطفال بالصور والأصوات",
            description: "طريقة ممتعة وتفاعلية تناسب الأطفال من 4 إلى 10 سنوات",
            category: "children", type: "video",
            url: "https://www.youtube.com/embed/ygKhRm-T-0c",
            thumbnail: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80"
          },
          {
            title: "Arabic Pronunciation for Beginners",
            description: "دورة متكاملة للناطقين بغير العربية — من الألف إلى الياء",
            category: "non-native", type: "video",
            url: "https://www.youtube.com/embed/4X5O0DnxBcU",
            thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80"
          },
          {
            title: "قواعد التجويد المبسطة للطلاب",
            description: "أحكام النون الساكنة والتنوين وحروف المد بأسلوب سهل",
            category: "students", type: "video",
            url: "https://www.youtube.com/embed/8JEtCJRSEzk",
            thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80"
          },
          {
            title: "الحروف الصعبة: ضاد ظاء عين غين",
            description: "تمارين مكثفة على الحروف الأصعب في العربية للمتعلمين",
            category: "non-native", type: "video",
            url: "https://www.youtube.com/embed/fKiJqUJDvuA",
            thumbnail: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&q=80"
          },
          {
            title: "قصص الحروف التفاعلية للأطفال",
            description: "كل حرف له قصة ممتعة تساعد الطفل على تذكره ونطقه",
            category: "children", type: "video",
            url: "https://www.youtube.com/embed/PKPXjvl_kEI",
            thumbnail: "https://images.unsplash.com/photo-1551966775-a4ddc8df052b?w=400&q=80"
          }
        ];
        for (const s of libSamples) {
          await addDoc(libraryRef, { ...s, createdAt: serverTimestamp() });
        }
      }

      const sessionsSnapshot = await getDocs(sessionsRef);
      if (sessionsSnapshot.empty) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(20, 0, 0, 0);

        const sessionsSamples = [
          {
            title: "جلسة تصحيح مخارج الحروف",
            instructor: "د. أحمد علي",
            datetime: tomorrow.toISOString(),
            remaining: 5,
            totalSpots: 10,
            category: "adults"
          },
          {
            title: "تعلم الحروف من خلال القصص",
            instructor: "أ. سارة خالد",
            datetime: nextWeek.toISOString(),
            remaining: 0,
            totalSpots: 8,
            category: "children"
          }
        ];
        for (const s of sessionsSamples) {
          await addDoc(sessionsRef, { ...s, createdAt: serverTimestamp() });
        }
      }

      console.log("Seeded initial collections.");
    } catch (e) {
      console.error("Seeding failed:", e);
    }
  };
  seedExercises();

  app.get("/api/library", verifyToken, async (req, res) => {
    try {
      const { category } = req.query;
      const libraryRef = collection(db, "library_items");
      let q = query(libraryRef);
      if (category && category !== 'all') {
        q = query(libraryRef, where("category", "==", category));
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/sessions", verifyToken, async (req, res) => {
    try {
      const sessionsRef = collection(db, "live_sessions");
      const q = query(sessionsRef, where("datetime", ">", new Date().toISOString()), orderBy("datetime", "asc"));
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(sessions);
    } catch (error) {
      console.error("Sessions fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/sessions/book", verifyToken, async (req, res) => {
    try {
      const { sessionId, userId } = req.body;
      if (!sessionId || !userId) return res.status(400).json({ error: "Missing data" });

      const sessionDocRef = doc(db, "live_sessions", sessionId);
      const sessionSnap = await getDoc(sessionDocRef);

      if (!sessionSnap.exists()) return res.status(404).json({ error: "Session not found" });
      const sessionData = sessionSnap.data();

      if (sessionData.remaining <= 0) return res.status(400).json({ error: "Session is full" });

      // Check duplicate booking
      const bookingsRef = collection(db, "session_bookings");
      const q = query(bookingsRef, where("userId", "==", userId), where("sessionId", "==", sessionId));
      const bookingSnap = await getDocs(q);

      if (!bookingSnap.empty) return res.status(400).json({ error: "تم حجز موعد مسبق في هذه الجلسة" });

      // Create booking
      await addDoc(bookingsRef, {
        userId,
        sessionId,
        bookedAt: serverTimestamp()
      });

      // Update remaining spots
      await setDoc(sessionDocRef, {
        ...sessionData,
        remaining: sessionData.remaining - 1
      });

      res.status(200).json({ message: "Booking successful" });
    } catch (error) {
      console.error("Booking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/progress/:userId", verifyToken, async (req, res) => {
    try {
      const { userId } = req.params;
      if ((req as any).userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const attemptsRef = collection(db, "attempts");
      let attempts: any[] = [];
      try {
        const q = query(
          attemptsRef, 
          where("userId", "==", userId),
          orderBy("attemptDate", "desc"),
          limit(30)
        );
        const snapshot = await getDocs(q);
        attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (indexErr) {
        // Fallback: fetch without orderBy if index doesn't exist yet
        console.warn("Index missing, falling back to unordered query:", indexErr);
        const fallbackQ = query(attemptsRef, where("userId", "==", userId), limit(30));
        const fallbackSnap = await getDocs(fallbackQ);
        attempts = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort manually
        attempts.sort((a, b) => {
          const aDate = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
          const bDate = b.attemptDate?.toDate?.() || new Date(b.attemptDate || 0);
          return bDate.getTime() - aDate.getTime();
        });
      }
      
      // Process stats
      const totalAttempts = attempts.length;
      const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => (a as any).score)) : 0;
      const averageScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, a) => acc + (a as any).score, 0) / totalAttempts) : 0;

      // Group by date for chart (last 7 days)
      const last7Days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - i);
        last7Days.push({
          date: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('ar-EG', { weekday: 'long' }),
          score: 0
        });
      }

      attempts.forEach(a => {
        const attemptDate = (a as any).attemptDate;
        let dateStr = "";
        if (attemptDate && typeof attemptDate.toDate === 'function') {
          dateStr = attemptDate.toDate().toISOString().split('T')[0];
        } else if (attemptDate) {
          dateStr = new Date(attemptDate).toISOString().split('T')[0];
        }
        
        const day = last7Days.find(d => d.date === dateStr);
        if (day) {
          day.score = Math.max(day.score, (a as any).score);
        }
      });

      res.json({
        stats: { bestScore, averageScore, totalAttempts },
        attempts: attempts.slice(0, 5),
        chartData: last7Days
      });
    } catch (error) {
      console.error("Progress fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/analyze/demo", verifyToken, async (req: express.Request, res: express.Response) => {
    const { text, simulatedText } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const result = advancedArabicFallbackAnalysis(text, simulatedText || text);
    res.json({ ...result, mode: 'demo', attemptDate: new Date().toISOString() });
  });

  app.post("/api/analyze", verifyToken, analyzeLimiter, upload.single('audio'), async (req: express.Request, res: express.Response) => {
    try {
      const { exerciseId, userId, text, recognizedText } = req.body;
      
      let analysisResult: { score: number; mistakes: any[]; feedback: string } | null = null;
      let usedFallback = false;

      // Use Gemini AI for real audio analysis
      if (GEMINI_API_KEY && req.file) {
        try {
          const audioBase64 = req.file.buffer.toString('base64');
          const mimeType = req.file.mimetype || 'audio/webm';

          const prompt = `أنت أستاذ متخصص في النطق العربي الفصيح وعلم الأصوات.
المستخدم قرأ النص العربي التالي بصوت عالٍ: "${text}"

استمع للتسجيل الصوتي المرفق وقيّم نطقه.

أعد JSON فقط بالشكل التالي (بدون أي نص آخر أو markdown):
{
  "score": [رقم من 0 إلى 100 يمثل دقة النطق],
  "mistakes": [قائمة بالكلمات التي نُطقت بشكل خاطئ، كل عنصر: {"word": "الكلمة", "tip": "نصيحة قصيرة للتصحيح"}],
  "feedback": "ملاحظة تشجيعية وبناءة بالعربية في جملة واحدة أو جملتين"
}

معايير التقييم:
- 90-100: نطق ممتاز
- 75-89: نطق جيد مع أخطاء بسيطة
- 60-74: نطق مقبول مع أخطاء واضحة
- أقل من 60: يحتاج تدريباً إضافياً`;

          const response = await generateContentWithFallbackAndRetry({
            contents: [
              prompt,
              {
                inlineData: {
                  mimeType,
                  data: audioBase64
                }
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });

          const responseText = (response.text || "").trim()
            .replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

          const parsed = JSON.parse(responseText);
          analysisResult = {
            score: Math.min(100, Math.max(0, Number(parsed.score) || 70)),
            mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
            feedback: parsed.feedback || "أحسنت، استمر في التدريب!"
          };
        } catch (aiError) {
          console.warn("Gemini analysis failed, using native fallback:", aiError);
          usedFallback = true;
        }
      } else {
        usedFallback = true;
      }

      if (!analysisResult || usedFallback) {
        // Robust Fallback (Local evaluation of SpeechRecognition text)
        analysisResult = advancedArabicFallbackAnalysis(text, recognizedText || "");
      }

      // Save attempt to Firestore
      const attemptsRef = collection(db, "attempts");
      await addDoc(attemptsRef, {
        userId,
        exerciseId,
        score: analysisResult.score,
        mistakesJson: JSON.stringify(analysisResult.mistakes),
        attemptDate: serverTimestamp()
      });

      res.json({ ...analysisResult, attemptDate: new Date().toISOString() });
    } catch (error) {
      console.error("Analysis failed:", error);
      res.status(500).json({ error: "فشل تحليل الصوت، يرجى المحاولة مرة أخرى" });
    }
  });

  // API routes
  app.get("/api/exercises/suggest", verifyToken, async (req: express.Request, res: express.Response) => {
    try {
      const { category, level, id } = req.query as any;
      const exercisesRef = collection(db, "exercises");
      
      if (id) {
        const docRef = doc(db, "exercises", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return res.status(404).json({ error: "Exercise not found" });
        return res.json({ id: docSnap.id, ...docSnap.data() });
      }

      // Fetch exercises matching category + level
      const q = query(
        exercisesRef,
        where("category", "==", category || "adults"),
        where("level", "==", level || "beginner"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      
      let exercisePool = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (exercisePool.length === 0) {
        const fallback = await getDocs(query(exercisesRef, limit(5)));
        if (fallback.empty) return res.status(404).json({ error: "No exercises found" });
        exercisePool = fallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Use Gemini to pick the best exercise for the user if possible
      if (GEMINI_API_KEY && exercisePool.length > 1) {
        try {
          const exerciseList = exercisePool.map((e: any, i: number) => `${i}: ${e.title} - ${e.description}`).join('\n');
          const prompt = `أنت نظام توصية تعليمي ذكي.
لديك مستخدم من فئة "${category}" ومستواه "${level}".
اختر رقم التمرين الأنسب له من القائمة التالية:
${exerciseList}
أعد رقماً واحداً فقط (0 إلى ${exercisePool.length - 1}) بدون أي نص آخر.`;

          const response = await generateContentWithFallbackAndRetry({
            contents: prompt
          });
          const idx = parseInt((response.text || "").trim(), 10);
          if (!isNaN(idx) && idx >= 0 && idx < exercisePool.length) {
            return res.json(exercisePool[idx]);
          }
        } catch (aiErr) {
          console.warn("Gemini exercise selection failed, using random:", aiErr);
        }
      }

      // Fallback: smart selection
      const recommended = await smartExerciseRecommendation(
        exercisePool, 
        (req as any).userId, 
        category || 'adults', 
        level || 'beginner'
      );
      res.json(recommended);
    } catch (error) {
      console.error("Exercise fetch error:", error);
      res.status(500).json({ error: "Failed to fetch exercise" });
    }
  });

  app.get("/api/progress/:userId/insights", verifyToken, async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      if ((req as any).userId !== userId) return res.status(403).json({ error: "Forbidden" });
      
      const attemptsRef = collection(db, "attempts");
      const q = query(attemptsRef, where("userId", "==", userId), limit(50));
      const snap = await getDocs(q);
      const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      if (attempts.length === 0) return res.json({ insights: [], streakDays: 0, trend: 'neutral' });
      
      // تحليل الاتجاه (هل يتحسن أم لا؟)
      const sortedByDate = [...attempts].sort((a, b) => {
        const aDate = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
        const bDate = b.attemptDate?.toDate?.() || new Date(b.attemptDate || 0);
        return aDate.getTime() - bDate.getTime();
      });
      
      const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
      const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
      const firstAvg = firstHalf.reduce((s, a) => s + (a.score || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, a) => s + (a.score || 0), 0) / secondHalf.length;
      const trend = secondAvg > firstAvg + 5 ? 'improving' : secondAvg < firstAvg - 5 ? 'declining' : 'stable';
      
      // حساب سلسلة الأيام المتتالية
      const uniqueDays = [...new Set(sortedByDate.map(a => {
        const d = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
        return d.toISOString().split('T')[0];
      }))].sort().reverse();
      
      let streakDays = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDay = today;
      for (const day of uniqueDays) {
        if (day === checkDay) {
          streakDays++;
          const d = new Date(checkDay);
          d.setDate(d.getDate() - 1);
          checkDay = d.toISOString().split('T')[0];
        } else break;
      }
      
      // توليد رسائل تحفيزية
      const insights: string[] = [];
      if (trend === 'improving') insights.push('📈 أداؤك في تحسّن مستمر، استمر بهذا الإيقاع!');
      if (trend === 'declining') insights.push('💪 لاحظنا تراجعاً طفيفاً — زد من وتيرة التدريب.');
      if (streakDays >= 7) insights.push(`🔥 ${streakDays} أيام تدريب متواصل — أنت منضبط!`);
      if (attempts.length >= 20) insights.push(`🎯 أكملت ${attempts.length} تمريناً — مثابرة رائعة!`);
      const bestScore = Math.max(...attempts.map((a: any) => a.score || 0));
      if (bestScore >= 90) insights.push(`🏆 أفضل نتيجة لك: ${bestScore}% — نطق احترافي!`);
      
      res.json({ insights, streakDays, trend, bestScore, totalAttempts: attempts.length });
    } catch (error) {
      console.error("Insights error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/seed", async (req, res) => {
    await seedExercises(true); // pass force=true flag
    res.json({ ok: true });
  });

  app.get("/api/health", async (req, res) => {
    let firebaseStatus = 'unknown';
    try {
      // اختبار سريع للاتصال بـFirebase
      await withTimeout(getDocs(query(collection(db, "exercises"), limit(1))), 3000);
      firebaseStatus = 'connected';
    } catch {
      firebaseStatus = 'error';
    }
    
    res.json({ 
      status: firebaseStatus === 'connected' ? "ok" : "degraded",
      version: "1.0.0",
      environment: process.env.NODE_ENV || 'development',
      firebase: firebaseStatus,
      aiEnabled: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development or fall back to static serve in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
