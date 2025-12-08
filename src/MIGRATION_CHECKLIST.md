# 🔄 Migration Checklist: Old OAuth → Nylas

## 📋 Pre-Migration Checklist

### **Understanding:**
- [ ] Read `/NYLAS_IMPLEMENTATION_SUMMARY.md`
- [ ] Read `/NYLAS_VS_OLD_OAUTH.md` (understand differences)
- [ ] Read `/NYLAS_DEPLOYMENT_GUIDE.md` (deployment steps)
- [ ] Understand what changes for users

### **Prerequisites:**
- [ ] Supabase project ready
- [ ] Supabase CLI installed and configured
- [ ] Git repository up to date
- [ ] Backup database (just in case)

---

## 🚀 Phase 1: Deploy Nylas (Parallel)

**Goal:** Deploy Nylas alongside old system (no disruption)

### **Step 1: Set Up Nylas Account**
- [ ] Create Nylas account at https://www.nylas.com/
- [ ] Create application in Nylas Dashboard
- [ ] Copy API Key
- [ ] Copy API Secret
- [ ] Copy Client ID

### **Step 2: Configure Google Cloud**
- [ ] Enable Gmail API
- [ ] Enable Google Calendar API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth credentials
- [ ] Add Nylas redirect URI: `https://api.us.nylas.com/v3/connect/callback`
- [ ] Configure in Nylas Dashboard → Connectors → Google

### **Step 3: Configure Microsoft Azure (Optional)**
- [ ] Create Azure AD app registration
- [ ] Add API permissions (Mail, Calendar)
- [ ] Create client secret
- [ ] Configure in Nylas Dashboard → Connectors → Microsoft

