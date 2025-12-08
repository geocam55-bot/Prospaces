# ProSpaces CRM - Project Structure

## 📁 Directory Layout

```
ProSpaces/
├── .github/
│   └── workflows/
│       └── check-imports.yml       # GitHub Action for import validation
├── .husky/
│   └── pre-commit                  # Pre-commit hooks
├── src/
│   ├── main.tsx                    # Entry point (imports ./index.css)
│   ├── index.css                   # Global styles (Tailwind + custom)
│   ├── App.tsx                     # Main app component
│   ├── components/                 # All React components
│   │   ├── ui/                     # Reusable UI components
│   │   ├── AITaskSuggestions.tsx
│   │   ├── Appointments.tsx
│   │   ├── Bids.tsx
│   │   ├── Contacts.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Documents.tsx
│   │   ├── Email.tsx
│   │   ├── ImportExport.tsx
│   │   ├── Inventory.tsx
│   │   ├── Login.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── Marketing.tsx
│   │   ├── Notes.tsx
│   │   ├── Opportunities.tsx
│   │   ├── Reports.tsx
│   │   ├── ScheduledJobs.tsx
│   │   ├── Security.tsx
│   │   ├── Settings.tsx
│   │   ├── Tasks.tsx
│   │   ├── Tenants.tsx
│   │   └── Users.tsx
│   ├── utils/                      # Utility functions
│   │   ├── supabase/
│   │   │   └── client.ts           # Supabase client
│   │   ├── api.ts                  # API utilities
│   │   ├── appointments-client.ts
│   │   ├── bids-client.ts
│   │   ├── contacts-client.ts
│   │   ├── documents-client.ts
│   │   ├── inventory-client.ts
│   │   ├── notes-client.ts
│   │   ├── opportunities-client.ts
│   │   ├── permissions.ts
│   │   ├── quotes-client.ts
│   │   ├── settings-client.ts
│   │   ├── tasks-client.ts
│   │   ├── themes.ts
│   │   └── users-client.ts
│   └── types/                      # TypeScript type definitions
├── public/                         # Static assets
├── .eslintrc.cjs                   # ESLint configuration
├── .lintstagedrc.json              # Lint-staged configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite configuration
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.cjs              # PostCSS configuration
├── DEPLOYMENT_CHECKLIST.md         # Pre-deployment checklist
└── PROJECT_STRUCTURE.md            # This file
```

---

## 📋 Import Rules

### ✅ Correct Import Patterns

```typescript
// Standard React imports
import React from 'react'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

// Component imports (relative paths)
import { Button } from './components/ui/button'
import { Dashboard } from './components/Dashboard'
import App from './App'

// Utility imports (relative paths)
import { supabase } from './utils/supabase/client'
import { checkPermission } from './utils/permissions'

// Package imports (no versions, except allowed)
import { Search, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner@2.0.3'  // Exception: versioned

// Form library (versioned required)
import { useForm } from 'react-hook-form@7.55.0'

// CSS import (only in main.tsx)
import './index.css'
```

### ❌ Incorrect Import Patterns

```typescript
// ❌ Versioned imports (except allowed packages)
import React from 'react@18.2.0'
import { Button } from 'lucide-react@0.307.0'

// ❌ Absolute imports for local files
import { Button } from 'components/ui/button'
import { supabase } from 'utils/supabase/client'

// ❌ Wrong CSS path
import '../styles/globals.css'
import './styles/globals.css'
```

---

## 🎯 Allowed Versioned Imports

Only these packages require version numbers:

1. **react-hook-form@7.55.0**
   ```typescript
   import { useForm } from 'react-hook-form@7.55.0'
   ```

2. **sonner@2.0.3** (for toast notifications)
   ```typescript
   import { toast } from 'sonner@2.0.3'
   ```

**All other imports must be unversioned.**

---

## 🏗️ Component Organization

### UI Components (`/src/components/ui/`)

Reusable, generic UI components:
- `button.tsx`
- `input.tsx`
- `dialog.tsx`
- `select.tsx`
- `badge.tsx`
- etc.

### Feature Components (`/src/components/`)

