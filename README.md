# نطقي (Natqi)

مرحباً بك في تطبيق **نطقي**! هذا التطبيق مصمم لمساعدة الأطفال، والطلاب، والمبتدئين وغير الناطقين الأصليين على تحسين النطق في اللغة العربية باستخدام تحليل الصوت والذكاء الاصطناعي.

Welcome to **Natqi**! This application is designed to help children, students, beginners, and non-native speakers improve their Arabic pronunciation using voice analysis and AI.

---

## 🚀 كيفية التثبيت والتشغيل (Setup Instructions)

1. **استنساخ المستودع (Clone the repository)**
   \`\`\`bash
   git clone <repository_url>
   cd natqi
   \`\`\`

2. **تثبيت الحزم (Install dependencies)**
   \`\`\`bash
   npm install
   \`\`\`

3. **إعداد متغيرات البيئة (Environment variables)**
   انسخ ملف `.env.example` إلى `.env` وقم بملء المتغيرات:
   Copy `.env.example` to `.env` and fill in the required variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. **إضافة البيانات الأولية (Seed database) [اختياري/Optional]**
   يتم إضافة البيانات تلقائياً عند تشغيل الخادم إذا كانت قاعدة البيانات فارغة.
   (The server will automatically seed data on startup if the database is empty).

5. **تشغيل خادم التطوير (Run dev server)**
   \`\`\`bash
   npm run dev
   \`\`\`
   سيتم تشغيل التطبيق على المنفذ 3000 (The app will start on port 3000).

6. **بناء نسخة الإنتاج (Production build)**
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`

---

## 🔑 بيانات تسجيل الدخول للاختبار (Test Credentials)

نظرًا لأن التطبيق يتطلب تسجيل الدخول للوصول إلى الميزات الرئيسية، يمكنك إنشاء حساب جديد مجاناً عبر صفحة التسجيل، أو إذا تم تشغيل نظام البيانات الأولية بنجاح يمكن استخدام الحساب التالي إذا قمت بإنشائه:
- **Email:** `test@natqi.com`
- **Password:** `123456`

---

## ⚙️ إعدادات فايربيس (Firebase Setup)

التطبيق يستخدم Firebase لتخزين المستخدمين (Firestore) وجلسات التعلم والتقدم:

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. قم بإنشاء مشروع جديد (Create a new project).
3. قم بتمكين **Firestore Database** في وضع الاختبار أو الإنتاج.
4. قم بإضافة تطبيق ويب (Add Web App) لنسخ إعداداتك (config).
5. قم بتحديث البيانات في ملف `firebase-applet-config.json` أو استخدم المتغيرات البيئية في `.env` إذا تم إعدادها بالخادم.

---

## 🤖 استبدال أداة تحليل الصوت الوهمية بـ API حقيقي

في بيئة التطوير، يتم استخدام أداة وهمية تقوم بإنشاء نتائج عشوائية لتحليل الصوت.
(The app currently uses a mock analysis in the development environment)

لتحديث التطبيق ليستخدم ذكاءً اصطناعياً حقيقياً للصوت:

1. افتح ملف `server.ts`.
2. ابحث عن المسار: `app.post("/api/analyze", ...)`
3. قم باستبدال الجزء الذي يوّلد أرقاماً عشوائية بطلب حقيقي لـ Gemini API أو أي مزود خدمات صوت آخر يقارن النطق بالنص الأصلي.
4. يمكنك استخدام الحزمة `@google/genai` المحملة في المشروع لإرسال الصوت وتحليله عن طريق توفير `GEMINI_API_KEY` في ملف `.env`.

---
*تم التطوير باستخدام Google AI Studio.*
