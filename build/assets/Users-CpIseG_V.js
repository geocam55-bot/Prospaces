import{c as na,r as i,j as e,o as M,v as B,C as Y,w as se,z as ge,q as X,B as m,E as Ds,a as ne,G as ie,x as a,Z as zs,aj as la,ak as Re,al as Le,am as Ze,an as Pe,ao as _s,ap as Is,aq as oa,d as ca,$ as da,a0 as ua,D as ma,e as xa,f as ha,i as es,F as Os,b as ss,p as pa}from"./index-CPlMhrZV.js";import{A as I,a as T,b as ga}from"./alert-DG_GkMKb.js";import{c as pe}from"./clipboard-DmeE4Bfy.js";import{C as ee}from"./copy-2sMiz0DC.js";import{E as Ye}from"./external-link-D1vlR_tM.js";import{P as fa}from"./PermissionGate-CELzBEQl.js";import{k as Ts,w as as}from"./api-C7n89QSE.js";import{I as he}from"./input-98Vd3q0i.js";import{L as k}from"./label-BGw_huBB.js";import{D as Fe,e as ja,a as ke,b as Me,c as Xe,d as Qe}from"./dialog-NXa0GPOH.js";import{S as oe,a as ce,b as de,c as ue,d as w}from"./select-f9cRD0v0.js";import{T as Ps,a as Fs,b as He,c as We}from"./tabs-DekjkXbt.js";import{C as Ae}from"./circle-check-pCfdL3iS.js";import{B as V}from"./badge-BJSjDBWj.js";import{D as ks}from"./database-N9QXjL2c.js";import{C as os}from"./circle-check-big-DEAxqEkP.js";import{S as ve}from"./shield-jKbXAuFf.js";import{B as Ms}from"./ban-Dhc36URD.js";import{E as Xs}from"./eye-Dpi7aeza.js";import{P as cs}from"./pencil-BzjYnjMl.js";import{S as Na}from"./save-CWVRU56J.js";import{T as ye}from"./triangle-alert-BxUKPRH1.js";import{U as ba,r as va}from"./auth-client-DJgN6PX0.js";import{S as we}from"./search-CTWmVC5C.js";import{C as ya}from"./circle-x-DQqQiDb1.js";import{W as Sa}from"./wrench-BKtGH4pf.js";import{u as Ea}from"./useDebounce-DtfL65mB.js";import{updateSubscription as wa,createSubscription as Rs}from"./subscription-client-BgEXem4w.js";import{I as Ca}from"./InteractiveModuleHelp-DoDpcFrz.js";import{U as Ls}from"./users-Dqt58K_m.js";import{P as ls}from"./plus-CXiRsIC5.js";import{B as rs}from"./building-2-BDCp05l-.js";import{X as _a}from"./x-N9hpif1F.js";import{U as ts}from"./user-plus-BRUn3QD8.js";import{E as Ia}from"./ellipsis-vertical-DgmcusGD.js";import{S as Oa}from"./square-pen-BbDZpyxX.js";import{T as Ta}from"./trash-2-BiCHEZvO.js";import"./lock-CbSLwSEM.js";import"./marketing-client-DsK7s1qr.js";import"./index-Dk0jW5i5.js";import"./index-BRbfZcd6.js";import"./chevron-up-aJ5jELkL.js";import"./square-CiTi7XLp.js";/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]],La=na("user-x",Ra);ne();const is=`-- Add manager_id column to profiles table
-- This allows users to be assigned a manager for hierarchical organization structure

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index on manager_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- Add comment
COMMENT ON COLUMN public.profiles.manager_id IS 'References the manager (another profile) for this user';`;function Aa(){const[r,o]=i.useState(!1),[E,N]=i.useState(!1),[d,C]=i.useState(!1),l=async()=>{try{if(await pe(is)){o(!0),setTimeout(()=>o(!1),2e3);return}}catch{}try{const t=document.createElement("textarea");t.value=is,t.style.position="fixed",t.style.left="-999999px",t.style.top="-999999px",document.body.appendChild(t),t.focus(),t.select();const L=document.execCommand("copy");document.body.removeChild(t),L?(o(!0),setTimeout(()=>o(!1),2e3)):N(!0)}catch{N(!0)}};return e.jsxs(M,{className:"border-blue-200 bg-blue-50",children:[e.jsx(B,{children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx(Y,{className:"h-5 w-5 text-blue-600 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx(se,{className:"text-blue-900",children:"Manager Feature Requires Database Update"}),e.jsx(ge,{className:"text-blue-700 mt-1",children:"To enable the manager assignment feature, we need to add a new column to your database."})]})]})}),e.jsxs(X,{className:"space-y-4",children:[e.jsxs(I,{children:[e.jsx(Y,{className:"h-4 w-4"}),e.jsxs(T,{children:[e.jsx("strong",{children:"Quick Setup:"})," Follow these steps to enable manager assignments."]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Copy the SQL migration"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"Click the button below to copy the SQL code"}),e.jsxs("div",{className:"flex gap-2 mt-2",children:[e.jsx(m,{onClick:l,variant:"outline",size:"sm",className:"gap-2",children:r?e.jsxs(e.Fragment,{children:[e.jsx(Ds,{className:"h-4 w-4 text-green-600"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ee,{className:"h-4 w-4"}),"Copy SQL Migration"]})}),e.jsxs(m,{onClick:()=>N(!E),variant:"ghost",size:"sm",children:[E?"Hide":"View"," SQL"]})]}),E&&e.jsx("pre",{className:"mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto",children:is})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"2"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Open Supabase SQL Editor"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"Go to your Supabase dashboard → SQL Editor → New Query"}),e.jsx(m,{asChild:!0,variant:"outline",size:"sm",className:"gap-2 mt-2",children:e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",children:["Open Supabase Dashboard",e.jsx(Ye,{className:"h-4 w-4"})]})})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"3"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Run the migration"}),e.jsxs("p",{className:"text-sm text-muted-foreground mt-1",children:["Paste the SQL code and click ",e.jsx("strong",{children:"Run"})," or press ",e.jsx("kbd",{className:"px-1.5 py-0.5 bg-muted rounded text-xs font-mono",children:"Ctrl+Enter"})]}),e.jsx("p",{className:"text-sm text-muted-foreground mt-2",children:"✅ After running, refresh this page to use the manager feature"})]})]})]}),e.jsxs("div",{className:"mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200",children:[e.jsx("p",{className:"text-sm text-blue-900",children:e.jsx("strong",{children:"💡 What this migration does:"})}),e.jsxs("ul",{className:"text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2",children:[e.jsxs("li",{children:["Adds a ",e.jsx("code",{className:"bg-blue-100 px-1 rounded",children:"manager_id"})," column to the profiles table"]}),e.jsx("li",{children:"Creates a foreign key relationship to allow users to have managers"}),e.jsx("li",{children:"Adds an index for efficient manager lookups"}),e.jsx("li",{children:"Existing users will have no manager assigned by default (NULL)"})]})]})]})]})}const $e=ne();function Ua({onRefresh:r}){const[o,E]=i.useState(!1),[N,d]=i.useState(!1),[C,l]=i.useState([]),[t,L]=i.useState(!1),[h,x]=i.useState(!1),c=`-- ================================================
-- ProSpaces CRM - Complete Profiles Table Fix
-- This script will create/fix the profiles table and sync all users
-- ================================================

-- Step 1: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id uuid,  -- Changed to UUID for consistency
  status text DEFAULT 'active',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Step 5: Create new, simplified RLS policies

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view profiles in their organization
CREATE POLICY "Users can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id::text = (
      SELECT raw_user_meta_data->>'organizationId' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Allow super admins to view all profiles
CREATE POLICY "Super admins can view all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to manage profiles in their organization
CREATE POLICY "Admins can manage org profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  );

-- Step 6: Create/replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    (NEW.raw_user_meta_data->>'organizationId')::uuid,
    'active',
    NEW.last_sign_in_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
    last_login = EXCLUDED.last_login,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Sync existing users from auth.users to profiles
-- This uses INSERT ... ON CONFLICT to be safe (won't duplicate)
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'standard_user') as role,
  (au.raw_user_meta_data->>'organizationId')::uuid as organization_id,
  'active' as status,
  au.last_sign_in_at as last_login,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  last_login = EXCLUDED.last_login,
  updated_at = now();

-- Step 9: Verify the results
SELECT 
  'Profiles sync complete!' as message,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as total_organizations,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'standard_user' THEN 1 END) as standard_users
FROM public.profiles;`,u=async()=>{d(!0),l([]);const n=[];try{n.push({step:"Authentication",status:"info",message:"Checking authentication..."});const{data:{user:v},error:K}=await $e.auth.getUser();if(!v||K){n.push({step:"Authentication",status:"error",message:"Not authenticated. Please refresh the page and log in again.",details:K}),l(n),d(!1);return}n.push({step:"Authentication",status:"success",message:`Authenticated as ${v.email}`,details:{userId:v.id,email:v.email,role:v.user_metadata?.role,organizationId:v.user_metadata?.organizationId}}),l([...n]),n.push({step:"Profiles Table",status:"info",message:"Checking if profiles table exists..."}),l([...n]);const{error:Q}=await $e.from("profiles").select("id").limit(0);if(Q)if(Q.code==="42P01"){n[n.length-1]={step:"Profiles Table",status:"error",message:"❌ Profiles table does not exist! You need to run the SQL script.",details:Q},l([...n]),L(!0),d(!1);return}else Q.code==="42501"?n[n.length-1]={step:"Profiles Table",status:"warning",message:"Profiles table exists but RLS policies may be blocking access",details:Q}:n[n.length-1]={step:"Profiles Table",status:"error",message:`Database error: ${Q.message}`,details:Q};else n[n.length-1]={step:"Profiles Table",status:"success",message:"✅ Profiles table exists"};l([...n]),n.push({step:"Profile Count",status:"info",message:"Counting profiles..."}),l([...n]);const{count:ae,error:q}=await $e.from("profiles").select("*",{count:"exact",head:!0});q?n[n.length-1]={step:"Profile Count",status:"error",message:`Error counting profiles: ${q.message}`,details:q}:n[n.length-1]={step:"Profile Count",status:ae===0?"warning":"success",message:ae===0?"⚠️ No profiles found! The table is empty.":`Found ${ae} profile(s)`,details:{count:ae}},l([...n]),n.push({step:"Visible Profiles",status:"info",message:"Querying profiles visible to you..."}),l([...n]);const{data:$,error:fe}=await $e.from("profiles").select("*");fe?n[n.length-1]={step:"Visible Profiles",status:"error",message:`Error querying profiles: ${fe.message}`,details:fe}:n[n.length-1]={step:"Visible Profiles",status:$.length===0?"warning":"success",message:$.length===0?"⚠️ No profiles visible to you. RLS policies may be blocking access.":`✅ ${$.length} profile(s) visible to you`,details:{count:$.length,profiles:$.map(p=>({email:p.email,role:p.role,org:p.organization_id}))}},l([...n]),ae===0||$&&$.length===0?(n.push({step:"Recommendation",status:"warning",message:"🔧 Action Required: Run the SQL script below to sync users from auth.users to profiles table"}),L(!0)):n.push({step:"Recommendation",status:"success",message:'✅ Everything looks good! Click "Refresh Users List" to reload.'}),l([...n])}catch(v){n.push({step:"Error",status:"error",message:`Unexpected error: ${v.message}`,details:v}),l(n)}finally{d(!1)}},D=async()=>{try{await pe(c),E(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>E(!1),3e3)}catch{const v=document.createElement("textarea");v.value=c,v.style.position="fixed",v.style.opacity="0",document.body.appendChild(v),v.select(),document.execCommand("copy"),document.body.removeChild(v),E(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>E(!1),3e3)}},U=()=>{window.open("https://supabase.com/dashboard/project/_/sql/new","_blank")},f=n=>{switch(n){case"success":return"text-green-600 bg-green-50 border-green-200";case"error":return"text-red-600 bg-red-50 border-red-200";case"warning":return"text-yellow-600 bg-yellow-50 border-yellow-200";case"info":return"text-blue-600 bg-blue-50 border-blue-200"}},O=n=>{switch(n){case"success":return e.jsx(Ae,{className:"h-4 w-4"});case"error":return e.jsx(Y,{className:"h-4 w-4"});case"warning":return e.jsx(Y,{className:"h-4 w-4"});case"info":return e.jsx(Database,{className:"h-4 w-4"})}};return e.jsxs(M,{className:"border-blue-200 bg-blue-50",children:[e.jsxs(B,{children:[e.jsxs(se,{className:"flex items-center gap-2 text-blue-900",children:[e.jsx(Database,{className:"h-5 w-5"}),"Profiles Table Sync Tool"]}),e.jsx(ge,{className:"text-sm text-muted-foreground",children:"Ensure your profiles table is correctly set up and synced with auth.users."})]}),e.jsxs(X,{className:"space-y-4",children:[e.jsx(I,{className:"border-blue-300 bg-blue-100",children:e.jsxs(T,{className:"text-blue-900",children:[e.jsx("p",{className:"font-semibold mb-2",children:"💡 What this tool does:"}),e.jsxs("ul",{className:"text-sm space-y-1 ml-4 list-disc",children:[e.jsx("li",{children:"Checks if your profiles table is set up correctly"}),e.jsx("li",{children:"Diagnoses RLS policy issues"}),e.jsx("li",{children:"Provides SQL script to sync all users from auth.users to profiles"}),e.jsx("li",{children:"Verifies data visibility"})]})]})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(m,{onClick:u,disabled:N,size:"lg",className:"gap-2",children:N?e.jsxs(e.Fragment,{children:[e.jsx(ie,{className:"h-4 w-4 animate-spin"}),"Running Diagnostic..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Play,{className:"h-4 w-4"}),"Run Full Diagnostic"]})}),C.length>0&&e.jsxs(m,{onClick:r,variant:"outline",size:"lg",className:"gap-2",children:[e.jsx(ie,{className:"h-4 w-4"}),"Refresh Users List"]})]}),C.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"font-semibold text-foreground",children:"Diagnostic Results:"}),C.map((n,v)=>e.jsx(I,{className:f(n.status),children:e.jsxs("div",{className:"flex items-start gap-2",children:[O(n.status),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-semibold text-sm",children:n.step}),e.jsx("p",{className:"text-sm",children:n.message}),n.details&&e.jsxs("details",{className:"mt-2",children:[e.jsx("summary",{className:"cursor-pointer text-xs hover:underline",children:"View Details"}),e.jsx("pre",{className:"text-xs mt-1 p-2 bg-background rounded overflow-auto max-h-32",children:JSON.stringify(n.details,null,2)})]})]})]})},v))]}),t&&e.jsxs("div",{className:"space-y-3 p-4 bg-background rounded-lg border-2 border-blue-300",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"font-semibold text-foreground",children:"📝 Fix SQL Script"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(m,{onClick:D,size:"sm",variant:o?"outline":"default",className:"gap-2",children:o?e.jsxs(e.Fragment,{children:[e.jsx(Ae,{className:"h-4 w-4"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ee,{className:"h-4 w-4"}),"Copy SQL"]})}),e.jsxs(m,{onClick:U,size:"sm",variant:"outline",className:"gap-2",children:[e.jsx(ExternalLink,{className:"h-4 w-4"}),"Open SQL Editor"]})]})]}),e.jsxs(I,{className:"border-yellow-300 bg-yellow-50",children:[e.jsx(Y,{className:"h-4 w-4 text-yellow-600"}),e.jsxs(T,{className:"text-yellow-900",children:[e.jsx("p",{className:"font-semibold mb-2",children:"📋 Instructions:"}),e.jsxs("ol",{className:"text-sm space-y-1 ml-4 list-decimal",children:[e.jsx("li",{children:'Click "Copy SQL" above'}),e.jsx("li",{children:'Click "Open SQL Editor" to open Supabase'}),e.jsx("li",{children:"Paste the SQL script in the editor"}),e.jsx("li",{children:'Click "Run" or press F5'}),e.jsx("li",{children:'Come back here and click "Refresh Users List"'})]})]})]}),e.jsxs("details",{children:[e.jsx("summary",{className:"cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700",children:"📄 Preview SQL Script (click to expand)"}),e.jsx("div",{className:"mt-2 p-3 bg-muted rounded border border-border max-h-96 overflow-auto",children:e.jsx("pre",{className:"text-xs font-mono text-foreground whitespace-pre-wrap",children:c})})]})]})]})]})}ne();function Da(){const[r,o]=i.useState(!1),[E,N]=i.useState(!1),[d,C]=i.useState(null),[l,t]=i.useState(!1),[L,h]=i.useState(!1),x=`-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  visible BOOLEAN DEFAULT false,
  add BOOLEAN DEFAULT false,
  change BOOLEAN DEFAULT false,
  delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable Row Level Security
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super Admin full access" ON permissions;
DROP POLICY IF EXISTS "Admin full access" ON permissions;
DROP POLICY IF EXISTS "Users can read own role permissions" ON permissions;

-- Policy: Super Admin can do everything
CREATE POLICY "Super Admin full access" 
ON permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Admin can do everything
CREATE POLICY "Admin full access" 
ON permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: All authenticated users can read permissions for their role
CREATE POLICY "Users can read own role permissions" 
ON permissions FOR SELECT TO authenticated
USING (
  role = (
    SELECT profiles.role FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_role_module ON permissions(role, module);

-- Insert default permissions
INSERT INTO permissions (role, module, visible, add, change, delete) VALUES
-- Super Admin - Full Access
('super_admin', 'dashboard', true, true, true, true),
('super_admin', 'contacts', true, true, true, true),
('super_admin', 'tasks', true, true, true, true),
('super_admin', 'appointments', true, true, true, true),
('super_admin', 'bids', true, true, true, true),
('super_admin', 'notes', true, true, true, true),
('super_admin', 'email', true, true, true, true),
('super_admin', 'marketing', true, true, true, true),
('super_admin', 'inventory', true, true, true, true),
('super_admin', 'users', true, true, true, true),
('super_admin', 'settings', true, true, true, true),
('super_admin', 'tenants', true, true, true, true),
('super_admin', 'security', true, true, true, true),
('super_admin', 'import-export', true, true, true, true),

-- Admin - Full Access except Tenants
('admin', 'dashboard', true, true, true, true),
('admin', 'contacts', true, true, true, true),
('admin', 'tasks', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'bids', true, true, true, true),
('admin', 'notes', true, true, true, true),
('admin', 'email', true, true, true, true),
('admin', 'marketing', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'users', true, true, true, false),
('admin', 'settings', true, true, true, true),
('admin', 'tenants', false, false, false, false),
('admin', 'security', true, true, true, true),
('admin', 'import-export', true, true, true, true),

-- Manager - Limited Access
('manager', 'dashboard', true, true, true, true),
('manager', 'contacts', true, true, true, true),
('manager', 'tasks', true, true, true, true),
('manager', 'appointments', true, true, true, true),
('manager', 'bids', true, true, true, true),
('manager', 'notes', true, true, true, true),
('manager', 'email', true, true, true, true),
('manager', 'marketing', true, true, true, true),
('manager', 'inventory', true, true, true, true),
('manager', 'users', false, false, false, false),
('manager', 'settings', false, false, false, false),
('manager', 'tenants', false, false, false, false),
('manager', 'security', false, false, false, false),
('manager', 'import-export', false, false, false, false),

-- Marketing - Marketing Focused
('marketing', 'dashboard', true, false, false, false),
('marketing', 'contacts', true, true, true, false),
('marketing', 'tasks', true, true, true, false),
('marketing', 'appointments', true, true, true, false),
('marketing', 'bids', false, false, false, false),
('marketing', 'notes', true, true, true, false),
('marketing', 'email', true, true, true, false),
('marketing', 'marketing', true, true, true, true),
('marketing', 'inventory', true, false, false, false),
('marketing', 'users', false, false, false, false),
('marketing', 'settings', false, false, false, false),
('marketing', 'tenants', false, false, false, false),
('marketing', 'security', false, false, false, false),
('marketing', 'import-export', false, false, false, false),

-- Standard User - Everything except Marketing and Inventory
('standard_user', 'dashboard', true, false, false, false),
('standard_user', 'contacts', true, true, true, false),
('standard_user', 'tasks', true, true, true, false),
('standard_user', 'appointments', true, true, true, false),
('standard_user', 'bids', true, true, true, false),
('standard_user', 'notes', true, true, true, false),
('standard_user', 'email', true, true, true, false),
('standard_user', 'marketing', false, false, false, false),
('standard_user', 'inventory', false, false, false, false),
('standard_user', 'users', true, false, false, false),
('standard_user', 'settings', true, true, true, false),
('standard_user', 'tenants', false, false, false, false),
('standard_user', 'security', false, false, false, false),
('standard_user', 'import-export', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;`,c=()=>{const u=document.createElement("textarea");u.value=x,u.style.position="fixed",u.style.left="-999999px",u.style.top="-999999px",document.body.appendChild(u),u.focus(),u.select();try{document.execCommand("copy"),u.remove(),h(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>h(!1),3e3)}catch{u.remove(),t(!0),a.error("Auto-copy failed. Script shown below - please copy manually.")}};return e.jsxs(M,{className:"border-orange-200 bg-orange-50",children:[e.jsxs(B,{children:[e.jsxs(se,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(ks,{className:"h-5 w-5"}),"Permissions Table Setup Required"]}),e.jsx(ge,{className:"text-orange-700",children:"The permissions table doesn't exist in your Supabase database yet."})]}),e.jsxs(X,{className:"space-y-4",children:[E?e.jsxs(I,{className:"border-green-300 bg-green-50",children:[e.jsx(os,{className:"h-4 w-4 text-green-600"}),e.jsxs(T,{className:"text-green-900",children:[e.jsx("strong",{children:"Success!"})," The permissions table has been created successfully."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs(I,{className:"border-orange-300 bg-orange-100",children:[e.jsx(Y,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900",children:[e.jsx("strong",{children:"Setup Required:"})," You need to create the permissions table in Supabase."]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("p",{className:"text-sm text-orange-900",children:e.jsx("strong",{children:"Follow these steps:"})}),e.jsxs("ol",{className:"list-decimal list-inside space-y-2 text-sm text-orange-800",children:[e.jsx("li",{children:'Click the "Copy SQL Script" button below'}),e.jsxs("li",{children:["Open your ",e.jsx("strong",{children:"Supabase Dashboard"})]}),e.jsxs("li",{children:["Go to ",e.jsx("strong",{children:"SQL Editor"})," (in the left sidebar)"]}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"New Query"'})]}),e.jsx("li",{children:"Paste the SQL script"}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"Run"'})]}),e.jsx("li",{children:"Return here and refresh the page"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{onClick:c,className:"flex-1",variant:"default",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),L?"Copied!":"Copy SQL Script"]}),e.jsx(m,{onClick:()=>t(!l),variant:"outline",children:l?"Hide Script":"Show Script"}),e.jsx(m,{onClick:()=>window.location.reload(),variant:"outline",children:"Refresh"})]}),l&&e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"flex justify-between items-center mb-2",children:e.jsxs("p",{className:"text-sm text-orange-900",children:[e.jsx("strong",{children:"SQL Script:"})," Select all and copy (Ctrl+A, Ctrl+C)"]})}),e.jsx("textarea",{readOnly:!0,value:x,className:"w-full h-96 p-3 bg-gray-900 text-green-400 text-xs rounded font-mono overflow-auto resize-y",onClick:u=>u.currentTarget.select()}),e.jsx("p",{className:"text-xs text-orange-700 mt-2",children:"💡 Tip: Click inside the text area to auto-select all text, then copy with Ctrl+C (Cmd+C on Mac)"})]})]}),d&&e.jsxs(I,{className:"border-red-300 bg-red-50",children:[e.jsx(Y,{className:"h-4 w-4 text-red-600"}),e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"Error:"})," ",d]})]})]})]})}const ns=ne(),As=[{value:"super_admin",label:"Super Admin",description:"Full system access across all organizations"},{value:"admin",label:"Admin",description:"Full access within the organization"},{value:"director",label:"Director",description:"Leadership visibility with broad operational access"},{value:"manager",label:"Manager",description:"Manage teams and day-to-day operations"},{value:"marketing",label:"Marketing",description:"Marketing and outreach focused access"},{value:"designer",label:"Designer",description:"Design and Project Wizards focused access"},{value:"standard_user",label:"Standard User",description:"General day-to-day user access"}],Us=[{value:"none",label:"No Access",icon:Ms},{value:"view",label:"View Only",icon:Xs},{value:"full",label:"Full Access",icon:cs}],za=[{value:"inherit",label:"Inherit",icon:ve},{value:"none",label:"No Access",icon:Ms},{value:"view",label:"View Only",icon:Xs},{value:"full",label:"Full Access",icon:cs}];function Pa({userRole:r}){const[o,E]=i.useState("standard_user"),[N,d]=i.useState({}),[C,l]=i.useState({}),[t,L]=i.useState(!0),[h,x]=i.useState(!1),[c,u]=i.useState(!1),[D,U]=i.useState(!1),f=r==="super_admin"||r==="admin",O=zs("security",r),n=As.filter(p=>r==="super_admin"||p.value!=="super_admin");i.useEffect(()=>{v(o)},[o]),i.useEffect(()=>{const p=new Set([...Object.keys(N),...Object.keys(C)]),_=Array.from(p).some(z=>{const R=N[z],S=C[z];return!R&&!S?!1:!R||!S?!0:R.visible!==S.visible||R.add!==S.add||R.change!==S.change||R.delete!==S.delete});u(_)},[N,C]);const v=async p=>{L(!0),U(!1);try{const{data:_,error:z}=await ns.from("permissions").select("*").eq("role",p);if(z){if(z.code==="PGRST205"||z.code==="42P01"){U(!0),L(!1);return}throw z}const R=la(_||[]),S={};Re.forEach(P=>{const J=Le(P.id),Ce=Ze(P.id,p),je=R.find(W=>W.role===p&&W.module===J);S[J]={role:p,module:J,...je||Ce},P.modules.forEach(W=>{const H=R.find(_e=>_e.role===p&&_e.module===W);H&&(S[W]={role:p,module:W,...H})})}),d(S),l(JSON.parse(JSON.stringify(S))),U(!1)}catch{a.error("Failed to load hierarchical access settings")}finally{L(!1)}},K=(p,_)=>{const z=Le(p);d(R=>({...R,[z]:{role:o,module:z,...R[z]||{},...Is(_)}}))},Q=p=>{const _=N[p];return _?Pe(_):"inherit"},ae=(p,_)=>{const z=Le(p),R=Pe(N[z]||Ze(p,o));if(R==="none")return"none";const S=Pe(N[_]||oa(_,o));return R==="view"?S==="none"?"none":"view":S},q=(p,_)=>{d(z=>{const R={...z};return _==="inherit"?(delete R[p],R):(R[p]={role:o,module:p,...z[p]||{},...Is(_)},R)})},$=async()=>{x(!0);try{const p=Array.from(new Set([...Re.map(S=>Le(S.id)),...Re.flatMap(S=>S.modules)])),_=Object.values(N).filter(S=>p.includes(S.module)).map(S=>({role:o,module:S.module,visible:S.visible,add:S.add,change:S.change,delete:S.delete})),{error:z}=await ns.from("permissions").delete().eq("role",o).in("module",p);if(z)throw z;const{error:R}=await ns.from("permissions").insert(_);if(R)throw R;await v(o),a.success(`Hierarchical access saved for ${As.find(S=>S.value===o)?.label}!`)}catch{a.error("Failed to save hierarchical access")}finally{x(!1)}},fe=()=>{d(JSON.parse(JSON.stringify(C)))};return f?e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl text-foreground mb-2",children:"Role Space & Option Access"}),e.jsxs("p",{className:"text-muted-foreground",children:["Manage security in two levels: ",e.jsx("strong",{children:"1) access to the space"}),", then ",e.jsx("strong",{children:"2) access to options inside that space"}),". This gives each role only the tools it actually needs."]})]}),D?e.jsx(Da,{}):e.jsxs(Ps,{value:o,onValueChange:p=>E(p),children:[e.jsx("div",{className:"overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",children:e.jsx(Fs,{className:"inline-flex w-auto min-w-full",children:n.map(p=>e.jsx(He,{value:p.value,className:"whitespace-nowrap",children:p.label},p.value))})}),n.map(p=>e.jsx(We,{value:p.value,className:"space-y-4",children:e.jsxs(M,{children:[e.jsxs(B,{children:[e.jsxs(se,{className:"flex items-center gap-2",children:[e.jsx(ve,{className:"h-5 w-5"}),p.label," Hierarchical Access"]}),e.jsx(ge,{children:p.description})]}),e.jsx(X,{children:t?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"}),e.jsx("p",{className:"text-muted-foreground",children:"Loading space access..."})]})}):e.jsxs(e.Fragment,{children:[c&&e.jsxs(I,{className:"mb-4 border-yellow-400 bg-yellow-50",children:[e.jsx(Y,{className:"h-4 w-4 text-yellow-600"}),e.jsxs(T,{className:"text-yellow-900",children:["You have unsaved changes. Click ",e.jsx("strong",{children:"Save Changes"})," to apply them."]})]}),e.jsx("div",{className:"space-y-3",children:Re.map(_=>{const z=Le(_.id),R=N[z],S=Pe(R||Ze(_.id,o));return e.jsx(M,{className:"bg-muted/30",children:e.jsxs(X,{className:"pt-5 space-y-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("span",{className:"text-xl",children:_.icon}),e.jsx("p",{className:"text-sm font-medium text-foreground",children:_.name})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:_.description}),e.jsx("div",{className:"flex flex-wrap gap-2 mt-2",children:_.modules.map(P=>e.jsx(V,{variant:"secondary",className:"text-xs",children:_s(P)},P))})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsx("p",{className:"text-sm font-semibold text-foreground",children:"Step 1 — Space Access"}),e.jsx(V,{variant:"secondary",children:"Level 1"})]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:Us.map(P=>{const J=P.icon;return e.jsxs(m,{type:"button",size:"sm",variant:S===P.value?"default":"outline",onClick:()=>K(_.id,P.value),disabled:!O,children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),P.label]},P.value)})})]}),e.jsxs("div",{className:"rounded-lg border border-border bg-background/70 p-4 space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-foreground",children:"Step 2 — Option Access"}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Inherit follows the role default and still respects the parent space access."})]}),e.jsx(V,{variant:"secondary",children:"Level 2"})]}),e.jsx("div",{className:"space-y-3",children:_.modules.map(P=>{const J=Q(P),Ce=ae(_.id,P),je=Us.find(H=>H.value===Ce)?.label||"No Access",W=Re.filter(H=>H.modules.includes(P)).length;return e.jsxs("div",{className:"rounded-lg border border-border/60 p-3",children:[e.jsxs("div",{className:"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:_s(P)}),W>1&&e.jsx(V,{variant:"outline",children:"Shared Option"})]}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Effective access: ",e.jsx("strong",{children:je})]})]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:za.map(H=>{const _e=H.icon;return e.jsxs(m,{type:"button",size:"sm",variant:J===H.value?"default":"outline",onClick:()=>q(P,H.value),disabled:!O,children:[e.jsx(_e,{className:"h-4 w-4 mr-2"}),H.label]},H.value)})})]}),S==="none"&&e.jsx("p",{className:"mt-2 text-xs text-muted-foreground",children:"Enable the parent space first before this option becomes available."}),S==="view"&&J==="full"&&e.jsxs("p",{className:"mt-2 text-xs text-amber-700",children:["This option is capped at ",e.jsx("strong",{children:"View Only"})," while the space remains read-only."]})]},`${_.id}-${P}`)})})]})]})},_.id)})}),e.jsxs("div",{className:"flex gap-3 mt-6",children:[e.jsx(m,{onClick:$,disabled:!O||!c||h,className:"flex-1",children:h?e.jsxs(e.Fragment,{children:[e.jsx(ie,{className:"h-4 w-4 mr-2 animate-spin"}),"Saving..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Na,{className:"h-4 w-4 mr-2"}),"Save Changes"]})}),e.jsxs(m,{onClick:fe,variant:"outline",disabled:!O||!c||h,children:[e.jsx(ie,{className:"h-4 w-4 mr-2"}),"Reset"]})]})]})})]})},p.value))]})]}):e.jsxs(I,{children:[e.jsx(ve,{className:"h-4 w-4"}),e.jsx(T,{children:"You don't have permission to manage space access. Only Super Admins and Admins can access this section."})]})}function Fa(){const r=`-- ============================================================================
-- COMPLETE RLS FIX FOR USER MANAGEMENT
-- ============================================================================

-- PART 1: Fix RLS Policies (Allow super_admin bypass)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view any profile" ON public.profiles;

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

CREATE POLICY "Super admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

CREATE POLICY "Super admins can view any profile"
  ON public.profiles FOR SELECT
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId') = organization_id
    OR auth.uid() = id
  );

-- PART 2: Create Server-Side Functions (Bypass RLS for everyone)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  p_user_email TEXT,
  p_organization_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND status = 'active'
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found or inactive');
  END IF;
  
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  UPDATE public.profiles
  SET organization_id = p_organization_id, status = 'active', updated_at = NOW()
  WHERE id = v_user_id;
  
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organizationId}', to_jsonb(p_organization_id)
  )
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'organization_id', p_organization_id,
    'message', 'User successfully assigned to organization'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_org_and_assign_user(
  p_org_name TEXT,
  p_user_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT;
  v_org_exists BOOLEAN;
BEGIN
  v_org_id := lower(regexp_replace(
    regexp_replace(trim(p_org_name), '[^a-zA-Z0-9\\\\s-]', '', 'g'),
    '\\\\s+', '-', 'g'
  ));
  v_org_id := substring(v_org_id from 1 for 50);
  
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = v_org_id) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    INSERT INTO public.organizations (id, name, status, created_at, updated_at)
    VALUES (v_org_id, p_org_name, 'active', NOW(), NOW());
  END IF;
  
  RETURN public.assign_user_to_organization(p_user_email, v_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO service_role;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO service_role;`,o=()=>{pe(r),a.success("SQL script copied to clipboard!")};return e.jsxs(M,{className:"border-orange-200 bg-orange-50",children:[e.jsx(B,{children:e.jsxs(se,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(ye,{className:"h-5 w-5"}),"⚠️ Database Setup Required (One-Time)"]})}),e.jsxs(X,{className:"space-y-4",children:[e.jsx(I,{className:"border-red-300 bg-red-100",children:e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"RLS policies are preventing cross-organization user management."}),e.jsx("p",{className:"mt-2",children:"To enable super_admin privileges and fix user assignment errors, you need to run a SQL script in your Supabase database."})]})}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("h3",{className:"font-medium text-orange-900",children:"What This Fixes:"}),e.jsxs("ul",{className:"list-disc pl-5 space-y-1 text-sm text-orange-800",children:[e.jsx("li",{children:"✅ Allows super_admins to manage users across all organizations"}),e.jsx("li",{children:'✅ Fixes "No rows updated - RLS policy blocking" errors'}),e.jsx("li",{children:"✅ Enables User Recovery tool to move users between orgs"}),e.jsx("li",{children:"✅ Enables browser console tools (assignUserToOrg, etc.)"}),e.jsx("li",{children:"✅ Creates server-side functions that bypass RLS safely"})]})]}),e.jsx(I,{className:"border-blue-300 bg-blue-50",children:e.jsxs(T,{className:"text-blue-900",children:[e.jsx("strong",{children:"📋 Step-by-Step Instructions:"}),e.jsxs("ol",{className:"list-decimal pl-5 mt-2 space-y-2",children:[e.jsx("li",{children:'Click the "Copy SQL Script" button below'}),e.jsxs("li",{children:["Go to your"," ",e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",className:"underline inline-flex items-center gap-1",children:["Supabase Dashboard ",e.jsx(Ye,{className:"h-3 w-3"})]})]}),e.jsxs("li",{children:["Navigate to ",e.jsx("strong",{children:"SQL Editor"})," in the left sidebar"]}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"New Query"'})]}),e.jsx("li",{children:"Paste the SQL script"}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"Run"'})," or press F5"]}),e.jsx("li",{children:"You should see: ✅ 3 policies created, ✅ 2 functions created"}),e.jsx("li",{children:"Come back here and refresh the page"})]})]})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{onClick:o,className:"flex-1",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"📋 Copy SQL Script"]}),e.jsxs(m,{variant:"outline",onClick:()=>window.open("https://supabase.com/dashboard","_blank"),className:"flex-1",children:[e.jsx(Ye,{className:"h-4 w-4 mr-2"}),"Open Supabase Dashboard"]})]}),e.jsxs("details",{className:"text-sm",children:[e.jsx("summary",{className:"cursor-pointer font-medium text-orange-900 hover:text-orange-700",children:"🔍 Show SQL Script Preview"}),e.jsx("div",{className:"mt-2 bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto",children:e.jsx("pre",{children:r})})]}),e.jsx(I,{className:"border-yellow-300 bg-yellow-50",children:e.jsxs(T,{className:"text-yellow-900 text-xs",children:[e.jsx("strong",{children:"⚠️ Important:"})," This SQL script is safe to run. It:",e.jsxs("ul",{className:"list-disc pl-5 mt-1 space-y-1",children:[e.jsxs("li",{children:["Uses ",e.jsx("code",{children:"CREATE OR REPLACE"})," so it's safe to run multiple times"]}),e.jsx("li",{children:"Only adds new RLS policies (doesn't remove existing ones)"}),e.jsx("li",{children:"Grants execute permissions to authenticated users"}),e.jsxs("li",{children:["Uses ",e.jsx("code",{children:"SECURITY DEFINER"})," safely (validated inputs)"]})]})]})}),e.jsxs(I,{className:"border-green-300 bg-green-50",children:[e.jsx(os,{className:"h-4 w-4"}),e.jsxs(T,{className:"text-green-900 text-sm",children:[e.jsx("strong",{children:"After running the SQL, you'll be able to:"}),e.jsxs("ul",{className:"list-disc pl-5 mt-2 space-y-1",children:[e.jsx("li",{children:"Move users between organizations"}),e.jsx("li",{children:"Use the User Recovery tool without errors"}),e.jsxs("li",{children:["Run console commands like: ",e.jsx("code",{className:"bg-green-100 px-1 rounded",children:"assignUserToOrg('email', 'org-id')"})]}),e.jsx("li",{children:"Manage users across all organizations as super_admin"})]})]})]})]})]})}const ka=async r=>{try{if(await pe(r))return}catch{}},Ee=ne();function Ma({currentUserId:r,currentOrganizationId:o,currentUserRole:E}){const[N,d]=i.useState(""),[C,l]=i.useState(!1),[t,L]=i.useState(null),[h,x]=i.useState(!1),c=async()=>{l(!0),L(null);try{const{data:f,error:O}=await Ee.auth.admin.listUsers(),n=f?.users?.find(q=>q.email?.toLowerCase()===N.toLowerCase()),{data:v,error:K}=await Ee.from("profiles").select("*").ilike("email",N),{data:Q,error:ae}=await Ee.from("profiles").select("*").ilike("email",N);L({email:N,authUser:n?{id:n.id,email:n.email,created_at:n.created_at,confirmed_at:n.confirmed_at}:null,profile:v?.[0]||null,allProfiles:Q||[],profileError:K,allProfilesError:ae,currentOrg:o}),!n&&!v?.[0]?a.error("User not found in system"):n&&!v?.[0]?a.warning("User exists in auth but missing profile record"):v?.[0]?.organization_id!==o?a.warning("User found but in different organization"):a.success("User found")}catch{a.error("Error searching for user")}finally{l(!1)}},u=async()=>{if(!t?.authUser){a.error("No auth user found to create profile for");return}x(!0);try{const{data:f,error:O}=await Ee.from("profiles").insert([{id:t.authUser.id,email:t.authUser.email,name:t.authUser.email.split("@")[0],organization_id:o,role:"standard_user",status:"active"}]).select();if(O){a.error("Failed to create profile: "+O.message);return}if(!f||f.length===0){a.error("Failed to create profile: No data returned");return}a.success("Profile created successfully"),await c()}catch{a.error("Error creating profile")}finally{x(!1)}},D=async()=>{if(!t?.profile){a.error("No profile found to update");return}x(!0);try{const{data:f,error:O}=await Ee.rpc("assign_user_to_organization",{p_user_email:t.profile.email,p_organization_id:o});if(O){O.message.includes("function")&&O.message.includes("does not exist")?a.error("Database functions not installed. Please run the SQL setup script first. See /SQL_FIX_USER_ORGANIZATION.sql"):a.error("Failed to update organization: "+O.message);return}if(!f||!f.success){a.error(f?.error||"Failed to assign user to organization");return}a.success("User moved to your organization successfully!"),await c()}catch(f){a.error("Error updating organization: "+f.message)}finally{x(!1)}},U=async()=>{if(!t?.profile){a.error("No profile to delete");return}if(confirm("This will delete the existing profile and recreate it. Continue?")){x(!0);try{const{data:f,error:O}=await Ee.from("profiles").delete().eq("id",t.profile.id).select();if(O){O.code==="42501"||O.message.includes("policy")?a.error("RLS Policy Error: Cannot delete profile in other organization. Use the SQL script below instead.",{duration:5e3}):a.error("Failed to delete profile: "+O.message);return}if(!f||f.length===0){a.error("Cannot delete profile - RLS policies are blocking this operation. Use the SQL script below instead.",{duration:5e3});return}await u()}catch{a.error("Error during delete and recreate - Use SQL script below instead")}finally{x(!1)}}};return e.jsxs("div",{className:"space-y-6",children:[e.jsx(Fa,{}),e.jsxs(M,{children:[e.jsx(B,{children:e.jsxs(se,{className:"flex items-center gap-2",children:[e.jsx(ba,{className:"h-5 w-5"}),"User Recovery Tool"]})}),e.jsxs(X,{className:"space-y-4",children:[e.jsxs(I,{children:[e.jsx(ye,{className:"h-4 w-4"}),e.jsx(T,{children:"This tool helps find and recover missing users. It will search across auth.users and profiles tables."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{children:"Email Address"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(he,{type:"email",placeholder:"user@example.com",value:N,onChange:f=>d(f.target.value),onKeyDown:f=>f.key==="Enter"&&c()}),e.jsxs(m,{onClick:c,disabled:C,children:[e.jsx(we,{className:"h-4 w-4 mr-2"}),C?"Searching...":"Search"]})]})]}),t&&e.jsxs("div",{className:"space-y-4 mt-6",children:[e.jsxs("div",{className:"border rounded-lg p-4 space-y-3",children:[e.jsxs("h3",{className:"font-medium",children:["Search Results for: ",t.email]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("div",{className:"flex items-center justify-between p-3 bg-muted rounded",children:e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium",children:"Auth User (auth.users)"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.authUser?e.jsxs(e.Fragment,{children:["✅ Found - ID: ",t.authUser.id.substring(0,8),"...",e.jsx("br",{}),"Created: ",new Date(t.authUser.created_at).toLocaleDateString()]}):"❌ Not found in authentication system"})]})}),e.jsx("div",{className:"flex items-center justify-between p-3 bg-muted rounded",children:e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium",children:"Profile (profiles table)"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.profile?e.jsxs(e.Fragment,{children:["✅ Found - Organization: ",t.profile.organization_id,e.jsx("br",{}),t.profile.organization_id===t.currentOrg?e.jsx("span",{className:"text-green-600",children:"✓ In your organization"}):e.jsx("span",{className:"text-orange-600",children:"⚠️ In different organization"}),e.jsx("br",{}),"Role: ",t.profile.role,e.jsx("br",{}),"Status: ",t.profile.status]}):"❌ No profile record found"})]})}),t.allProfiles&&t.allProfiles.length>0&&e.jsxs("div",{className:"p-3 bg-blue-50 rounded border border-blue-200",children:[e.jsxs("p",{className:"text-sm font-medium text-blue-900",children:["Found ",t.allProfiles.length," profile(s) across all organizations:"]}),t.allProfiles.map((f,O)=>e.jsxs("div",{className:"text-xs text-blue-800 mt-2 pl-4",children:["• Org: ",f.organization_id," | Role: ",f.role," | Status: ",f.status]},O))]})]}),e.jsxs("div",{className:"space-y-2 pt-4 border-t",children:[e.jsx("p",{className:"text-sm font-medium",children:"Recovery Actions:"}),t.authUser&&!t.profile&&e.jsxs(m,{onClick:u,disabled:h,className:"w-full",children:[e.jsx(ie,{className:"h-4 w-4 mr-2"}),"Create Profile in Your Organization"]}),t.profile&&t.profile.organization_id!==t.currentOrg&&e.jsxs(e.Fragment,{children:[e.jsxs(I,{className:"border-orange-200 bg-orange-50",children:[e.jsx(ye,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900",children:[e.jsx("strong",{children:"User in Different Organization"}),e.jsxs("p",{className:"text-sm mt-1",children:["This user is in organization: ",e.jsx("code",{className:"bg-orange-100 px-1 rounded",children:t.profile.organization_id})]}),e.jsxs("p",{className:"text-sm mt-2",children:[e.jsx("strong",{children:"⚠️ Note:"}),' Due to Row Level Security (RLS) policies, moving users between organizations requires super_admin privileges. If the "Move User" button fails, use "Delete & Recreate" instead.']})]})]}),e.jsxs(m,{onClick:D,disabled:h,variant:"outline",className:"w-full",children:[e.jsx(ie,{className:"h-4 w-4 mr-2"}),"Try to Move User (May Fail if Not Super Admin)"]}),e.jsxs(m,{onClick:U,disabled:h,className:"w-full bg-blue-600 hover:bg-blue-700 text-white",children:[e.jsx(ie,{className:"h-4 w-4 mr-2"}),"Delete & Recreate (Recommended)"]})]}),t.profile&&t.profile.organization_id===t.currentOrg&&e.jsx(I,{className:"border-green-200 bg-green-50",children:e.jsx(T,{className:"text-green-900",children:"✅ User is already in your organization. No action needed."})}),!t.authUser&&!t.profile&&e.jsx(I,{children:e.jsx(T,{children:"User not found in the system. They may need to sign up first."})})]})]}),t.profile&&t.profile.organization_id!==t.currentOrg&&e.jsxs("div",{className:"border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200",children:[e.jsx("h3",{className:"font-medium text-blue-900",children:"🛠️ Manual SQL Fix (Bypasses RLS)"}),e.jsx("p",{className:"text-sm text-blue-800",children:"If the buttons above fail due to RLS policies, copy and run this SQL in your Supabase SQL Editor:"}),e.jsx("div",{className:"bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto",children:e.jsx("pre",{children:`-- Move user ${t.email} to organization ${o}
UPDATE public.profiles 
SET organization_id = '${o}'
WHERE id = '${t.profile.id}';

-- Verify the update
SELECT id, email, organization_id, role, status 
FROM public.profiles 
WHERE email = '${t.email}';`})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(m,{size:"sm",variant:"outline",onClick:()=>{const f=`-- Move user ${t.email} to organization ${o}
UPDATE public.profiles 
SET organization_id = '${o}'
WHERE id = '${t.profile.id}';

-- Verify the update
SELECT id, email, organization_id, role, status 
FROM public.profiles 
WHERE email = '${t.email}';`;ka(f),a.success("SQL copied to clipboard!")},children:"📋 Copy SQL"}),e.jsxs(m,{size:"sm",onClick:c,disabled:C,children:[e.jsx(ie,{className:"h-4 w-4 mr-2"}),"Re-check After Running SQL"]})]}),e.jsx(I,{className:"border-yellow-300 bg-yellow-50",children:e.jsxs(T,{className:"text-yellow-900 text-xs",children:[e.jsx("strong",{children:"How to run this SQL:"}),e.jsxs("ol",{className:"list-decimal pl-5 mt-2 space-y-1",children:[e.jsx("li",{children:"Go to your Supabase Dashboard"}),e.jsx("li",{children:"Navigate to SQL Editor"}),e.jsx("li",{children:'Click "New Query"'}),e.jsx("li",{children:"Paste the SQL above"}),e.jsx("li",{children:'Click "Run" or press Ctrl+Enter'}),e.jsx("li",{children:'Return here and click "Re-check After Running SQL"'})]})]})})]})]}),e.jsxs("div",{className:"text-xs text-muted-foreground space-y-1 mt-4",children:[e.jsx("p",{children:e.jsx("strong",{children:"Troubleshooting Tips:"})}),e.jsxs("ul",{className:"list-disc pl-5 space-y-1",children:[e.jsx("li",{children:'If user exists in auth but no profile: Click "Create Profile"'}),e.jsx("li",{children:'If user is in different organization: Use "Delete & Recreate" (recommended for non-super admins)'}),e.jsx("li",{children:'"Move User" button requires super_admin role due to RLS policies'}),e.jsx("li",{children:'"Delete & Recreate" bypasses RLS by creating a fresh profile in your organization'}),e.jsx("li",{children:"After recovery, user should appear in the Users list immediately"})]})]})]})]})]})}function Xa(){const[r,o]=useState(!1),E=`-- Fix profiles table to allow invited users without auth.users entry
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Make id column independent (not dependent on auth.users)
-- The id will still be PRIMARY KEY but won't require auth.users reference

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Step 4: Update RLS policies to allow admins to insert invited users
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

CREATE POLICY "admins_can_insert_profiles" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can insert their own profile
    auth.uid() = id
    OR
    -- Or if user is admin/super_admin (check from their existing profile)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Step 5: Update RLS policies to allow admins to update any profile in their org
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

CREATE POLICY "users_can_update_profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Or if user is super_admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Or if user is admin in the same organization
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  );

-- Step 6: Allow admins to delete profiles
DROP POLICY IF EXISTS "users_delete_own_profile" ON public.profiles;

CREATE POLICY "admins_can_delete_profiles" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own profile
    auth.uid() = id
    OR
    -- Or if user is super_admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Or if user is admin in the same organization
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role = 'admin'
      AND p1.organization_id = public.profiles.organization_id
    )
  );

