# 🔑 Find Your Supabase Credentials

## What is VITE_SUPABASE_URL?

It's the web address (URL) of YOUR Supabase database project.

**Example:** `https://abcdefghijk.supabase.co`

Every Supabase project has a unique URL - you need to find YOURS!

---

## 📍 Where to Find It (2 minutes)

### Step 1: Go to Supabase

1. **Open your browser**
2. **Go to:** [supabase.com](https://supabase.com)
3. **Click:** "Sign In" (top-right)
4. **Login** with your account

✅ You should see your Supabase dashboard

---

### Step 2: Select Your Project

**You should see your ProSpaces CRM project**

Look for:
- Project name (might be "prospaces-crm" or something similar)
- Click on it

If you have multiple projects, find the one you're using for this CRM.

---

### Step 3: Go to Project Settings

**Look at the LEFT sidebar:**

1. **Click:** ⚙️ Settings icon (near the bottom)
2. **Click:** "API" (in the settings menu)

You should now see the "API Settings" page

---

### Step 4: Copy Your Credentials

You'll see two important sections:

### 📍 Section 1: Project URL

```
Project URL
https://abcdefghijk.supabase.co
[Copy]
```

**This is your `VITE_SUPABASE_URL`!** ✅

Click the **[Copy]** button

---

### 📍 Section 2: Project API Keys

You'll see a table with different keys:

```
Name        | Key                          | Actions
-------------------------------------------------------
anon public | eyJhbGc... (very long string) | [Copy]
service_role| eyJhbGc... (very long string) | [Copy]
```

**Look for the row that says: `anon` or `anon public`**

Click the **[Copy]** button next to it

**This is your `VITE_SUPABASE_ANON_KEY`!** ✅

---

## ✅ What You Need for Vercel

Copy these TWO things:

### 1. VITE_SUPABASE_URL
```
Example: https://abcdefghijk.supabase.co
```
**Where:** Project Settings → API → Project URL

### 2. VITE_SUPABASE_ANON_KEY
```
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MzQ...
(very long string, starts with eyJ)
```
**Where:** Project Settings → API → Project API keys → `anon public` row

---

## 📋 Copy to Notepad

**Before going to Vercel, save these to a notepad:**

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace with YOUR actual values!**

---

## 🎯 Visual Guide

### What Your Screen Should Look Like:

**After clicking Settings → API:**

```
┌─────────────────────────────────────────────────┐
│ API Settings                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Configuration                                   │
│                                                 │
│ Project URL                                     │
│ https://abcdefghijk.supabase.co      [Copy] ← Click this
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Project API keys                                │
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ anon │ public                            │  │
│ │ eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...      │  │
│ │                            [Reveal] [Copy]│← Click Copy
│ └──────────────────────────────────────────┘  │
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ service_role │ secret                    │  │
│ │ eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...      │  │
│ │                            [Reveal] [Copy]│← DON'T use this
│ └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### ✅ Use the "anon" key
- This is the PUBLIC key
- Safe to use in your frontend
- Starts with `eyJ`

### ❌ DON'T use the "service_role" key
- This is the SECRET key
- Has full admin access
- NEVER put this in Vercel or frontend code

---

## 🆘 Troubleshooting

### ❌ "I don't have a Supabase project"

**Problem:** You haven't set up Supabase yet

**Solution:**
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free
3. Create a new project
4. Wait 2-3 minutes for it to provision
5. Then follow the steps above

**Note:** ProSpaces CRM REQUIRES Supabase to work!

---

### ❌ "I can't find the Settings icon"

**Look for:**
- ⚙️ Gear icon
- "Settings" text
- "Project Settings"

**Location:** Left sidebar, usually near the bottom

**Alternative:**
- Click your project name dropdown (top-left)
- Select "Project Settings"

---

### ❌ "I don't see API in Settings"

**Make sure you:**
1. Clicked the ⚙️ Settings icon (left sidebar)
2. Look for "API" in the list
3. Should be near the top of settings menu

**Settings sections:**
- General
- **API** ← Click this one
- Database
- Authentication
- Storage
- etc.

---

### ❌ "My URL doesn't start with https://"

**Check again:** It should ALWAYS start with `https://`

**Example formats:**
- ✅ `https://abcdefghijk.supabase.co`
- ✅ `https://yourproject.supabase.co`
- ❌ `abcdefghijk.supabase.co` (missing https://)

If missing `https://`, add it manually when copying to Vercel.

---

### ❌ "The anon key is hidden"

**Click "Reveal"** button next to the key, then click "Copy"

**OR:** Just click "Copy" directly (works even if hidden)

---

## 🔐 Is This Safe?

### ✅ Safe to Share:
- `VITE_SUPABASE_URL` - Yes, it's public
- `VITE_SUPABASE_ANON_KEY` (anon key) - Yes, it's meant for frontend

### ❌ NEVER Share:
- `service_role` key - This is your admin password!

**The anon key has limited permissions set in Supabase Row Level Security (RLS).**

---

## 📝 Example Values

**These are EXAMPLES - don't use these!**

```
VITE_SUPABASE_URL=https://xyzabcdefghijk.supabase.co

VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MzQwNTg0MzQsImV4cCI6MTk0OTYzNDQzNH0.example_signature_here
```

**YOUR values will be different!**

---

## 🎯 Quick Checklist

- [ ] Logged into Supabase.com
- [ ] Selected my ProSpaces CRM project
- [ ] Clicked Settings (⚙️) in left sidebar
- [ ] Clicked "API"
- [ ] Copied Project URL → Saved as VITE_SUPABASE_URL
- [ ] Copied anon/public key → Saved as VITE_SUPABASE_ANON_KEY
- [ ] Both values saved to notepad
- [ ] Ready to paste into Vercel!

---

## 🚀 Next Step

Once you have both values:

1. **Go back to Vercel**
2. **In Environment Variables section:**
   - Add `VITE_SUPABASE_URL` = (paste your URL)
   - Add `VITE_SUPABASE_ANON_KEY` = (paste your key)
3. **Click Deploy!**

---

## 💡 Pro Tips

### Tip 1: Keep These Safe
- Save them in a password manager
- You'll need them if you redeploy
- Or if you deploy to other platforms

### Tip 2: Each Project is Different
- Don't mix up URLs from different projects
- Each Supabase project has unique credentials

### Tip 3: You Can Regenerate
- If you accidentally expose your anon key, you can regenerate it
- Settings → API → Generate new anon key
- But then you need to update Vercel!

---

## 🎊 You're Ready!

Once you have:
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

**Go back to Vercel and continue deployment!** 🚀

---

**Need help finding them? Tell me what you see on your screen!** 👍