### **Step 4: Configure Webhook**
- [ ] In Nylas Dashboard → Webhooks
- [ ] Add webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-webhook`
- [ ] Subscribe to events:
  - [ ] message.created
  - [ ] message.updated
  - [ ] message.deleted
  - [ ] event.created
  - [ ] event.updated
  - [ ] event.deleted
- [ ] Copy Webhook Secret

### **Step 5: Deploy Edge Functions**
```bash
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-webhook
supabase functions deploy nylas-sync-emails
supabase functions deploy nylas-sync-calendar
supabase functions deploy nylas-create-event
supabase functions deploy nylas-send-email
```
- [ ] All functions deployed successfully
- [ ] Verify with `supabase functions list`

### **Step 6: Configure Secrets**
```bash
supabase secrets set NYLAS_API_KEY="nyk_xxx_your_api_key"
supabase secrets set NYLAS_WEBHOOK_SECRET="your_webhook_secret"
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```
- [ ] All secrets set
- [ ] Verify with `supabase secrets list`

### **Step 7: Apply Database Migrations**
```bash
supabase db push
```
- [ ] Migrations applied successfully
- [ ] Verify columns added to appointments table:
  - [ ] calendar_event_id
  - [ ] calendar_provider
  - [ ] attendees

---

## ✅ Phase 2: Test Nylas Integration

**Goal:** Verify everything works before switching over

### **Test Email:**
- [ ] Connect test Gmail account via Nylas
- [ ] Send email to test account (external)
- [ ] Verify email appears in ProSpaces within 10 seconds
- [ ] Send email from ProSpaces
- [ ] Verify email appears in Gmail sent folder
- [ ] Check Edge Function logs: `supabase functions logs nylas-webhook --tail`

### **Test Calendar:**
- [ ] Create event in Google Calendar
- [ ] Verify event appears in ProSpaces within 10 seconds
- [ ] Create event in ProSpaces
- [ ] Verify event appears in Google Calendar
- [ ] Check Edge Function logs

### **Test Webhooks:**
- [ ] Go to Nylas Dashboard → Webhooks → Recent Deliveries
- [ ] Verify webhook fired when email arrived
- [ ] Verify webhook fired when event created
- [ ] Check for any errors

### **Test Multiple Providers (Optional):**
- [ ] Test with Outlook account
- [ ] Test with Office 365 account
- [ ] Verify all providers work

---

## 🔄 Phase 3: Transition Plan

**Goal:** Move users from old OAuth to Nylas

### **Option A: Gradual Migration (Recommended)**

**Week 1-2: Parallel Systems**
- [ ] Both old OAuth and Nylas available
- [ ] Add banner: "New and improved email sync available!"
- [ ] Let users opt-in to Nylas
- [ ] Monitor for issues

**Week 3-4: Encourage Migration**
- [ ] Add notification: "Switch to improved email sync for auto-updates"
- [ ] Offer incentive (e.g., "No more sync buttons!")
- [ ] Support both systems

**Week 5+: Deprecate Old System**
- [ ] Announce deprecation date (e.g., 30 days)
- [ ] Send email to users still on old system
- [ ] Auto-migrate remaining users (or force switch)
- [ ] Remove old Edge Functions

---

### **Option B: Hard Cutover (Faster)**

**Pre-cutover:**
- [ ] Test Nylas thoroughly
- [ ] Document the change
- [ ] Prepare user communication

**Cutover Day:**
- [ ] Send email to all users: "Email sync improved - please reconnect"
- [ ] Deploy updated UI (Nylas only)
- [ ] Remove old Edge Functions
- [ ] Monitor for issues

**Post-cutover:**
- [ ] Support users with connection issues
- [ ] Monitor Edge Function logs
- [ ] Gather feedback

---

## 🗑️ Phase 4: Clean Up Old System

**Goal:** Remove old OAuth code once Nylas is stable

### **Database Cleanup:**
- [ ] Backup old OAuth data (optional)
- [ ] Remove old OAuth columns from email_accounts (if any)
- [ ] Clean up old email sync logs (optional)

### **Edge Functions Cleanup:**
- [ ] Delete old Edge Functions:
  ```bash
  supabase functions delete gmail-oauth-init
  supabase functions delete gmail-oauth-callback
  supabase functions delete gmail-sync
  supabase functions delete calendar-oauth-init
  supabase functions delete calendar-oauth-callback
  supabase functions delete calendar-sync
  ```
- [ ] Verify functions deleted: `supabase functions list`

### **Secrets Cleanup:**
- [ ] Remove old secrets (if any):
  ```bash
  supabase secrets unset GOOGLE_CLIENT_ID
  supabase secrets unset GOOGLE_CLIENT_SECRET
  supabase secrets unset MICROSOFT_CLIENT_ID
  supabase secrets unset MICROSOFT_CLIENT_SECRET
  supabase secrets unset EMAIL_REDIRECT_URI
  supabase secrets unset CALENDAR_REDIRECT_URI
  ```

### **Code Cleanup:**
- [ ] Remove old OAuth UI components (if separate)
- [ ] Update documentation to reference Nylas only
- [ ] Remove commented-out old OAuth code
- [ ] Update deployment guides

---

## 📊 Monitoring & Success Metrics

### **During Migration:**
- [ ] Monitor Edge Function logs daily
- [ ] Check webhook delivery success rate (Nylas Dashboard)
- [ ] Track number of users migrated
- [ ] Monitor support tickets for issues
- [ ] Check for error patterns

### **Success Metrics:**
- [ ] 95%+ webhook delivery success rate
- [ ] <5 second latency for new emails/events
- [ ] <5% support tickets related to email/calendar
- [ ] User feedback is positive
- [ ] No increase in errors

### **Red Flags (Stop Migration):**
- ❌ Webhook delivery <90%
- ❌ Frequent timeout errors
- ❌ Data loss or sync issues
- ❌ User complaints about sync failures
- ❌ Edge Function errors spiking

---

## 🐛 Rollback Plan

**If something goes wrong:**

### **Quick Rollback (if in parallel mode):**
1. [ ] Disable Nylas option in UI
2. [ ] Force all users back to old OAuth
3. [ ] Investigate issues
4. [ ] Fix problems
5. [ ] Re-enable Nylas when ready

### **Full Rollback (if hard cutover):**
1. [ ] Redeploy old Edge Functions
2. [ ] Restore old secrets
3. [ ] Update UI to use old OAuth
4. [ ] Communicate to users
5. [ ] Investigate issues
6. [ ] Plan better migration

---

## ✅ Post-Migration Checklist

### **Verify Everything Works:**
- [ ] Email sync working for all users
- [ ] Calendar sync working for all users
- [ ] No sync buttons in UI
- [ ] Real-time updates working
- [ ] Sent emails appear in external clients
- [ ] Created events appear in external calendars

### **Documentation:**
- [ ] Update user documentation
- [ ] Update developer documentation
- [ ] Update deployment guides
- [ ] Archive old OAuth documentation

### **Monitoring:**
- [ ] Set up alerts for webhook failures (optional)
- [ ] Monitor Nylas usage/costs
- [ ] Track Edge Function performance
- [ ] Review monthly

### **Team Training:**
- [ ] Train customer support on Nylas
- [ ] Document troubleshooting steps
- [ ] Create FAQ for common issues
- [ ] Share success stories

---

## 💰 Cost Tracking

### **Expected Costs:**
- Free tier: 5 accounts = $0
- Paid tier: $12/month per account after 5

### **Monitor:**
- [ ] Number of connected accounts
- [ ] Monthly Nylas invoice
- [ ] Cost per user
- [ ] Compare to original estimate

### **Optimize:**
- [ ] Review usage patterns
- [ ] Identify unused accounts
- [ ] Consider volume discounts (50+ accounts)
- [ ] Pass cost to customers ($15/user/month)

---

## 📅 Suggested Timeline

### **Week 1: Preparation**
- [ ] Set up Nylas account
- [ ] Configure Google/Microsoft OAuth
- [ ] Deploy Edge Functions
- [ ] Test with personal accounts

### **Week 2: Testing**
- [ ] Internal team testing
- [ ] Invite beta users
- [ ] Fix any issues
- [ ] Monitor webhooks

### **Week 3-4: Gradual Rollout**
- [ ] Enable for 25% of users
- [ ] Monitor metrics
- [ ] Enable for 50% of users
- [ ] Monitor metrics

### **Week 5: Full Rollout**
- [ ] Enable for all users
- [ ] Announce deprecation of old system
- [ ] Support migration

### **Week 6: Cleanup**
- [ ] Remove old Edge Functions
- [ ] Clean up code
- [ ] Update documentation
- [ ] Celebrate! 🎉

---

## 🎯 Key Decision Points

### **Should I migrate?**
✅ **Yes, if:**
- You want auto-sync (no manual buttons)
- You want to support multiple providers
- You value developer time
- You're building a production app
- You're okay with $12/user/month cost

❌ **No, if:**
- You only have 1-2 users (use free tier to test)
- Budget is extremely tight
- You enjoy complex OAuth debugging 😅

### **Gradual vs Hard Cutover?**
✅ **Gradual (Recommended):**
- Lower risk
- Easier rollback
- Get user feedback
- Takes longer (6 weeks)

✅ **Hard Cutover:**
- Faster (1 week)
- Higher risk
- All users switch at once
- Better for small user base (<50 users)

---

## 📞 Support During Migration

### **Nylas Support:**
- Email: support@nylas.com
- Response time: <24 hours
- Use for: API issues, webhook problems, OAuth failures

### **Supabase Support:**
- Discord: https://discord.supabase.com/
- Use for: Edge Function issues, database problems

### **Your Team:**
- Document common issues
- Create internal FAQ
- Share Edge Function logs
- Communicate proactively

---

## ✅ Final Checklist Before Going Live

**Technical:**
- [ ] All Edge Functions deployed and tested
- [ ] Webhooks configured and firing
- [ ] Database migrations applied
- [ ] Secrets configured correctly
- [ ] Real-time updates working
- [ ] Error handling tested

**Business:**
- [ ] Users notified of change
- [ ] Documentation updated
- [ ] Support team trained
- [ ] Rollback plan ready
- [ ] Monitoring in place
- [ ] Budget approved

**Testing:**
- [ ] Tested with Gmail
- [ ] Tested with Outlook
- [ ] Tested webhooks
- [ ] Tested Edge Functions
- [ ] Tested error scenarios
- [ ] Load tested (optional)

---

## 🎉 Success!

Once all checklist items are complete, you'll have:

✅ Production-ready Nylas integration
✅ Auto-syncing email and calendar
✅ Real-time updates (no manual sync)
✅ Multi-provider support
✅ Clean, maintainable codebase
✅ Happy users! 😊

---

**Good luck with your migration!** 🚀

Remember: Start with testing, roll out gradually, monitor closely, and communicate with your users. You've got this! 💪