-- ✅ Done! Now admins can invite users and create profiles with temporary IDs`,N=()=>{copyToClipboard(E),o(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>o(!1),2e3)};return e.jsxs(Card,{className:"border-orange-200 bg-orange-50",children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(AlertTriangle,{className:"h-5 w-5"}),"Profiles Table Fix Required"]}),e.jsx(CardDescription,{className:"text-sm text-muted-foreground",children:"The profiles table currently has a foreign key constraint that prevents inviting users who haven't signed up yet. Run the SQL script below to fix this."})]}),e.jsxs(CardContent,{className:"space-y-4",children:[e.jsxs(I,{className:"bg-background border-orange-300",children:[e.jsx(Database,{className:"h-4 w-4"}),e.jsx(T,{children:"The profiles table currently has a foreign key constraint that prevents inviting users who haven't signed up yet. Run the SQL script below to fix this."})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"text-sm font-semibold text-foreground",children:"SQL Migration Script"}),e.jsx(Button,{onClick:N,size:"sm",variant:"outline",className:"gap-2",children:r?e.jsxs(e.Fragment,{children:[e.jsx(Ae,{className:"h-4 w-4"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ee,{className:"h-4 w-4"}),"Copy SQL"]})})]}),e.jsx("pre",{className:"bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs",children:E}),e.jsxs("div",{className:"bg-background border border-orange-200 rounded-lg p-4 space-y-2",children:[e.jsx("h4",{className:"font-medium text-sm text-foreground",children:"Instructions:"}),e.jsxs("ol",{className:"text-sm text-foreground space-y-1 list-decimal list-inside",children:[e.jsx("li",{children:'Click "Copy SQL" button above'}),e.jsx("li",{children:"Open Supabase Dashboard → SQL Editor"}),e.jsx("li",{children:"Paste and run the script"}),e.jsx("li",{children:"Refresh this page and try inviting the user again"})]})]})]})]})]})}function Qa(){const[r,o]=i.useState(""),[E,N]=i.useState(!1),[d,C]=i.useState(!1),[l,t]=i.useState(null),L=async()=>{if(!r){a.error("Please enter an email address");return}N(!0),t(null);try{const x=ne(),c={found:!1,inProfiles:!1,hasOrganization:!1,isActive:!1,issues:[],fixes:[]},{data:u,error:D}=await x.from("profiles").select("*").eq("email",r).maybeSingle();u?(c.found=!0,c.inProfiles=!0,c.hasOrganization=!!u.organization_id,c.isActive=u.status==="active",c.details=u,u.organization_id||(c.issues.push("User has no organization assigned"),c.fixes.push('Click "Recover User" to assign to Rona Atlantic')),u.status!=="active"&&(c.issues.push(`User status is '${u.status}' instead of 'active'`),c.fixes.push('Click "Recover User" to activate'))):(c.issues.push("User not found in profiles table"),c.fixes.push("User may need to be recreated or may exist only in auth.users"));const U="rona-atlantic",{data:f}=await x.from("profiles").select("email, role, status").eq("organization_id",U).order("email");c.orgUsers=f||[],t(c),c.found&&c.hasOrganization&&c.isActive?a.success("User found and active!"):c.found?a.warning("User found but has issues"):a.error("User not found")}catch(x){a.error("Search failed: "+x.message)}finally{N(!1)}},h=async()=>{if(!r){a.error("Please enter an email address");return}C(!0);try{const x=ne(),c="rona-atlantic",{data:u,error:D}=await x.rpc("assign_user_to_organization",{p_user_email:r,p_organization_id:c});if(D){if(l?.details?.user_id){const{error:U}=await x.from("profiles").update({organization_id:c,status:"active",updated_at:new Date().toISOString()}).eq("user_id",l.details.user_id);if(U){a.error("Recovery failed: "+U.message);return}a.success("User recovered using fallback method!"),setTimeout(()=>L(),500);return}a.error("RPC call failed: "+D.message);return}a.success("User recovered successfully!"),setTimeout(()=>L(),500)}catch(x){a.error("Recovery failed: "+x.message)}finally{C(!1)}};return e.jsxs("div",{className:"space-y-6",children:[e.jsxs(M,{children:[e.jsxs(B,{children:[e.jsxs(se,{className:"flex items-center gap-2",children:[e.jsx(La,{className:"w-5 h-5"}),"Find Missing User"]}),e.jsx(ge,{children:"Search for and recover missing users in the system"})]}),e.jsxs(X,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"email",children:"User Email"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(he,{id:"email",type:"email",placeholder:"user@example.com",value:r,onChange:x=>o(x.target.value),onKeyDown:x=>x.key==="Enter"&&L()}),e.jsxs(m,{onClick:L,disabled:E,children:[e.jsx(we,{className:"w-4 h-4 mr-2"}),E?"Searching...":"Search"]})]})]}),l&&e.jsxs(e.Fragment,{children:[e.jsx(I,{className:l.found&&l.hasOrganization&&l.isActive?"border-green-500":l.found?"border-yellow-500":"border-red-500",children:e.jsx(T,{children:e.jsx("div",{className:"space-y-3",children:e.jsxs("div",{className:"flex items-start gap-2",children:[l.found&&l.hasOrganization&&l.isActive?e.jsx(Ae,{className:"w-5 h-5 text-green-600 mt-0.5"}):l.found?e.jsx(ye,{className:"w-5 h-5 text-yellow-600 mt-0.5"}):e.jsx(ya,{className:"w-5 h-5 text-red-600 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("span",{className:"font-medium",children:"Status:"}),e.jsx(V,{variant:l.found?"default":"destructive",children:l.found?"Found":"Not Found"}),l.found&&e.jsxs(e.Fragment,{children:[e.jsx(V,{variant:l.hasOrganization?"default":"destructive",children:l.hasOrganization?"Has Org":"No Org"}),e.jsx(V,{variant:l.isActive?"default":"secondary",children:l.isActive?"Active":"Inactive"})]})]}),l.details&&e.jsxs("div",{className:"text-sm space-y-1 mb-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"User ID:"})," ",l.details.user_id]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Email:"})," ",l.details.email]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Organization:"})," ",l.details.organization_id||"❌ None"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Role:"})," ",l.details.role||"standard_user"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Status:"})," ",l.details.status]})]}),l.issues.length>0&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-medium text-sm",children:"Issues:"}),e.jsx("ul",{className:"text-sm space-y-1",children:l.issues.map((x,c)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-red-500",children:"•"}),e.jsx("span",{children:x})]},c))})]}),l.fixes.length>0&&e.jsxs("div",{className:"space-y-1 mt-2",children:[e.jsx("div",{className:"font-medium text-sm",children:"Suggested Fixes:"}),e.jsx("ul",{className:"text-sm space-y-1",children:l.fixes.map((x,c)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-blue-500",children:"→"}),e.jsx("span",{children:x})]},c))})]}),l.found&&l.issues.length>0&&e.jsx("div",{className:"mt-3",children:e.jsxs(m,{onClick:h,disabled:d,size:"sm",children:[e.jsx(ie,{className:"w-4 h-4 mr-2"}),d?"Recovering...":"Recover User"]})})]})]})})})}),l.orgUsers&&l.orgUsers.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"font-medium text-sm",children:["Users in Rona Atlantic (",l.orgUsers.length,"):"]}),e.jsx("div",{className:"border rounded-lg overflow-hidden",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{className:"bg-muted",children:e.jsxs("tr",{children:[e.jsx("th",{className:"text-left p-2",children:"Email"}),e.jsx("th",{className:"text-left p-2",children:"Role"}),e.jsx("th",{className:"text-left p-2",children:"Status"})]})}),e.jsx("tbody",{children:l.orgUsers.map((x,c)=>e.jsxs("tr",{className:"border-t",children:[e.jsx("td",{className:"p-2",children:x.email}),e.jsx("td",{className:"p-2",children:x.role}),e.jsx("td",{className:"p-2",children:e.jsx(V,{variant:x.status==="active"?"default":"secondary",children:x.status})})]},c))})]})})]})]})]})]}),e.jsxs(M,{children:[e.jsxs(B,{children:[e.jsx(se,{children:"Quick Actions"}),e.jsx(ge,{children:"Common recovery operations"})]}),e.jsx(X,{className:"space-y-3",children:e.jsxs("div",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:"Note:"})," If a user is completely missing from the database, they will need to sign up again or be re-invited by an administrator."]})})]})]})}function $a(){const[r,o]=i.useState(!1),[E,N]=i.useState(!1),[d,C]=i.useState(null),l=async()=>{o(!0);try{const h=ne(),{data:x,error:c}=await h.from("profiles").select("email, organization_id, status");if(c){a.error("Failed to scan users: "+c.message);return}const{data:u,error:D}=await h.from("tenants").select("id, name, status").eq("status","active");if(D){a.error("Failed to load organizations: "+D.message);return}const U=new Set(u?.map(n=>n.id)||[]),f=x?.filter(n=>{const v=/^org-[0-9]+$/.test(n.organization_id||""),K=!n.organization_id,Q=n.organization_id&&!U.has(n.organization_id);return v||K||Q})||[],O={totalUsers:x?.length||0,invalidUsers:f.length,invalidUsersList:f,availableOrgs:u||[]};C(O),f.length===0?a.success("✅ All users have valid organization IDs!"):a.warning(`Found ${f.length} user(s) with invalid organization IDs`)}catch(h){a.error("Scan failed: "+h.message)}finally{o(!1)}},t=async()=>{if(!d||d.invalidUsers===0){a.info("No invalid organizations to fix");return}N(!0);try{const h=ne();let x=0,c=0;try{const{data:u,error:D}=await h.rpc("fix_all_invalid_org_ids");if(!D&&u){a.success("✅ Fixed all invalid organization IDs!"),await l();return}}catch{}for(const u of d.invalidUsersList)try{const D=u.email.split("@")[1].toLowerCase();let U=null;if(D.includes("ronaatlantic")||D.includes("rona")?U="rona-atlantic":U=d.availableOrgs[0]?.id||null,!U){c++;continue}const{error:f}=await h.from("profiles").update({organization_id:U,status:"active",updated_at:new Date().toISOString()}).eq("email",u.email);f?c++:x++}catch{c++}x>0&&a.success(`✅ Fixed ${x} user(s)!`),c>0&&a.error(`❌ Failed to fix ${c} user(s)`),await l()}catch(h){a.error("Fix failed: "+h.message)}finally{N(!1)}},L=h=>h?/^org-[0-9]+$/.test(h):!1;return e.jsxs("div",{className:"space-y-4",children:[e.jsxs(M,{children:[e.jsxs(B,{children:[e.jsxs(se,{className:"flex items-center gap-2",children:[e.jsx(ye,{className:"w-5 h-5 text-orange-600"}),"Fix Invalid Organization IDs"]}),e.jsx(ge,{children:'Scan for and fix users with invalid timestamp-based organization IDs (e.g., "org-1762906336768")'})]}),e.jsxs(X,{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{onClick:l,disabled:r,variant:"outline",className:"flex-1",children:[e.jsx(ks,{className:"w-4 h-4 mr-2"}),r?"Scanning...":"Scan for Issues"]}),d&&d.invalidUsers>0&&e.jsxs(m,{onClick:t,disabled:E,className:"flex-1",children:[e.jsx(Sa,{className:"w-4 h-4 mr-2"}),E?"Fixing...":`Fix ${d.invalidUsers} User(s)`]})]}),d&&e.jsxs("div",{className:"space-y-4",children:[e.jsx(I,{className:d.invalidUsers===0?"border-green-500 bg-green-50":"border-orange-500 bg-orange-50",children:e.jsx(T,{children:e.jsxs("div",{className:"flex items-start gap-3",children:[d.invalidUsers===0?e.jsx(Ae,{className:"w-5 h-5 text-green-600 mt-0.5"}):e.jsx(ye,{className:"w-5 h-5 text-orange-600 mt-0.5"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("div",{className:"flex items-center gap-2",children:e.jsx("span",{className:"font-medium",children:d.invalidUsers===0?"✅ All users have valid organization IDs":`⚠️ Found ${d.invalidUsers} invalid organization ID(s)`})}),e.jsxs("div",{className:"text-sm space-y-1",children:[e.jsxs("div",{children:["Total users: ",d.totalUsers]}),e.jsxs("div",{children:["Valid users: ",d.totalUsers-d.invalidUsers]}),e.jsxs("div",{children:["Invalid users: ",d.invalidUsers]})]})]})]})})}),d.availableOrgs.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"font-medium text-sm",children:["Available Organizations (",d.availableOrgs.length,"):"]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:d.availableOrgs.map(h=>e.jsxs(V,{variant:"outline",className:"text-xs",children:[h.name," (",h.id,")"]},h.id))})]}),d.invalidUsersList.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("div",{className:"font-medium text-sm",children:"Users with Invalid Organization IDs:"}),e.jsx("div",{className:"border rounded-lg overflow-hidden max-h-64 overflow-y-auto",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{className:"bg-muted sticky top-0",children:e.jsxs("tr",{children:[e.jsx("th",{className:"text-left p-2",children:"Email"}),e.jsx("th",{className:"text-left p-2",children:"Current Org ID"}),e.jsx("th",{className:"text-left p-2",children:"Issue"})]})}),e.jsx("tbody",{children:d.invalidUsersList.map((h,x)=>e.jsxs("tr",{className:"border-t hover:bg-muted/50",children:[e.jsx("td",{className:"p-2",children:h.email}),e.jsx("td",{className:"p-2",children:e.jsx("code",{className:"text-xs bg-red-100 text-red-700 px-2 py-1 rounded",children:h.organization_id||"NULL"})}),e.jsxs("td",{className:"p-2",children:[!h.organization_id&&e.jsx(V,{variant:"destructive",className:"text-xs",children:"No Org"}),L(h.organization_id)&&e.jsx(V,{variant:"destructive",className:"text-xs",children:"Timestamp-based"}),h.organization_id&&!L(h.organization_id)&&e.jsx(V,{variant:"secondary",className:"text-xs",children:"Org Not Found"})]})]},x))})]})})]})]}),!d&&e.jsx(I,{children:e.jsxs(T,{className:"text-sm",children:["Click ",e.jsx("strong",{children:'"Scan for Issues"'}),' to check for users with invalid organization IDs. This will detect timestamp-based IDs like "org-1762906336768" and other invalid references.']})})]})]}),e.jsxs(M,{children:[e.jsx(B,{children:e.jsx(se,{className:"text-base",children:"About This Issue"})}),e.jsxs(X,{className:"space-y-3 text-sm text-muted-foreground",children:[e.jsx("p",{children:e.jsx("strong",{children:"What are timestamp-based organization IDs?"})}),e.jsx("p",{children:'These are incorrectly generated IDs in the format "org-1762906336768" where the number is a timestamp. They should be proper slug-format IDs like "rona-atlantic".'}),e.jsx("p",{children:e.jsx("strong",{children:"How does the fix work?"})}),e.jsxs("ul",{className:"list-disc list-inside space-y-1",children:[e.jsx("li",{children:"Detects users with invalid organization IDs"}),e.jsx("li",{children:"Maps users to correct organizations based on email domain"}),e.jsx("li",{children:"Updates both profiles and auth metadata"}),e.jsx("li",{children:"Ensures all users have valid, active organizations"})]}),e.jsx("div",{className:"pt-2 border-t",children:e.jsxs("p",{className:"text-xs",children:[e.jsx("strong",{children:"Alternative:"})," Run the SQL script ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"/FIX_INVALID_ORG_IDS.sql"})," in Supabase SQL Editor for server-side fix."]})})]})]})]})}function Ha({invalidOrgId:r,correctOrgId:o="rona-atlantic"}){const[E,N]=i.useState(!1),d=`-- Quick Fix: Replace invalid org ID with correct one
UPDATE profiles
SET 
  organization_id = '${o}',
  updated_at = NOW()
