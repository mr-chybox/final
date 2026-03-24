# 🚀 Vercel Deployment Guide — পরিচিত বাজার

## ধাপ ১ — Database তৈরি করুন (Neon — বিনামূল্যে)

1. **[neon.tech](https://neon.tech)** → Sign Up → New Project
2. Project name দিন (যেমন: `poricito-bazar`)
3. Region: **Singapore** (বাংলাদেশের কাছের)
4. তৈরি হলে **Connection String** copy করুন:
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. **SQL Editor** খুলুন → `database/schema.sql` ফাইলের সব content paste করে Run করুন

---

## ধাপ ২ — GitHub-এ Push করুন

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/poricito-bazar.git
git push -u origin main
```

---

## ধাপ ৩ — Vercel-এ Deploy করুন

1. **[vercel.com](https://vercel.com)** → Sign Up (GitHub দিয়ে)
2. **New Project** → GitHub repo টি import করুন
3. Framework Preset: **Other**
4. Build & Output Settings: কিছু পরিবর্তন করতে হবে না
5. **Environment Variables** section-এ নিচের variable গুলো যোগ করুন:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon থেকে copy করা connection string |
| `JWT_SECRET` | একটি random string (নিচে দেখুন কীভাবে বানাবেন) |
| `JWT_EXPIRES_IN` | `8h` |
| `JWT_USER_EXPIRES_IN` | `30d` |
| `ADMIN_USERNAME` | `admin` (বা আপনার পছন্দের নাম) |
| `ADMIN_PASSWORD` | একটি শক্তিশালী password |
| `NODE_ENV` | `production` |

**JWT_SECRET বানানোর উপায়:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

6. **Deploy** বাটনে click করুন ✅

---

## ধাপ ৪ — Deploy হওয়ার পর

- Vercel আপনাকে একটি URL দেবে: `https://poricito-bazar-xxx.vercel.app`
- `/api/health` এ গিয়ে database connection চেক করুন
- Admin panel: `/admin/login.html`

---

## স্থানীয়ভাবে চালানো (Local Dev)

```bash
cp .env.example .env
# .env ফাইলে DATABASE_URL বা DB_* values দিন

npm install
npm run dev
```

---

## সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| Database connection error | `DATABASE_URL` সঠিক আছে কিনা চেক করুন |
| 500 error on API | Vercel Functions log দেখুন |
| Admin login কাজ করছে না | `ADMIN_USERNAME` ও `ADMIN_PASSWORD` env var চেক করুন |
