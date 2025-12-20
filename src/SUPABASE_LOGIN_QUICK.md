# ⚡ Get Supabase Authorization Code - QUICK

## 🎯 You're Here:
```
$ supabase login

Enter your authorization code:
_
```

---

## ✅ HOW TO GET THE CODE:

### 1️⃣ Look Up in Your Terminal
Scroll up slightly. You should see a URL like:
```
https://api.supabase.com/v1/cli/authorize?token=ABC123...
```

### 2️⃣ Click That URL
- It's clickable! Just click it
- A browser tab opens

### 3️⃣ Click "Authorize" Button
On the page that opens, click the big **"Authorize"** button

### 4️⃣ Copy the Code
After authorizing, the page shows:
```
✅ Authorization Successful

Your authorization code is:
sbp_abc123xyz456...
```

**Copy that code!** (The one starting with `sbp_`)

### 5️⃣ Paste in Terminal
- Go back to Codespace
- Paste the code at the prompt
- Press **Enter**

### 6️⃣ Done! ✅
You should see:
```
✅ Logged in successfully
```

---

## 🔄 Alternative: Direct Token Login

If the above doesn't work:

1. Press `Ctrl+C` in terminal (cancel current login)
2. Go to: https://app.supabase.com/account/tokens
3. Click **"Generate new token"**
4. Copy the token
5. Run:
```bash
supabase login --token YOUR_TOKEN_HERE
```

---

## 📖 Full Guide
See `/FIX_SUPABASE_AUTH_CODE.md` for detailed screenshots and troubleshooting.

---

**The code is on the page AFTER you click "Authorize"!** 🔑