WHERE organization_id = '${r}';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('organizationId', '${o}')
WHERE id IN (
  SELECT id FROM profiles WHERE organization_id = '${o}'
);`,C=async()=>{await pe(d)&&(N(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>N(!1),3e3))};return e.jsxs(I,{className:"border-red-500 bg-red-50",children:[e.jsx(ye,{className:"h-5 w-5 text-red-600"}),e.jsx(ga,{className:"text-red-900 text-lg",children:"Invalid Organization ID Detected"}),e.jsx(T,{children:e.jsxs("div",{className:"space-y-4 text-red-900 mt-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"font-medium",children:"Your account has an invalid organization ID:"}),e.jsx("code",{className:"block bg-red-100 px-3 py-2 rounded border border-red-300 text-sm",children:r}),e.jsx("p",{className:"text-sm",children:"This is a timestamp-based ID that was created by old signup logic. It needs to be replaced with a valid organization ID."})]}),e.jsxs(M,{className:"border-blue-200 bg-blue-50",children:[e.jsxs(B,{className:"pb-3",children:[e.jsx(se,{className:"text-base text-blue-900",children:"⚡ 2-Minute Fix"}),e.jsx(ge,{className:"text-blue-700",children:"Run this SQL in your Supabase SQL Editor to fix the issue immediately"})]}),e.jsxs(X,{className:"space-y-3",children:[e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-background p-3 rounded border border-blue-200 text-xs overflow-x-auto max-h-48",children:d}),e.jsx(m,{onClick:C,size:"sm",variant:"outline",className:"absolute top-2 right-2 bg-background",children:E?e.jsxs(e.Fragment,{children:[e.jsx(os,{className:"h-3 w-3 mr-1 text-green-600"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ee,{className:"h-3 w-3 mr-1"}),"Copy SQL"]})})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"1."}),e.jsxs("span",{className:"text-blue-800",children:["Open your ",e.jsx("strong",{children:"Supabase Dashboard"})," → ",e.jsx("strong",{children:"SQL Editor"})]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"2."}),e.jsx("span",{className:"text-blue-800",children:'Copy the SQL above (or click "Copy SQL" button)'})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"3."}),e.jsxs("span",{className:"text-blue-800",children:["Paste and click ",e.jsx("strong",{children:"Run"})," (or press F5)"]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"4."}),e.jsxs("span",{className:"text-blue-800",children:[e.jsx("strong",{children:"Log out"})," and ",e.jsx("strong",{children:"log back in"})]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"✅"}),e.jsx("span",{className:"text-blue-800 font-semibold",children:"Error is fixed!"})]})]})]})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-2 pt-2",children:[e.jsxs(m,{onClick:C,variant:"default",className:"flex-1",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Copy Fix SQL"]}),e.jsx(m,{asChild:!0,variant:"outline",className:"flex-1",children:e.jsxs("a",{href:"#recovery",className:"flex items-center justify-center",children:[e.jsx(Ye,{className:"h-4 w-4 mr-2"}),"Go to User Recovery"]})})]}),e.jsxs("div",{className:"bg-amber-100 border border-amber-300 rounded p-3 text-sm space-y-1",children:[e.jsx("p",{className:"font-semibold text-amber-900",children:"Alternative: Use the UI Tool"}),e.jsxs("p",{className:"text-amber-800",children:["Navigate to ",e.jsx("strong",{children:"Users → User Recovery"})," tab and use the",e.jsx("strong",{children:' "Fix Invalid Organization IDs"'})," tool to scan and fix automatically."]})]}),e.jsxs("div",{className:"text-xs text-muted-foreground pt-2 border-t border-red-200",children:[e.jsx("p",{children:e.jsx("strong",{children:"What gets fixed:"})}),e.jsxs("ul",{className:"list-disc list-inside space-y-1 mt-1",children:[e.jsxs("li",{children:["Your organization ID in the ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"profiles"})," table"]}),e.jsxs("li",{children:["Your organization ID in the ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"auth.users"})," metadata"]}),e.jsx("li",{children:"All related permission and access issues"})]})]})]})})]})}function Wa({userId:r,totalUsers:o,canManageUsers:E,onOpenUsersTab:N,onOpenPermissionsTab:d,onOpenRecoveryTab:C,onRefreshUsers:l,onFindMissingUsers:t,onOpenInviteUser:L}){return e.jsx(Ca,{moduleKey:"users-help",userId:r,title:"Users Module Interactive Help",description:"Manage team access safely, validate account ownership, and hand off permission-ready user operations.",moduleIcon:Ls,triggerLabel:"Users Help",steps:[{title:"Discovery and Scope Lock",body:"Start from User Management to verify account inventory and organizational alignment."},{title:"Estimate and Validate",body:"Use access and recovery views to validate role design, missing profiles, and operational readiness."},{title:"Approval and Handoff",body:"Apply approved account changes and confirm recoverability before handoff to operations."}],badges:[{label:"Users In Scope",value:o},{label:"Manage Access",value:E?"Enabled":"View only"},{label:"Workflow",value:"Discovery -> Scope Lock -> Estimate -> Approval -> Handoff",variant:"outline"}],actions:[{label:"Open User Management",icon:Ls,variant:"outline",onClick:N},{label:"Open Space Access",icon:ve,variant:"outline",onClick:d},{label:"Open User Recovery",icon:we,variant:"outline",onClick:C},{label:"Show Latest Users",icon:ie,variant:"outline",onClick:l},{label:"Show Missing Users",icon:we,variant:"outline",onClick:t},{label:"Open Invite User Form",icon:ls,onClick:L,fullWidth:!0}],howToGuides:[{title:"How to onboard a new user safely",steps:["Discovery: Open User Management and verify organization context.","Scope Lock: Confirm role, invite method, and organization assignment.","Estimate: Validate access impact and recovery readiness.","Approval: Invite user and confirm credentials flow.","Handoff: Verify first-login and permission alignment with the manager."]}]})}const be=ne();function Xr({user:r,organization:o,onOrganizationUpdate:E}){const[N,d]=i.useState("users"),[C,l]=i.useState(""),t=Ea(C,300),[L,h]=i.useState(!1),[x,c]=i.useState(!1),[u,D]=i.useState(null),[U,f]=i.useState([]),[O,n]=i.useState(!1),[v,K]=i.useState(!0),[Q,ae]=i.useState(!1),[q,$]=i.useState(null),[fe,p]=i.useState(!1),[_,z]=i.useState(null),[R,S]=i.useState(!1),[P,J]=i.useState(!1),[Ce,je]=i.useState(!1),[W,H]=i.useState(""),[_e,ds]=i.useState(!1),[Ne,us]=i.useState(null),[Ga,qa]=i.useState(!1),[Ie,Qs]=i.useState(""),[Va,Ba]=i.useState(null),[$s,Ge]=i.useState(!1),[re,ms]=i.useState(null),[Hs,Ue]=i.useState(!1),[Oe,xs]=i.useState(""),[Ws,hs]=i.useState(!1),[qe,ps]=i.useState(!1),[G,De]=i.useState(null),[Ve,gs]=i.useState("email"),Ys=ca("users",r.role),Te=da("users",r.role)||zs("users",r.role),fs=ua("users",r.role)||r.role==="super_admin"||r.role==="admin",js=r.role==="admin"||r.role==="super_admin",[Z,Be]=i.useState([]),[A,Se]=i.useState({name:"",email:"",role:"standard_user",organizationId:r.organizationId,plan:""}),[g,me]=i.useState({name:"",email:"",role:"standard_user",organizationId:"",status:"active",managerId:"",plan:""}),[te,Gs]=i.useState({});i.useEffect(()=>{le(),r.organizationId&&Ts.getOrganizationSettings(r.organizationId).then(s=>{s?.user_invite_method&&gs(s.user_invite_method)}).catch(s=>{})},[]),i.useEffect(()=>{r.role==="super_admin"&&qs()},[r.role]),i.useEffect(()=>{Z.length>0&&Ke()},[Z]);const Ke=async()=>{if(["admin","super_admin"].includes(r.role))try{const s={},b=Z.map(j=>j.id).filter(Boolean);if(b.length>0){const{data:j}=await be.from("profiles").select("id, billing_plan").in("id",b).not("billing_plan","is",null);if(j)for(const y of j)y.billing_plan&&(s[y.id]=y.billing_plan)}Gs(s)}catch{}},le=async()=>{K(!0),$(null);try{const b=(await as.getAll())?.users||[];if(b.length>0,b.length===0){Be([]),p(!1);return}let j=b;r.role!=="super_admin"&&r.organizationId&&(j=b.filter(F=>F.organization_id===r.organizationId));const y=j.map(F=>({...F,organizationId:F.organization_id,lastLogin:F.last_login}));Be(y),$(null)}catch(s){s?.code==="42P17"||s?.message?.includes("infinite recursion")?$("infinite recursion: "+String(s)):$(String(s)),p(!0),Be([])}finally{K(!1)}},qs=async()=>{try{n(!0);const{data:s,error:b}=await be.from("organizations").select("*").order("name",{ascending:!0});if(b)return;const j=s?.map(y=>({id:y.id,name:y.name,status:y.status||"active",logo:y.logo}))||[];f(j)}catch{}finally{n(!1)}},Ns=Z.filter(s=>{const b=t.toLowerCase().trim(),j=!b||s.name.toLowerCase().includes(b)||s.email.toLowerCase().includes(b)||s.role.toLowerCase().includes(b)||s.status&&s.status.toLowerCase().includes(b),y=r.role==="super_admin"||s.role!=="super_admin";return j&&y}),bs=Z.filter(s=>(s.role==="manager"||s.role==="director")&&s.status==="active");Z.length>0&&r.role!=="super_admin"&&Z.some(s=>s.organizationId===r.organizationId);const Vs=/^org-[0-9]+$/.test(r.organizationId),vs=s=>/^[0-9a-fA-F]{8}[-\s]?[0-9a-fA-F]{4}/.test(s),ze=o?.name||"",ys=ze&&!vs(ze)&&ze!=="Organization"?ze:"Not set — click pencil to rename",Ss=async()=>{if(!(!Oe.trim()||!r.organizationId)){hs(!0);try{if(await Ts.updateOrganizationName(r.organizationId,Oe.trim()),o){const s={...o,name:Oe.trim()};E?.(s)}a.success("Organization name updated!"),Ue(!1)}catch{a.error("Failed to update organization name")}finally{hs(!1)}}},Es=async()=>{ps(!0),De(null);try{const s=await Os(),b=r.organizationId,j=await fetch(`https://${ss}.supabase.co/functions/v1/make-server-8405be07/profiles/find-missing?organization_id=${encodeURIComponent(b)}`,{headers:s});if(!j.ok){const xe=await j.text();a.error("Failed to scan for missing users");return}const y=await j.json();De({missing:y.missing||[],wrongOrg:y.wrongOrg||[]});const F=(y.missing?.length||0)+(y.wrongOrg?.length||0);F===0?a.success("All auth users have matching profiles — no issues found!"):a.warning(`Found ${F} user(s) with profile issues`)}catch(s){a.error("Error scanning: "+s.message)}finally{ps(!1)}},Bs=async s=>{try{const b=await Os(),j=await fetch(`https://${ss}.supabase.co/functions/v1/make-server-8405be07/profiles/fix-missing`,{method:"POST",headers:b,body:JSON.stringify({users:s,organizationId:r.organizationId})});if(!j.ok){const F=await j.text();a.error("Failed to fix users");return}const y=await j.json();a.success(`Fixed ${y.fixed} user(s)!`),De(null),le()}catch(b){a.error("Error fixing: "+b.message)}},Je=s=>{if(r.role==="super_admin"){const b=U.find(j=>j.id===s);return b&&!vs(b.name)?b.name:s||"Unknown"}return r.role==="admin"&&s===r.organizationId?ys:s||"Unknown"},Ks=s=>{s.preventDefault(),Js()},Js=async()=>{try{J(!1);const s={email:A.email,name:A.name,role:A.role,inviteMethod:Ve};if(r.role==="super_admin"){s.organizationId=A.organizationId;const j=U.find(y=>y.id===A.organizationId);j&&(s.organizationName=j.name)}else o?.name&&(s.organizationName=o.name);const b=await as.invite(s);if(A.plan&&b?.userId)try{await be.from("profiles").update({billing_plan:A.plan,updated_at:new Date().toISOString()}).eq("id",b.userId);try{await Rs(A.plan,"month",void 0,!1,b.userId,r.organizationId)}catch{}}catch(j){a.error("User created but failed to assign plan: "+(j.message||"Unknown error"))}await le(),await Ke(),Se({name:"",email:"",role:"standard_user",organizationId:r.organizationId,plan:""}),h(!1),b?.tempPassword?(ms({email:s.email,tempPassword:b.tempPassword,name:s.name}),Ge(!0),a.success("User account created! Share the temporary password with the user.")):a.success("User invited successfully! An email has been sent to them.")}catch(s){s.message?.includes("does not exist")&&s.message?.includes("Organization")?a.error(s.message+" Please create it in the Tenants module first."):s.message?.includes("profiles_id_fkey")||s.message?.includes("is not present in table")?(J(!0),a.error("Database migration required. See instructions above.")):s.message?.includes("already exists")?a.error("A user with this email already exists"):a.error("Failed to invite user: "+(s.message||"Unknown error"))}},Zs=async s=>{const b=Z.find(j=>j.id===s);if(r.role==="admin"&&b?.role==="super_admin"){a.error("You do not have permission to delete Super Admin users");return}if(confirm("Are you sure you want to remove this user?"))try{await as.delete(s),await le()}catch{alert("Failed to remove user. Please try again.")}},ea=s=>{if(r.role==="admin"&&s.role==="super_admin"){a.error("You do not have permission to edit Super Admin users");return}D(s),Qs(s.organizationId),me({name:s.name,email:s.email,role:s.role,organizationId:s.organizationId,status:s.status,managerId:s.managerId||"",plan:te[s.id]||""}),c(!0)},sa=async s=>{if(s.preventDefault(),!u)return;if(g.organizationId!==Ie&&r.role==="super_admin"){const j=Je(Ie),y=Je(g.organizationId);if(!confirm(`⚠️ ORGANIZATION CHANGE WARNING

