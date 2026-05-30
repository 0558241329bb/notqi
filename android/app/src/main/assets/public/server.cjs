var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_body_parser = __toESM(require("body-parser"), 1);
var import_express_session = __toESM(require("express-session"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_express_validator = require("express-validator");
var import_multer = __toESM(require("multer"), 1);
var import_genai = require("@google/genai");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var isProd = process.env.NODE_ENV === "production";
var fileFirebaseConfig = {};
try {
  const configPath = import_path.default.resolve(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    fileFirebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
}
var firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || fileFirebaseConfig.apiKey || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || fileFirebaseConfig.authDomain || "",
  projectId: process.env.FIREBASE_PROJECT_ID || fileFirebaseConfig.projectId || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || fileFirebaseConfig.storageBucket || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || fileFirebaseConfig.messagingSenderId || "",
  appId: process.env.FIREBASE_APP_ID || fileFirebaseConfig.appId || ""
};
var requiredEnvVars = ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "JWT_SECRET"];
var missingVars = requiredEnvVars.filter((v) => {
  if (!isProd && v !== "JWT_SECRET" && v !== "FIREBASE_PROJECT_ID" && v !== "FIREBASE_API_KEY") return false;
  if (!isProd && v === "FIREBASE_API_KEY" && firebaseConfig.apiKey) return false;
  if (!isProd && v === "FIREBASE_PROJECT_ID" && firebaseConfig.projectId) return false;
  return !process.env[v] && !firebaseConfig[v.replace("FIREBASE_", "").replace(/_([a-z])/g, (g) => g[1].toUpperCase())];
});
if (isProd && missingVars.length > 0) {
  console.error(`\u274C Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}
(0, import_firestore.setLogLevel)("error");
var firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
var db = (0, import_firestore.getFirestore)(firebaseApp);
var withTimeout = (promise, ms = 8e3) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout: Server could not reach Firebase")), ms))
  ]);
};
var JWT_SECRET = process.env.JWT_SECRET || "natqi-super-secret";
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
var ai = new import_genai.GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var ARABIC_PHONETIC_RULES = {
  // أحرف متشابهة في النطق
  confusable_pairs: [
    { chars: ["\u0633", "\u0635"], tips: "\u0627\u0644\u0633\u064A\u0646 \u062D\u0631\u0641 \u0645\u0631\u0642\u0642 \u064A\u062E\u0631\u062C \u0645\u0646 \u0628\u064A\u0646 \u0627\u0644\u0623\u0633\u0646\u0627\u0646. \u0627\u0644\u0635\u0627\u062F \u0645\u0641\u062E\u0651\u0645 \u064A\u062E\u0631\u062C \u0645\u0646 \u0637\u0631\u0641 \u0627\u0644\u0644\u0633\u0627\u0646 \u0645\u0639 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u0639\u0644\u064A\u0627." },
    { chars: ["\u0637", "\u062A"], tips: "\u0627\u0644\u0637\u0627\u0621 \u0645\u0641\u062E\u0651\u0645\u0629 \u062A\u062E\u0631\u062C \u0645\u0646 \u0637\u0631\u0641 \u0627\u0644\u0644\u0633\u0627\u0646 \u0648\u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u0639\u0644\u064A\u0627 \u0645\u0639 \u0627\u0644\u062A\u0641\u062E\u064A\u0645. \u0627\u0644\u062A\u0627\u0621 \u0645\u0631\u0642\u0642\u0629 \u0628\u062F\u0648\u0646 \u062A\u0641\u062E\u064A\u0645." },
    { chars: ["\u0630", "\u0632", "\u0638"], tips: "\u0627\u0644\u0630\u0627\u0644 \u062A\u062E\u0631\u062C \u0645\u0646 \u0637\u0631\u0641 \u0627\u0644\u0644\u0633\u0627\u0646 \u0628\u064A\u0646 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0628\u062F\u0648\u0646 \u062A\u0641\u062E\u064A\u0645. \u0627\u0644\u0638\u0627\u0621 \u0645\u062B\u0644\u0647\u0627 \u0645\u0639 \u0627\u0644\u062A\u0641\u062E\u064A\u0645." },
    { chars: ["\u062D", "\u0647\u0640"], tips: "\u0627\u0644\u062D\u0627\u0621 \u062A\u062E\u0631\u062C \u0645\u0646 \u0648\u0633\u0637 \u0627\u0644\u062D\u0644\u0642 \u0645\u0639 \u0627\u062D\u062A\u0643\u0627\u0643. \u0627\u0644\u0647\u0627\u0621 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0628\u0631\u0641\u0642." },
    { chars: ["\u0639", "\u0621"], tips: "\u0627\u0644\u0639\u064A\u0646 \u062A\u062E\u0631\u062C \u0645\u0646 \u0648\u0633\u0637 \u0627\u0644\u062D\u0644\u0642 \u0645\u0639 \u0636\u063A\u0637. \u0627\u0644\u0647\u0645\u0632\u0629 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0628\u0627\u0646\u0642\u0637\u0627\u0639." },
    { chars: ["\u063A", "\u062E"], tips: "\u0627\u0644\u063A\u064A\u0646 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0645\u0639 \u0627\u0647\u062A\u0632\u0627\u0632. \u0627\u0644\u062E\u0627\u0621 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0628\u0627\u062D\u062A\u0643\u0627\u0643." },
    { chars: ["\u0642", "\u0643"], tips: "\u0627\u0644\u0642\u0627\u0641 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u0644\u0633\u0627\u0646 \u0645\u0639 \u0627\u0644\u062D\u0646\u0643 \u0627\u0644\u0644\u064A\u0646. \u0627\u0644\u0643\u0627\u0641 \u062A\u062E\u0631\u062C \u0645\u0646 \u0648\u0633\u0637 \u0627\u0644\u0644\u0633\u0627\u0646 \u0645\u0639 \u0627\u0644\u062D\u0646\u0643." },
    { chars: ["\u0636", "\u062F"], tips: "\u0627\u0644\u0636\u0627\u062F \u062A\u062E\u0631\u062C \u0645\u0646 \u062D\u0627\u0641\u0629 \u0627\u0644\u0644\u0633\u0627\u0646 \u0645\u0639 \u0627\u0644\u0623\u0636\u0631\u0627\u0633 \u0627\u0644\u0639\u0644\u064A\u0627 \u0645\u0639 \u0627\u0644\u062A\u0641\u062E\u064A\u0645. \u0627\u0644\u062F\u0627\u062F \u0645\u0631\u0642\u0642\u0629 \u0645\u0646 \u0637\u0631\u0641 \u0627\u0644\u0644\u0633\u0627\u0646." }
  ],
  // حروف صعبة على غير الناطقين
  difficult_for_non_native: ["\u0639", "\u063A", "\u062D", "\u062E", "\u0642", "\u0636", "\u0638", "\u0630", "\u062B"],
  // أوزان أهمية الحروف
  letter_difficulty: {
    "\u0636": 1.5,
    "\u0638": 1.5,
    "\u0639": 1.4,
    "\u063A": 1.4,
    "\u062D": 1.3,
    "\u062E": 1.3,
    "\u0642": 1.3,
    "\u0630": 1.2,
    "\u062B": 1.2,
    "\u0635": 1.2,
    "\u0637": 1.2
  },
  // قاموس التشكيل المشترك
  diacritics_patterns: {
    tanwin_fath: "\u064B",
    tanwin_kasr: "\u064D",
    tanwin_damm: "\u064C",
    shadda: "\u0651",
    sukun: "\u0652"
  }
};
function analyzePhoneticErrors(targetWord, recognizedWord) {
  const normTarget = normalizeArabic(targetWord);
  const normRecognized = normalizeArabic(recognizedWord);
  if (normTarget === normRecognized) return { hasError: false, tip: "", severity: "minor" };
  for (const pair of ARABIC_PHONETIC_RULES.confusable_pairs) {
    for (const char of pair.chars) {
      if (normTarget.includes(char) && !normRecognized.includes(char)) {
        const isDifficult = ARABIC_PHONETIC_RULES.difficult_for_non_native.includes(char);
        return {
          hasError: true,
          tip: pair.tips,
          severity: isDifficult ? "major" : "minor"
        };
      }
    }
  }
  return {
    hasError: true,
    tip: "\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0645\u062E\u0631\u062C \u0627\u0644\u062D\u0631\u0641 \u0648\u062D\u0627\u0648\u0644 \u0627\u0644\u0646\u0637\u0642 \u0628\u0628\u0637\u0621 \u0623\u0643\u062B\u0631",
    severity: "minor"
  };
}
function isRateLimitError(err) {
  if (!err) return false;
  const status = err.status || err.error && err.error.status;
  const code = err.code || err.error && err.error.code;
  const errMsg = String(err.message || err.error && err.error.message || "").toUpperCase();
  const errStr = JSON.stringify(err).toUpperCase();
  return status === "RESOURCE_EXHAUSTED" || code === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("QUOTA") || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("QUOTA");
}
function normalizeArabic(text) {
  if (!text) return "";
  return text.replace(/[أإآا]/g, "\u0627").replace(/[ةه]/g, "\u0647").replace(/[ىي]/g, "\u064A").replace(/[ؤئ]/g, "\u0621").replace(/[ًٌٍَُِّْ]/g, "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().replace(/\s+/g, " ");
}
function arabicWeightedLevenshtein(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const c1 = s1[i - 1];
      const c2 = s2[j - 1];
      let substitutionCost = 1;
      if (c1 === c2) {
        substitutionCost = 0;
      } else {
        const isPhoneticallySimilar = ARABIC_PHONETIC_RULES.confusable_pairs.some(
          (pair) => pair.chars.includes(c1) && pair.chars.includes(c2)
        );
        if (isPhoneticallySimilar) substitutionCost = 0.5;
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
function advancedArabicFallbackAnalysis(targetText, recognizedText) {
  const normTarget = normalizeArabic(targetText).split(" ").filter((w) => w);
  const rawTargetWords = targetText.replace(/[\u064B-\u065F]/g, "").split(" ").filter((w) => w);
  const normRecognized = normalizeArabic(recognizedText).split(" ").filter((w) => w);
  if (!recognizedText || normRecognized.length === 0) {
    return {
      score: 0,
      mistakes: rawTargetWords.slice(0, 3).map((w) => ({
        word: w,
        tip: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629. \u062A\u062D\u062F\u062B \u0628\u0635\u0648\u062A \u0623\u0639\u0644\u0649 \u0648\u0623\u0648\u0636\u062D.",
        severity: "major"
      })),
      feedback: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0635\u0648\u062A\u0643. \u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u0636\u0648\u062D \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0648\u0627\u0644\u062A\u062D\u062F\u062B \u0641\u064A \u0645\u0643\u0627\u0646 \u0647\u0627\u062F\u0626.",
      phonetic_score: 0,
      completeness_score: 0
    };
  }
  const mistakes = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let matchedWords = 0;
  for (let i = 0; i < normTarget.length; i++) {
    const tWord = normTarget[i];
    const wordWeight = [...tWord].reduce((acc, char) => {
      return acc + (ARABIC_PHONETIC_RULES.letter_difficulty[char] || 1);
    }, 0) / tWord.length;
    totalWeight += wordWeight;
    let bestSim = 0;
    let bestMatchWord = "";
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
  const phonetic_score = totalWeight > 0 ? totalWeightedScore / totalWeight * 100 : 0;
  const completeness_score = normTarget.length > 0 ? matchedWords / normTarget.length * 100 : 0;
  const finalScore = Math.round(phonetic_score * 0.7 + completeness_score * 0.3);
  const clampedScore = Math.min(100, Math.max(0, finalScore));
  let feedback = "";
  if (clampedScore >= 90) {
    feedback = "\u0645\u0645\u062A\u0627\u0632! \u0646\u0637\u0642\u0643 \u0631\u0627\u0626\u0639 \u0648\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u060C \u0627\u0633\u062A\u0645\u0631 \u0628\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0631\u0641\u064A\u0639!";
  } else if (clampedScore >= 75) {
    feedback = "\u062C\u064A\u062F \u062C\u062F\u0627\u064B! \u0646\u0637\u0642\u0643 \u0648\u0627\u0636\u062D \u0645\u0639 \u0628\u0639\u0636 \u0623\u062E\u0637\u0627\u0621 \u0628\u0633\u064A\u0637\u0629 \u064A\u0645\u0643\u0646 \u062A\u062D\u0633\u064A\u0646\u0647\u0627 \u0628\u0627\u0644\u062A\u062F\u0631\u064A\u0628.";
  } else if (clampedScore >= 60) {
    feedback = "\u0645\u062D\u0627\u0648\u0644\u0629 \u062C\u064A\u062F\u0629! \u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u064F\u0634\u0627\u0631 \u0625\u0644\u064A\u0647\u0627 \u0648\u0633\u062A\u062A\u062D\u0633\u0646 \u0628\u0633\u0631\u0639\u0629.";
  } else if (clampedScore >= 40) {
    feedback = "\u062A\u062D\u062A\u0627\u062C \u0645\u0632\u064A\u062F\u0627\u064B \u0645\u0646 \u0627\u0644\u062A\u062F\u0631\u064A\u0628. \u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0635\u062D\u064A\u062D \u0648\u0643\u0631\u0631 \u0639\u062F\u0629 \u0645\u0631\u0627\u062A.";
  } else {
    feedback = "\u0644\u0627 \u062A\u0633\u062A\u0633\u0644\u0645! \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0645\u0633\u062A\u0645\u0631 \u0647\u0648 \u0627\u0644\u0637\u0631\u064A\u0642 \u0644\u0644\u0625\u062A\u0642\u0627\u0646. \u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B \u0628\u0628\u0637\u0621 \u0623\u0643\u062B\u0631.";
  }
  return {
    score: clampedScore,
    mistakes: mistakes.slice(0, 5),
    // أقصى 5 أخطاء
    feedback,
    phonetic_score: Math.round(phonetic_score),
    completeness_score: Math.round(completeness_score)
  };
}
async function smartExerciseRecommendation(exercisePool, userId, category, level) {
  let recentAttempts = [];
  try {
    const attemptsRef = (0, import_firestore.collection)(db, "attempts");
    const q = (0, import_firestore.query)(attemptsRef, (0, import_firestore.where)("userId", "==", userId), (0, import_firestore.limit)(10));
    const snap = await (0, import_firestore.getDocs)(q);
    recentAttempts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
  }
  const recentExerciseIds = new Set(recentAttempts.map((a) => a.exerciseId));
  const exerciseScores = {};
  recentAttempts.forEach((attempt) => {
    if (!exerciseScores[attempt.exerciseId]) exerciseScores[attempt.exerciseId] = [];
    exerciseScores[attempt.exerciseId].push(attempt.score || 0);
  });
  const avgScore = recentAttempts.length > 0 ? recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / recentAttempts.length : 50;
  const scoredExercises = exercisePool.map((exercise) => {
    let weight = 100;
    if (recentExerciseIds.has(exercise.id)) {
      weight -= 30;
    }
    const levelMap = { "beginner": 1, "intermediate": 2, "advanced": 3 };
    const exerciseDifficulty = levelMap[exercise.level] || 1;
    const userPerformanceLevel = avgScore >= 80 ? 2 : avgScore >= 50 ? 1 : 0;
    const difficultyMatch = Math.abs(exerciseDifficulty - (userPerformanceLevel + 1));
    weight -= difficultyMatch * 15;
    const exerciseHistory = exerciseScores[exercise.id];
    if (exerciseHistory && exerciseHistory.length > 0) {
      const exerciseAvg = exerciseHistory.reduce((a, b) => a + b, 0) / exerciseHistory.length;
      if (exerciseAvg < 60) {
        weight += 20;
      } else if (exerciseAvg > 85) {
        weight -= 10;
      }
    }
    if (exercise.category === category) weight += 25;
    if (exercise.level === level) weight += 20;
    return { exercise, weight: Math.max(0, weight) };
  });
  const totalWeight = scoredExercises.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) {
    return exercisePool[Math.floor(Math.random() * exercisePool.length)];
  }
  let random = Math.random() * totalWeight;
  for (const { exercise, weight } of scoredExercises) {
    random -= weight;
    if (random <= 0) return exercise;
  }
  return exercisePool[exercisePool.length - 1];
}
async function generateContentWithFallbackAndRetry(params, models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"]) {
  let lastError = null;
  for (const modelName of models) {
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`Calling Gemini API via ${modelName} - attempt ${attempt}/${attempts}`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName
        });
        return response;
      } catch (err) {
        lastError = err;
        console.warn(`Gemini generation failed for model ${modelName} on attempt ${attempt}:`, err?.message || err);
        if (isRateLimitError(err)) {
          console.warn(`Rate limit / Quota exceeded for model ${modelName} (429/RESOURCE_EXHAUSTED). Moving to next model.`);
          break;
        }
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
var upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
async function startServer() {
  const app = (0, import_express.default)();
  app.set("trust proxy", 1);
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_body_parser.default.json());
  app.use((0, import_express_session.default)({
    secret: process.env.SESSION_SECRET || "natqi-session-secret",
    resave: false,
    saveUninitialized: false,
    // تغيير من true لـfalse
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      // منع JavaScript من الوصول
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 7 أيام
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
    }
  }));
  const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
  const analyzeLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    // 1 minute
    max: 10,
    // 10 requests per window
    message: { error: "\u0644\u0642\u062F \u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u062F\u0642\u064A\u0642\u0629" }
  });
  app.post("/api/auth/register", [
    (0, import_express_validator.body)("name").trim().escape().notEmpty(),
    (0, import_express_validator.body)("email").isEmail().normalizeEmail(),
    (0, import_express_validator.body)("password").isLength({ min: 6 }),
    (0, import_express_validator.body)("category").trim().escape()
  ], async (req, res) => {
    console.log("POST /api/auth/register request received");
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      console.log("Validation failed:", errors.array());
      return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    }
    try {
      const { name, email, password, category } = req.body;
      console.log("Checking if user exists for:", email);
      const usersRef = (0, import_firestore.collection)(db, "users");
      const q = (0, import_firestore.query)(usersRef, (0, import_firestore.where)("email", "==", email));
      console.log("Querying firestore...");
      const querySnapshot = await withTimeout((0, import_firestore.getDocs)(q));
      console.log("Query completed.");
      if (!querySnapshot.empty) {
        console.log("User already exists:", email);
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644" });
      }
      console.log("Hashing password...");
      const passwordHash = await import_bcryptjs.default.hash(password, 10);
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
        createdAt: (0, import_firestore.serverTimestamp)()
      };
      console.log("Adding user doc...");
      const docRef = await withTimeout((0, import_firestore.addDoc)(usersRef, userData));
      console.log("User doc added with ID:", docRef.id);
      const user = {
        id: docRef.id,
        name,
        email,
        category,
        level: "beginner",
        goal: "pronunciation",
        language_pref: "arabic_native",
        mic_sensitivity: 70
      };
      console.log("Signing JWT...");
      const token = import_jsonwebtoken.default.sign({ userId: docRef.id }, JWT_SECRET, { expiresIn: "7d" });
      console.log("Sending success response.");
      res.status(201).json({ token, user });
    } catch (error) {
      console.error("Detailed registration error:", error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628" });
    }
  });
  app.post("/api/auth/login", [
    (0, import_express_validator.body)("email").isEmail().normalizeEmail(),
    (0, import_express_validator.body)("password").notEmpty()
  ], async (req, res) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    try {
      const { email, password } = req.body;
      const usersRef = (0, import_firestore.collection)(db, "users");
      const q = (0, import_firestore.query)(usersRef, (0, import_firestore.where)("email", "==", email));
      const querySnapshot = await withTimeout((0, import_firestore.getDocs)(q));
      if (querySnapshot.empty) {
        return res.status(401).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const isPasswordValid = await import_bcryptjs.default.compare(password, userData.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const user = {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        category: userData.category,
        level: userData.level || "beginner",
        goal: userData.goal || "pronunciation",
        language_pref: userData.language_pref || "arabic_native",
        mic_sensitivity: userData.mic_sensitivity || 70
      };
      const token = import_jsonwebtoken.default.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    }
  });
  app.put("/api/user/profile", verifyToken, [
    (0, import_express_validator.body)("name").optional().trim().escape(),
    (0, import_express_validator.body)("email").optional().isEmail().normalizeEmail(),
    (0, import_express_validator.body)("currentPassword").optional(),
    (0, import_express_validator.body)("newPassword").optional()
  ], async (req, res) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    try {
      const { userId } = req;
      const { name, email, currentPassword, newPassword } = req.body;
      const userRef = (0, import_firestore.doc)(db, "users", userId);
      const userSnap = await (0, import_firestore.getDoc)(userRef);
      if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
      const userData = userSnap.data();
      if (email && email !== userData.email) {
        const usersRef = (0, import_firestore.collection)(db, "users");
        const q = (0, import_firestore.query)(usersRef, (0, import_firestore.where)("email", "==", email));
        const emailSnap = await (0, import_firestore.getDocs)(q);
        if (!emailSnap.empty) return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644" });
      }
      let updatedData = { name, email };
      if (newPassword) {
        const isPasswordValid = await import_bcryptjs.default.compare(currentPassword, userData.passwordHash);
        if (!isPasswordValid) return res.status(401).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
        updatedData.passwordHash = await import_bcryptjs.default.hash(newPassword, 10);
      }
      await (0, import_firestore.setDoc)(userRef, { ...userData, ...updatedData });
      const updatedUserSnap = await (0, import_firestore.getDoc)(userRef);
      const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() };
      delete updatedUser.passwordHash;
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A" });
    }
  });
  app.put("/api/user/settings", verifyToken, [
    (0, import_express_validator.body)("level").optional().trim().escape(),
    (0, import_express_validator.body)("goal").optional().trim().escape(),
    (0, import_express_validator.body)("language_pref").optional().trim().escape(),
    (0, import_express_validator.body)("mic_sensitivity").optional().isInt(),
    (0, import_express_validator.body)("category").optional().trim().escape()
  ], async (req, res) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    try {
      const { userId } = req;
      const { level, goal, language_pref, mic_sensitivity, category } = req.body;
      const userRef = (0, import_firestore.doc)(db, "users", userId);
      const userSnap = await (0, import_firestore.getDoc)(userRef);
      if (!userSnap.exists()) return res.status(404).json({ error: "User not found" });
      const updatedData = { level, goal, language_pref, mic_sensitivity, category };
      await (0, import_firestore.setDoc)(userRef, { ...userSnap.data(), ...updatedData });
      const updatedUserSnap = await (0, import_firestore.getDoc)(userRef);
      const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() };
      delete updatedUser.passwordHash;
      res.json(updatedUser);
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" });
    }
  });
  const seedExercises = async (force = false) => {
    try {
      const exercisesRef = (0, import_firestore.collection)(db, "exercises");
      const libraryRef = (0, import_firestore.collection)(db, "library_items");
      const sessionsRef = (0, import_firestore.collection)(db, "live_sessions");
      const exSnapshot = await (0, import_firestore.getDocs)(exercisesRef);
      if (exSnapshot.empty || force) {
        const samples = [
          // ========= فئة الأطفال — مستوى مبتدئ =========
          {
            title: "\u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u062F \u0627\u0644\u062B\u0644\u0627\u062B\u0629",
            text: "\u0623\u064E\u0646\u064E\u0627 \u0623\u064F\u062D\u0650\u0628\u064F\u0651 \u0623\u064F\u0645\u0650\u0651\u064A \u0648\u064E\u0623\u064E\u0628\u0650\u064A",
            level: "beginner",
            category: "children",
            description: "\u062A\u0645\u0631\u064A\u0646 \u0639\u0644\u0649 \u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u062F \u0648\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
            text_translation: "I love my mother and father",
            tips: "\u0627\u0646\u0637\u0642 \u0643\u0644 \u062D\u0631\u0643\u0629 \u0628\u0648\u0636\u0648\u062D: \u0627\u0644\u0641\u062A\u062D\u0629 \u0644\u0644\u0623\u0644\u0641\u060C \u0627\u0644\u0636\u0645\u0629 \u0644\u0644\u0648\u0627\u0648\u060C \u0627\u0644\u0643\u0633\u0631\u0629 \u0644\u0644\u064A\u0627\u0621",
            audio_correct_url: ""
          },
          {
            title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0634\u0645\u0633\u064A\u0629 \u0648\u0627\u0644\u0642\u0645\u0631\u064A\u0629",
            text: "\u0627\u0644\u0634\u064E\u0651\u0645\u0652\u0633\u064F \u062A\u064F\u0634\u0652\u0631\u0650\u0642\u064F \u0641\u0650\u064A \u0627\u0644\u0635\u064E\u0651\u0628\u064E\u0627\u062D\u0650",
            level: "beginner",
            category: "children",
            description: "\u0627\u0644\u0641\u0631\u0642 \u0628\u064A\u0646 \u0627\u0644 \u0627\u0644\u0634\u0645\u0633\u064A\u0629 \u0648\u0627\u0644 \u0627\u0644\u0642\u0645\u0631\u064A\u0629",
            text_translation: "The sun rises in the morning",
            tips: "\u0639\u0646\u062F\u0645\u0627 \u062A\u0623\u062A\u064A \u0627\u0644 \u0642\u0628\u0644 \u062D\u0631\u0641 \u0634\u0645\u0633\u064A\u060C \u062A\u0646\u062F\u063A\u0645 \u0627\u0644\u0644\u0627\u0645 \u0641\u064A \u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0630\u064A \u064A\u0644\u064A\u0647\u0627. \u0647\u0646\u0627 \u0627\u0644\u0634\u0645\u0633 = \u0627\u0634-\u0634\u0645\u0633",
            audio_correct_url: ""
          },
          {
            title: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u0627\u062A\u062D\u0629 \u2014 \u0627\u0644\u0622\u064A\u0629 \u0627\u0644\u0623\u0648\u0644\u0649",
            text: "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0627\u0644\u0631\u064E\u0651\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u064E\u0651\u062D\u0650\u064A\u0645\u0650",
            level: "beginner",
            category: "children",
            description: "\u062D\u0641\u0638 \u0648\u0646\u0637\u0642 \u0627\u0644\u0628\u0633\u0645\u0644\u0629 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D",
            text_translation: "In the name of Allah, the Most Gracious, the Most Merciful",
            tips: "\u0627\u0644\u0644\u0627\u0645 \u0641\u064A \u0644\u0641\u0638 \u0627\u0644\u062C\u0644\u0627\u0644\u0629 (\u0627\u0644\u0644\u0647) \u0645\u0641\u062E\u0651\u0645\u0629 \u0628\u0639\u062F \u0627\u0644\u0641\u062A\u062D\u0629 \u0648\u0627\u0644\u0636\u0645\u0629\u060C \u0645\u0631\u0642\u0642\u0629 \u0628\u0639\u062F \u0627\u0644\u0643\u0633\u0631\u0629",
            audio_correct_url: ""
          },
          {
            title: "\u0623\u0631\u0642\u0627\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
            text: "\u0648\u064E\u0627\u062D\u0650\u062F\u064C \u0627\u062B\u0652\u0646\u064E\u0627\u0646\u0650 \u062B\u064E\u0644\u064E\u0627\u062B\u064E\u0629\u064C \u0623\u064E\u0631\u0652\u0628\u064E\u0639\u064E\u0629\u064C \u062E\u064E\u0645\u0652\u0633\u064E\u0629\u064C",
            level: "beginner",
            category: "children",
            description: "\u0646\u0637\u0642 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0645\u0646 1 \u0625\u0644\u0649 5 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649",
            text_translation: "One, two, three, four, five",
            tips: "\u0627\u0646\u062A\u0628\u0647 \u0644\u0644\u062A\u0646\u0648\u064A\u0646 \u0641\u064A \u0622\u062E\u0631 \u0643\u0644 \u0643\u0644\u0645\u0629\u060C \u0648\u0644\u0644\u062B\u0627\u0621 \u0641\u064A '\u0627\u062B\u0646\u0627\u0646' \u0648'\u062B\u0644\u0627\u062B\u0629'",
            audio_correct_url: ""
          },
          // ========= فئة الأطفال — مستوى متوسط =========
          {
            title: "\u0645\u0632\u062F\u0648\u062C \u0627\u0644\u0633\u064A\u0646 \u0648\u0627\u0644\u0635\u0627\u062F",
            text: "\u0633\u064E\u0627\u0631\u064E \u0633\u064E\u0645\u0650\u064A\u0631\u064C \u0625\u0650\u0644\u064E\u0649 \u0633\u064F\u0648\u0642\u0650 \u0627\u0644\u0635\u064E\u0651\u0628\u064E\u0627\u062D\u0650",
            level: "intermediate",
            category: "children",
            description: "\u0627\u0644\u062A\u0645\u064A\u064A\u0632 \u0628\u064A\u0646 \u0627\u0644\u0633\u064A\u0646 \u0648\u0627\u0644\u0635\u0627\u062F \u0641\u064A \u0633\u064A\u0627\u0642 \u0648\u0627\u062D\u062F",
            text_translation: "Samir walked to the morning market",
            tips: "\u0627\u0644\u0633\u064A\u0646 \u0645\u0631\u0642\u0642\u0629 \u0648\u0627\u0644\u0647\u0648\u0627\u0621 \u064A\u062E\u0631\u062C \u0628\u064A\u0646 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0628\u062F\u0648\u0646 \u0635\u0648\u062A. \u0627\u0644\u0635\u0627\u062F \u0645\u0641\u062E\u0645\u0629 \u0645\u0639 \u0631\u0641\u0639 \u0645\u0624\u062E\u0631\u0629 \u0627\u0644\u0644\u0633\u0627\u0646",
            audio_correct_url: ""
          },
          // ========= فئة البالغين — مستوى مبتدئ =========
          {
            title: "\u062A\u062D\u064A\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645",
            text: "\u0627\u0644\u0633\u064E\u0651\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0648\u064E\u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u0648\u064E\u0628\u064E\u0631\u064E\u0643\u064E\u0627\u062A\u064F\u0647\u064F",
            level: "beginner",
            category: "adults",
            description: "\u0646\u0637\u0642 \u0627\u0644\u062A\u062D\u064A\u0629 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D",
            text_translation: "Peace, mercy, and blessings of Allah be upon you",
            tips: "\u0627\u0644\u0639\u064A\u0646 \u0641\u064A '\u0639\u0644\u064A\u0643\u0645' \u062A\u062E\u0631\u062C \u0645\u0646 \u0648\u0633\u0637 \u0627\u0644\u062D\u0644\u0642 \u0645\u0639 \u0636\u063A\u0637. \u0627\u062C\u0639\u0644 \u0635\u0648\u062A\u0647\u0627 \u0645\u0645\u064A\u0632\u0627\u064B \u0648\u0644\u064A\u0633 \u0647\u0627\u0621\u064B",
            audio_correct_url: ""
          },
          {
            title: "\u062D\u0631\u0641 \u0627\u0644\u0636\u0627\u062F \u2014 \u0635\u0648\u062A \u0627\u0644\u0639\u0631\u0628",
            text: "\u0627\u0644\u0636\u064E\u0651\u0628\u064E\u0627\u0628\u064F \u064A\u064F\u063A\u064E\u0637\u0650\u0651\u064A \u0627\u0644\u0636\u0650\u0651\u0641\u064E\u0627\u0641\u064E \u0627\u0644\u062E\u064E\u0636\u0652\u0631\u064E\u0627\u0621\u064E",
            level: "beginner",
            category: "adults",
            description: "\u0625\u062A\u0642\u0627\u0646 \u062D\u0631\u0641 \u0627\u0644\u0636\u0627\u062F \u0627\u0644\u0645\u0645\u064A\u0632 \u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
            text_translation: "The fog covers the green banks",
            tips: "\u0627\u0644\u0636\u0627\u062F \u064A\u062E\u0631\u062C \u0645\u0646 \u062D\u0627\u0641\u0629 \u0627\u0644\u0644\u0633\u0627\u0646 \u0627\u0644\u064A\u0645\u0646\u0649 \u0623\u0648 \u0627\u0644\u064A\u0633\u0631\u0649 \u0645\u0639 \u0627\u0644\u0623\u0636\u0631\u0627\u0633 \u0627\u0644\u0639\u0644\u064A\u0627 \u0645\u0639 \u0627\u0644\u062A\u0641\u062E\u064A\u0645. \u0647\u0630\u0627 \u0627\u0644\u062D\u0631\u0641 \u0641\u0631\u064A\u062F \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
            audio_correct_url: ""
          },
          {
            title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u062D\u0644\u0642\u064A\u0629",
            text: "\u0639\u064E\u0644\u064E\u0651\u0645\u064E \u0627\u0644\u0625\u0650\u0646\u0652\u0633\u064E\u0627\u0646\u064E \u0645\u064E\u0627 \u0644\u064E\u0645\u0652 \u064A\u064E\u0639\u0652\u0644\u064E\u0645\u0652",
            level: "beginner",
            category: "adults",
            description: "\u062A\u062F\u0631\u064A\u0628 \u0639\u0644\u0649 \u0646\u0637\u0642 \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u062D\u0644\u0642\u064A\u0629: \u0627\u0644\u0639\u064A\u0646 \u0648\u0627\u0644\u0647\u0645\u0632\u0629",
            text_translation: "He taught man what he did not know",
            tips: "\u0627\u0644\u0639\u064A\u0646 \u062D\u0631\u0641 \u062D\u0644\u0642\u064A \u064A\u062D\u062A\u0627\u062C \u0636\u063A\u0637\u0627\u064B \u0641\u064A \u0648\u0633\u0637 \u0627\u0644\u062D\u0644\u0642. \u0627\u0644\u0647\u0645\u0632\u0629 \u0627\u0646\u0642\u0637\u0627\u0639 \u0647\u0648\u0627\u0626\u064A \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642",
            audio_correct_url: ""
          },
          {
            title: "\u0627\u0644\u063A\u064A\u0646 \u0648\u0627\u0644\u062E\u0627\u0621",
            text: "\u062E\u064E\u064A\u0652\u0631\u064F \u0627\u0644\u0643\u064E\u0644\u064E\u0627\u0645\u0650 \u0645\u064E\u0627 \u0642\u064E\u0644\u064E\u0651 \u0648\u064E\u062F\u064E\u0644\u064E\u0651",
            level: "intermediate",
            category: "adults",
            description: "\u0627\u0644\u0641\u0631\u0642 \u0628\u064A\u0646 \u0627\u0644\u063A\u064A\u0646 \u0648\u0627\u0644\u062E\u0627\u0621 \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645",
            text_translation: "The best speech is that which is concise and meaningful",
            tips: "\u0627\u0644\u062E\u0627\u0621 \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0628\u0627\u062D\u062A\u0643\u0627\u0643 \u0628\u062F\u0648\u0646 \u0627\u0647\u062A\u0632\u0627\u0632. \u0627\u0644\u063A\u064A\u0646 \u0645\u062B\u0644\u0647\u0627 \u0645\u0639 \u0627\u0647\u062A\u0632\u0627\u0632 \u0627\u0644\u0648\u062A\u0631\u064A\u0646 \u0627\u0644\u0635\u0648\u062A\u064A\u064A\u0646",
            audio_correct_url: ""
          },
          // ========= فئة الطلاب =========
          {
            title: "\u0645\u062B\u0644 \u0639\u0631\u0628\u064A \u0641\u0635\u064A\u062D \u2014 \u0627\u0644\u0646\u062C\u0627\u062D",
            text: "\u0645\u064E\u0646\u0652 \u062C\u064E\u062F\u064E\u0651 \u0648\u064E\u062C\u064E\u062F\u064E \u0648\u064E\u0645\u064E\u0646\u0652 \u0632\u064E\u0631\u064E\u0639\u064E \u062D\u064E\u0635\u064E\u062F\u064E",
            level: "beginner",
            category: "students",
            description: "\u0645\u062B\u0644 \u0639\u0631\u0628\u064A \u0639\u0646 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0645\u062B\u0627\u0628\u0631\u0629",
            text_translation: "He who strives shall succeed, he who plants shall harvest",
            tips: "\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u062A\u0634\u062F\u064A\u062F \u0627\u0644\u062F\u0627\u0644 \u0641\u064A '\u062C\u062F\u064E\u0651' \u0648\u062A\u0634\u062F\u064A\u062F \u0627\u0644\u062F\u0627\u0644 \u0641\u064A '\u0648\u062C\u062F'. \u0643\u0644 \u062D\u0631\u0641 \u0645\u0634\u062F\u062F \u064A\u0646\u0637\u0642 \u0645\u0631\u062A\u064A\u0646",
            audio_correct_url: ""
          },
          {
            title: "\u0622\u064A\u0629 \u0642\u0631\u0622\u0646\u064A\u0629 \u2014 \u0627\u0644\u062D\u062C\u0631\u0627\u062A",
            text: "\u064A\u064E\u0627 \u0623\u064E\u064A\u064F\u0651\u0647\u064E\u0627 \u0627\u0644\u064E\u0651\u0630\u0650\u064A\u0646\u064E \u0622\u0645\u064E\u0646\u064F\u0648\u0627 \u0627\u062C\u0652\u062A\u064E\u0646\u0650\u0628\u064F\u0648\u0627 \u0643\u064E\u062B\u0650\u064A\u0631\u064B\u0627 \u0645\u0650\u0646\u064E \u0627\u0644\u0638\u064E\u0651\u0646\u0650\u0651",
            level: "intermediate",
            category: "students",
            description: "\u062A\u0644\u0627\u0648\u0629 \u0622\u064A\u0629 \u0643\u0631\u064A\u0645\u0629 \u0645\u0639 \u0645\u0631\u0627\u0639\u0627\u0629 \u0627\u0644\u062A\u062C\u0648\u064A\u062F",
            text_translation: "O you who have believed, avoid much suspicion",
            tips: "\u0627\u0644\u0638\u0627\u0621 \u0641\u064A '\u0627\u0644\u0638\u0646' \u0645\u0641\u062E\u0651\u0645\u0629 \u062A\u062E\u0631\u062C \u0643\u0627\u0644\u0630\u0627\u0644 \u0645\u0639 \u0627\u0644\u062A\u0641\u062E\u064A\u0645. '\u0622\u0645\u0646\u0648\u0627' \u0645\u062F\u0651\u0647\u0627 \u0628\u0645\u0642\u062F\u0627\u0631 \u062D\u0631\u0643\u062A\u064A\u0646",
            audio_correct_url: ""
          },
          {
            title: "\u062E\u0637\u0628\u0629 \u062C\u0645\u0639\u0629 \u2014 \u0645\u0642\u0637\u0639",
            text: "\u0625\u0650\u0646\u064E\u0651 \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064E \u0644\u0650\u0644\u064E\u0651\u0647\u0650 \u0646\u064E\u062D\u0652\u0645\u064E\u062F\u064F\u0647\u064F \u0648\u064E\u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F\u0647\u064F \u0648\u064E\u0646\u064E\u0633\u0652\u062A\u064E\u063A\u0652\u0641\u0650\u0631\u064F\u0647\u064F",
            level: "intermediate",
            category: "students",
            description: "\u062A\u062F\u0631\u064A\u0628 \u0639\u0644\u0649 \u062E\u0637\u0627\u0628\u0629 \u0628\u0645\u0633\u062A\u0648\u0649 \u0631\u0641\u064A\u0639",
            text_translation: "Indeed, all praise is for Allah. We praise Him, seek His help and forgiveness.",
            tips: "\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0627\u0644\u0646\u0648\u0646 \u0627\u0644\u0645\u0634\u062F\u062F\u0629 \u0641\u064A '\u0625\u0646' \u0648\u0627\u0644\u062A\u0634\u062F\u064A\u062F \u0641\u064A '\u0627\u0644\u0644\u0647'. \u0643\u0644\u0645\u0629 '\u0646\u0633\u062A\u063A\u0641\u0631\u0647' \u0641\u064A\u0647\u0627 \u063A\u064A\u0646 \u0648\u0641\u0627\u0621 \u0648\u0645\u0648\u0627\u0636\u0639 \u062F\u0642\u064A\u0642\u0629",
            audio_correct_url: ""
          },
          {
            title: "\u062D\u062F\u064A\u062B \u0646\u0628\u0648\u064A \u0634\u0631\u064A\u0641",
            text: "\u0625\u0650\u0646\u064E\u0651\u0645\u064E\u0627 \u0627\u0644\u0623\u064E\u0639\u0652\u0645\u064E\u0627\u0644\u064F \u0628\u0650\u0627\u0644\u0646\u0650\u0651\u064A\u064E\u0651\u0627\u062A\u0650 \u0648\u064E\u0625\u0650\u0646\u064E\u0651\u0645\u064E\u0627 \u0644\u0650\u0643\u064F\u0644\u0650\u0651 \u0627\u0645\u0652\u0631\u0650\u0626\u064D \u0645\u064E\u0627 \u0646\u064E\u0648\u064E\u0649",
            level: "advanced",
            category: "students",
            description: "\u0646\u0637\u0642 \u0627\u0644\u062D\u062F\u064A\u062B \u0627\u0644\u0646\u0628\u0648\u064A \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0635\u062D\u064A\u062D\u064A\u0646",
            text_translation: "Indeed, deeds are by intentions, and for each person what he intended",
            tips: "\u0627\u0644\u0646\u064A\u0629 \u0641\u064A '\u0627\u0644\u0646\u064A\u0627\u062A' \u0644\u0647\u0627 \u064A\u0627\u0621 \u0645\u0634\u062F\u062F\u0629. '\u0627\u0645\u0631\u0626' \u0647\u0645\u0632\u0629 \u0641\u064A \u0627\u0644\u0648\u0633\u0637 \u062A\u062D\u062A\u0627\u062C \u0627\u0646\u0642\u0637\u0627\u0639\u0627\u064B \u0647\u0648\u0627\u0626\u064A\u0627\u064B \u0648\u0627\u0636\u062D\u0627\u064B",
            audio_correct_url: ""
          },
          // ========= فئة غير الناطقين =========
          {
            title: "\u0627\u0644\u062A\u062D\u064A\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
            text: "\u0635\u064E\u0628\u064E\u0627\u062D\u064F \u0627\u0644\u062E\u064E\u064A\u0652\u0631\u0650\u060C \u0643\u064E\u064A\u0652\u0641\u064E \u062D\u064E\u0627\u0644\u064F\u0643\u064E\u061F",
            level: "beginner",
            category: "non-native",
            description: "\u062A\u062D\u064A\u0629 \u0627\u0644\u0635\u0628\u0627\u062D \u0648\u0627\u0644\u0633\u0624\u0627\u0644 \u0639\u0646 \u0627\u0644\u062D\u0627\u0644",
            text_translation: "Good morning, how are you?",
            tips: "\u0627\u0644\u062E\u0627\u0621 \u0641\u064A '\u0627\u0644\u062E\u064A\u0631' \u062A\u062E\u0631\u062C \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0645\u062B\u0644 \u062D\u0631\u0641 'ch' \u0641\u064A \u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A\u0629 (Bach). \u0644\u0627 \u062A\u0639\u0648\u0651\u0636\u0647\u0627 \u0628\u062D\u0631\u0641 'k'",
            audio_correct_url: ""
          },
          {
            title: "\u0627\u0644\u062A\u0639\u0631\u064A\u0641 \u0628\u0627\u0644\u0646\u0641\u0633",
            text: "\u0627\u0633\u0652\u0645\u0650\u064A \u0643\u064E\u0627\u0631\u0650\u064A\u0645\u060C \u0623\u064E\u0646\u064E\u0627 \u0623\u064E\u062A\u064E\u0639\u064E\u0644\u064E\u0651\u0645\u064F \u0627\u0644\u0652\u0639\u064E\u0631\u064E\u0628\u0650\u064A\u064E\u0651\u0629\u064E",
            level: "beginner",
            category: "non-native",
            description: "\u062C\u0645\u0644\u0629 \u062A\u0639\u0631\u064A\u0641\u064A\u0629 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0645\u0628\u062A\u062F\u0626\u064A\u0646",
            text_translation: "My name is Karim, I am learning Arabic",
            tips: "\u0627\u0644\u0647\u0645\u0632\u0629 \u0641\u064A '\u0623\u0646\u0627' \u0648'\u0623\u062A\u0639\u0644\u0645' \u062A\u0628\u062F\u0623 \u0645\u0646 \u0623\u0642\u0635\u0649 \u0627\u0644\u062D\u0644\u0642 \u0628\u0627\u0646\u0642\u0637\u0627\u0639. \u0644\u0627 \u062A\u0628\u062F\u0623 \u0627\u0644\u0643\u0644\u0645\u0629 \u0628\u062F\u0648\u0646\u0647\u0627",
            audio_correct_url: ""
          },
          {
            title: "\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u062A\u0633\u0648\u0642",
            text: "\u0643\u064E\u0645\u0650 \u0627\u0644\u062B\u064E\u0651\u0645\u064E\u0646\u064F\u061F \u0647\u064E\u0630\u064E\u0627 \u063A\u064E\u0627\u0644\u064D \u062C\u0650\u062F\u064B\u0651\u0627",
            level: "intermediate",
            category: "non-native",
            description: "\u0644\u063A\u0629 \u0627\u0644\u062A\u0633\u0648\u0642 \u0648\u0627\u0644\u062A\u0641\u0627\u0648\u0636 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
            text_translation: "How much is the price? This is very expensive",
            tips: "\u0627\u0644\u062B\u0627\u0621 \u0641\u064A '\u0627\u0644\u062B\u0645\u0646' \u0645\u062B\u0644 'th' \u0641\u064A \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 (think). \u0627\u0644\u063A\u064A\u0646 \u0641\u064A '\u063A\u0627\u0644\u064D' \u0635\u0648\u062A \u0639\u0645\u064A\u0642 \u0645\u0646 \u0627\u0644\u062D\u0644\u0642",
            audio_correct_url: ""
          },
          {
            title: "\u0648\u0635\u0641 \u0627\u0644\u0637\u0639\u0627\u0645",
            text: "\u0627\u0644\u0637\u064E\u0651\u0639\u064E\u0627\u0645\u064F \u0644\u064E\u0630\u0650\u064A\u0630\u064C \u062C\u0650\u062F\u064B\u0651\u0627\u060C \u0634\u064F\u0643\u0652\u0631\u064B\u0627 \u062C\u064E\u0632\u0650\u064A\u0644\u064B\u0627",
            level: "beginner",
            category: "non-native",
            description: "\u0627\u0644\u062A\u0639\u0628\u064A\u0631 \u0639\u0646 \u0627\u0644\u062A\u0642\u062F\u064A\u0631 \u0648\u0627\u0644\u0634\u0643\u0631",
            text_translation: "The food is very delicious, thank you very much",
            tips: "\u0627\u0644\u0637\u0627\u0621 \u0641\u064A '\u0627\u0644\u0637\u0639\u0627\u0645' \u0645\u0641\u062E\u0651\u0645\u0629 \u2014 \u0623\u0639\u0644\u0649 \u0635\u0648\u062A\u0627\u064B \u0645\u0646 \u0627\u0644\u062A\u0627\u0621 \u0627\u0644\u0639\u0627\u062F\u064A\u0629. \u0627\u0644\u062C\u064A\u0645 \u0641\u064A '\u062C\u0632\u064A\u0644\u0627\u064B' \u062C\u064A\u0645 \u0645\u0635\u0631\u064A\u0629 \u0623\u0648 \u062C\u064A\u0645 \u0641\u0635\u062D\u0649 \u062D\u0633\u0628 \u0627\u0644\u062A\u0642\u0637\u064A\u0631",
            audio_correct_url: ""
          }
        ];
        for (const s of samples) {
          await (0, import_firestore.addDoc)(exercisesRef, { ...s, createdAt: (0, import_firestore.serverTimestamp)() });
        }
      }
      const libSnapshot = await (0, import_firestore.getDocs)(libraryRef);
      if (libSnapshot.empty) {
        const libSamples = [
          {
            title: "\u0623\u0633\u0627\u0633\u064A\u0627\u062A \u0645\u062E\u0627\u0631\u062C \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
            description: "\u0634\u0631\u062D \u0639\u0644\u0645\u064A \u0644\u0645\u062E\u0627\u0631\u062C \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u064017 \u0648\u0645\u0648\u0627\u0636\u0639\u0647\u0627",
            category: "adults",
            type: "video",
            url: "https://www.youtube.com/embed/Rty9oEFkVGk",
            thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"
          },
          {
            title: "\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u062D\u0631\u0648\u0641 \u0644\u0644\u0623\u0637\u0641\u0627\u0644 \u0628\u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0623\u0635\u0648\u0627\u062A",
            description: "\u0637\u0631\u064A\u0642\u0629 \u0645\u0645\u062A\u0639\u0629 \u0648\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u062A\u0646\u0627\u0633\u0628 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0645\u0646 4 \u0625\u0644\u0649 10 \u0633\u0646\u0648\u0627\u062A",
            category: "children",
            type: "video",
            url: "https://www.youtube.com/embed/ygKhRm-T-0c",
            thumbnail: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80"
          },
          {
            title: "Arabic Pronunciation for Beginners",
            description: "\u062F\u0648\u0631\u0629 \u0645\u062A\u0643\u0627\u0645\u0644\u0629 \u0644\u0644\u0646\u0627\u0637\u0642\u064A\u0646 \u0628\u063A\u064A\u0631 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u2014 \u0645\u0646 \u0627\u0644\u0623\u0644\u0641 \u0625\u0644\u0649 \u0627\u0644\u064A\u0627\u0621",
            category: "non-native",
            type: "video",
            url: "https://www.youtube.com/embed/4X5O0DnxBcU",
            thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80"
          },
          {
            title: "\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u062A\u062C\u0648\u064A\u062F \u0627\u0644\u0645\u0628\u0633\u0637\u0629 \u0644\u0644\u0637\u0644\u0627\u0628",
            description: "\u0623\u062D\u0643\u0627\u0645 \u0627\u0644\u0646\u0648\u0646 \u0627\u0644\u0633\u0627\u0643\u0646\u0629 \u0648\u0627\u0644\u062A\u0646\u0648\u064A\u0646 \u0648\u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u062F \u0628\u0623\u0633\u0644\u0648\u0628 \u0633\u0647\u0644",
            category: "students",
            type: "video",
            url: "https://www.youtube.com/embed/8JEtCJRSEzk",
            thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80"
          },
          {
            title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0635\u0639\u0628\u0629: \u0636\u0627\u062F \u0638\u0627\u0621 \u0639\u064A\u0646 \u063A\u064A\u0646",
            description: "\u062A\u0645\u0627\u0631\u064A\u0646 \u0645\u0643\u062B\u0641\u0629 \u0639\u0644\u0649 \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0623\u0635\u0639\u0628 \u0641\u064A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0644\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646",
            category: "non-native",
            type: "video",
            url: "https://www.youtube.com/embed/fKiJqUJDvuA",
            thumbnail: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&q=80"
          },
          {
            title: "\u0642\u0635\u0635 \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0644\u0644\u0623\u0637\u0641\u0627\u0644",
            description: "\u0643\u0644 \u062D\u0631\u0641 \u0644\u0647 \u0642\u0635\u0629 \u0645\u0645\u062A\u0639\u0629 \u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0637\u0641\u0644 \u0639\u0644\u0649 \u062A\u0630\u0643\u0631\u0647 \u0648\u0646\u0637\u0642\u0647",
            category: "children",
            type: "video",
            url: "https://www.youtube.com/embed/PKPXjvl_kEI",
            thumbnail: "https://images.unsplash.com/photo-1551966775-a4ddc8df052b?w=400&q=80"
          }
        ];
        for (const s of libSamples) {
          await (0, import_firestore.addDoc)(libraryRef, { ...s, createdAt: (0, import_firestore.serverTimestamp)() });
        }
      }
      const sessionsSnapshot = await (0, import_firestore.getDocs)(sessionsRef);
      if (sessionsSnapshot.empty) {
        const tomorrow = /* @__PURE__ */ new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        const nextWeek = /* @__PURE__ */ new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(20, 0, 0, 0);
        const sessionsSamples = [
          {
            title: "\u062C\u0644\u0633\u0629 \u062A\u0635\u062D\u064A\u062D \u0645\u062E\u0627\u0631\u062C \u0627\u0644\u062D\u0631\u0648\u0641",
            instructor: "\u062F. \u0623\u062D\u0645\u062F \u0639\u0644\u064A",
            datetime: tomorrow.toISOString(),
            remaining: 5,
            totalSpots: 10,
            category: "adults"
          },
          {
            title: "\u062A\u0639\u0644\u0645 \u0627\u0644\u062D\u0631\u0648\u0641 \u0645\u0646 \u062E\u0644\u0627\u0644 \u0627\u0644\u0642\u0635\u0635",
            instructor: "\u0623. \u0633\u0627\u0631\u0629 \u062E\u0627\u0644\u062F",
            datetime: nextWeek.toISOString(),
            remaining: 0,
            totalSpots: 8,
            category: "children"
          }
        ];
        for (const s of sessionsSamples) {
          await (0, import_firestore.addDoc)(sessionsRef, { ...s, createdAt: (0, import_firestore.serverTimestamp)() });
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
      const libraryRef = (0, import_firestore.collection)(db, "library_items");
      let q = (0, import_firestore.query)(libraryRef);
      if (category && category !== "all") {
        q = (0, import_firestore.query)(libraryRef, (0, import_firestore.where)("category", "==", category));
      }
      const snapshot = await (0, import_firestore.getDocs)(q);
      const items = snapshot.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/sessions", verifyToken, async (req, res) => {
    try {
      const sessionsRef = (0, import_firestore.collection)(db, "live_sessions");
      const q = (0, import_firestore.query)(sessionsRef, (0, import_firestore.where)("datetime", ">", (/* @__PURE__ */ new Date()).toISOString()), (0, import_firestore.orderBy)("datetime", "asc"));
      const snapshot = await (0, import_firestore.getDocs)(q);
      const sessions = snapshot.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
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
      const sessionDocRef = (0, import_firestore.doc)(db, "live_sessions", sessionId);
      const sessionSnap = await (0, import_firestore.getDoc)(sessionDocRef);
      if (!sessionSnap.exists()) return res.status(404).json({ error: "Session not found" });
      const sessionData = sessionSnap.data();
      if (sessionData.remaining <= 0) return res.status(400).json({ error: "Session is full" });
      const bookingsRef = (0, import_firestore.collection)(db, "session_bookings");
      const q = (0, import_firestore.query)(bookingsRef, (0, import_firestore.where)("userId", "==", userId), (0, import_firestore.where)("sessionId", "==", sessionId));
      const bookingSnap = await (0, import_firestore.getDocs)(q);
      if (!bookingSnap.empty) return res.status(400).json({ error: "\u062A\u0645 \u062D\u062C\u0632 \u0645\u0648\u0639\u062F \u0645\u0633\u0628\u0642 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629" });
      await (0, import_firestore.addDoc)(bookingsRef, {
        userId,
        sessionId,
        bookedAt: (0, import_firestore.serverTimestamp)()
      });
      await (0, import_firestore.setDoc)(sessionDocRef, {
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
      if (req.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const attemptsRef = (0, import_firestore.collection)(db, "attempts");
      let attempts = [];
      try {
        const q = (0, import_firestore.query)(
          attemptsRef,
          (0, import_firestore.where)("userId", "==", userId),
          (0, import_firestore.orderBy)("attemptDate", "desc"),
          (0, import_firestore.limit)(30)
        );
        const snapshot = await (0, import_firestore.getDocs)(q);
        attempts = snapshot.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
      } catch (indexErr) {
        console.warn("Index missing, falling back to unordered query:", indexErr);
        const fallbackQ = (0, import_firestore.query)(attemptsRef, (0, import_firestore.where)("userId", "==", userId), (0, import_firestore.limit)(30));
        const fallbackSnap = await (0, import_firestore.getDocs)(fallbackQ);
        attempts = fallbackSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
        attempts.sort((a, b) => {
          const aDate = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
          const bDate = b.attemptDate?.toDate?.() || new Date(b.attemptDate || 0);
          return bDate.getTime() - aDate.getTime();
        });
      }
      const totalAttempts = attempts.length;
      const bestScore = totalAttempts > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
      const averageScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : 0;
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        last7Days.push({
          date: d.toISOString().split("T")[0],
          dayName: d.toLocaleDateString("ar-EG", { weekday: "long" }),
          score: 0
        });
      }
      attempts.forEach((a) => {
        const attemptDate = a.attemptDate;
        let dateStr = "";
        if (attemptDate && typeof attemptDate.toDate === "function") {
          dateStr = attemptDate.toDate().toISOString().split("T")[0];
        } else if (attemptDate) {
          dateStr = new Date(attemptDate).toISOString().split("T")[0];
        }
        const day = last7Days.find((d) => d.date === dateStr);
        if (day) {
          day.score = Math.max(day.score, a.score);
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
  app.post("/api/analyze/demo", verifyToken, async (req, res) => {
    const { text, simulatedText } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const result = advancedArabicFallbackAnalysis(text, simulatedText || text);
    res.json({ ...result, mode: "demo", attemptDate: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/analyze", verifyToken, analyzeLimiter, upload.single("audio"), async (req, res) => {
    try {
      const { exerciseId, userId, text, recognizedText } = req.body;
      let analysisResult = null;
      let usedFallback = false;
      if (GEMINI_API_KEY && req.file) {
        try {
          const audioBase64 = req.file.buffer.toString("base64");
          const mimeType = req.file.mimetype || "audio/webm";
          const prompt = `\u0623\u0646\u062A \u0623\u0633\u062A\u0627\u0630 \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0644\u0646\u0637\u0642 \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0641\u0635\u064A\u062D \u0648\u0639\u0644\u0645 \u0627\u0644\u0623\u0635\u0648\u0627\u062A.
\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0642\u0631\u0623 \u0627\u0644\u0646\u0635 \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u062A\u0627\u0644\u064A \u0628\u0635\u0648\u062A \u0639\u0627\u0644\u064D: "${text}"

\u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u0627\u0644\u0645\u0631\u0641\u0642 \u0648\u0642\u064A\u0651\u0645 \u0646\u0637\u0642\u0647.

\u0623\u0639\u062F JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A (\u0628\u062F\u0648\u0646 \u0623\u064A \u0646\u0635 \u0622\u062E\u0631 \u0623\u0648 markdown):
{
  "score": [\u0631\u0642\u0645 \u0645\u0646 0 \u0625\u0644\u0649 100 \u064A\u0645\u062B\u0644 \u062F\u0642\u0629 \u0627\u0644\u0646\u0637\u0642],
  "mistakes": [\u0642\u0627\u0626\u0645\u0629 \u0628\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u062A\u064A \u0646\u064F\u0637\u0642\u062A \u0628\u0634\u0643\u0644 \u062E\u0627\u0637\u0626\u060C \u0643\u0644 \u0639\u0646\u0635\u0631: {"word": "\u0627\u0644\u0643\u0644\u0645\u0629", "tip": "\u0646\u0635\u064A\u062D\u0629 \u0642\u0635\u064A\u0631\u0629 \u0644\u0644\u062A\u0635\u062D\u064A\u062D"}],
  "feedback": "\u0645\u0644\u0627\u062D\u0638\u0629 \u062A\u0634\u062C\u064A\u0639\u064A\u0629 \u0648\u0628\u0646\u0627\u0621\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0641\u064A \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0623\u0648 \u062C\u0645\u0644\u062A\u064A\u0646"
}

\u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645:
- 90-100: \u0646\u0637\u0642 \u0645\u0645\u062A\u0627\u0632
- 75-89: \u0646\u0637\u0642 \u062C\u064A\u062F \u0645\u0639 \u0623\u062E\u0637\u0627\u0621 \u0628\u0633\u064A\u0637\u0629
- 60-74: \u0646\u0637\u0642 \u0645\u0642\u0628\u0648\u0644 \u0645\u0639 \u0623\u062E\u0637\u0627\u0621 \u0648\u0627\u0636\u062D\u0629
- \u0623\u0642\u0644 \u0645\u0646 60: \u064A\u062D\u062A\u0627\u062C \u062A\u062F\u0631\u064A\u0628\u0627\u064B \u0625\u0636\u0627\u0641\u064A\u0627\u064B`;
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
          const responseText = (response.text || "").trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          const parsed = JSON.parse(responseText);
          analysisResult = {
            score: Math.min(100, Math.max(0, Number(parsed.score) || 70)),
            mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
            feedback: parsed.feedback || "\u0623\u062D\u0633\u0646\u062A\u060C \u0627\u0633\u062A\u0645\u0631 \u0641\u064A \u0627\u0644\u062A\u062F\u0631\u064A\u0628!"
          };
        } catch (aiError) {
          console.warn("Gemini analysis failed, using native fallback:", aiError);
          usedFallback = true;
        }
      } else {
        usedFallback = true;
      }
      if (!analysisResult || usedFallback) {
        analysisResult = advancedArabicFallbackAnalysis(text, recognizedText || "");
      }
      const attemptsRef = (0, import_firestore.collection)(db, "attempts");
      await (0, import_firestore.addDoc)(attemptsRef, {
        userId,
        exerciseId,
        score: analysisResult.score,
        mistakesJson: JSON.stringify(analysisResult.mistakes),
        attemptDate: (0, import_firestore.serverTimestamp)()
      });
      res.json({ ...analysisResult, attemptDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("Analysis failed:", error);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649" });
    }
  });
  app.get("/api/exercises/suggest", verifyToken, async (req, res) => {
    try {
      const { category, level, id } = req.query;
      const exercisesRef = (0, import_firestore.collection)(db, "exercises");
      if (id) {
        const docRef = (0, import_firestore.doc)(db, "exercises", id);
        const docSnap = await (0, import_firestore.getDoc)(docRef);
        if (!docSnap.exists()) return res.status(404).json({ error: "Exercise not found" });
        return res.json({ id: docSnap.id, ...docSnap.data() });
      }
      const q = (0, import_firestore.query)(
        exercisesRef,
        (0, import_firestore.where)("category", "==", category || "adults"),
        (0, import_firestore.where)("level", "==", level || "beginner"),
        (0, import_firestore.limit)(10)
      );
      const snapshot = await (0, import_firestore.getDocs)(q);
      let exercisePool = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (exercisePool.length === 0) {
        const fallback = await (0, import_firestore.getDocs)((0, import_firestore.query)(exercisesRef, (0, import_firestore.limit)(5)));
        if (fallback.empty) return res.status(404).json({ error: "No exercises found" });
        exercisePool = fallback.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (GEMINI_API_KEY && exercisePool.length > 1) {
        try {
          const exerciseList = exercisePool.map((e, i) => `${i}: ${e.title} - ${e.description}`).join("\n");
          const prompt = `\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u062A\u0648\u0635\u064A\u0629 \u062A\u0639\u0644\u064A\u0645\u064A \u0630\u0643\u064A.
\u0644\u062F\u064A\u0643 \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0646 \u0641\u0626\u0629 "${category}" \u0648\u0645\u0633\u062A\u0648\u0627\u0647 "${level}".
\u0627\u062E\u062A\u0631 \u0631\u0642\u0645 \u0627\u0644\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u0623\u0646\u0633\u0628 \u0644\u0647 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629:
${exerciseList}
\u0623\u0639\u062F \u0631\u0642\u0645\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0641\u0642\u0637 (0 \u0625\u0644\u0649 ${exercisePool.length - 1}) \u0628\u062F\u0648\u0646 \u0623\u064A \u0646\u0635 \u0622\u062E\u0631.`;
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
      const recommended = await smartExerciseRecommendation(
        exercisePool,
        req.userId,
        category || "adults",
        level || "beginner"
      );
      res.json(recommended);
    } catch (error) {
      console.error("Exercise fetch error:", error);
      res.status(500).json({ error: "Failed to fetch exercise" });
    }
  });
  app.get("/api/progress/:userId/insights", verifyToken, async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.userId !== userId) return res.status(403).json({ error: "Forbidden" });
      const attemptsRef = (0, import_firestore.collection)(db, "attempts");
      const q = (0, import_firestore.query)(attemptsRef, (0, import_firestore.where)("userId", "==", userId), (0, import_firestore.limit)(50));
      const snap = await (0, import_firestore.getDocs)(q);
      const attempts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (attempts.length === 0) return res.json({ insights: [], streakDays: 0, trend: "neutral" });
      const sortedByDate = [...attempts].sort((a, b) => {
        const aDate = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
        const bDate = b.attemptDate?.toDate?.() || new Date(b.attemptDate || 0);
        return aDate.getTime() - bDate.getTime();
      });
      const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
      const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
      const firstAvg = firstHalf.reduce((s, a) => s + (a.score || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, a) => s + (a.score || 0), 0) / secondHalf.length;
      const trend = secondAvg > firstAvg + 5 ? "improving" : secondAvg < firstAvg - 5 ? "declining" : "stable";
      const uniqueDays = [...new Set(sortedByDate.map((a) => {
        const d = a.attemptDate?.toDate?.() || new Date(a.attemptDate || 0);
        return d.toISOString().split("T")[0];
      }))].sort().reverse();
      let streakDays = 0;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let checkDay = today;
      for (const day of uniqueDays) {
        if (day === checkDay) {
          streakDays++;
          const d = new Date(checkDay);
          d.setDate(d.getDate() - 1);
          checkDay = d.toISOString().split("T")[0];
        } else break;
      }
      const insights = [];
      if (trend === "improving") insights.push("\u{1F4C8} \u0623\u062F\u0627\u0624\u0643 \u0641\u064A \u062A\u062D\u0633\u0651\u0646 \u0645\u0633\u062A\u0645\u0631\u060C \u0627\u0633\u062A\u0645\u0631 \u0628\u0647\u0630\u0627 \u0627\u0644\u0625\u064A\u0642\u0627\u0639!");
      if (trend === "declining") insights.push("\u{1F4AA} \u0644\u0627\u062D\u0638\u0646\u0627 \u062A\u0631\u0627\u062C\u0639\u0627\u064B \u0637\u0641\u064A\u0641\u0627\u064B \u2014 \u0632\u062F \u0645\u0646 \u0648\u062A\u064A\u0631\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628.");
      if (streakDays >= 7) insights.push(`\u{1F525} ${streakDays} \u0623\u064A\u0627\u0645 \u062A\u062F\u0631\u064A\u0628 \u0645\u062A\u0648\u0627\u0635\u0644 \u2014 \u0623\u0646\u062A \u0645\u0646\u0636\u0628\u0637!`);
      if (attempts.length >= 20) insights.push(`\u{1F3AF} \u0623\u0643\u0645\u0644\u062A ${attempts.length} \u062A\u0645\u0631\u064A\u0646\u0627\u064B \u2014 \u0645\u062B\u0627\u0628\u0631\u0629 \u0631\u0627\u0626\u0639\u0629!`);
      const bestScore = Math.max(...attempts.map((a) => a.score || 0));
      if (bestScore >= 90) insights.push(`\u{1F3C6} \u0623\u0641\u0636\u0644 \u0646\u062A\u064A\u062C\u0629 \u0644\u0643: ${bestScore}% \u2014 \u0646\u0637\u0642 \u0627\u062D\u062A\u0631\u0627\u0641\u064A!`);
      res.json({ insights, streakDays, trend, bestScore, totalAttempts: attempts.length });
    } catch (error) {
      console.error("Insights error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/seed", async (req, res) => {
    await seedExercises(true);
    res.json({ ok: true });
  });
  app.get("/api/health", async (req, res) => {
    let firebaseStatus = "unknown";
    try {
      await withTimeout((0, import_firestore.getDocs)((0, import_firestore.query)((0, import_firestore.collection)(db, "exercises"), (0, import_firestore.limit)(1))), 3e3);
      firebaseStatus = "connected";
    } catch {
      firebaseStatus = "error";
    }
    res.json({
      status: firebaseStatus === "connected" ? "ok" : "degraded",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      firebase: firebaseStatus,
      aiEnabled: !!process.env.GEMINI_API_KEY,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
