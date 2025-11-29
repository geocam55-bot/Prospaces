# 🚀 ProSpaces CRM

A comprehensive multi-tenant CRM platform with role-based access control, email integration, marketing automation, and full data isolation across organizations.

## 📧 Email Integration - Quick Start

### Current Status
- ✅ **Demo Mode Active** - Sample data loaded for testing
- ⏳ **Live Email** - Ready to activate (2-15 minutes)

### Activate Live Email (Choose One):

#### Option 1: IMAP/SMTP (2 minutes, works instantly)
```
1. Open Email module → "Add Account"
2. Select "IMAP/SMTP" tab
3. Enter your email settings
4. Done! ✅
```
[Get Gmail App Password](https://myaccount.google.com/apppasswords)

#### Option 2: OAuth via Nylas (15 minutes, production ready)
```bash
# Automated deployment
chmod +x deploy-email.sh
./deploy-email.sh
```

📖 **Full Documentation:** [README_EMAIL_SETUP.md](./README_EMAIL_SETUP.md)  
📋 **Quick Reference:** [EMAIL_ACTIVATION_QUICK_REF.md](./EMAIL_ACTIVATION_QUICK_REF.md)

---

## 🎯 Core Features

### CRM Modules
- **Contacts** - Comprehensive contact management with organization linking
- **Tasks** - Task tracking with priorities, due dates, and assignments
- **Notes** - Searchable notes linked to contacts and opportunities
- **Bids** - Opportunity and bid management with pipeline tracking
- **Appointments** - Calendar and appointment scheduling
- **Inventory** - Product/service inventory management
- **Files** - Document management and storage

### Email Integration
- **Multiple Accounts** - Connect Gmail, Outlook, IMAP/SMTP
- **OAuth Support** - Secure one-click Gmail/Outlook connection
- **IMAP/SMTP** - Direct connection to any email provider
- **Email Sync** - Auto-sync inbox and sent items
- **Contact Linking** - Link emails to contacts, bids, appointments
- **Compose & Send** - Full email composition interface

### Marketing Automation
- **Email Campaigns** - Create and manage email marketing campaigns
- **SMS & Social** - Multi-channel marketing automation
- **Drip Campaigns** - Automated email sequences
- **Lead Scoring** - AI-powered lead qualification
- **A/B Testing** - Campaign optimization tools
- **Landing Pages** - Built-in landing page builder
- **Journey Mapping** - Visual customer journey designer
- **Analytics** - Comprehensive marketing analytics and attribution

### Security & Access Control
- **Multi-Tenant** - Complete data isolation by organization
- **RBAC** - Role-based access control (Owner, Admin, Manager, Sales, Support)
- **Permission Matrix** - Granular permissions for each role
- **Audit Logging** - Complete activity tracking
- **Secure Auth** - Supabase authentication with session management

### User Management
- **User Profiles** - Manage team members and their roles
- **Organization Management** - Multi-organization support
- **Tenant Isolation** - Data security across organizations
- **Invitations** - Invite users to join your organization

---

## 🏗️ Architecture

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/UI** components
- **Lucide React** icons
- **Recharts** for analytics

### Backend
- **Supabase** - PostgreSQL database, authentication, Edge Functions
- **Nylas API** - Email integration (optional, can use IMAP directly)
- **Row-Level Security** - Database-level data isolation
- **Edge Functions** - Serverless API endpoints

### Database Structure
```
organizations
  ├── users
  ├── user_organizations (many-to-many)
  ├── contacts
  ├── tasks
  ├── notes
  ├── bids
  ├── appointments
  ├── inventory
  ├── files
  ├── email_accounts
  ├── emails
  └── marketing_campaigns
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ (for deployment scripts)
- Supabase account (already connected)
- Web browser (modern Chrome, Firefox, Safari, or Edge)

### Quick Start

1. **Test with Demo Mode** (Already Active)
   - Explore all features with sample data
   - Go to Settings → Developer to enable more demo data

2. **Activate Live Email** (Choose your path)
   - **Fast:** Use IMAP/SMTP (2 minutes)
   - **Production:** Deploy OAuth (15 minutes)
   - See [README_EMAIL_SETUP.md](./README_EMAIL_SETUP.md)

3. **Customize Your CRM**
   - Add your real contacts, tasks, and opportunities
   - Configure your organization settings
   - Invite team members

---

## 📚 Documentation

### Email Setup
- [README_EMAIL_SETUP.md](./README_EMAIL_SETUP.md) - Email setup overview
- [EMAIL_ACTIVATION_QUICK_REF.md](./EMAIL_ACTIVATION_QUICK_REF.md) - Quick reference card
- [ACTIVATE_LIVE_EMAIL.md](./ACTIVATE_LIVE_EMAIL.md) - Detailed setup guide
- [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) - OAuth configuration

### Deployment
- [QUICK_START.md](./QUICK_START.md) - Quick deployment guide
- [deploy-email.sh](./deploy-email.sh) - Automated deployment (Mac/Linux)
- [deploy-email.ps1](./deploy-email.ps1) - Automated deployment (Windows)
- [test-email-setup.sh](./test-email-setup.sh) - Setup verification

### Administration
- [TENANT_MANAGEMENT_GUIDE.md](./TENANT_MANAGEMENT_GUIDE.md) - Multi-tenant setup
- [CLEANUP_DEMO_DATA.md](./CLEANUP_DEMO_DATA.md) - Remove demo data

---

## 🧪 Testing & Diagnostics

### Built-in Diagnostic Tool
1. Go to **Settings** → **Developer** tab
2. Click **"Run Diagnostic Test"**
3. Review deployment status and connection health

### Command Line Testing
```bash
# Verify your setup
chmod +x test-email-setup.sh
./test-email-setup.sh

# View function logs (after deployment)
supabase functions logs nylas-connect --tail
```

---

## 🔧 Configuration

### Supabase Project
- **Project Ref:** `usorqldwroecyxucmtuw`
- **Region:** US East
- **Auth:** Email/Password enabled
- **RLS:** Enabled on all tables

### Environment Secrets (For OAuth)
```bash
NYLAS_API_KEY=your_nylas_api_key
```

### Edge Functions
- `nylas-connect` - Initiate email connections
- `nylas-callback` - Handle OAuth callbacks
- `nylas-send-email` - Send emails via Nylas
- `nylas-sync-emails` - Sync inbox messages

---

## 🎨 Features by Module

### Dashboard
- Activity overview
- Quick stats (contacts, tasks, bids, emails)
- Recent activity feed
- Quick actions

### Contacts
- Full contact profiles
- Organization linking
- Activity timeline
- Email history
- Notes and attachments

### Email
- Multiple account support
- Inbox and sent folders
- Search and filter
- Compose with rich text
- Link to CRM records
- Manual or auto sync

### Marketing
- Campaign creation and management
- Email templates
- Lead scoring engine
- A/B testing tools
- Landing page builder
- Journey mapping
- Analytics dashboard

### Tasks
- Priority levels
- Due date tracking
- Assignment to users
- Status tracking
- Related to contacts/bids

### Settings
- User profile management
- Organization settings
- Security & permissions
- Developer tools
- Diagnostics

---

## 🔒 Security

### Authentication
- Supabase Auth with email/password
- Session management
- Secure password hashing

### Authorization
- Row-Level Security (RLS) on all tables
- Organization-based data isolation
- Role-based access control (RBAC)
- Permission matrix per role

### Data Protection
- Encrypted at rest (Supabase)
- TLS/SSL in transit
- No demo data in production
- Audit logging enabled

---

## 🚢 Deployment Options

### Option 1: IMAP/SMTP Only
**Best for:** Testing, small teams, simple use cases
- No backend deployment needed
- Works with any email provider
- Credentials stored locally
- Manual email sync

### Option 2: Full OAuth Setup
**Best for:** Production, multiple users, enterprise
- Server-side credential storage
- Automatic email sync
- Multi-user support
- Secure OAuth flow
- Requires Edge Functions deployment

---

## 📊 Performance

### Optimizations
- Lazy loading of modules
- Pagination on large lists
- Indexed database queries
- Client-side caching (localStorage)
- Optimistic UI updates

### Scalability
- Multi-tenant architecture
- Database partitioning by organization
- Edge Functions for serverless compute
- CDN-ready static assets

---

## 🆘 Support & Troubleshooting

### Common Issues

**"Failed to fetch" when connecting email**
- Edge Functions not deployed → Use IMAP/SMTP or deploy functions
- See [EMAIL_ACTIVATION_QUICK_REF.md](./EMAIL_ACTIVATION_QUICK_REF.md)

**"Unauthorized" errors**
- Session expired → Log out and log back in
- Check browser console for details

**Demo data in production**
- Remove via Settings → Developer → Clean Demo Data
- See [CLEANUP_DEMO_DATA.md](./CLEANUP_DEMO_DATA.md)

### Getting Help
1. Check browser console (F12) for errors
2. Run diagnostic test in Settings → Developer
3. Review relevant documentation (see above)
4. Check Supabase function logs

---

## 📝 Development

### Tech Stack
- React 18+ with TypeScript
- Tailwind CSS v4.0
- Shadcn/UI components
- Supabase client SDK
- Lucide React icons
- Recharts for visualizations

### Code Structure
```
/
├── components/           # React components
│   ├── ui/              # Shadcn UI components
│   ├── marketing/       # Marketing module components
│   └── *.tsx            # Main module components
├── utils/               # Utility functions
│   ├── supabase/        # Supabase client
│   ├── api.ts           # API functions
│   └── permissions.ts   # Permission helpers
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Database migrations
└── styles/              # Global styles
```

---

## 🎯 Roadmap

### Current Features (v1.0)
- ✅ Core CRM modules
- ✅ Email integration (IMAP + OAuth)
- ✅ Marketing automation
- ✅ Multi-tenant architecture
- ✅ Role-based access control
- ✅ Demo mode for testing

### Planned Features
- 📅 Calendar sync (Google Calendar, Outlook)
- 📱 Mobile app (React Native)
- 🤖 AI-powered insights
- 📞 Phone/SMS integration
- 🔗 Third-party integrations (Zapier, Make)
- 📧 Email templates library
- 📊 Advanced reporting

---

## 📜 License

Proprietary - ProSpaces CRM  
All rights reserved.

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/)
- [Nylas](https://nylas.com/)
- [Lucide Icons](https://lucide.dev/)
- [Recharts](https://recharts.org/)

---

**Ready to activate live email?** Open [README_EMAIL_SETUP.md](./README_EMAIL_SETUP.md) to get started!

---

*Last Updated: November 12, 2025*