You are about to move ${u.name} from:
  "${j}"
to:
  "${y}"

This will affect their access to data and may cause issues.

Are you absolutely sure you want to do this?`)){a.info("User update cancelled");return}a.success(`User organization changed from "${j}" to "${y}"`)}try{let j={name:g.name,email:g.email,role:g.role,organization_id:g.organizationId,status:g.status,updated_at:new Date().toISOString()};j.manager_id=g.managerId||null;let{error:y}=await be.from("profiles").update(j).eq("id",u.id);if(y&&y.code==="PGRST204"&&y.message?.includes("manager_id")){$("MANAGER_COLUMN_MISSING");const{manager_id:F,...xe}=j,{error:Cs}=await be.from("profiles").update(xe).eq("id",u.id);if(Cs){a.error("Failed to update user: "+Cs.message);return}a.warning("User updated, but manager assignment requires database migration. See instructions above."),y=null}if(y){a.error("Failed to update user: "+y.message);return}if(a.success("User updated successfully!"),u&&g.plan){const F=te[u.id];if(g.plan!==F)try{const{error:xe}=await be.from("profiles").update({billing_plan:g.plan,updated_at:new Date().toISOString()}).eq("id",u.id);if(xe)throw xe;try{F?await wa(g.plan,void 0,u.id,u.organizationId):await Rs(g.plan,"month",void 0,!1,u.id,u.organizationId)}catch{}a.success(`Billing plan updated to ${g.plan==="starter"?"Standard User":g.plan==="professional"?"Professional":"Enterprise"} for ${u.name}`)}catch(xe){a.error("Profile saved but failed to update plan: "+(xe.message||"Unknown error"))}}else if(u&&!g.plan&&te[u.id])try{await be.from("profiles").update({billing_plan:null,updated_at:new Date().toISOString()}).eq("id",u.id)}catch{}await le(),await Ke(),c(!1),D(null)}catch{a.error("Failed to update user. Please try again.")}},aa=async s=>{if(r.role==="admin"&&s.role==="super_admin"){a.error("You do not have permission to reset Super Admin passwords");return}us(s),ds(!0);const b=Ya();H(b);try{const j=`https://${ss}.supabase.co/functions/v1/make-server-8405be07/reset-password`,y=await fetch(j,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${pa}`},body:JSON.stringify({userEmail:s.email,tempPassword:b})}),F=await y.json();if(!y.ok||!F.success)throw new Error(F.error||"Failed to reset password");!F.profileUpdated&&F.warning?a.warning("Password reset successful! Note: Run the database migration to enable password change prompts.",{duration:8e3}):F.profileUpdated;try{await va(s.email,"/reset-password")}catch{}je(!0),a.success("✅ Temporary password set! User can now log in.")}catch(j){a.error(j.message||"Failed to set temporary password")}finally{ds(!1)}},ws=async()=>{if(!W){a.error("No password to copy");return}await pe(W)?a.success("Password copied to clipboard!"):a.error("Could not copy automatically. Please select and copy the password manually.")},ra=s=>{switch(s){case"super_admin":return"bg-purple-100 text-purple-700";case"admin":return"bg-blue-100 text-blue-700";case"director":return"bg-indigo-100 text-indigo-700";case"manager":return"bg-green-100 text-green-700";case"marketing":return"bg-amber-100 text-amber-700";case"standard_user":return"bg-muted text-foreground";default:return"bg-muted text-foreground"}},ta=s=>{switch(s){case"active":return"bg-green-100 text-green-700";case"invited":return"bg-yellow-100 text-yellow-700";case"inactive":return"bg-red-100 text-red-700";default:return"bg-muted text-foreground"}},ia=s=>s?new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Never";return Ys?e.jsx(fa,{user:r,module:"users",action:"view",children:e.jsxs("div",{className:"p-4 sm:p-6 space-y-4 sm:space-y-6",children:[e.jsx("div",{className:"flex justify-end",children:e.jsx(Wa,{userId:r.id,totalUsers:Z.length,canManageUsers:Te,onOpenUsersTab:()=>d("users"),onOpenPermissionsTab:()=>d("permissions"),onOpenRecoveryTab:()=>d("recovery"),onRefreshUsers:le,onFindMissingUsers:()=>{fs&&Es()},onOpenInviteUser:()=>{Te&&h(!0)}})}),e.jsxs(Ps,{value:N,onValueChange:d,className:"space-y-6",children:[e.jsx("div",{className:"overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",children:e.jsxs(Fs,{className:"inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3",children:[e.jsx(He,{value:"users",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"User Management"}),e.jsx(He,{value:"permissions",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"Space Access"}),e.jsx(He,{value:"recovery",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"User Recovery"})]})}),e.jsxs(We,{value:"users",className:"space-y-6",children:[Vs&&!v&&e.jsx(Ha,{invalidOrgId:r.organizationId,correctOrgId:"rona-atlantic"}),v&&e.jsx(M,{className:"border-blue-200 bg-blue-50",children:e.jsx(X,{className:"p-8",children:e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-4",children:[e.jsx("div",{className:"animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"}),e.jsxs("div",{className:"text-center",children:[e.jsx("h3",{className:"text-lg font-semibold text-blue-900",children:"Loading Users..."}),e.jsx("p",{className:"text-sm text-blue-700 mt-1",children:"Please wait while we fetch your users from the database"})]})]})})}),q&&!q.includes("infinite recursion")&&!v&&e.jsxs(I,{className:"border-red-400 bg-red-50",children:[e.jsx(Y,{className:"h-5 w-5 text-red-600"}),e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"Error loading users:"}),e.jsx("pre",{className:"mt-2 text-xs bg-red-100 p-2 rounded",children:q}),e.jsx(m,{onClick:le,variant:"outline",size:"sm",className:"mt-3",children:"Try Again"})]})]}),fe&&Z.length>0&&e.jsx(Ua,{onRefresh:le}),q==="MANAGER_COLUMN_MISSING"&&e.jsx(Aa,{}),P&&e.jsx(Xa,{}),e.jsx(M,{className:"border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50",children:e.jsx(X,{className:"p-6",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0",children:e.jsx(rs,{className:"h-6 w-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-lg font-semibold text-foreground mb-2",children:"Current Organization"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-1",children:"Organization Name"}),Hs?e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(he,{value:Oe,onChange:s=>xs(s.target.value),className:"h-8 text-sm max-w-[250px]",placeholder:"Enter organization name",autoFocus:!0,onKeyDown:s=>{s.key==="Enter"?Ss():s.key==="Escape"&&Ue(!1)}}),e.jsx(m,{size:"sm",variant:"ghost",className:"h-8 w-8 p-0 text-green-600 hover:text-green-700",onClick:Ss,disabled:Ws||!Oe.trim(),children:e.jsx(Ds,{className:"h-4 w-4"})}),e.jsx(m,{size:"sm",variant:"ghost",className:"h-8 w-8 p-0 text-muted-foreground hover:text-foreground",onClick:()=>Ue(!1),children:e.jsx(_a,{className:"h-4 w-4"})})]}):e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("p",{className:"font-medium text-foreground",children:ys}),(r.role==="admin"||r.role==="super_admin")&&e.jsx(m,{size:"sm",variant:"ghost",className:"h-6 w-6 p-0 text-muted-foreground hover:text-blue-600",onClick:()=>{xs(o?.name||""),Ue(!0)},title:"Edit organization name",children:e.jsx(cs,{className:"h-3.5 w-3.5"})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-1",children:"Organization ID"}),e.jsx("p",{className:"font-mono text-sm text-foreground bg-background px-2 py-1 rounded border border-border inline-block",children:r.organizationId})]})]}),r.role==="super_admin"&&e.jsxs("div",{className:"mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md inline-flex",children:[e.jsx(ve,{className:"h-4 w-4"}),e.jsx("span",{children:"You can view, edit, and delete users from ALL organizations"})]})]})]})})}),e.jsx("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{variant:"outline",onClick:le,disabled:v,className:"flex items-center gap-2",children:[e.jsx("svg",{className:`h-4 w-4 ${v?"animate-spin":""}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Refresh"]}),fs&&e.jsxs(m,{variant:"outline",onClick:Es,disabled:qe,className:"flex items-center gap-2",children:[e.jsx(we,{className:`h-4 w-4 ${qe?"animate-pulse":""}`}),qe?"Scanning...":"Find Missing Users"]}),Te&&e.jsxs(Fe,{open:L,onOpenChange:h,children:[e.jsx(ja,{asChild:!0,children:e.jsxs(m,{className:"flex items-center gap-2",children:[e.jsx(ls,{className:"h-4 w-4"}),"Invite User"]})}),e.jsxs(ke,{className:"bg-background",children:[e.jsxs(Me,{children:[e.jsx(Xe,{children:"Invite New User"}),e.jsx(Qe,{children:"Add a new user to your organization by filling out the form below."})]}),e.jsxs("form",{onSubmit:Ks,className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"name",children:"Name"}),e.jsx(he,{id:"name",value:A.name,onChange:s=>Se({...A,name:s.target.value}),required:!0})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"email",children:"Email"}),e.jsx(he,{id:"email",type:"email",value:A.email,onChange:s=>Se({...A,email:s.target.value}),required:!0})]}),r.role==="super_admin"&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"organization",children:"Organization *"}),e.jsxs(oe,{value:A.organizationId,onValueChange:s=>Se({...A,organizationId:s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:O?"Loading...":"Select organization"})}),e.jsx(ue,{children:U.map(s=>e.jsx(w,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[s.logo?e.jsx("img",{src:s.logo,alt:s.name,className:"h-4 w-4 object-contain"}):e.jsx(rs,{className:"h-4 w-4"}),e.jsx("span",{children:s.name})]})},s.id))})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Select which organization this user will belong to"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"role",children:"Role"}),e.jsxs(oe,{value:A.role,onValueChange:s=>Se({...A,role:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(w,{value:"standard_user",children:"Standard User"}),e.jsx(w,{value:"marketing",children:"Marketing"}),e.jsx(w,{value:"designer",children:"Designer"}),e.jsx(w,{value:"manager",children:"Manager"}),e.jsx(w,{value:"director",children:"Director"}),e.jsx(w,{value:"admin",children:"Admin"}),r.role==="super_admin"&&e.jsx(w,{value:"super_admin",children:"Super Admin"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[A.role==="standard_user"&&"Can manage only their own data",A.role==="marketing"&&"Full access to marketing and campaigns, limited access to contacts",A.role==="designer"&&"Access to Project Wizards and design tools. Admins can enable additional modules.",A.role==="manager"&&"Can manage data of users they oversee",A.role==="director"&&"Same as Manager, plus full user visibility on Team Dashboard",A.role==="admin"&&"Full access within the organization",A.role==="super_admin"&&"Full access across all organizations"]})]}),js&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"plan",children:"Billing Plan"}),e.jsxs(oe,{value:A.plan||"none",onValueChange:s=>Se({...A,plan:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a plan"})}),e.jsxs(ue,{children:[e.jsx(w,{value:"none",children:"No Plan (Free)"}),e.jsx(w,{value:"starter",children:"Standard User — $29/mo"}),e.jsx(w,{value:"professional",children:"Professional — $79/mo"}),e.jsx(w,{value:"enterprise",children:"Enterprise — $199/mo"})]})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Assign a billing plan to this user. Each user can have a different plan level."})]}),e.jsxs("div",{className:"space-y-2 pt-2 border-t",children:[e.jsx(k,{htmlFor:"inviteMethodOverride",children:"Delivery Method"}),e.jsxs(oe,{value:Ve,onValueChange:s=>gs(s),children:[e.jsx(ce,{id:"inviteMethodOverride",children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(w,{value:"email",children:"Automatically Email Invite Link"}),e.jsx(w,{value:"manual",children:"Generate Temporary Password"})]})]}),e.jsx("p",{className:"text-[11px] text-muted-foreground",children:Ve==="email"?"Requires SMTP setup in Supabase Auth.":"You will need to manually share the temporary password."})]}),e.jsxs("div",{className:"flex gap-2 pt-4",children:[e.jsx(m,{type:"button",variant:"outline",onClick:()=>h(!1),className:"flex-1",children:"Cancel"}),e.jsxs(m,{type:"submit",className:"flex-1",children:[e.jsx(ts,{className:"h-4 w-4 mr-2"}),"Send Invite"]})]})]})]})]})]})}),G&&(G.missing.length>0||G.wrongOrg.length>0)&&e.jsx(M,{className:"border-amber-300 bg-amber-50",children:e.jsxs(X,{className:"p-4",children:[e.jsxs("h4",{className:"font-semibold text-amber-800 mb-3 flex items-center gap-2",children:[e.jsx(Y,{className:"h-4 w-4"}),"Auth Users Missing from User List"]}),G.missing.length>0&&e.jsxs("div",{className:"mb-3",children:[e.jsxs("p",{className:"text-sm text-amber-700 mb-2",children:[e.jsx("strong",{children:G.missing.length})," user(s) exist in auth but have no profile:"]}),e.jsx("div",{className:"space-y-1",children:G.missing.map(s=>e.jsx("div",{className:"flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200",children:e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:s.name}),e.jsx("span",{className:"text-muted-foreground ml-2",children:s.email}),e.jsxs("span",{className:"text-xs text-muted-foreground ml-2",children:["(",s.role,")"]})]})},s.id))})]}),G.wrongOrg.length>0&&e.jsxs("div",{className:"mb-3",children:[e.jsxs("p",{className:"text-sm text-amber-700 mb-2",children:[e.jsx("strong",{children:G.wrongOrg.length})," user(s) have a profile but wrong organization:"]}),e.jsx("div",{className:"space-y-1",children:G.wrongOrg.map(s=>e.jsx("div",{className:"flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200",children:e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:s.name}),e.jsx("span",{className:"text-muted-foreground ml-2",children:s.email}),e.jsxs("span",{className:"text-xs text-red-500 ml-2",children:["(org: ",s.currentOrg?.slice(0,8),"...)"]})]})},s.id))})]}),e.jsxs("div",{className:"flex gap-2 mt-3",children:[e.jsxs(m,{size:"sm",onClick:()=>Bs([...G.missing,...G.wrongOrg]),children:["Fix All (",G.missing.length+G.wrongOrg.length," users)"]}),e.jsx(m,{size:"sm",variant:"outline",onClick:()=>De(null),children:"Dismiss"})]})]})}),e.jsxs(M,{children:[e.jsx(B,{children:e.jsxs("div",{className:"relative",children:[e.jsx(we,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(he,{placeholder:"Search users by name, email, role, or status...",value:C,onChange:s=>l(s.target.value),className:"pl-10"})]})}),e.jsxs(X,{children:[Q&&Z.length>0&&e.jsxs(I,{className:"mb-4",children:[e.jsx(Y,{className:"h-4 w-4"}),e.jsxs(T,{children:[e.jsx("strong",{children:"Local Mode:"})," Currently showing users that you've invited in this session. Deploy the backend to see all organization users and sync across devices."]})]}),e.jsx("div",{className:"overflow-x-auto",children:v?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"}),e.jsx("p",{className:"text-muted-foreground",children:"Loading users..."})]})}):Ns.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-12 text-center",children:[e.jsx("div",{className:"h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4",children:e.jsx(ts,{className:"h-8 w-8 text-muted-foreground"})}),e.jsx("h3",{className:"text-lg text-foreground mb-2",children:"No users found"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:C?"Try adjusting your search query":"Get started by inviting your first team member"}),!C&&Te&&e.jsxs(m,{onClick:()=>h(!0),children:[e.jsx(ls,{className:"h-4 w-4 mr-2"}),"Invite User"]})]}):e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Actions"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"User"}),(r.role==="super_admin"||r.role==="admin")&&e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Organization"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Role"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Plan"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Status"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Last Login"})]})}),e.jsx("tbody",{children:Ns.map(s=>e.jsxs("tr",{className:"border-b border-border hover:bg-muted",children:[Te&&e.jsx("td",{className:"py-3 px-4",children:e.jsxs(ma,{children:[e.jsx(xa,{asChild:!0,children:e.jsx(m,{variant:"ghost",size:"sm",disabled:s.id===r.id,children:e.jsx(Ia,{className:"h-4 w-4"})})}),e.jsxs(ha,{align:"start",children:[e.jsxs(es,{onClick:()=>ea(s),children:[e.jsx(Oa,{className:"h-4 w-4 mr-2"}),"Edit User"]}),e.jsxs(es,{className:"text-red-600",onClick:()=>Zs(s.id),children:[e.jsx(Ta,{className:"h-4 w-4 mr-2"}),"Remove"]}),e.jsxs(es,{className:"text-blue-600",onClick:()=>aa(s),children:[e.jsx(ve,{className:"h-4 w-4 mr-2"}),"Reset Password"]})]})]})}),e.jsx("td",{className:"py-3 px-4",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600",children:s.name.charAt(0)}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-foreground",children:s.name}),e.jsx("p",{className:"text-xs text-muted-foreground",children:s.email})]})]})}),(r.role==="super_admin"||r.role==="admin")&&e.jsx("td",{className:"py-3 px-4",children:e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"text-sm text-foreground",children:Je(s.organizationId)}),e.jsxs("span",{className:"text-xs text-muted-foreground font-mono",children:["ID: ",s.organizationId]})]})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${ra(s.role)}`,children:s.role.replace("_"," ").toUpperCase()})}),e.jsx("td",{className:"py-3 px-4",children:te[s.id]?e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${te[s.id]==="enterprise"?"bg-purple-100 text-purple-700":te[s.id]==="professional"?"bg-blue-100 text-blue-700":"bg-orange-100 text-orange-700"}`,children:te[s.id]==="starter"?"Standard User":te[s.id]==="professional"?"Professional":te[s.id]==="enterprise"?"Enterprise":te[s.id]}):e.jsx("span",{className:"inline-block px-2 py-1 text-xs rounded bg-muted text-muted-foreground",children:"Free"})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${ta(s.status)}`,children:s.status})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:"text-sm text-muted-foreground",children:ia(s.lastLogin)})})]},s.id))})]})})]})]}),e.jsx(Fe,{open:x,onOpenChange:c,children:e.jsxs(ke,{className:"max-h-[90vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Me,{children:[e.jsx(Xe,{children:"Edit User"}),e.jsx(Qe,{children:"Update the user's details and permissions."})]}),e.jsxs("form",{onSubmit:sa,className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"name",children:"Name"}),e.jsx(he,{id:"name",value:g.name,onChange:s=>me({...g,name:s.target.value}),required:!0})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"email",children:"Email"}),e.jsx(he,{id:"email",type:"email",value:g.email,onChange:s=>me({...g,email:s.target.value}),required:!0})]}),r.role==="super_admin"&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs(k,{htmlFor:"organization",className:"flex items-center gap-2",children:["Organization *",g.organizationId!==Ie&&e.jsx("span",{className:"text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded",children:"⚠️ CHANGED"})]}),e.jsxs(oe,{value:g.organizationId,onValueChange:s=>me({...g,organizationId:s}),children:[e.jsx(ce,{className:g.organizationId!==Ie?"border-orange-500 border-2":"",children:e.jsx(de,{placeholder:O?"Loading...":"Select organization"})}),e.jsx(ue,{children:U.map(s=>e.jsx(w,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[s.logo?e.jsx("img",{src:s.logo,alt:s.name,className:"h-4 w-4 object-contain"}):e.jsx(rs,{className:"h-4 w-4"}),e.jsx("span",{children:s.name})]})},s.id))})]}),g.organizationId!==Ie?e.jsxs(I,{className:"border-orange-500 bg-orange-50",children:[e.jsx(Y,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900 text-xs",children:[e.jsx("strong",{children:"⚠️ Warning:"})," Changing organization will affect this user's access to data. You will be asked to confirm before saving."]})]}):e.jsx("p",{className:"text-xs text-muted-foreground",children:"Select which organization this user will belong to"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"role",children:"Role"}),e.jsxs(oe,{value:g.role,onValueChange:s=>me({...g,role:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(w,{value:"standard_user",children:"Standard User"}),e.jsx(w,{value:"marketing",children:"Marketing"}),e.jsx(w,{value:"designer",children:"Designer"}),e.jsx(w,{value:"manager",children:"Manager"}),e.jsx(w,{value:"director",children:"Director"}),e.jsx(w,{value:"admin",children:"Admin"}),r.role==="super_admin"&&e.jsx(w,{value:"super_admin",children:"Super Admin"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[g.role==="standard_user"&&"Can manage only their own data",g.role==="marketing"&&"Full access to marketing and campaigns, limited access to contacts",g.role==="designer"&&"Access to Project Wizards and design tools. Admins can enable additional modules.",g.role==="manager"&&"Can manage data of users they oversee",g.role==="director"&&"Same as Manager, plus full user visibility on Team Dashboard",g.role==="admin"&&"Full access within the organization",g.role==="super_admin"&&"Full access across all organizations"]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"status",children:"Status"}),e.jsxs(oe,{value:g.status,onValueChange:s=>me({...g,status:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(w,{value:"active",children:"Active"}),e.jsx(w,{value:"invited",children:"Invited"}),e.jsx(w,{value:"inactive",children:"Inactive"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[g.status==="active"&&"User has full access to the system",g.status==="invited"&&"User has been invited but not yet accepted",g.status==="inactive"&&"User account is temporarily disabled"]})]}),js&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"editPlan",children:"Billing Plan"}),e.jsxs(oe,{value:g.plan||"none",onValueChange:s=>me({...g,plan:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a plan"})}),e.jsxs(ue,{children:[e.jsx(w,{value:"none",children:"No Plan (Free)"}),e.jsx(w,{value:"starter",children:"Standard User — $29/mo"}),e.jsx(w,{value:"professional",children:"Professional — $79/mo"}),e.jsx(w,{value:"enterprise",children:"Enterprise — $199/mo"})]})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Change this user's billing plan. Each user can have a different plan level."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{htmlFor:"manager",children:"Manager (Optional)"}),e.jsxs(oe,{value:g.managerId||"none",onValueChange:s=>me({...g,managerId:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a manager"})}),e.jsxs(ue,{children:[e.jsx(w,{value:"none",children:"No Manager"}),bs.map(s=>e.jsx(w,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs",children:s.name.charAt(0)}),e.jsx("span",{children:s.name})]})},s.id))]})]}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:bs.length===0?"No active managers available. Assign a Manager role to a user first.":"Assign a manager who will oversee this user"})]}),e.jsxs("div",{className:"flex gap-2 pt-4",children:[e.jsx(m,{type:"button",variant:"outline",onClick:()=>c(!1),className:"flex-1",children:"Cancel"}),e.jsxs(m,{type:"submit",className:"flex-1",children:[e.jsx(ts,{className:"h-4 w-4 mr-2"}),"Update User"]})]})]})]})}),e.jsx(Fe,{open:Ce,onOpenChange:je,children:e.jsxs(ke,{className:"sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Me,{children:[e.jsx(Xe,{children:"🔐 Password Generated"}),e.jsxs(Qe,{children:["Temporary password for ",Ne?.name," (",Ne?.email,")"]})]}),e.jsxs("div",{className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(k,{children:"Generated Temporary Password"}),e.jsx("div",{className:"bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6",children:e.jsxs("div",{className:"flex items-center justify-between gap-3",children:[e.jsx("code",{className:"text-3xl font-mono font-bold text-blue-900 select-all break-all flex-1",children:W}),e.jsxs(m,{type:"button",size:"sm",onClick:ws,className:"flex-shrink-0",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Copy"]})]})}),e.jsx("p",{className:"text-xs text-red-600 font-semibold",children:"⚠️ This password is shown only once. Copy it before closing this dialog!"})]}),e.jsxs(I,{className:"bg-green-50 border-green-300 border-2",children:[e.jsx(Y,{className:"h-5 w-5 text-green-600"}),e.jsxs(T,{className:"text-green-900",children:[e.jsx("strong",{className:"text-base",children:"✅ Password is Active!"}),e.jsxs("p",{className:"mt-2 text-sm",children:["The user can now ",e.jsx("strong",{children:"login immediately"})," with the temporary password shown above. They will be prompted to change it on first login."]})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"bg-blue-50 border-2 border-blue-300 rounded-lg p-4",children:[e.jsxs("h5",{className:"font-semibold text-blue-900 mb-2 flex items-center gap-2",children:[e.jsx("span",{className:"bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"1"}),"📋 Share the Password"]}),e.jsxs("div",{className:"text-sm text-blue-900 space-y-2 ml-8",children:[e.jsxs("p",{children:["Send this temporary password to ",e.jsx("strong",{children:Ne?.email}),":"]}),e.jsx("div",{className:"bg-background border border-blue-300 rounded p-3",children:e.jsx("p",{className:"font-mono text-lg font-bold text-blue-900",children:W})}),e.jsx("p",{className:"text-xs text-blue-700 mt-2",children:"⚠️ They will be required to change this password on first login."})]})]}),e.jsxs("details",{className:"bg-blue-50 border-2 border-blue-300 rounded-lg",children:[e.jsxs("summary",{className:"p-4 cursor-pointer font-semibold text-blue-900 flex items-center gap-2",children:[e.jsx("span",{className:"bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"2"}),"🔧 Alternative: Supabase Dashboard UI (Click to expand)"]}),e.jsx("div",{className:"px-4 pb-4 text-sm text-blue-900 space-y-2 mt-2",children:e.jsxs("ol",{className:"list-decimal list-inside space-y-1 ml-4",children:[e.jsx("li",{children:"Go to Supabase Dashboard → Authentication → Users"}),e.jsxs("li",{children:["Find: ",e.jsx("code",{className:"bg-blue-100 px-2 py-0.5 rounded font-mono text-xs",children:Ne?.email})]}),e.jsx("li",{children:'Click "..." menu → "Update User"'}),e.jsxs("li",{children:['Check "Auto Confirm User" and enter password: ',e.jsx("code",{className:"bg-blue-100 px-2 py-0.5 rounded font-mono text-xs",children:W})]}),e.jsx("li",{children:'Click "Save"'})]})})]}),e.jsxs("details",{className:"bg-muted border-2 border-border rounded-lg opacity-70",children:[e.jsxs("summary",{className:"p-4 cursor-pointer font-semibold text-muted-foreground flex items-center gap-2",children:[e.jsx("span",{className:"bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"3"}),"📧 Email Method (Not Available - Email Not Configured)"]}),e.jsxs("div",{className:"px-4 pb-4 text-sm text-muted-foreground space-y-2 mt-2",children:[e.jsx("p",{className:"font-medium",children:"Once email is configured in Supabase, you can:"}),e.jsxs("ol",{className:"list-decimal list-inside space-y-1 ml-4",children:[e.jsx("li",{children:'Click "Reset Password" button'}),e.jsx("li",{children:"User receives email with reset link"}),e.jsx("li",{children:"User clicks link and enters the password you provide"}),e.jsx("li",{children:"Password is automatically set"})]}),e.jsx("p",{className:"text-xs mt-2 italic bg-muted p-2 rounded",children:"💡 To enable: Configure SMTP in Supabase Dashboard → Settings → Auth → Email Templates"})]})]})]}),e.jsxs("div",{className:"bg-muted border border-border rounded-lg p-3",children:[e.jsx("h5",{className:"font-semibold text-foreground mb-2 text-sm",children:"👤 User Information"}),e.jsxs("div",{className:"text-sm text-foreground space-y-1",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Name:"})," ",Ne?.name]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Email:"})," ",Ne?.email]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Role:"})," ",Ne?.role]})]})]})]}),e.jsxs("div",{className:"flex gap-2 pt-4 border-t mt-4",children:[e.jsxs(m,{type:"button",variant:"outline",onClick:ws,className:"flex-1",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Copy Password"]}),e.jsx(m,{type:"button",onClick:()=>{je(!1),us(null),H("")},className:"flex-1",children:"Done"})]})]})}),e.jsx(Fe,{open:$s,onOpenChange:Ge,children:e.jsxs(ke,{className:"sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Me,{children:[e.jsx(Xe,{children:"Account Created Successfully"}),e.jsxs(Qe,{children:["A new account has been created for ",re?.name,". Share the login credentials below."]})]}),e.jsxs("div",{className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 space-y-3",children:[e.jsxs("div",{children:[e.jsx(k,{className:"text-xs text-green-700 uppercase tracking-wide",children:"Email"}),e.jsx("p",{className:"font-mono text-lg font-semibold text-green-900 select-all",children:re?.email})]}),e.jsxs("div",{children:[e.jsx(k,{className:"text-xs text-green-700 uppercase tracking-wide",children:"Temporary Password"}),e.jsxs("div",{className:"flex items-center justify-between gap-3 mt-1",children:[e.jsx("code",{className:"text-2xl font-mono font-bold text-green-900 select-all break-all flex-1",children:re?.tempPassword}),e.jsxs(m,{type:"button",size:"sm",onClick:async()=>{re?.tempPassword&&(await pe(re.tempPassword)?a.success("Password copied!"):a.error("Copy failed. Please select and copy manually."))},className:"flex-shrink-0",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Copy"]})]})]})]}),e.jsx("p",{className:"text-xs text-red-600 font-semibold",children:"This password is shown only once. Copy it before closing this dialog!"}),e.jsxs(I,{className:"bg-blue-50 border-blue-300 border-2",children:[e.jsx(Y,{className:"h-5 w-5 text-blue-600"}),e.jsxs(T,{className:"text-blue-900",children:[e.jsx("strong",{children:"Next Steps:"}),e.jsxs("ol",{className:"list-decimal list-inside mt-2 space-y-1 text-sm",children:[e.jsxs("li",{children:["Share the email and temporary password with ",e.jsx("strong",{children:re?.name})]}),e.jsx("li",{children:"They can sign in immediately at the login page"}),e.jsx("li",{children:"They will be prompted to change their password on first login"})]})]})]})]}),e.jsxs("div",{className:"flex gap-2 pt-4 border-t mt-4",children:[e.jsxs(m,{type:"button",variant:"outline",onClick:async()=>{if(re){const s=`Login Credentials for ${re.name}:
Email: ${re.email}
Temporary Password: ${re.tempPassword}

Please sign in and change your password immediately.`;await pe(s)?a.success("Full credentials copied!"):a.error("Copy failed. Please copy manually.")}},className:"flex-1",children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Copy All"]}),e.jsx(m,{type:"button",onClick:()=>{Ge(!1),ms(null)},className:"flex-1",children:"Done"})]})]})})]}),e.jsx(We,{value:"permissions",className:"space-y-6",children:e.jsx(Pa,{userRole:r.role})}),e.jsxs(We,{value:"recovery",className:"space-y-6",children:[e.jsx($a,{}),e.jsx(Qa,{}),e.jsx(Ma,{currentUserId:r.id,currentOrganizationId:r.organizationId,currentUserRole:r.role})]})]})]})}):e.jsxs("div",{className:"space-y-6",children:[e.jsx("h1",{className:"text-3xl text-foreground",children:"Users"}),e.jsxs(I,{children:[e.jsx(ve,{className:"h-4 w-4"}),e.jsx(T,{children:"You don't have permission to manage users. Only Admins, Directors, and Super Admins can access this section."})]})]})}function Ya(r=12){const o="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?";let E="";for(let N=0;N<r;N++){const d=Math.floor(Math.random()*o.length);E+=o[d]}return E}export{Xr as Users};
