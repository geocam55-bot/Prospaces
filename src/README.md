# ProSpaces CRM

**A multi-tenant CRM platform with role-based access control and comprehensive permission matrices for data isolation across organizations.**

---

## 🚀 Quick Start

### Live Application
**Production:** https://pro-spaces.vercel.app/

### GitHub Repository
**Source Code:** https://github.com/geocam55-bot/ProSpaces

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Automation](#automation)
- [Documentation](#documentation)

---

## ✨ Features

### Core CRM Functionality
- 👥 **Contact Management** - Comprehensive contact database
- 📝 **Task Management** - Task tracking and assignment
- 💰 **Bids & Quotes** - Proposal and quote generation
- 📦 **Inventory Management** - AI-powered inventory search
- 📊 **Opportunities** - Sales pipeline management
- 📅 **Appointments** - Calendar and scheduling
- 📄 **Documents** - File management and storage
- 📧 **Email Integration** - Gmail integration
- 📈 **Reports** - Live data reporting

### Security & Access Control
- 🔐 **Multi-tenant Architecture** - Organization isolation
- 👮 **Role-Based Access Control (RBAC)** - Admin, Manager, User roles
- 🛡️ **Super Admin** - Platform-level administration
- 🔑 **Invitation Code System** - Controlled sign-ups
- 📋 **Audit Logging** - Activity tracking

### Advanced Features
- 🤖 **AI-Powered Task Suggestions** - Daily recommendations
- 🔍 **Advanced Search** - AI-powered inventory search
- 📊 **Manager Dashboard** - Team performance metrics
- 📥 **Import/Export** - CSV data management with scheduling
- 🎨 **Theme System** - Customizable appearance
- 🔧 **Module Toggles** - Organization-level feature control
- 💵 **Tax System** - Dual tax rate support
- 📄 **Quote Terms** - Default terms management

---

## 🛠️ Technology Stack

### Frontend
- **React 18.2** - UI library
- **TypeScript 5.3** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Vite 6.3** - Build tool
- **Radix UI** - Accessible components
- **Lucide React** - Icons
- **Recharts** - Data visualization

### Backend & Database
- **Supabase 2.39** - Backend as a service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage

### Deployment
- **Vercel** - Hosting and CI/CD
- **GitHub Actions** - Automated testing

---

## 📁 Project Structure

```
ProSpaces/
├── src/
│   ├── main.tsx              # Entry point
│   ├── index.css             # Global styles
│   ├── App.tsx               # Main app component
│   ├── components/           # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── Dashboard.tsx
│   │   ├── Contacts.tsx
│   │   ├── Bids.tsx
│   │   ├── Inventory.tsx
│   │   └── ...
│   └── utils/               # Utility functions
│       ├── supabase/
│       ├── *-client.ts      # API wrappers
│       └── ...
├── .github/
│   └── workflows/           # GitHub Actions
├── public/                  # Static assets
├── DEPLOYMENT_CHECKLIST.md  # Pre-commit checklist
├── PROJECT_STRUCTURE.md     # Detailed structure
├── AUTOMATION_SETUP.md      # Automation guide
├── QUICK_REFERENCE.md       # Quick tips
└── README.md               # This file
```

**For detailed structure, see:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 💻 Development

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account (for backend)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/geocam55-bot/ProSpaces.git
   cd ProSpaces
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`

### Scripts

```bash
npm run dev         # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
```

---

## 🚀 Deployment

### Automatic Deployment

Every push to `main` branch automatically:
1. ✅ Runs GitHub Actions validation
2. ✅ Builds on Vercel
3. ✅ Deploys to production

### Manual Deployment

Via Vercel dashboard or:
```bash
npm run build
# Upload build/ directory
```

### Environment Variables (Vercel)

Set in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🤖 Automation

We have **3 layers of automated protection** to prevent build issues:

### 1. GitHub Actions ✅
- Runs on every push/PR
- Validates import patterns
- Checks TypeScript compilation
- Ensures build success

**View at:** https://github.com/geocam55-bot/ProSpaces/actions

### 2. ESLint Configuration ✅
- Real-time linting
- Catches import issues
- Enforces code quality
- Auto-fix capability

### 3. Pre-commit Hooks 🔶
- Validates before commit (local git only)
- Blocks bad commits
- Formats code

**For setup details, see:** [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md)

---

## 📖 Documentation

### Quick Access

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Pre-deployment verification |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Complete project structure |
| [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) | Automation tools guide |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick reference card |
| [README.md](README.md) | This file (overview) |

### For Developers

**Before making changes:**
1. Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

**After making changes:**
1. Run checklist from [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Commit with clear message
3. Monitor GitHub Actions
4. Verify Vercel deployment

---

## 🔧 Import Rules

### ✅ Correct Imports

```typescript
// Standard packages (no versions)
import React from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Local files (relative paths)
import { Button } from './components/ui/button'
import { supabase } from './utils/supabase/client'

// Versioned (only these 2 allowed)
import { useForm } from 'react-hook-form@7.55.0'
import { toast } from 'sonner@2.0.3'

// CSS (only in main.tsx)
import './index.css'
```

### ❌ Incorrect Imports

```typescript
// ❌ Versioned imports (not allowed)
import React from 'react@18.2.0'
import { Search } from 'lucide-react@0.307.0'

// ❌ Absolute imports for local files
import { Button } from 'components/ui/button'

// ❌ Wrong CSS path
import '../styles/globals.css'
```

**For more details, see:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## 🎯 Key Features Breakdown

### Multi-Tenant Architecture
- Complete organization isolation
- Shared authentication
- Tenant-specific data
- Cross-tenant super admin access

### Role-Based Access Control
- **Super Admin** - Platform-wide access
- **Admin** - Organization management
- **Manager** - Team oversight
- **User** - Standard access

### Module System
- Toggle features per organization
- Contacts, Bids, Inventory, etc.
- Granular control
- Easy customization

### AI Features
- Daily task suggestions
- Follow-up recommendations
- Advanced inventory search
- Intelligent insights

---

## 🔒 Security

### Authentication
- Supabase Auth
- Email/password
- Session management
- Secure token handling

### Authorization
- Row-level security (RLS)
- Permission matrices
- Organization isolation
- Audit logging

### Data Protection
- Encrypted at rest
- Encrypted in transit
- Regular backups
- GDPR compliant

---

## 📊 Database Schema

### Core Tables
- `organizations` - Tenant data
- `profiles` - User profiles
- `contacts` - Customer data
- `bids` - Bids and quotes
- `inventory` - Product catalog
- `tasks` - Task management
- `appointments` - Calendar events
- `documents` - File storage
- `notes` - Activity notes
- `opportunities` - Sales pipeline

### Security
- Row-level security on all tables
- Organization-based filtering
- Permission checking
- Audit trails

---

## 🧪 Testing

### GitHub Actions
Automated checks on every commit:
- Import validation
- TypeScript compilation
- Build verification
- Path checking

### Manual Testing
- Local development testing
- Staging environment
- Production verification

---

## 📈 Performance

### Build Optimizations
- Code splitting
- Lazy loading
- Tree shaking
- CSS extraction
- Gzip compression

### Runtime Optimizations
- React memoization
- Virtual scrolling
- Debounced search
- Optimistic updates

---

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 🤝 Contributing

### Workflow
1. Work via GitHub web interface or local git
2. Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. Use [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for imports
4. Ensure GitHub Actions pass
5. Verify Vercel deployment

### Commit Messages
```bash
feat: Add new feature
fix: Fix bug
refactor: Refactor code
chore: Update dependencies
docs: Update documentation
```

---

## 📞 Support

### Resources
- **Documentation:** See files listed above
- **GitHub Issues:** https://github.com/geocam55-bot/ProSpaces/issues
- **GitHub Actions:** https://github.com/geocam55-bot/ProSpaces/actions

### Common Issues
See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) troubleshooting section.

---

## 📅 Version History

### Current: v1.0.0 (December 2024)

**Recent Major Updates:**
- ✅ UUID migration
- ✅ Performance optimizations
- ✅ Tax functionality (dual rates)
- ✅ Theme system
- ✅ CSV import
- ✅ Document management
- ✅ Enhanced bid dialogs
- ✅ Manager dashboard
- ✅ Gmail integration
- ✅ Named price levels
- ✅ Live reports module
- ✅ Invitation-required signup
- ✅ Super admin restrictions
- ✅ AI task suggestions
- ✅ Module toggles
- ✅ Scheduled import/export
- ✅ AI-powered inventory search
- ✅ Build automation system

---

## 📜 License

Proprietary - All rights reserved

---

## 🎉 Acknowledgments

Built with:
- React
- TypeScript
- Supabase
- Tailwind CSS
- Vercel
- And many other amazing open-source tools

---

## 🔗 Quick Links

- **Live App:** https://pro-spaces.vercel.app/
- **GitHub:** https://github.com/geocam55-bot/ProSpaces
- **Actions:** https://github.com/geocam55-bot/ProSpaces/actions
- **Vercel:** https://vercel.com/geocam55-bot/ProSpaces

---

**Built with ❤️ for enterprise CRM needs**

**Last Updated:** December 2024
