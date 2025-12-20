# ⚡ QUICK FIX - npm Error in Codespaces

## ❌ Error You Got:
```
npm error Node.js v24.11.1
```

## ✅ Solution:
**Don't use npm!** Use the official installer instead!

---

## 🚀 RUN THESE COMMANDS (In Order):

### 1️⃣ Install Supabase CLI (Copy ALL 3 lines!)
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  sudo mv supabase /usr/local/bin/
```
⏱️ Wait ~10 seconds

### 2️⃣ Check It Worked
```bash
supabase --version
```
✅ Should show: `1.x.x`

### 3️⃣ Login
```bash
supabase login
```
📝 Click the URL → Authorize → Come back

### 4️⃣ Set Secret (Replace with YOUR Nylas key!)
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
```

### 5️⃣ Link Project (Enter password when asked)
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

### 6️⃣ Deploy Functions (Wait 2-5 min)
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

### 7️⃣ Verify
```bash
supabase functions list
```
✅ Should show 7 functions!

---

## 🎯 Key Change:

| ❌ OLD (broken) | ✅ NEW (works!) |
|----------------|----------------|
| `npm install -g supabase` | `curl ... supabase_linux_amd64.tar.gz` |

---

## 🎉 That's It!

**The npm error is bypassed!** Now continue with the rest of the deployment! 🚀

**Full details:** `/FIX_NPM_ERROR_CODESPACES.md`