Business logic components:
- `Contacts.tsx` - Contact management
- `Bids.tsx` - Bid/quote management
- `Inventory.tsx` - Inventory management
- `Dashboard.tsx` - Main dashboard
- etc.

### Utility Modules (`/src/utils/`)

Helper functions and API clients:
- `*-client.ts` - Supabase API wrappers
- `permissions.ts` - Permission checking
- `themes.ts` - Theme management
- `api.ts` - General API utilities

---

## 🎨 Styling

### Global Styles

**Location:** `/src/index.css`

Contains:
- Tailwind CSS imports
- Custom CSS variables
- Global typography
- Theme tokens

**Import in:** `/src/main.tsx` only

```typescript
// main.tsx
import './index.css'  // ✅ Correct
```

### Component Styles

Use Tailwind utility classes:

```typescript
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <Button className="bg-blue-500 hover:bg-blue-600">Click Me</Button>
</div>
```

---

## 🔧 Configuration Files

### `vite.config.ts`

- Build configuration
- Path aliases (`@` → `./src`)
- Dev server settings
- Build optimizations

### `tsconfig.json`

- TypeScript compiler options
- Module resolution
- Type checking rules

### `tailwind.config.js`

- Tailwind customization
- Custom colors/spacing
- Plugin configuration

### `.eslintrc.cjs`

- Linting rules
- Import restrictions
- Code quality checks

---

## 🚀 Build Process

### Development

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`

### Production Build

```bash
npm run build
```

1. TypeScript compilation (`tsc`)
2. Vite build
3. Output to `/build` directory
4. CSS extraction and optimization
5. Code splitting and chunking

### Build Output

```
build/
├── index.html
└── assets/
    ├── index-[hash].css      # Compiled CSS
    ├── index-[hash].js       # Main bundle
    ├── vendor-[hash].js      # React/ReactDOM
    ├── supabase-[hash].js    # Supabase client
    ├── charts-[hash].js      # Recharts
    └── ui-[hash].js          # Lucide icons
```

---

## 📦 Dependencies

### Core Framework

- **React 18.2.0** - UI library
- **TypeScript 5.3.3** - Type safety
- **Vite 6.3.5** - Build tool

### UI Components

- **Radix UI** - Accessible primitives
- **Tailwind CSS 3.4.0** - Utility-first CSS
- **Lucide React** - Icons

### Data & State

- **Supabase 2.39.0** - Backend as a service
- **React Hook Form 7.55.0** - Form management
- **Date-fns 3.0.6** - Date utilities

### Charts & Visualization

- **Recharts 2.10.3** - Chart library

### Utilities

- **clsx** - Class name utility
- **uuid** - UUID generation
- **sonner** - Toast notifications

---

## 🔒 Environment Variables

Required in `.env.local` (not committed):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Access in code:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

---

## 🧪 Testing & Quality

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run build  # Includes TypeScript compilation
```

### Pre-commit Checks

Automatically run before commits (if using local git):
- Import validation
- CSS path checking
- Lint-staged formatting

---

## 🌐 Deployment

### Vercel Configuration

- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`
- **Framework:** Vite

### Deployment URL

**Production:** https://pro-spaces.vercel.app/

### Environment Variables (Vercel)

Set in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📝 Development Workflow

1. **Create feature branch** (if using git locally)
2. **Make changes** in `/src/`
3. **Test locally** with `npm run dev`
4. **Check imports** (automated by pre-commit)
5. **Lint code** with `npm run lint`
6. **Build locally** with `npm run build`
7. **Commit changes** with clear message
8. **Push to GitHub**
9. **Monitor GitHub Actions** for validation
10. **Check Vercel deployment** for build success

---

## 🆘 Troubleshooting

### Build Fails

1. Check import paths are relative
2. Remove versioned imports (except allowed)
3. Verify CSS import is `./index.css`
4. Check TypeScript errors

### CSS Not Loading

1. Ensure `./index.css` exists in `/src/`
2. Check import in `main.tsx`
3. Verify Tailwind config is correct
4. Clear browser cache

### Component Not Found

1. Check file path is correct
2. Use relative imports (`./` or `../`)
3. Verify file exists in `/src/components/`

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated:** December 2024
**Maintained By:** ProSpaces Development Team
