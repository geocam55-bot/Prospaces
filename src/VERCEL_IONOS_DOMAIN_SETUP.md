# Connect Vercel Project to IONOS Domain

**Complete guide to connecting your ProSpaces CRM Vercel deployment to your IONOS domain**

---

## 📋 Prerequisites

- ✅ Vercel account with your project deployed
- ✅ IONOS domain (e.g., `yourcompany.com`)
- ✅ Access to IONOS control panel
- ✅ Access to Vercel dashboard

---

## 🚀 Step-by-Step Guide

### **Step 1: Add Domain in Vercel**

1. **Log in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Navigate to your ProSpaces CRM project

2. **Access Domain Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Domains** in the left sidebar

3. **Add Your Domain**
   - Enter your domain: `yourcompany.com`
   - Click **Add**
   
4. **Add www subdomain (Optional but Recommended)**
   - Also add: `www.yourcompany.com`
   - Click **Add**

5. **Note the DNS Records**
   - Vercel will show you DNS records to configure
   - Keep this page open - you'll need these values

---

### **Step 2: Get DNS Records from Vercel**

After adding your domain, Vercel will display the required DNS records. You'll typically see:

#### **For Root Domain (`yourcompany.com`)**
```
Type: A
Name: @
Value: 76.76.21.21
```

#### **For www Subdomain (`www.yourcompany.com`)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**📝 Copy these values - you'll need them for IONOS**

---

### **Step 3: Configure DNS at IONOS**

#### **Method A: IONOS Control Panel (Recommended)**

1. **Log in to IONOS**
   - Go to [ionos.com](https://www.ionos.com)
   - Click **Login** (top right)
   - Enter your credentials

2. **Access Domain Settings**
   - Click **Domains & SSL** (or **Domain**)
   - Find your domain in the list
   - Click the **⚙️ Settings** icon or **Manage** button

3. **Go to DNS Settings**
   - Click **DNS** or **Manage DNS**
   - You may see "Expert Mode" or "Edit DNS Settings"
   - Click to enable/access DNS editor

4. **Add A Record for Root Domain**
   - Click **Add Record** or **Add DNS Record**
   - Select **Type: A**
   - **Host/Name**: `@` or leave blank (represents root domain)
   - **Points to/Value**: `76.76.21.21` (Vercel's IP)
   - **TTL**: `3600` (or 1 hour - default is fine)
   - Click **Save**

5. **Add CNAME Record for www**
   - Click **Add Record**
   - Select **Type: CNAME**
   - **Host/Name**: `www`
   - **Points to/Value**: `cname.vercel-dns.com`
   - **TTL**: `3600`
   - Click **Save**

6. **Remove Conflicting Records (Important!)**
   - Look for existing A or CNAME records for `@` or `www`
   - Delete any that point to IONOS parking pages or old servers
   - Common conflicts:
     - A record pointing to IONOS IP (212.x.x.x or 217.x.x.x)
     - CNAME pointing to IONOS redirect service
   - **Delete these** before saving

7. **Save Changes**
   - Click **Save** or **Apply Changes**
   - Confirm the changes

---

#### **Method B: IONOS "External Name Server" (Alternative)**

If you prefer Vercel to manage DNS entirely:

1. **In Vercel** (Step 1 above):
   - When adding domain, choose **"Transfer"** option
   - Vercel will provide nameservers like:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`

2. **In IONOS**:
   - Go to **Domain Settings**
   - Look for **Name Servers** or **DNS Settings**
   - Select **"Use external name servers"**
   - Add Vercel's nameservers
   - Save changes

⚠️ **Note**: This transfers full DNS control to Vercel. You won't be able to use IONOS email unless you configure MX records in Vercel.

---

### **Step 4: Verify Configuration**

#### **In Vercel Dashboard**

1. **Check Domain Status**
   - Go back to Vercel **Domains** settings
   - Your domain should show **"Valid Configuration"** or **"Pending"**
   - **Pending** is normal - DNS takes time to propagate

2. **Wait for Verification**
   - Initial check: **30 seconds to 5 minutes**
   - Full propagation: **up to 48 hours** (usually under 1 hour)
   - Vercel will auto-verify every few minutes

3. **SSL Certificate**
   - Vercel automatically provisions SSL (HTTPS)
   - Certificate issued within minutes after DNS verification
   - Your site will be accessible via `https://yourcompany.com`

#### **Test DNS Propagation**

Use online tools to check if DNS has updated:

**Option 1: Command Line**
```bash
# Check A record
nslookup yourcompany.com

# Check CNAME record
nslookup www.yourcompany.com

# Check with specific DNS server
dig yourcompany.com @8.8.8.8
```

**Option 2: Online Tools**
- [whatsmydns.net](https://www.whatsmydns.net) - Check global propagation
- [dnschecker.org](https://dnschecker.org) - Multi-location DNS lookup
- Enter your domain and check if it points to Vercel's IP

---

## 🔧 Common Issues & Solutions

### **Issue 1: Domain Shows "Invalid Configuration"**

**Cause**: DNS records not configured correctly or not yet propagated

**Solutions**:
- ✅ Double-check A record points to `76.76.21.21`
- ✅ Double-check CNAME points to `cname.vercel-dns.com`
- ✅ Wait 5-10 minutes for initial propagation
- ✅ Clear browser cache and try incognito mode

---

### **Issue 2: DNS Not Updating After Hours**

**Cause**: Conflicting DNS records or high TTL from previous settings

**Solutions**:
- ✅ Delete ALL old A/CNAME records for your domain in IONOS
- ✅ Check for "parking page" redirects and remove them
- ✅ Flush DNS cache on your computer:
  ```bash
  # Windows
  ipconfig /flushdns
  
  # macOS
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
  
  # Linux
  sudo systemd-resolve --flush-caches
  ```
- ✅ Try accessing from phone (different network)

---

### **Issue 3: www Works But Root Domain Doesn't (or vice versa)**

**Cause**: Missing DNS record

**Solutions**:
- ✅ Ensure BOTH records are added:
  - A record for `@` (root)
  - CNAME for `www`
- ✅ In Vercel, add both `yourcompany.com` AND `www.yourcompany.com`
- ✅ Set one as "Primary" in Vercel (recommended: non-www)

---

### **Issue 4: SSL Certificate Not Issued**

**Cause**: DNS not verified yet or CAA record blocking

**Solutions**:
- ✅ Wait for DNS verification in Vercel (green checkmark)
- ✅ Check for CAA records in IONOS DNS:
  - If you have CAA records, add: `0 issue "letsencrypt.org"`
  - Or delete all CAA records to allow any CA
- ✅ SSL usually takes 2-5 minutes after DNS verification

---

### **Issue 5: IONOS Email Stops Working**

**Cause**: Switching to Vercel nameservers removes MX records

**Solutions**:

**If using Method A (A/CNAME records only)**:
- ✅ Keep existing MX records in IONOS - they'll still work
- ✅ Don't switch to Vercel nameservers

**If using Method B (Vercel nameservers)**:
- ✅ Add MX records in Vercel DNS settings:
  ```
  Type: MX
  Name: @
  Value: mx00.ionos.com (priority: 10)
  
  Type: MX
  Name: @
  Value: mx01.ionos.com (priority: 10)
  ```
- ✅ Check IONOS documentation for exact MX record values

---

## 📱 Additional Configuration (Optional)

### **Redirect www to non-www (or vice versa)**

Vercel handles this automatically if you add both domains:

1. In Vercel **Domains** settings
2. Add both `yourcompany.com` and `www.yourcompany.com`
3. Click **Edit** on your preferred domain
4. Select **"Primary Domain"**
5. Vercel will auto-redirect the other to your primary

---

### **Add Subdomain (e.g., app.yourcompany.com)**

1. **In Vercel**:
   - Add domain: `app.yourcompany.com`
   - Note the CNAME value

2. **In IONOS**:
   - Add CNAME record:
     - Name: `app`
     - Value: `cname.vercel-dns.com`
   - Save

---

### **Environment Variables for Production**

Don't forget to set production environment variables in Vercel:

1. Go to **Project Settings** → **Environment Variables**
2. Add:
   ```
   VITE_SUPABASE_URL=your_production_supabase_url
   VITE_SUPABASE_ANON_KEY=your_production_key
   ```
3. Select **"Production"** environment
4. Click **Save**
5. **Redeploy** your project to apply changes

---

## ✅ Verification Checklist

After configuration, verify everything works:

- [ ] `yourcompany.com` loads your ProSpaces CRM
- [ ] `www.yourcompany.com` loads (or redirects to non-www)
- [ ] HTTPS (SSL) is working (padlock icon in browser)
- [ ] No security warnings
- [ ] Login/authentication works
- [ ] All features functional on custom domain
- [ ] Email still works (if using IONOS email)
- [ ] Mobile view works correctly

---

## 📞 Support Resources

### **Vercel Support**
- Documentation: [vercel.com/docs/custom-domains](https://vercel.com/docs/concepts/projects/domains)
- Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- Email: support@vercel.com

### **IONOS Support**
- Help Center: [ionos.com/help](https://www.ionos.com/help)
- DNS Guide: Search "IONOS DNS settings" in help center
- Phone: Check your IONOS account for support number

### **DNS Troubleshooting Tools**
- [whatsmydns.net](https://www.whatsmydns.net) - Global DNS propagation
- [dnschecker.org](https://dnschecker.org) - Multi-location lookup
- [mxtoolbox.com](https://mxtoolbox.com) - Comprehensive DNS analysis

---

## 🎯 Quick Reference

### **Vercel DNS Values**
```
Root Domain (A Record):
IP: 76.76.21.21

www Subdomain (CNAME):
Target: cname.vercel-dns.com

Vercel Nameservers (if transferring DNS):
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### **IONOS DNS Settings Location**
1. Login → Domains & SSL
2. Select domain → Settings/Manage
3. DNS / Manage DNS / DNS Settings
4. Add/Edit Records

---

**🎉 Once configured, your ProSpaces CRM will be live at your custom domain!**

**Typical timeline:**
- DNS configuration: 5-10 minutes
- DNS propagation: 15-60 minutes (usually)
- SSL certificate: 2-5 minutes after DNS verification
- **Total**: 30-90 minutes for full setup

---

**Last Updated**: December 25, 2025  
**Version**: 1.0  
**For**: ProSpaces CRM Production Deployment
