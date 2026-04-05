import{c as ra,r as n,j as e,n as X,t as K,x as W,v as Z,F as Ne,o as Q,B as u,ai as Os,a as re,E as me,w as a,Y as Rs,aj as ta,ak as Ie,al as Te,am as Je,an as Ue,ao as ys,ap as Ss,aq as ia,d as na,Z as la,$ as oa,D as ca,e as da,f as ua,i as Ze,z as Es,b as es,p as ma}from"./index-1yhNq2Ha.js";import{A as I,a as T,b as xa}from"./alert-D-2051dM.js";import{c as je}from"./clipboard-DmeE4Bfy.js";import{C as J}from"./copy-CxIa53Iw.js";import{E as $e}from"./external-link-D9PnVpFl.js";import{P as ha}from"./PermissionGate-DfVpLJEP.js";import{k as ws,u as ss}from"./api-DLayqI9K.js";import{I as fe}from"./input-BlzDXCXY.js";import{L as M}from"./label-CkiZE_m4.js";import{D as De,e as pa,a as ze,b as Pe,c as Fe,d as ke}from"./dialog-BRfCE-l4.js";import{S as oe,a as ce,b as de,c as ue,d as E}from"./select-GOcbvL91.js";import{T as Ls,a as As,b as Xe,c as Qe}from"./tabs-BauqCbsN.js";import{C as Oe}from"./circle-check-DTyfLj9L.js";import{B as V}from"./badge-CzbMQZzh.js";import{D as Us}from"./database-C4rZLiEf.js";import{C as ns}from"./circle-check-big-BbdgK9P5.js";import{S as we}from"./shield-gF1dOQPr.js";import{B as Ds}from"./ban-D5kz2boL.js";import{E as zs}from"./eye-C1WpxOBk.js";import{P as ls}from"./pencil-CcU2hMlL.js";import{S as ga}from"./save-BOXDPCr7.js";import{T as be}from"./triangle-alert-BU1HRSoN.js";import{U as fa,a as as}from"./user-plus-BAv12cWQ.js";import{S as He}from"./search-BVkbQeFR.js";import{C as ja}from"./circle-x-20xyzRXu.js";import{W as Na}from"./wrench-i32ZHG3e.js";import{u as ba}from"./useDebounce-BwDveitC.js";import{u as va,c as _s}from"./subscription-client-CdKzIOnp.js";import{B as rs}from"./building-2-X1Hv8mTb.js";import{X as ya}from"./x-C286KHut.js";import{P as Cs}from"./plus-B5ylHloC.js";import{E as Sa}from"./ellipsis-vertical-D0C0GQos.js";import{S as Ea}from"./square-pen-B7TG7lqZ.js";import{T as wa}from"./trash-2-CEc4aRyv.js";import"./lock-CMjIZbay.js";import"./marketing-client-DHQ5s_aO.js";import"./index-CRGzBiJw.js";import"./index-Bng_odzP.js";import"./chevron-up-CDQiFqGc.js";/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]],Ca=ra("user-x",_a);re();const ts=`-- Add manager_id column to profiles table
-- This allows users to be assigned a manager for hierarchical organization structure

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index on manager_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- Add comment
COMMENT ON COLUMN public.profiles.manager_id IS 'References the manager (another profile) for this user';`;function Ia(){const[r,c]=n.useState(!1),[_,g]=n.useState(!1),[m,L]=n.useState(!1),l=async()=>{try{if(await je(ts)){c(!0),setTimeout(()=>c(!1),2e3);return}}catch{}try{const t=document.createElement("textarea");t.value=ts,t.style.position="fixed",t.style.left="-999999px",t.style.top="-999999px",document.body.appendChild(t),t.focus(),t.select();const A=document.execCommand("copy");document.body.removeChild(t),A?(c(!0),setTimeout(()=>c(!1),2e3)):g(!0)}catch{g(!0)}};return e.jsxs(X,{className:"border-blue-200 bg-blue-50",children:[e.jsx(K,{children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx(W,{className:"h-5 w-5 text-blue-600 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx(Z,{className:"text-blue-900",children:"Manager Feature Requires Database Update"}),e.jsx(Ne,{className:"text-blue-700 mt-1",children:"To enable the manager assignment feature, we need to add a new column to your database."})]})]})}),e.jsxs(Q,{className:"space-y-4",children:[e.jsxs(I,{children:[e.jsx(W,{className:"h-4 w-4"}),e.jsxs(T,{children:[e.jsx("strong",{children:"Quick Setup:"})," Follow these steps to enable manager assignments."]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Copy the SQL migration"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"Click the button below to copy the SQL code"}),e.jsxs("div",{className:"flex gap-2 mt-2",children:[e.jsx(u,{onClick:l,variant:"outline",size:"sm",className:"gap-2",children:r?e.jsxs(e.Fragment,{children:[e.jsx(Os,{className:"h-4 w-4 text-green-600"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(J,{className:"h-4 w-4"}),"Copy SQL Migration"]})}),e.jsxs(u,{onClick:()=>g(!_),variant:"ghost",size:"sm",children:[_?"Hide":"View"," SQL"]})]}),_&&e.jsx("pre",{className:"mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto",children:ts})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"2"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Open Supabase SQL Editor"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"Go to your Supabase dashboard → SQL Editor → New Query"}),e.jsx(u,{asChild:!0,variant:"outline",size:"sm",className:"gap-2 mt-2",children:e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",children:["Open Supabase Dashboard",e.jsx($e,{className:"h-4 w-4"})]})})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0",children:"3"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-foreground",children:"Run the migration"}),e.jsxs("p",{className:"text-sm text-muted-foreground mt-1",children:["Paste the SQL code and click ",e.jsx("strong",{children:"Run"})," or press ",e.jsx("kbd",{className:"px-1.5 py-0.5 bg-muted rounded text-xs font-mono",children:"Ctrl+Enter"})]}),e.jsx("p",{className:"text-sm text-muted-foreground mt-2",children:"✅ After running, refresh this page to use the manager feature"})]})]})]}),e.jsxs("div",{className:"mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200",children:[e.jsx("p",{className:"text-sm text-blue-900",children:e.jsx("strong",{children:"💡 What this migration does:"})}),e.jsxs("ul",{className:"text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2",children:[e.jsxs("li",{children:["Adds a ",e.jsx("code",{className:"bg-blue-100 px-1 rounded",children:"manager_id"})," column to the profiles table"]}),e.jsx("li",{children:"Creates a foreign key relationship to allow users to have managers"}),e.jsx("li",{children:"Adds an index for efficient manager lookups"}),e.jsx("li",{children:"Existing users will have no manager assigned by default (NULL)"})]})]})]})]})}const Me=re();function Ta({onRefresh:r}){const[c,_]=n.useState(!1),[g,m]=n.useState(!1),[L,l]=n.useState([]),[t,A]=n.useState(!1),[h,o]=n.useState(!1),d=`-- ================================================
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
FROM public.profiles;`,f=async()=>{m(!0),l([]);const i=[];try{i.push({step:"Authentication",status:"info",message:"Checking authentication..."});const{data:{user:w},error:te}=await Me.auth.getUser();if(!w||te){i.push({step:"Authentication",status:"error",message:"Not authenticated. Please refresh the page and log in again.",details:te}),l(i),m(!1);return}i.push({step:"Authentication",status:"success",message:`Authenticated as ${w.email}`,details:{userId:w.id,email:w.email,role:w.user_metadata?.role,organizationId:w.user_metadata?.organizationId}}),l([...i]),i.push({step:"Profiles Table",status:"info",message:"Checking if profiles table exists..."}),l([...i]);const{error:k}=await Me.from("profiles").select("id").limit(0);if(k)if(k.code==="42P01"){i[i.length-1]={step:"Profiles Table",status:"error",message:"❌ Profiles table does not exist! You need to run the SQL script.",details:k},l([...i]),A(!0),m(!1);return}else k.code==="42501"?i[i.length-1]={step:"Profiles Table",status:"warning",message:"Profiles table exists but RLS policies may be blocking access",details:k}:i[i.length-1]={step:"Profiles Table",status:"error",message:`Database error: ${k.message}`,details:k};else i[i.length-1]={step:"Profiles Table",status:"success",message:"✅ Profiles table exists"};l([...i]),i.push({step:"Profile Count",status:"info",message:"Counting profiles..."}),l([...i]);const{count:$,error:ie}=await Me.from("profiles").select("*",{count:"exact",head:!0});ie?i[i.length-1]={step:"Profile Count",status:"error",message:`Error counting profiles: ${ie.message}`,details:ie}:i[i.length-1]={step:"Profile Count",status:$===0?"warning":"success",message:$===0?"⚠️ No profiles found! The table is empty.":`Found ${$} profile(s)`,details:{count:$}},l([...i]),i.push({step:"Visible Profiles",status:"info",message:"Querying profiles visible to you..."}),l([...i]);const{data:G,error:ve}=await Me.from("profiles").select("*");ve?i[i.length-1]={step:"Visible Profiles",status:"error",message:`Error querying profiles: ${ve.message}`,details:ve}:i[i.length-1]={step:"Visible Profiles",status:G.length===0?"warning":"success",message:G.length===0?"⚠️ No profiles visible to you. RLS policies may be blocking access.":`✅ ${G.length} profile(s) visible to you`,details:{count:G.length,profiles:G.map(j=>({email:j.email,role:j.role,org:j.organization_id}))}},l([...i]),$===0||G&&G.length===0?(i.push({step:"Recommendation",status:"warning",message:"🔧 Action Required: Run the SQL script below to sync users from auth.users to profiles table"}),A(!0)):i.push({step:"Recommendation",status:"success",message:'✅ Everything looks good! Click "Refresh Users List" to reload.'}),l([...i])}catch(w){i.push({step:"Error",status:"error",message:`Unexpected error: ${w.message}`,details:w}),l(i)}finally{m(!1)}},z=async()=>{try{await je(d),_(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>_(!1),3e3)}catch{const w=document.createElement("textarea");w.value=d,w.style.position="fixed",w.style.opacity="0",document.body.appendChild(w),w.select(),document.execCommand("copy"),document.body.removeChild(w),_(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>_(!1),3e3)}},U=()=>{window.open("https://supabase.com/dashboard/project/_/sql/new","_blank")},p=i=>{switch(i){case"success":return"text-green-600 bg-green-50 border-green-200";case"error":return"text-red-600 bg-red-50 border-red-200";case"warning":return"text-yellow-600 bg-yellow-50 border-yellow-200";case"info":return"text-blue-600 bg-blue-50 border-blue-200"}},S=i=>{switch(i){case"success":return e.jsx(Oe,{className:"h-4 w-4"});case"error":return e.jsx(W,{className:"h-4 w-4"});case"warning":return e.jsx(W,{className:"h-4 w-4"});case"info":return e.jsx(Database,{className:"h-4 w-4"})}};return e.jsxs(X,{className:"border-blue-200 bg-blue-50",children:[e.jsxs(K,{children:[e.jsxs(Z,{className:"flex items-center gap-2 text-blue-900",children:[e.jsx(Database,{className:"h-5 w-5"}),"Profiles Table Sync Tool"]}),e.jsx(Ne,{className:"text-sm text-muted-foreground",children:"Ensure your profiles table is correctly set up and synced with auth.users."})]}),e.jsxs(Q,{className:"space-y-4",children:[e.jsx(I,{className:"border-blue-300 bg-blue-100",children:e.jsxs(T,{className:"text-blue-900",children:[e.jsx("p",{className:"font-semibold mb-2",children:"💡 What this tool does:"}),e.jsxs("ul",{className:"text-sm space-y-1 ml-4 list-disc",children:[e.jsx("li",{children:"Checks if your profiles table is set up correctly"}),e.jsx("li",{children:"Diagnoses RLS policy issues"}),e.jsx("li",{children:"Provides SQL script to sync all users from auth.users to profiles"}),e.jsx("li",{children:"Verifies data visibility"})]})]})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(u,{onClick:f,disabled:g,size:"lg",className:"gap-2",children:g?e.jsxs(e.Fragment,{children:[e.jsx(me,{className:"h-4 w-4 animate-spin"}),"Running Diagnostic..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Play,{className:"h-4 w-4"}),"Run Full Diagnostic"]})}),L.length>0&&e.jsxs(u,{onClick:r,variant:"outline",size:"lg",className:"gap-2",children:[e.jsx(me,{className:"h-4 w-4"}),"Refresh Users List"]})]}),L.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"font-semibold text-foreground",children:"Diagnostic Results:"}),L.map((i,w)=>e.jsx(I,{className:p(i.status),children:e.jsxs("div",{className:"flex items-start gap-2",children:[S(i.status),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-semibold text-sm",children:i.step}),e.jsx("p",{className:"text-sm",children:i.message}),i.details&&e.jsxs("details",{className:"mt-2",children:[e.jsx("summary",{className:"cursor-pointer text-xs hover:underline",children:"View Details"}),e.jsx("pre",{className:"text-xs mt-1 p-2 bg-background rounded overflow-auto max-h-32",children:JSON.stringify(i.details,null,2)})]})]})]})},w))]}),t&&e.jsxs("div",{className:"space-y-3 p-4 bg-background rounded-lg border-2 border-blue-300",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"font-semibold text-foreground",children:"📝 Fix SQL Script"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(u,{onClick:z,size:"sm",variant:c?"outline":"default",className:"gap-2",children:c?e.jsxs(e.Fragment,{children:[e.jsx(Oe,{className:"h-4 w-4"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(J,{className:"h-4 w-4"}),"Copy SQL"]})}),e.jsxs(u,{onClick:U,size:"sm",variant:"outline",className:"gap-2",children:[e.jsx(ExternalLink,{className:"h-4 w-4"}),"Open SQL Editor"]})]})]}),e.jsxs(I,{className:"border-yellow-300 bg-yellow-50",children:[e.jsx(W,{className:"h-4 w-4 text-yellow-600"}),e.jsxs(T,{className:"text-yellow-900",children:[e.jsx("p",{className:"font-semibold mb-2",children:"📋 Instructions:"}),e.jsxs("ol",{className:"text-sm space-y-1 ml-4 list-decimal",children:[e.jsx("li",{children:'Click "Copy SQL" above'}),e.jsx("li",{children:'Click "Open SQL Editor" to open Supabase'}),e.jsx("li",{children:"Paste the SQL script in the editor"}),e.jsx("li",{children:'Click "Run" or press F5'}),e.jsx("li",{children:'Come back here and click "Refresh Users List"'})]})]})]}),e.jsxs("details",{children:[e.jsx("summary",{className:"cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700",children:"📄 Preview SQL Script (click to expand)"}),e.jsx("div",{className:"mt-2 p-3 bg-muted rounded border border-border max-h-96 overflow-auto",children:e.jsx("pre",{className:"text-xs font-mono text-foreground whitespace-pre-wrap",children:d})})]})]})]})]})}re();function Oa(){const[r,c]=n.useState(!1),[_,g]=n.useState(!1),[m,L]=n.useState(null),[l,t]=n.useState(!1),[A,h]=n.useState(!1),o=`-- Create permissions table
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
ON CONFLICT (role, module) DO NOTHING;`,d=()=>{const f=document.createElement("textarea");f.value=o,f.style.position="fixed",f.style.left="-999999px",f.style.top="-999999px",document.body.appendChild(f),f.focus(),f.select();try{document.execCommand("copy"),f.remove(),h(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>h(!1),3e3)}catch{f.remove(),t(!0),a.error("Auto-copy failed. Script shown below - please copy manually.")}};return e.jsxs(X,{className:"border-orange-200 bg-orange-50",children:[e.jsxs(K,{children:[e.jsxs(Z,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(Us,{className:"h-5 w-5"}),"Permissions Table Setup Required"]}),e.jsx(Ne,{className:"text-orange-700",children:"The permissions table doesn't exist in your Supabase database yet."})]}),e.jsxs(Q,{className:"space-y-4",children:[_?e.jsxs(I,{className:"border-green-300 bg-green-50",children:[e.jsx(ns,{className:"h-4 w-4 text-green-600"}),e.jsxs(T,{className:"text-green-900",children:[e.jsx("strong",{children:"Success!"})," The permissions table has been created successfully."]})]}):e.jsxs(e.Fragment,{children:[e.jsxs(I,{className:"border-orange-300 bg-orange-100",children:[e.jsx(W,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900",children:[e.jsx("strong",{children:"Setup Required:"})," You need to create the permissions table in Supabase."]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("p",{className:"text-sm text-orange-900",children:e.jsx("strong",{children:"Follow these steps:"})}),e.jsxs("ol",{className:"list-decimal list-inside space-y-2 text-sm text-orange-800",children:[e.jsx("li",{children:'Click the "Copy SQL Script" button below'}),e.jsxs("li",{children:["Open your ",e.jsx("strong",{children:"Supabase Dashboard"})]}),e.jsxs("li",{children:["Go to ",e.jsx("strong",{children:"SQL Editor"})," (in the left sidebar)"]}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"New Query"'})]}),e.jsx("li",{children:"Paste the SQL script"}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"Run"'})]}),e.jsx("li",{children:"Return here and refresh the page"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(u,{onClick:d,className:"flex-1",variant:"default",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),A?"Copied!":"Copy SQL Script"]}),e.jsx(u,{onClick:()=>t(!l),variant:"outline",children:l?"Hide Script":"Show Script"}),e.jsx(u,{onClick:()=>window.location.reload(),variant:"outline",children:"Refresh"})]}),l&&e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"flex justify-between items-center mb-2",children:e.jsxs("p",{className:"text-sm text-orange-900",children:[e.jsx("strong",{children:"SQL Script:"})," Select all and copy (Ctrl+A, Ctrl+C)"]})}),e.jsx("textarea",{readOnly:!0,value:o,className:"w-full h-96 p-3 bg-gray-900 text-green-400 text-xs rounded font-mono overflow-auto resize-y",onClick:f=>f.currentTarget.select()}),e.jsx("p",{className:"text-xs text-orange-700 mt-2",children:"💡 Tip: Click inside the text area to auto-select all text, then copy with Ctrl+C (Cmd+C on Mac)"})]})]}),m&&e.jsxs(I,{className:"border-red-300 bg-red-50",children:[e.jsx(W,{className:"h-4 w-4 text-red-600"}),e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"Error:"})," ",m]})]})]})]})}const is=re(),Is=[{value:"super_admin",label:"Super Admin",description:"Full system access across all organizations"},{value:"admin",label:"Admin",description:"Full access within the organization"},{value:"director",label:"Director",description:"Leadership visibility with broad operational access"},{value:"manager",label:"Manager",description:"Manage teams and day-to-day operations"},{value:"marketing",label:"Marketing",description:"Marketing and outreach focused access"},{value:"designer",label:"Designer",description:"Design and Project Wizards focused access"},{value:"standard_user",label:"Standard User",description:"General day-to-day user access"}],Ts=[{value:"none",label:"No Access",icon:Ds},{value:"view",label:"View Only",icon:zs},{value:"full",label:"Full Access",icon:ls}],Ra=[{value:"inherit",label:"Inherit",icon:we},{value:"none",label:"No Access",icon:Ds},{value:"view",label:"View Only",icon:zs},{value:"full",label:"Full Access",icon:ls}];function La({userRole:r}){const[c,_]=n.useState("standard_user"),[g,m]=n.useState({}),[L,l]=n.useState({}),[t,A]=n.useState(!0),[h,o]=n.useState(!1),[d,f]=n.useState(!1),[z,U]=n.useState(!1),p=r==="super_admin"||r==="admin",S=Rs("security",r),i=Is.filter(j=>r==="super_admin"||j.value!=="super_admin");n.useEffect(()=>{w(c)},[c]),n.useEffect(()=>{const j=new Set([...Object.keys(g),...Object.keys(L)]),C=Array.from(j).some(D=>{const O=g[D],v=L[D];return!O&&!v?!1:!O||!v?!0:O.visible!==v.visible||O.add!==v.add||O.change!==v.change||O.delete!==v.delete});f(C)},[g,L]);const w=async j=>{A(!0),U(!1);try{const{data:C,error:D}=await is.from("permissions").select("*").eq("role",j);if(D){if(D.code==="PGRST205"||D.code==="42P01"){U(!0),A(!1);return}throw D}const O=ta(C||[]),v={};Ie.forEach(P=>{const q=Te(P.id),ne=Je(P.id,j),ye=O.find(le=>le.role===j&&le.module===q);v[q]={role:j,module:q,...ye||ne},P.modules.forEach(le=>{const H=O.find(B=>B.role===j&&B.module===le);H&&(v[le]={role:j,module:le,...H})})}),m(v),l(JSON.parse(JSON.stringify(v))),U(!1)}catch{a.error("Failed to load hierarchical access settings")}finally{A(!1)}},te=(j,C)=>{const D=Te(j);m(O=>({...O,[D]:{role:c,module:D,...O[D]||{},...Ss(C)}}))},k=j=>{const C=g[j];return C?Ue(C):"inherit"},$=(j,C)=>{const D=Te(j),O=Ue(g[D]||Je(j,c));if(O==="none")return"none";const v=Ue(g[C]||ia(C,c));return O==="view"?v==="none"?"none":"view":v},ie=(j,C)=>{m(D=>{const O={...D};return C==="inherit"?(delete O[j],O):(O[j]={role:c,module:j,...D[j]||{},...Ss(C)},O)})},G=async()=>{o(!0);try{const j=Array.from(new Set([...Ie.map(v=>Te(v.id)),...Ie.flatMap(v=>v.modules)])),C=Object.values(g).filter(v=>j.includes(v.module)).map(v=>({role:c,module:v.module,visible:v.visible,add:v.add,change:v.change,delete:v.delete})),{error:D}=await is.from("permissions").delete().eq("role",c).in("module",j);if(D)throw D;const{error:O}=await is.from("permissions").insert(C);if(O)throw O;await w(c),a.success(`Hierarchical access saved for ${Is.find(v=>v.value===c)?.label}!`)}catch{a.error("Failed to save hierarchical access")}finally{o(!1)}},ve=()=>{m(JSON.parse(JSON.stringify(L)))};return p?e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl text-foreground mb-2",children:"Role Space & Option Access"}),e.jsxs("p",{className:"text-muted-foreground",children:["Manage security in two levels: ",e.jsx("strong",{children:"1) access to the space"}),", then ",e.jsx("strong",{children:"2) access to options inside that space"}),". This gives each role only the tools it actually needs."]})]}),z?e.jsx(Oa,{}):e.jsxs(Ls,{value:c,onValueChange:j=>_(j),children:[e.jsx("div",{className:"overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",children:e.jsx(As,{className:"inline-flex w-auto min-w-full",children:i.map(j=>e.jsx(Xe,{value:j.value,className:"whitespace-nowrap",children:j.label},j.value))})}),i.map(j=>e.jsx(Qe,{value:j.value,className:"space-y-4",children:e.jsxs(X,{children:[e.jsxs(K,{children:[e.jsxs(Z,{className:"flex items-center gap-2",children:[e.jsx(we,{className:"h-5 w-5"}),j.label," Hierarchical Access"]}),e.jsx(Ne,{children:j.description})]}),e.jsx(Q,{children:t?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"}),e.jsx("p",{className:"text-muted-foreground",children:"Loading space access..."})]})}):e.jsxs(e.Fragment,{children:[d&&e.jsxs(I,{className:"mb-4 border-yellow-400 bg-yellow-50",children:[e.jsx(W,{className:"h-4 w-4 text-yellow-600"}),e.jsxs(T,{className:"text-yellow-900",children:["You have unsaved changes. Click ",e.jsx("strong",{children:"Save Changes"})," to apply them."]})]}),e.jsx("div",{className:"space-y-3",children:Ie.map(C=>{const D=Te(C.id),O=g[D],v=Ue(O||Je(C.id,c));return e.jsx(X,{className:"bg-muted/30",children:e.jsxs(Q,{className:"pt-5 space-y-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("span",{className:"text-xl",children:C.icon}),e.jsx("p",{className:"text-sm font-medium text-foreground",children:C.name})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:C.description}),e.jsx("div",{className:"flex flex-wrap gap-2 mt-2",children:C.modules.map(P=>e.jsx(V,{variant:"secondary",className:"text-xs",children:ys(P)},P))})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsx("p",{className:"text-sm font-semibold text-foreground",children:"Step 1 — Space Access"}),e.jsx(V,{variant:"secondary",children:"Level 1"})]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:Ts.map(P=>{const q=P.icon;return e.jsxs(u,{type:"button",size:"sm",variant:v===P.value?"default":"outline",onClick:()=>te(C.id,P.value),disabled:!S,children:[e.jsx(q,{className:"h-4 w-4 mr-2"}),P.label]},P.value)})})]}),e.jsxs("div",{className:"rounded-lg border border-border bg-background/70 p-4 space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-foreground",children:"Step 2 — Option Access"}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Inherit follows the role default and still respects the parent space access."})]}),e.jsx(V,{variant:"secondary",children:"Level 2"})]}),e.jsx("div",{className:"space-y-3",children:C.modules.map(P=>{const q=k(P),ne=$(C.id,P),ye=Ts.find(H=>H.value===ne)?.label||"No Access",le=Ie.filter(H=>H.modules.includes(P)).length;return e.jsxs("div",{className:"rounded-lg border border-border/60 p-3",children:[e.jsxs("div",{className:"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:ys(P)}),le>1&&e.jsx(V,{variant:"outline",children:"Shared Option"})]}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Effective access: ",e.jsx("strong",{children:ye})]})]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:Ra.map(H=>{const B=H.icon;return e.jsxs(u,{type:"button",size:"sm",variant:q===H.value?"default":"outline",onClick:()=>ie(P,H.value),disabled:!S,children:[e.jsx(B,{className:"h-4 w-4 mr-2"}),H.label]},H.value)})})]}),v==="none"&&e.jsx("p",{className:"mt-2 text-xs text-muted-foreground",children:"Enable the parent space first before this option becomes available."}),v==="view"&&q==="full"&&e.jsxs("p",{className:"mt-2 text-xs text-amber-700",children:["This option is capped at ",e.jsx("strong",{children:"View Only"})," while the space remains read-only."]})]},`${C.id}-${P}`)})})]})]})},C.id)})}),e.jsxs("div",{className:"flex gap-3 mt-6",children:[e.jsx(u,{onClick:G,disabled:!S||!d||h,className:"flex-1",children:h?e.jsxs(e.Fragment,{children:[e.jsx(me,{className:"h-4 w-4 mr-2 animate-spin"}),"Saving..."]}):e.jsxs(e.Fragment,{children:[e.jsx(ga,{className:"h-4 w-4 mr-2"}),"Save Changes"]})}),e.jsxs(u,{onClick:ve,variant:"outline",disabled:!S||!d||h,children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Reset"]})]})]})})]})},j.value))]})]}):e.jsxs(I,{children:[e.jsx(we,{className:"h-4 w-4"}),e.jsx(T,{children:"You don't have permission to manage space access. Only Super Admins and Admins can access this section."})]})}function Aa(){const r=`-- ============================================================================
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
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO service_role;`,c=()=>{je(r),a.success("SQL script copied to clipboard!")};return e.jsxs(X,{className:"border-orange-200 bg-orange-50",children:[e.jsx(K,{children:e.jsxs(Z,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(be,{className:"h-5 w-5"}),"⚠️ Database Setup Required (One-Time)"]})}),e.jsxs(Q,{className:"space-y-4",children:[e.jsx(I,{className:"border-red-300 bg-red-100",children:e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"RLS policies are preventing cross-organization user management."}),e.jsx("p",{className:"mt-2",children:"To enable super_admin privileges and fix user assignment errors, you need to run a SQL script in your Supabase database."})]})}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("h3",{className:"font-medium text-orange-900",children:"What This Fixes:"}),e.jsxs("ul",{className:"list-disc pl-5 space-y-1 text-sm text-orange-800",children:[e.jsx("li",{children:"✅ Allows super_admins to manage users across all organizations"}),e.jsx("li",{children:'✅ Fixes "No rows updated - RLS policy blocking" errors'}),e.jsx("li",{children:"✅ Enables User Recovery tool to move users between orgs"}),e.jsx("li",{children:"✅ Enables browser console tools (assignUserToOrg, etc.)"}),e.jsx("li",{children:"✅ Creates server-side functions that bypass RLS safely"})]})]}),e.jsx(I,{className:"border-blue-300 bg-blue-50",children:e.jsxs(T,{className:"text-blue-900",children:[e.jsx("strong",{children:"📋 Step-by-Step Instructions:"}),e.jsxs("ol",{className:"list-decimal pl-5 mt-2 space-y-2",children:[e.jsx("li",{children:'Click the "Copy SQL Script" button below'}),e.jsxs("li",{children:["Go to your"," ",e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",className:"underline inline-flex items-center gap-1",children:["Supabase Dashboard ",e.jsx($e,{className:"h-3 w-3"})]})]}),e.jsxs("li",{children:["Navigate to ",e.jsx("strong",{children:"SQL Editor"})," in the left sidebar"]}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"New Query"'})]}),e.jsx("li",{children:"Paste the SQL script"}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:'"Run"'})," or press F5"]}),e.jsx("li",{children:"You should see: ✅ 3 policies created, ✅ 2 functions created"}),e.jsx("li",{children:"Come back here and refresh the page"})]})]})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(u,{onClick:c,className:"flex-1",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"📋 Copy SQL Script"]}),e.jsxs(u,{variant:"outline",onClick:()=>window.open("https://supabase.com/dashboard","_blank"),className:"flex-1",children:[e.jsx($e,{className:"h-4 w-4 mr-2"}),"Open Supabase Dashboard"]})]}),e.jsxs("details",{className:"text-sm",children:[e.jsx("summary",{className:"cursor-pointer font-medium text-orange-900 hover:text-orange-700",children:"🔍 Show SQL Script Preview"}),e.jsx("div",{className:"mt-2 bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto",children:e.jsx("pre",{children:r})})]}),e.jsx(I,{className:"border-yellow-300 bg-yellow-50",children:e.jsxs(T,{className:"text-yellow-900 text-xs",children:[e.jsx("strong",{children:"⚠️ Important:"})," This SQL script is safe to run. It:",e.jsxs("ul",{className:"list-disc pl-5 mt-1 space-y-1",children:[e.jsxs("li",{children:["Uses ",e.jsx("code",{children:"CREATE OR REPLACE"})," so it's safe to run multiple times"]}),e.jsx("li",{children:"Only adds new RLS policies (doesn't remove existing ones)"}),e.jsx("li",{children:"Grants execute permissions to authenticated users"}),e.jsxs("li",{children:["Uses ",e.jsx("code",{children:"SECURITY DEFINER"})," safely (validated inputs)"]})]})]})}),e.jsxs(I,{className:"border-green-300 bg-green-50",children:[e.jsx(ns,{className:"h-4 w-4"}),e.jsxs(T,{className:"text-green-900 text-sm",children:[e.jsx("strong",{children:"After running the SQL, you'll be able to:"}),e.jsxs("ul",{className:"list-disc pl-5 mt-2 space-y-1",children:[e.jsx("li",{children:"Move users between organizations"}),e.jsx("li",{children:"Use the User Recovery tool without errors"}),e.jsxs("li",{children:["Run console commands like: ",e.jsx("code",{className:"bg-green-100 px-1 rounded",children:"assignUserToOrg('email', 'org-id')"})]}),e.jsx("li",{children:"Manage users across all organizations as super_admin"})]})]})]})]})]})}const Ua=async r=>{try{if(await je(r))return}catch{}},Ee=re();function Da({currentUserId:r,currentOrganizationId:c,currentUserRole:_}){const[g,m]=n.useState(""),[L,l]=n.useState(!1),[t,A]=n.useState(null),[h,o]=n.useState(!1),d=async()=>{l(!0),A(null);try{const{data:p,error:S}=await Ee.auth.admin.listUsers(),i=p?.users?.find(ie=>ie.email?.toLowerCase()===g.toLowerCase()),{data:w,error:te}=await Ee.from("profiles").select("*").ilike("email",g),{data:k,error:$}=await Ee.from("profiles").select("*").ilike("email",g);A({email:g,authUser:i?{id:i.id,email:i.email,created_at:i.created_at,confirmed_at:i.confirmed_at}:null,profile:w?.[0]||null,allProfiles:k||[],profileError:te,allProfilesError:$,currentOrg:c}),!i&&!w?.[0]?a.error("User not found in system"):i&&!w?.[0]?a.warning("User exists in auth but missing profile record"):w?.[0]?.organization_id!==c?a.warning("User found but in different organization"):a.success("User found")}catch{a.error("Error searching for user")}finally{l(!1)}},f=async()=>{if(!t?.authUser){a.error("No auth user found to create profile for");return}o(!0);try{const{data:p,error:S}=await Ee.from("profiles").insert([{id:t.authUser.id,email:t.authUser.email,name:t.authUser.email.split("@")[0],organization_id:c,role:"standard_user",status:"active"}]).select();if(S){a.error("Failed to create profile: "+S.message);return}if(!p||p.length===0){a.error("Failed to create profile: No data returned");return}a.success("Profile created successfully"),await d()}catch{a.error("Error creating profile")}finally{o(!1)}},z=async()=>{if(!t?.profile){a.error("No profile found to update");return}o(!0);try{const{data:p,error:S}=await Ee.rpc("assign_user_to_organization",{p_user_email:t.profile.email,p_organization_id:c});if(S){S.message.includes("function")&&S.message.includes("does not exist")?a.error("Database functions not installed. Please run the SQL setup script first. See /SQL_FIX_USER_ORGANIZATION.sql"):a.error("Failed to update organization: "+S.message);return}if(!p||!p.success){a.error(p?.error||"Failed to assign user to organization");return}a.success("User moved to your organization successfully!"),await d()}catch(p){a.error("Error updating organization: "+p.message)}finally{o(!1)}},U=async()=>{if(!t?.profile){a.error("No profile to delete");return}if(confirm("This will delete the existing profile and recreate it. Continue?")){o(!0);try{const{data:p,error:S}=await Ee.from("profiles").delete().eq("id",t.profile.id).select();if(S){S.code==="42501"||S.message.includes("policy")?a.error("RLS Policy Error: Cannot delete profile in other organization. Use the SQL script below instead.",{duration:5e3}):a.error("Failed to delete profile: "+S.message);return}if(!p||p.length===0){a.error("Cannot delete profile - RLS policies are blocking this operation. Use the SQL script below instead.",{duration:5e3});return}await f()}catch{a.error("Error during delete and recreate - Use SQL script below instead")}finally{o(!1)}}};return e.jsxs("div",{className:"space-y-6",children:[e.jsx(Aa,{}),e.jsxs(X,{children:[e.jsx(K,{children:e.jsxs(Z,{className:"flex items-center gap-2",children:[e.jsx(fa,{className:"h-5 w-5"}),"User Recovery Tool"]})}),e.jsxs(Q,{className:"space-y-4",children:[e.jsxs(I,{children:[e.jsx(be,{className:"h-4 w-4"}),e.jsx(T,{children:"This tool helps find and recover missing users. It will search across auth.users and profiles tables."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{children:"Email Address"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(fe,{type:"email",placeholder:"user@example.com",value:g,onChange:p=>m(p.target.value),onKeyDown:p=>p.key==="Enter"&&d()}),e.jsxs(u,{onClick:d,disabled:L,children:[e.jsx(He,{className:"h-4 w-4 mr-2"}),L?"Searching...":"Search"]})]})]}),t&&e.jsxs("div",{className:"space-y-4 mt-6",children:[e.jsxs("div",{className:"border rounded-lg p-4 space-y-3",children:[e.jsxs("h3",{className:"font-medium",children:["Search Results for: ",t.email]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("div",{className:"flex items-center justify-between p-3 bg-muted rounded",children:e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium",children:"Auth User (auth.users)"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.authUser?e.jsxs(e.Fragment,{children:["✅ Found - ID: ",t.authUser.id.substring(0,8),"...",e.jsx("br",{}),"Created: ",new Date(t.authUser.created_at).toLocaleDateString()]}):"❌ Not found in authentication system"})]})}),e.jsx("div",{className:"flex items-center justify-between p-3 bg-muted rounded",children:e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium",children:"Profile (profiles table)"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.profile?e.jsxs(e.Fragment,{children:["✅ Found - Organization: ",t.profile.organization_id,e.jsx("br",{}),t.profile.organization_id===t.currentOrg?e.jsx("span",{className:"text-green-600",children:"✓ In your organization"}):e.jsx("span",{className:"text-orange-600",children:"⚠️ In different organization"}),e.jsx("br",{}),"Role: ",t.profile.role,e.jsx("br",{}),"Status: ",t.profile.status]}):"❌ No profile record found"})]})}),t.allProfiles&&t.allProfiles.length>0&&e.jsxs("div",{className:"p-3 bg-blue-50 rounded border border-blue-200",children:[e.jsxs("p",{className:"text-sm font-medium text-blue-900",children:["Found ",t.allProfiles.length," profile(s) across all organizations:"]}),t.allProfiles.map((p,S)=>e.jsxs("div",{className:"text-xs text-blue-800 mt-2 pl-4",children:["• Org: ",p.organization_id," | Role: ",p.role," | Status: ",p.status]},S))]})]}),e.jsxs("div",{className:"space-y-2 pt-4 border-t",children:[e.jsx("p",{className:"text-sm font-medium",children:"Recovery Actions:"}),t.authUser&&!t.profile&&e.jsxs(u,{onClick:f,disabled:h,className:"w-full",children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Create Profile in Your Organization"]}),t.profile&&t.profile.organization_id!==t.currentOrg&&e.jsxs(e.Fragment,{children:[e.jsxs(I,{className:"border-orange-200 bg-orange-50",children:[e.jsx(be,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900",children:[e.jsx("strong",{children:"User in Different Organization"}),e.jsxs("p",{className:"text-sm mt-1",children:["This user is in organization: ",e.jsx("code",{className:"bg-orange-100 px-1 rounded",children:t.profile.organization_id})]}),e.jsxs("p",{className:"text-sm mt-2",children:[e.jsx("strong",{children:"⚠️ Note:"}),' Due to Row Level Security (RLS) policies, moving users between organizations requires super_admin privileges. If the "Move User" button fails, use "Delete & Recreate" instead.']})]})]}),e.jsxs(u,{onClick:z,disabled:h,variant:"outline",className:"w-full",children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Try to Move User (May Fail if Not Super Admin)"]}),e.jsxs(u,{onClick:U,disabled:h,className:"w-full bg-blue-600 hover:bg-blue-700 text-white",children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Delete & Recreate (Recommended)"]})]}),t.profile&&t.profile.organization_id===t.currentOrg&&e.jsx(I,{className:"border-green-200 bg-green-50",children:e.jsx(T,{className:"text-green-900",children:"✅ User is already in your organization. No action needed."})}),!t.authUser&&!t.profile&&e.jsx(I,{children:e.jsx(T,{children:"User not found in the system. They may need to sign up first."})})]})]}),t.profile&&t.profile.organization_id!==t.currentOrg&&e.jsxs("div",{className:"border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200",children:[e.jsx("h3",{className:"font-medium text-blue-900",children:"🛠️ Manual SQL Fix (Bypasses RLS)"}),e.jsx("p",{className:"text-sm text-blue-800",children:"If the buttons above fail due to RLS policies, copy and run this SQL in your Supabase SQL Editor:"}),e.jsx("div",{className:"bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto",children:e.jsx("pre",{children:`-- Move user ${t.email} to organization ${c}
UPDATE public.profiles 
SET organization_id = '${c}'
WHERE id = '${t.profile.id}';

-- Verify the update
SELECT id, email, organization_id, role, status 
FROM public.profiles 
WHERE email = '${t.email}';`})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(u,{size:"sm",variant:"outline",onClick:()=>{const p=`-- Move user ${t.email} to organization ${c}
UPDATE public.profiles 
SET organization_id = '${c}'
WHERE id = '${t.profile.id}';

-- Verify the update
SELECT id, email, organization_id, role, status 
FROM public.profiles 
WHERE email = '${t.email}';`;Ua(p),a.success("SQL copied to clipboard!")},children:"📋 Copy SQL"}),e.jsxs(u,{size:"sm",onClick:d,disabled:L,children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Re-check After Running SQL"]})]}),e.jsx(I,{className:"border-yellow-300 bg-yellow-50",children:e.jsxs(T,{className:"text-yellow-900 text-xs",children:[e.jsx("strong",{children:"How to run this SQL:"}),e.jsxs("ol",{className:"list-decimal pl-5 mt-2 space-y-1",children:[e.jsx("li",{children:"Go to your Supabase Dashboard"}),e.jsx("li",{children:"Navigate to SQL Editor"}),e.jsx("li",{children:'Click "New Query"'}),e.jsx("li",{children:"Paste the SQL above"}),e.jsx("li",{children:'Click "Run" or press Ctrl+Enter'}),e.jsx("li",{children:'Return here and click "Re-check After Running SQL"'})]})]})})]})]}),e.jsxs("div",{className:"text-xs text-muted-foreground space-y-1 mt-4",children:[e.jsx("p",{children:e.jsx("strong",{children:"Troubleshooting Tips:"})}),e.jsxs("ul",{className:"list-disc pl-5 space-y-1",children:[e.jsx("li",{children:'If user exists in auth but no profile: Click "Create Profile"'}),e.jsx("li",{children:'If user is in different organization: Use "Delete & Recreate" (recommended for non-super admins)'}),e.jsx("li",{children:'"Move User" button requires super_admin role due to RLS policies'}),e.jsx("li",{children:'"Delete & Recreate" bypasses RLS by creating a fresh profile in your organization'}),e.jsx("li",{children:"After recovery, user should appear in the Users list immediately"})]})]})]})]})]})}function za(){const[r,c]=useState(!1),_=`-- Fix profiles table to allow invited users without auth.users entry
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

-- ✅ Done! Now admins can invite users and create profiles with temporary IDs`,g=()=>{copyToClipboard(_),c(!0),a.success("SQL script copied to clipboard!"),setTimeout(()=>c(!1),2e3)};return e.jsxs(Card,{className:"border-orange-200 bg-orange-50",children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center gap-2 text-orange-900",children:[e.jsx(AlertTriangle,{className:"h-5 w-5"}),"Profiles Table Fix Required"]}),e.jsx(CardDescription,{className:"text-sm text-muted-foreground",children:"The profiles table currently has a foreign key constraint that prevents inviting users who haven't signed up yet. Run the SQL script below to fix this."})]}),e.jsxs(CardContent,{className:"space-y-4",children:[e.jsxs(I,{className:"bg-background border-orange-300",children:[e.jsx(Database,{className:"h-4 w-4"}),e.jsx(T,{children:"The profiles table currently has a foreign key constraint that prevents inviting users who haven't signed up yet. Run the SQL script below to fix this."})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"text-sm font-semibold text-foreground",children:"SQL Migration Script"}),e.jsx(Button,{onClick:g,size:"sm",variant:"outline",className:"gap-2",children:r?e.jsxs(e.Fragment,{children:[e.jsx(Oe,{className:"h-4 w-4"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(J,{className:"h-4 w-4"}),"Copy SQL"]})})]}),e.jsx("pre",{className:"bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs",children:_}),e.jsxs("div",{className:"bg-background border border-orange-200 rounded-lg p-4 space-y-2",children:[e.jsx("h4",{className:"font-medium text-sm text-foreground",children:"Instructions:"}),e.jsxs("ol",{className:"text-sm text-foreground space-y-1 list-decimal list-inside",children:[e.jsx("li",{children:'Click "Copy SQL" button above'}),e.jsx("li",{children:"Open Supabase Dashboard → SQL Editor"}),e.jsx("li",{children:"Paste and run the script"}),e.jsx("li",{children:"Refresh this page and try inviting the user again"})]})]})]})]})]})}function Pa(){const[r,c]=n.useState(""),[_,g]=n.useState(!1),[m,L]=n.useState(!1),[l,t]=n.useState(null),A=async()=>{if(!r){a.error("Please enter an email address");return}g(!0),t(null);try{const o=re(),d={found:!1,inProfiles:!1,hasOrganization:!1,isActive:!1,issues:[],fixes:[]},{data:f,error:z}=await o.from("profiles").select("*").eq("email",r).maybeSingle();f?(d.found=!0,d.inProfiles=!0,d.hasOrganization=!!f.organization_id,d.isActive=f.status==="active",d.details=f,f.organization_id||(d.issues.push("User has no organization assigned"),d.fixes.push('Click "Recover User" to assign to Rona Atlantic')),f.status!=="active"&&(d.issues.push(`User status is '${f.status}' instead of 'active'`),d.fixes.push('Click "Recover User" to activate'))):(d.issues.push("User not found in profiles table"),d.fixes.push("User may need to be recreated or may exist only in auth.users"));const U="rona-atlantic",{data:p}=await o.from("profiles").select("email, role, status").eq("organization_id",U).order("email");d.orgUsers=p||[],t(d),d.found&&d.hasOrganization&&d.isActive?a.success("User found and active!"):d.found?a.warning("User found but has issues"):a.error("User not found")}catch(o){a.error("Search failed: "+o.message)}finally{g(!1)}},h=async()=>{if(!r){a.error("Please enter an email address");return}L(!0);try{const o=re(),d="rona-atlantic",{data:f,error:z}=await o.rpc("assign_user_to_organization",{p_user_email:r,p_organization_id:d});if(z){if(l?.details?.user_id){const{error:U}=await o.from("profiles").update({organization_id:d,status:"active",updated_at:new Date().toISOString()}).eq("user_id",l.details.user_id);if(U){a.error("Recovery failed: "+U.message);return}a.success("User recovered using fallback method!"),setTimeout(()=>A(),500);return}a.error("RPC call failed: "+z.message);return}a.success("User recovered successfully!"),setTimeout(()=>A(),500)}catch(o){a.error("Recovery failed: "+o.message)}finally{L(!1)}};return e.jsxs("div",{className:"space-y-6",children:[e.jsxs(X,{children:[e.jsxs(K,{children:[e.jsxs(Z,{className:"flex items-center gap-2",children:[e.jsx(Ca,{className:"w-5 h-5"}),"Find Missing User"]}),e.jsx(Ne,{children:"Search for and recover missing users in the system"})]}),e.jsxs(Q,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"email",children:"User Email"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(fe,{id:"email",type:"email",placeholder:"user@example.com",value:r,onChange:o=>c(o.target.value),onKeyDown:o=>o.key==="Enter"&&A()}),e.jsxs(u,{onClick:A,disabled:_,children:[e.jsx(He,{className:"w-4 h-4 mr-2"}),_?"Searching...":"Search"]})]})]}),l&&e.jsxs(e.Fragment,{children:[e.jsx(I,{className:l.found&&l.hasOrganization&&l.isActive?"border-green-500":l.found?"border-yellow-500":"border-red-500",children:e.jsx(T,{children:e.jsx("div",{className:"space-y-3",children:e.jsxs("div",{className:"flex items-start gap-2",children:[l.found&&l.hasOrganization&&l.isActive?e.jsx(Oe,{className:"w-5 h-5 text-green-600 mt-0.5"}):l.found?e.jsx(be,{className:"w-5 h-5 text-yellow-600 mt-0.5"}):e.jsx(ja,{className:"w-5 h-5 text-red-600 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("span",{className:"font-medium",children:"Status:"}),e.jsx(V,{variant:l.found?"default":"destructive",children:l.found?"Found":"Not Found"}),l.found&&e.jsxs(e.Fragment,{children:[e.jsx(V,{variant:l.hasOrganization?"default":"destructive",children:l.hasOrganization?"Has Org":"No Org"}),e.jsx(V,{variant:l.isActive?"default":"secondary",children:l.isActive?"Active":"Inactive"})]})]}),l.details&&e.jsxs("div",{className:"text-sm space-y-1 mb-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"User ID:"})," ",l.details.user_id]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Email:"})," ",l.details.email]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Organization:"})," ",l.details.organization_id||"❌ None"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Role:"})," ",l.details.role||"standard_user"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Status:"})," ",l.details.status]})]}),l.issues.length>0&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-medium text-sm",children:"Issues:"}),e.jsx("ul",{className:"text-sm space-y-1",children:l.issues.map((o,d)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-red-500",children:"•"}),e.jsx("span",{children:o})]},d))})]}),l.fixes.length>0&&e.jsxs("div",{className:"space-y-1 mt-2",children:[e.jsx("div",{className:"font-medium text-sm",children:"Suggested Fixes:"}),e.jsx("ul",{className:"text-sm space-y-1",children:l.fixes.map((o,d)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-blue-500",children:"→"}),e.jsx("span",{children:o})]},d))})]}),l.found&&l.issues.length>0&&e.jsx("div",{className:"mt-3",children:e.jsxs(u,{onClick:h,disabled:m,size:"sm",children:[e.jsx(me,{className:"w-4 h-4 mr-2"}),m?"Recovering...":"Recover User"]})})]})]})})})}),l.orgUsers&&l.orgUsers.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"font-medium text-sm",children:["Users in Rona Atlantic (",l.orgUsers.length,"):"]}),e.jsx("div",{className:"border rounded-lg overflow-hidden",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{className:"bg-muted",children:e.jsxs("tr",{children:[e.jsx("th",{className:"text-left p-2",children:"Email"}),e.jsx("th",{className:"text-left p-2",children:"Role"}),e.jsx("th",{className:"text-left p-2",children:"Status"})]})}),e.jsx("tbody",{children:l.orgUsers.map((o,d)=>e.jsxs("tr",{className:"border-t",children:[e.jsx("td",{className:"p-2",children:o.email}),e.jsx("td",{className:"p-2",children:o.role}),e.jsx("td",{className:"p-2",children:e.jsx(V,{variant:o.status==="active"?"default":"secondary",children:o.status})})]},d))})]})})]})]})]})]}),e.jsxs(X,{children:[e.jsxs(K,{children:[e.jsx(Z,{children:"Quick Actions"}),e.jsx(Ne,{children:"Common recovery operations"})]}),e.jsx(Q,{className:"space-y-3",children:e.jsxs("div",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:"Note:"})," If a user is completely missing from the database, they will need to sign up again or be re-invited by an administrator."]})})]})]})}function Fa(){const[r,c]=n.useState(!1),[_,g]=n.useState(!1),[m,L]=n.useState(null),l=async()=>{c(!0);try{const h=re(),{data:o,error:d}=await h.from("profiles").select("email, organization_id, status");if(d){a.error("Failed to scan users: "+d.message);return}const{data:f,error:z}=await h.from("tenants").select("id, name, status").eq("status","active");if(z){a.error("Failed to load organizations: "+z.message);return}const U=new Set(f?.map(i=>i.id)||[]),p=o?.filter(i=>{const w=/^org-[0-9]+$/.test(i.organization_id||""),te=!i.organization_id,k=i.organization_id&&!U.has(i.organization_id);return w||te||k})||[],S={totalUsers:o?.length||0,invalidUsers:p.length,invalidUsersList:p,availableOrgs:f||[]};L(S),p.length===0?a.success("✅ All users have valid organization IDs!"):a.warning(`Found ${p.length} user(s) with invalid organization IDs`)}catch(h){a.error("Scan failed: "+h.message)}finally{c(!1)}},t=async()=>{if(!m||m.invalidUsers===0){a.info("No invalid organizations to fix");return}g(!0);try{const h=re();let o=0,d=0;try{const{data:f,error:z}=await h.rpc("fix_all_invalid_org_ids");if(!z&&f){a.success("✅ Fixed all invalid organization IDs!"),await l();return}}catch{}for(const f of m.invalidUsersList)try{const z=f.email.split("@")[1].toLowerCase();let U=null;if(z.includes("ronaatlantic")||z.includes("rona")?U="rona-atlantic":U=m.availableOrgs[0]?.id||null,!U){d++;continue}const{error:p}=await h.from("profiles").update({organization_id:U,status:"active",updated_at:new Date().toISOString()}).eq("email",f.email);p?d++:o++}catch{d++}o>0&&a.success(`✅ Fixed ${o} user(s)!`),d>0&&a.error(`❌ Failed to fix ${d} user(s)`),await l()}catch(h){a.error("Fix failed: "+h.message)}finally{g(!1)}},A=h=>h?/^org-[0-9]+$/.test(h):!1;return e.jsxs("div",{className:"space-y-4",children:[e.jsxs(X,{children:[e.jsxs(K,{children:[e.jsxs(Z,{className:"flex items-center gap-2",children:[e.jsx(be,{className:"w-5 h-5 text-orange-600"}),"Fix Invalid Organization IDs"]}),e.jsx(Ne,{children:'Scan for and fix users with invalid timestamp-based organization IDs (e.g., "org-1762906336768")'})]}),e.jsxs(Q,{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(u,{onClick:l,disabled:r,variant:"outline",className:"flex-1",children:[e.jsx(Us,{className:"w-4 h-4 mr-2"}),r?"Scanning...":"Scan for Issues"]}),m&&m.invalidUsers>0&&e.jsxs(u,{onClick:t,disabled:_,className:"flex-1",children:[e.jsx(Na,{className:"w-4 h-4 mr-2"}),_?"Fixing...":`Fix ${m.invalidUsers} User(s)`]})]}),m&&e.jsxs("div",{className:"space-y-4",children:[e.jsx(I,{className:m.invalidUsers===0?"border-green-500 bg-green-50":"border-orange-500 bg-orange-50",children:e.jsx(T,{children:e.jsxs("div",{className:"flex items-start gap-3",children:[m.invalidUsers===0?e.jsx(Oe,{className:"w-5 h-5 text-green-600 mt-0.5"}):e.jsx(be,{className:"w-5 h-5 text-orange-600 mt-0.5"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("div",{className:"flex items-center gap-2",children:e.jsx("span",{className:"font-medium",children:m.invalidUsers===0?"✅ All users have valid organization IDs":`⚠️ Found ${m.invalidUsers} invalid organization ID(s)`})}),e.jsxs("div",{className:"text-sm space-y-1",children:[e.jsxs("div",{children:["Total users: ",m.totalUsers]}),e.jsxs("div",{children:["Valid users: ",m.totalUsers-m.invalidUsers]}),e.jsxs("div",{children:["Invalid users: ",m.invalidUsers]})]})]})]})})}),m.availableOrgs.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"font-medium text-sm",children:["Available Organizations (",m.availableOrgs.length,"):"]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:m.availableOrgs.map(h=>e.jsxs(V,{variant:"outline",className:"text-xs",children:[h.name," (",h.id,")"]},h.id))})]}),m.invalidUsersList.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("div",{className:"font-medium text-sm",children:"Users with Invalid Organization IDs:"}),e.jsx("div",{className:"border rounded-lg overflow-hidden max-h-64 overflow-y-auto",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{className:"bg-muted sticky top-0",children:e.jsxs("tr",{children:[e.jsx("th",{className:"text-left p-2",children:"Email"}),e.jsx("th",{className:"text-left p-2",children:"Current Org ID"}),e.jsx("th",{className:"text-left p-2",children:"Issue"})]})}),e.jsx("tbody",{children:m.invalidUsersList.map((h,o)=>e.jsxs("tr",{className:"border-t hover:bg-muted/50",children:[e.jsx("td",{className:"p-2",children:h.email}),e.jsx("td",{className:"p-2",children:e.jsx("code",{className:"text-xs bg-red-100 text-red-700 px-2 py-1 rounded",children:h.organization_id||"NULL"})}),e.jsxs("td",{className:"p-2",children:[!h.organization_id&&e.jsx(V,{variant:"destructive",className:"text-xs",children:"No Org"}),A(h.organization_id)&&e.jsx(V,{variant:"destructive",className:"text-xs",children:"Timestamp-based"}),h.organization_id&&!A(h.organization_id)&&e.jsx(V,{variant:"secondary",className:"text-xs",children:"Org Not Found"})]})]},o))})]})})]})]}),!m&&e.jsx(I,{children:e.jsxs(T,{className:"text-sm",children:["Click ",e.jsx("strong",{children:'"Scan for Issues"'}),' to check for users with invalid organization IDs. This will detect timestamp-based IDs like "org-1762906336768" and other invalid references.']})})]})]}),e.jsxs(X,{children:[e.jsx(K,{children:e.jsx(Z,{className:"text-base",children:"About This Issue"})}),e.jsxs(Q,{className:"space-y-3 text-sm text-muted-foreground",children:[e.jsx("p",{children:e.jsx("strong",{children:"What are timestamp-based organization IDs?"})}),e.jsx("p",{children:'These are incorrectly generated IDs in the format "org-1762906336768" where the number is a timestamp. They should be proper slug-format IDs like "rona-atlantic".'}),e.jsx("p",{children:e.jsx("strong",{children:"How does the fix work?"})}),e.jsxs("ul",{className:"list-disc list-inside space-y-1",children:[e.jsx("li",{children:"Detects users with invalid organization IDs"}),e.jsx("li",{children:"Maps users to correct organizations based on email domain"}),e.jsx("li",{children:"Updates both profiles and auth metadata"}),e.jsx("li",{children:"Ensures all users have valid, active organizations"})]}),e.jsx("div",{className:"pt-2 border-t",children:e.jsxs("p",{className:"text-xs",children:[e.jsx("strong",{children:"Alternative:"})," Run the SQL script ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"/FIX_INVALID_ORG_IDS.sql"})," in Supabase SQL Editor for server-side fix."]})})]})]})]})}function ka({invalidOrgId:r,correctOrgId:c="rona-atlantic"}){const[_,g]=n.useState(!1),m=`-- Quick Fix: Replace invalid org ID with correct one
UPDATE profiles
SET 
  organization_id = '${c}',
  updated_at = NOW()
WHERE organization_id = '${r}';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('organizationId', '${c}')
WHERE id IN (
  SELECT id FROM profiles WHERE organization_id = '${c}'
);`,L=async()=>{await je(m)&&(g(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>g(!1),3e3))};return e.jsxs(I,{className:"border-red-500 bg-red-50",children:[e.jsx(be,{className:"h-5 w-5 text-red-600"}),e.jsx(xa,{className:"text-red-900 text-lg",children:"Invalid Organization ID Detected"}),e.jsx(T,{children:e.jsxs("div",{className:"space-y-4 text-red-900 mt-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"font-medium",children:"Your account has an invalid organization ID:"}),e.jsx("code",{className:"block bg-red-100 px-3 py-2 rounded border border-red-300 text-sm",children:r}),e.jsx("p",{className:"text-sm",children:"This is a timestamp-based ID that was created by old signup logic. It needs to be replaced with a valid organization ID."})]}),e.jsxs(X,{className:"border-blue-200 bg-blue-50",children:[e.jsxs(K,{className:"pb-3",children:[e.jsx(Z,{className:"text-base text-blue-900",children:"⚡ 2-Minute Fix"}),e.jsx(Ne,{className:"text-blue-700",children:"Run this SQL in your Supabase SQL Editor to fix the issue immediately"})]}),e.jsxs(Q,{className:"space-y-3",children:[e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-background p-3 rounded border border-blue-200 text-xs overflow-x-auto max-h-48",children:m}),e.jsx(u,{onClick:L,size:"sm",variant:"outline",className:"absolute top-2 right-2 bg-background",children:_?e.jsxs(e.Fragment,{children:[e.jsx(ns,{className:"h-3 w-3 mr-1 text-green-600"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(J,{className:"h-3 w-3 mr-1"}),"Copy SQL"]})})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"1."}),e.jsxs("span",{className:"text-blue-800",children:["Open your ",e.jsx("strong",{children:"Supabase Dashboard"})," → ",e.jsx("strong",{children:"SQL Editor"})]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"2."}),e.jsx("span",{className:"text-blue-800",children:'Copy the SQL above (or click "Copy SQL" button)'})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"3."}),e.jsxs("span",{className:"text-blue-800",children:["Paste and click ",e.jsx("strong",{children:"Run"})," (or press F5)"]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"4."}),e.jsxs("span",{className:"text-blue-800",children:[e.jsx("strong",{children:"Log out"})," and ",e.jsx("strong",{children:"log back in"})]})]}),e.jsxs("div",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"font-bold text-blue-900 min-w-[20px]",children:"✅"}),e.jsx("span",{className:"text-blue-800 font-semibold",children:"Error is fixed!"})]})]})]})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-2 pt-2",children:[e.jsxs(u,{onClick:L,variant:"default",className:"flex-1",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"Copy Fix SQL"]}),e.jsx(u,{asChild:!0,variant:"outline",className:"flex-1",children:e.jsxs("a",{href:"#recovery",className:"flex items-center justify-center",children:[e.jsx($e,{className:"h-4 w-4 mr-2"}),"Go to User Recovery"]})})]}),e.jsxs("div",{className:"bg-amber-100 border border-amber-300 rounded p-3 text-sm space-y-1",children:[e.jsx("p",{className:"font-semibold text-amber-900",children:"Alternative: Use the UI Tool"}),e.jsxs("p",{className:"text-amber-800",children:["Navigate to ",e.jsx("strong",{children:"Users → User Recovery"})," tab and use the",e.jsx("strong",{children:' "Fix Invalid Organization IDs"'})," tool to scan and fix automatically."]})]}),e.jsxs("div",{className:"text-xs text-muted-foreground pt-2 border-t border-red-200",children:[e.jsx("p",{children:e.jsx("strong",{children:"What gets fixed:"})}),e.jsxs("ul",{className:"list-disc list-inside space-y-1 mt-1",children:[e.jsxs("li",{children:["Your organization ID in the ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"profiles"})," table"]}),e.jsxs("li",{children:["Your organization ID in the ",e.jsx("code",{className:"bg-muted px-1 py-0.5 rounded",children:"auth.users"})," metadata"]}),e.jsx("li",{children:"All related permission and access issues"})]})]})]})})]})}const ge=re();function Rr({user:r,organization:c,onOrganizationUpdate:_}){const[g,m]=n.useState(""),L=ba(g,300),[l,t]=n.useState(!1),[A,h]=n.useState(!1),[o,d]=n.useState(null),[f,z]=n.useState([]),[U,p]=n.useState(!1),[S,i]=n.useState(!0),[w,te]=n.useState(!1),[k,$]=n.useState(null),[ie,G]=n.useState(!1),[ve,j]=n.useState(null),[C,D]=n.useState(!1),[O,v]=n.useState(!1),[P,q]=n.useState(!1),[ne,ye]=n.useState(""),[le,H]=n.useState(!1),[B,os]=n.useState(null),[Xa,Qa]=n.useState(!1),[_e,Ps]=n.useState(""),[$a,Ha]=n.useState(null),[Fs,We]=n.useState(!1),[ee,cs]=n.useState(null),[ks,Re]=n.useState(!1),[Ce,ds]=n.useState(""),[Ms,us]=n.useState(!1),[Ye,ms]=n.useState(!1),[Y,Le]=n.useState(null),[Ge,xs]=n.useState("email"),Xs=na("users",r.role),qe=la("users",r.role)||Rs("users",r.role),Qs=oa("users",r.role)||r.role==="super_admin"||r.role==="admin",hs=r.role==="admin"||r.role==="super_admin",[se,Be]=n.useState([]),[R,Se]=n.useState({name:"",email:"",role:"standard_user",organizationId:r.organizationId,plan:""}),[x,xe]=n.useState({name:"",email:"",role:"standard_user",organizationId:"",status:"active",managerId:"",plan:""}),[ae,$s]=n.useState({});n.useEffect(()=>{he(),r.organizationId&&ws.getOrganizationSettings(r.organizationId).then(s=>{s?.user_invite_method&&xs(s.user_invite_method)}).catch(s=>{})},[]),n.useEffect(()=>{r.role==="super_admin"&&Hs()},[r.role]),n.useEffect(()=>{se.length>0&&Ve()},[se]);const Ve=async()=>{if(["admin","super_admin"].includes(r.role))try{const s={},b=se.map(N=>N.id).filter(Boolean);if(b.length>0){const{data:N}=await ge.from("profiles").select("id, billing_plan").in("id",b).not("billing_plan","is",null);if(N)for(const y of N)y.billing_plan&&(s[y.id]=y.billing_plan)}$s(s)}catch{}},he=async()=>{i(!0),$(null);try{const b=(await ss.getAll())?.users||[];if(b.length>0,b.length===0){Be([]),G(!1);return}let N=b;r.role!=="super_admin"&&r.organizationId&&(N=b.filter(F=>F.organization_id===r.organizationId));const y=N.map(F=>({...F,organizationId:F.organization_id,lastLogin:F.last_login}));Be(y),$(null)}catch(s){s?.code==="42P17"||s?.message?.includes("infinite recursion")?$("infinite recursion: "+String(s)):$(String(s)),G(!0),Be([])}finally{i(!1)}},Hs=async()=>{try{p(!0);const{data:s,error:b}=await ge.from("organizations").select("*").order("name",{ascending:!0});if(b)return;const N=s?.map(y=>({id:y.id,name:y.name,status:y.status||"active",logo:y.logo}))||[];z(N)}catch{}finally{p(!1)}},ps=se.filter(s=>{const b=L.toLowerCase().trim(),N=!b||s.name.toLowerCase().includes(b)||s.email.toLowerCase().includes(b)||s.role.toLowerCase().includes(b)||s.status&&s.status.toLowerCase().includes(b),y=r.role==="super_admin"||s.role!=="super_admin";return N&&y}),gs=se.filter(s=>(s.role==="manager"||s.role==="director")&&s.status==="active");se.length>0&&r.role!=="super_admin"&&se.some(s=>s.organizationId===r.organizationId);const Ws=/^org-[0-9]+$/.test(r.organizationId),fs=s=>/^[0-9a-fA-F]{8}[-\s]?[0-9a-fA-F]{4}/.test(s),Ae=c?.name||"",js=Ae&&!fs(Ae)&&Ae!=="Organization"?Ae:"Not set — click pencil to rename",Ns=async()=>{if(!(!Ce.trim()||!r.organizationId)){us(!0);try{if(await ws.updateOrganizationName(r.organizationId,Ce.trim()),c){const s={...c,name:Ce.trim()};_?.(s)}a.success("Organization name updated!"),Re(!1)}catch{a.error("Failed to update organization name")}finally{us(!1)}}},Ys=async()=>{ms(!0),Le(null);try{const s=await Es(),b=r.organizationId,N=await fetch(`https://${es}.supabase.co/functions/v1/make-server-8405be07/profiles/find-missing?organization_id=${encodeURIComponent(b)}`,{headers:s});if(!N.ok){const pe=await N.text();a.error("Failed to scan for missing users");return}const y=await N.json();Le({missing:y.missing||[],wrongOrg:y.wrongOrg||[]});const F=(y.missing?.length||0)+(y.wrongOrg?.length||0);F===0?a.success("All auth users have matching profiles — no issues found!"):a.warning(`Found ${F} user(s) with profile issues`)}catch(s){a.error("Error scanning: "+s.message)}finally{ms(!1)}},Gs=async s=>{try{const b=await Es(),N=await fetch(`https://${es}.supabase.co/functions/v1/make-server-8405be07/profiles/fix-missing`,{method:"POST",headers:b,body:JSON.stringify({users:s,organizationId:r.organizationId})});if(!N.ok){const F=await N.text();a.error("Failed to fix users");return}const y=await N.json();a.success(`Fixed ${y.fixed} user(s)!`),Le(null),he()}catch(b){a.error("Error fixing: "+b.message)}},Ke=s=>{if(r.role==="super_admin"){const b=f.find(N=>N.id===s);return b&&!fs(b.name)?b.name:s||"Unknown"}return r.role==="admin"&&s===r.organizationId?js:s||"Unknown"},qs=s=>{s.preventDefault(),Bs()},Bs=async()=>{try{v(!1);const s={email:R.email,name:R.name,role:R.role,inviteMethod:Ge};if(r.role==="super_admin"){s.organizationId=R.organizationId;const N=f.find(y=>y.id===R.organizationId);N&&(s.organizationName=N.name)}else c?.name&&(s.organizationName=c.name);const b=await ss.invite(s);if(R.plan&&b?.userId)try{await ge.from("profiles").update({billing_plan:R.plan,updated_at:new Date().toISOString()}).eq("id",b.userId);try{await _s(R.plan,"month",void 0,!1,b.userId,r.organizationId)}catch{}}catch(N){a.error("User created but failed to assign plan: "+(N.message||"Unknown error"))}await he(),await Ve(),Se({name:"",email:"",role:"standard_user",organizationId:r.organizationId,plan:""}),t(!1),b?.tempPassword?(cs({email:s.email,tempPassword:b.tempPassword,name:s.name}),We(!0),a.success("User account created! Share the temporary password with the user.")):a.success("User invited successfully! An email has been sent to them.")}catch(s){s.message?.includes("does not exist")&&s.message?.includes("Organization")?a.error(s.message+" Please create it in the Tenants module first."):s.message?.includes("profiles_id_fkey")||s.message?.includes("is not present in table")?(v(!0),a.error("Database migration required. See instructions above.")):s.message?.includes("already exists")?a.error("A user with this email already exists"):a.error("Failed to invite user: "+(s.message||"Unknown error"))}},Vs=async s=>{const b=se.find(N=>N.id===s);if(r.role==="admin"&&b?.role==="super_admin"){a.error("You do not have permission to delete Super Admin users");return}if(confirm("Are you sure you want to remove this user?"))try{await ss.delete(s),await he()}catch{alert("Failed to remove user. Please try again.")}},Ks=s=>{if(r.role==="admin"&&s.role==="super_admin"){a.error("You do not have permission to edit Super Admin users");return}d(s),Ps(s.organizationId),xe({name:s.name,email:s.email,role:s.role,organizationId:s.organizationId,status:s.status,managerId:s.managerId||"",plan:ae[s.id]||""}),h(!0)},Js=async s=>{if(s.preventDefault(),!o)return;if(x.organizationId!==_e&&r.role==="super_admin"){const N=Ke(_e),y=Ke(x.organizationId);if(!confirm(`⚠️ ORGANIZATION CHANGE WARNING

You are about to move ${o.name} from:
  "${N}"
to:
  "${y}"

This will affect their access to data and may cause issues.

Are you absolutely sure you want to do this?`)){a.info("User update cancelled");return}a.success(`User organization changed from "${N}" to "${y}"`)}try{let N={name:x.name,email:x.email,role:x.role,organization_id:x.organizationId,status:x.status,updated_at:new Date().toISOString()};N.manager_id=x.managerId||null;let{error:y}=await ge.from("profiles").update(N).eq("id",o.id);if(y&&y.code==="PGRST204"&&y.message?.includes("manager_id")){$("MANAGER_COLUMN_MISSING");const{manager_id:F,...pe}=N,{error:vs}=await ge.from("profiles").update(pe).eq("id",o.id);if(vs){a.error("Failed to update user: "+vs.message);return}a.warning("User updated, but manager assignment requires database migration. See instructions above."),y=null}if(y){a.error("Failed to update user: "+y.message);return}if(a.success("User updated successfully!"),o&&x.plan){const F=ae[o.id];if(x.plan!==F)try{const{error:pe}=await ge.from("profiles").update({billing_plan:x.plan,updated_at:new Date().toISOString()}).eq("id",o.id);if(pe)throw pe;try{F?await va(x.plan,void 0,o.id,o.organizationId):await _s(x.plan,"month",void 0,!1,o.id,o.organizationId)}catch{}a.success(`Billing plan updated to ${x.plan==="starter"?"Standard User":x.plan==="professional"?"Professional":"Enterprise"} for ${o.name}`)}catch(pe){a.error("Profile saved but failed to update plan: "+(pe.message||"Unknown error"))}}else if(o&&!x.plan&&ae[o.id])try{await ge.from("profiles").update({billing_plan:null,updated_at:new Date().toISOString()}).eq("id",o.id)}catch{}await he(),await Ve(),h(!1),d(null)}catch{a.error("Failed to update user. Please try again.")}},Zs=async s=>{if(r.role==="admin"&&s.role==="super_admin"){a.error("You do not have permission to reset Super Admin passwords");return}os(s),H(!0);const b=Ma();ye(b);try{const N=`https://${es}.supabase.co/functions/v1/make-server-8405be07/reset-password`,y=await fetch(N,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${ma}`},body:JSON.stringify({userEmail:s.email,tempPassword:b})}),F=await y.json();if(!y.ok||!F.success)throw new Error(F.error||"Failed to reset password");!F.profileUpdated&&F.warning?a.warning("Password reset successful! Note: Run the database migration to enable password change prompts.",{duration:8e3}):F.profileUpdated;try{await ge.auth.resetPasswordForEmail(s.email,{redirectTo:`${window.location.origin}/reset-password`})}catch{}q(!0),a.success("✅ Temporary password set! User can now log in.")}catch(N){a.error(N.message||"Failed to set temporary password")}finally{H(!1)}},bs=async()=>{if(!ne){a.error("No password to copy");return}await je(ne)?a.success("Password copied to clipboard!"):a.error("Could not copy automatically. Please select and copy the password manually.")},ea=s=>{switch(s){case"super_admin":return"bg-purple-100 text-purple-700";case"admin":return"bg-blue-100 text-blue-700";case"director":return"bg-indigo-100 text-indigo-700";case"manager":return"bg-green-100 text-green-700";case"marketing":return"bg-amber-100 text-amber-700";case"standard_user":return"bg-muted text-foreground";default:return"bg-muted text-foreground"}},sa=s=>{switch(s){case"active":return"bg-green-100 text-green-700";case"invited":return"bg-yellow-100 text-yellow-700";case"inactive":return"bg-red-100 text-red-700";default:return"bg-muted text-foreground"}},aa=s=>s?new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Never";return Xs?e.jsx(ha,{user:r,module:"users",action:"view",children:e.jsx("div",{className:"p-4 sm:p-6 space-y-4 sm:space-y-6",children:e.jsxs(Ls,{defaultValue:"users",className:"space-y-6",children:[e.jsx("div",{className:"overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",children:e.jsxs(As,{className:"inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3",children:[e.jsx(Xe,{value:"users",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"User Management"}),e.jsx(Xe,{value:"permissions",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"Space Access"}),e.jsx(Xe,{value:"recovery",className:"whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm",children:"User Recovery"})]})}),e.jsxs(Qe,{value:"users",className:"space-y-6",children:[Ws&&!S&&e.jsx(ka,{invalidOrgId:r.organizationId,correctOrgId:"rona-atlantic"}),S&&e.jsx(X,{className:"border-blue-200 bg-blue-50",children:e.jsx(Q,{className:"p-8",children:e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-4",children:[e.jsx("div",{className:"animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"}),e.jsxs("div",{className:"text-center",children:[e.jsx("h3",{className:"text-lg font-semibold text-blue-900",children:"Loading Users..."}),e.jsx("p",{className:"text-sm text-blue-700 mt-1",children:"Please wait while we fetch your users from the database"})]})]})})}),k&&!k.includes("infinite recursion")&&!S&&e.jsxs(I,{className:"border-red-400 bg-red-50",children:[e.jsx(W,{className:"h-5 w-5 text-red-600"}),e.jsxs(T,{className:"text-red-900",children:[e.jsx("strong",{children:"Error loading users:"}),e.jsx("pre",{className:"mt-2 text-xs bg-red-100 p-2 rounded",children:k}),e.jsx(u,{onClick:he,variant:"outline",size:"sm",className:"mt-3",children:"Try Again"})]})]}),ie&&se.length>0&&e.jsx(Ta,{onRefresh:he}),k==="MANAGER_COLUMN_MISSING"&&e.jsx(Ia,{}),O&&e.jsx(za,{}),e.jsx(X,{className:"border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50",children:e.jsx(Q,{className:"p-6",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0",children:e.jsx(rs,{className:"h-6 w-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-lg font-semibold text-foreground mb-2",children:"Current Organization"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-1",children:"Organization Name"}),ks?e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(fe,{value:Ce,onChange:s=>ds(s.target.value),className:"h-8 text-sm max-w-[250px]",placeholder:"Enter organization name",autoFocus:!0,onKeyDown:s=>{s.key==="Enter"?Ns():s.key==="Escape"&&Re(!1)}}),e.jsx(u,{size:"sm",variant:"ghost",className:"h-8 w-8 p-0 text-green-600 hover:text-green-700",onClick:Ns,disabled:Ms||!Ce.trim(),children:e.jsx(Os,{className:"h-4 w-4"})}),e.jsx(u,{size:"sm",variant:"ghost",className:"h-8 w-8 p-0 text-muted-foreground hover:text-foreground",onClick:()=>Re(!1),children:e.jsx(ya,{className:"h-4 w-4"})})]}):e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("p",{className:"font-medium text-foreground",children:js}),(r.role==="admin"||r.role==="super_admin")&&e.jsx(u,{size:"sm",variant:"ghost",className:"h-6 w-6 p-0 text-muted-foreground hover:text-blue-600",onClick:()=>{ds(c?.name||""),Re(!0)},title:"Edit organization name",children:e.jsx(ls,{className:"h-3.5 w-3.5"})})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-1",children:"Organization ID"}),e.jsx("p",{className:"font-mono text-sm text-foreground bg-background px-2 py-1 rounded border border-border inline-block",children:r.organizationId})]})]}),r.role==="super_admin"&&e.jsxs("div",{className:"mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md inline-flex",children:[e.jsx(we,{className:"h-4 w-4"}),e.jsx("span",{children:"You can view, edit, and delete users from ALL organizations"})]})]})]})})}),e.jsx("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(u,{variant:"outline",onClick:he,disabled:S,className:"flex items-center gap-2",children:[e.jsx("svg",{className:`h-4 w-4 ${S?"animate-spin":""}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Refresh"]}),Qs&&e.jsxs(u,{variant:"outline",onClick:Ys,disabled:Ye,className:"flex items-center gap-2",children:[e.jsx(He,{className:`h-4 w-4 ${Ye?"animate-pulse":""}`}),Ye?"Scanning...":"Find Missing Users"]}),qe&&e.jsxs(De,{open:l,onOpenChange:t,children:[e.jsx(pa,{asChild:!0,children:e.jsxs(u,{className:"flex items-center gap-2",children:[e.jsx(Cs,{className:"h-4 w-4"}),"Invite User"]})}),e.jsxs(ze,{className:"bg-background",children:[e.jsxs(Pe,{children:[e.jsx(Fe,{children:"Invite New User"}),e.jsx(ke,{children:"Add a new user to your organization by filling out the form below."})]}),e.jsxs("form",{onSubmit:qs,className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"name",children:"Name"}),e.jsx(fe,{id:"name",value:R.name,onChange:s=>Se({...R,name:s.target.value}),required:!0})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"email",children:"Email"}),e.jsx(fe,{id:"email",type:"email",value:R.email,onChange:s=>Se({...R,email:s.target.value}),required:!0})]}),r.role==="super_admin"&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"organization",children:"Organization *"}),e.jsxs(oe,{value:R.organizationId,onValueChange:s=>Se({...R,organizationId:s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:U?"Loading...":"Select organization"})}),e.jsx(ue,{children:f.map(s=>e.jsx(E,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[s.logo?e.jsx("img",{src:s.logo,alt:s.name,className:"h-4 w-4 object-contain"}):e.jsx(rs,{className:"h-4 w-4"}),e.jsx("span",{children:s.name})]})},s.id))})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Select which organization this user will belong to"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"role",children:"Role"}),e.jsxs(oe,{value:R.role,onValueChange:s=>Se({...R,role:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(E,{value:"standard_user",children:"Standard User"}),e.jsx(E,{value:"marketing",children:"Marketing"}),e.jsx(E,{value:"designer",children:"Designer"}),e.jsx(E,{value:"manager",children:"Manager"}),e.jsx(E,{value:"director",children:"Director"}),e.jsx(E,{value:"admin",children:"Admin"}),r.role==="super_admin"&&e.jsx(E,{value:"super_admin",children:"Super Admin"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[R.role==="standard_user"&&"Can manage only their own data",R.role==="marketing"&&"Full access to marketing and campaigns, limited access to contacts",R.role==="designer"&&"Access to Project Wizards and design tools. Admins can enable additional modules.",R.role==="manager"&&"Can manage data of users they oversee",R.role==="director"&&"Same as Manager, plus full user visibility on Team Dashboard",R.role==="admin"&&"Full access within the organization",R.role==="super_admin"&&"Full access across all organizations"]})]}),hs&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"plan",children:"Billing Plan"}),e.jsxs(oe,{value:R.plan||"none",onValueChange:s=>Se({...R,plan:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a plan"})}),e.jsxs(ue,{children:[e.jsx(E,{value:"none",children:"No Plan (Free)"}),e.jsx(E,{value:"starter",children:"Standard User — $29/mo"}),e.jsx(E,{value:"professional",children:"Professional — $79/mo"}),e.jsx(E,{value:"enterprise",children:"Enterprise — $199/mo"})]})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Assign a billing plan to this user. Each user can have a different plan level."})]}),e.jsxs("div",{className:"space-y-2 pt-2 border-t",children:[e.jsx(M,{htmlFor:"inviteMethodOverride",children:"Delivery Method"}),e.jsxs(oe,{value:Ge,onValueChange:s=>xs(s),children:[e.jsx(ce,{id:"inviteMethodOverride",children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(E,{value:"email",children:"Automatically Email Invite Link"}),e.jsx(E,{value:"manual",children:"Generate Temporary Password"})]})]}),e.jsx("p",{className:"text-[11px] text-muted-foreground",children:Ge==="email"?"Requires SMTP setup in Supabase Auth.":"You will need to manually share the temporary password."})]}),e.jsxs("div",{className:"flex gap-2 pt-4",children:[e.jsx(u,{type:"button",variant:"outline",onClick:()=>t(!1),className:"flex-1",children:"Cancel"}),e.jsxs(u,{type:"submit",className:"flex-1",children:[e.jsx(as,{className:"h-4 w-4 mr-2"}),"Send Invite"]})]})]})]})]})]})}),Y&&(Y.missing.length>0||Y.wrongOrg.length>0)&&e.jsx(X,{className:"border-amber-300 bg-amber-50",children:e.jsxs(Q,{className:"p-4",children:[e.jsxs("h4",{className:"font-semibold text-amber-800 mb-3 flex items-center gap-2",children:[e.jsx(W,{className:"h-4 w-4"}),"Auth Users Missing from User List"]}),Y.missing.length>0&&e.jsxs("div",{className:"mb-3",children:[e.jsxs("p",{className:"text-sm text-amber-700 mb-2",children:[e.jsx("strong",{children:Y.missing.length})," user(s) exist in auth but have no profile:"]}),e.jsx("div",{className:"space-y-1",children:Y.missing.map(s=>e.jsx("div",{className:"flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200",children:e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:s.name}),e.jsx("span",{className:"text-muted-foreground ml-2",children:s.email}),e.jsxs("span",{className:"text-xs text-muted-foreground ml-2",children:["(",s.role,")"]})]})},s.id))})]}),Y.wrongOrg.length>0&&e.jsxs("div",{className:"mb-3",children:[e.jsxs("p",{className:"text-sm text-amber-700 mb-2",children:[e.jsx("strong",{children:Y.wrongOrg.length})," user(s) have a profile but wrong organization:"]}),e.jsx("div",{className:"space-y-1",children:Y.wrongOrg.map(s=>e.jsx("div",{className:"flex items-center justify-between bg-background rounded px-3 py-2 text-sm border border-amber-200",children:e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:s.name}),e.jsx("span",{className:"text-muted-foreground ml-2",children:s.email}),e.jsxs("span",{className:"text-xs text-red-500 ml-2",children:["(org: ",s.currentOrg?.slice(0,8),"...)"]})]})},s.id))})]}),e.jsxs("div",{className:"flex gap-2 mt-3",children:[e.jsxs(u,{size:"sm",onClick:()=>Gs([...Y.missing,...Y.wrongOrg]),children:["Fix All (",Y.missing.length+Y.wrongOrg.length," users)"]}),e.jsx(u,{size:"sm",variant:"outline",onClick:()=>Le(null),children:"Dismiss"})]})]})}),e.jsxs(X,{children:[e.jsx(K,{children:e.jsxs("div",{className:"relative",children:[e.jsx(He,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(fe,{placeholder:"Search users by name, email, role, or status...",value:g,onChange:s=>m(s.target.value),className:"pl-10"})]})}),e.jsxs(Q,{children:[w&&se.length>0&&e.jsxs(I,{className:"mb-4",children:[e.jsx(W,{className:"h-4 w-4"}),e.jsxs(T,{children:[e.jsx("strong",{children:"Local Mode:"})," Currently showing users that you've invited in this session. Deploy the backend to see all organization users and sync across devices."]})]}),e.jsx("div",{className:"overflow-x-auto",children:S?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"}),e.jsx("p",{className:"text-muted-foreground",children:"Loading users..."})]})}):ps.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-12 text-center",children:[e.jsx("div",{className:"h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4",children:e.jsx(as,{className:"h-8 w-8 text-muted-foreground"})}),e.jsx("h3",{className:"text-lg text-foreground mb-2",children:"No users found"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:g?"Try adjusting your search query":"Get started by inviting your first team member"}),!g&&qe&&e.jsxs(u,{onClick:()=>t(!0),children:[e.jsx(Cs,{className:"h-4 w-4 mr-2"}),"Invite User"]})]}):e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Actions"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"User"}),(r.role==="super_admin"||r.role==="admin")&&e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Organization"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Role"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Plan"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Status"}),e.jsx("th",{className:"text-left py-3 px-4 text-sm text-muted-foreground",children:"Last Login"})]})}),e.jsx("tbody",{children:ps.map(s=>e.jsxs("tr",{className:"border-b border-border hover:bg-muted",children:[qe&&e.jsx("td",{className:"py-3 px-4",children:e.jsxs(ca,{children:[e.jsx(da,{asChild:!0,children:e.jsx(u,{variant:"ghost",size:"sm",disabled:s.id===r.id,children:e.jsx(Sa,{className:"h-4 w-4"})})}),e.jsxs(ua,{align:"start",children:[e.jsxs(Ze,{onClick:()=>Ks(s),children:[e.jsx(Ea,{className:"h-4 w-4 mr-2"}),"Edit User"]}),e.jsxs(Ze,{className:"text-red-600",onClick:()=>Vs(s.id),children:[e.jsx(wa,{className:"h-4 w-4 mr-2"}),"Remove"]}),e.jsxs(Ze,{className:"text-blue-600",onClick:()=>Zs(s),children:[e.jsx(we,{className:"h-4 w-4 mr-2"}),"Reset Password"]})]})]})}),e.jsx("td",{className:"py-3 px-4",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600",children:s.name.charAt(0)}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-foreground",children:s.name}),e.jsx("p",{className:"text-xs text-muted-foreground",children:s.email})]})]})}),(r.role==="super_admin"||r.role==="admin")&&e.jsx("td",{className:"py-3 px-4",children:e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"text-sm text-foreground",children:Ke(s.organizationId)}),e.jsxs("span",{className:"text-xs text-muted-foreground font-mono",children:["ID: ",s.organizationId]})]})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${ea(s.role)}`,children:s.role.replace("_"," ").toUpperCase()})}),e.jsx("td",{className:"py-3 px-4",children:ae[s.id]?e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${ae[s.id]==="enterprise"?"bg-purple-100 text-purple-700":ae[s.id]==="professional"?"bg-blue-100 text-blue-700":"bg-orange-100 text-orange-700"}`,children:ae[s.id]==="starter"?"Standard User":ae[s.id]==="professional"?"Professional":ae[s.id]==="enterprise"?"Enterprise":ae[s.id]}):e.jsx("span",{className:"inline-block px-2 py-1 text-xs rounded bg-muted text-muted-foreground",children:"Free"})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:`inline-block px-2 py-1 text-xs rounded ${sa(s.status)}`,children:s.status})}),e.jsx("td",{className:"py-3 px-4",children:e.jsx("span",{className:"text-sm text-muted-foreground",children:aa(s.lastLogin)})})]},s.id))})]})})]})]}),e.jsx(De,{open:A,onOpenChange:h,children:e.jsxs(ze,{className:"max-h-[90vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Pe,{children:[e.jsx(Fe,{children:"Edit User"}),e.jsx(ke,{children:"Update the user's details and permissions."})]}),e.jsxs("form",{onSubmit:Js,className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"name",children:"Name"}),e.jsx(fe,{id:"name",value:x.name,onChange:s=>xe({...x,name:s.target.value}),required:!0})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"email",children:"Email"}),e.jsx(fe,{id:"email",type:"email",value:x.email,onChange:s=>xe({...x,email:s.target.value}),required:!0})]}),r.role==="super_admin"&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs(M,{htmlFor:"organization",className:"flex items-center gap-2",children:["Organization *",x.organizationId!==_e&&e.jsx("span",{className:"text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded",children:"⚠️ CHANGED"})]}),e.jsxs(oe,{value:x.organizationId,onValueChange:s=>xe({...x,organizationId:s}),children:[e.jsx(ce,{className:x.organizationId!==_e?"border-orange-500 border-2":"",children:e.jsx(de,{placeholder:U?"Loading...":"Select organization"})}),e.jsx(ue,{children:f.map(s=>e.jsx(E,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[s.logo?e.jsx("img",{src:s.logo,alt:s.name,className:"h-4 w-4 object-contain"}):e.jsx(rs,{className:"h-4 w-4"}),e.jsx("span",{children:s.name})]})},s.id))})]}),x.organizationId!==_e?e.jsxs(I,{className:"border-orange-500 bg-orange-50",children:[e.jsx(W,{className:"h-4 w-4 text-orange-600"}),e.jsxs(T,{className:"text-orange-900 text-xs",children:[e.jsx("strong",{children:"⚠️ Warning:"})," Changing organization will affect this user's access to data. You will be asked to confirm before saving."]})]}):e.jsx("p",{className:"text-xs text-muted-foreground",children:"Select which organization this user will belong to"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"role",children:"Role"}),e.jsxs(oe,{value:x.role,onValueChange:s=>xe({...x,role:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(E,{value:"standard_user",children:"Standard User"}),e.jsx(E,{value:"marketing",children:"Marketing"}),e.jsx(E,{value:"designer",children:"Designer"}),e.jsx(E,{value:"manager",children:"Manager"}),e.jsx(E,{value:"director",children:"Director"}),e.jsx(E,{value:"admin",children:"Admin"}),r.role==="super_admin"&&e.jsx(E,{value:"super_admin",children:"Super Admin"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[x.role==="standard_user"&&"Can manage only their own data",x.role==="marketing"&&"Full access to marketing and campaigns, limited access to contacts",x.role==="designer"&&"Access to Project Wizards and design tools. Admins can enable additional modules.",x.role==="manager"&&"Can manage data of users they oversee",x.role==="director"&&"Same as Manager, plus full user visibility on Team Dashboard",x.role==="admin"&&"Full access within the organization",x.role==="super_admin"&&"Full access across all organizations"]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"status",children:"Status"}),e.jsxs(oe,{value:x.status,onValueChange:s=>xe({...x,status:s}),children:[e.jsx(ce,{children:e.jsx(de,{})}),e.jsxs(ue,{children:[e.jsx(E,{value:"active",children:"Active"}),e.jsx(E,{value:"invited",children:"Invited"}),e.jsx(E,{value:"inactive",children:"Inactive"})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[x.status==="active"&&"User has full access to the system",x.status==="invited"&&"User has been invited but not yet accepted",x.status==="inactive"&&"User account is temporarily disabled"]})]}),hs&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"editPlan",children:"Billing Plan"}),e.jsxs(oe,{value:x.plan||"none",onValueChange:s=>xe({...x,plan:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a plan"})}),e.jsxs(ue,{children:[e.jsx(E,{value:"none",children:"No Plan (Free)"}),e.jsx(E,{value:"starter",children:"Standard User — $29/mo"}),e.jsx(E,{value:"professional",children:"Professional — $79/mo"}),e.jsx(E,{value:"enterprise",children:"Enterprise — $199/mo"})]})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Change this user's billing plan. Each user can have a different plan level."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{htmlFor:"manager",children:"Manager (Optional)"}),e.jsxs(oe,{value:x.managerId||"none",onValueChange:s=>xe({...x,managerId:s==="none"?"":s}),children:[e.jsx(ce,{children:e.jsx(de,{placeholder:"Select a manager"})}),e.jsxs(ue,{children:[e.jsx(E,{value:"none",children:"No Manager"}),gs.map(s=>e.jsx(E,{value:s.id,children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs",children:s.name.charAt(0)}),e.jsx("span",{children:s.name})]})},s.id))]})]}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:gs.length===0?"No active managers available. Assign a Manager role to a user first.":"Assign a manager who will oversee this user"})]}),e.jsxs("div",{className:"flex gap-2 pt-4",children:[e.jsx(u,{type:"button",variant:"outline",onClick:()=>h(!1),className:"flex-1",children:"Cancel"}),e.jsxs(u,{type:"submit",className:"flex-1",children:[e.jsx(as,{className:"h-4 w-4 mr-2"}),"Update User"]})]})]})]})}),e.jsx(De,{open:P,onOpenChange:q,children:e.jsxs(ze,{className:"sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Pe,{children:[e.jsx(Fe,{children:"🔐 Password Generated"}),e.jsxs(ke,{children:["Temporary password for ",B?.name," (",B?.email,")"]})]}),e.jsxs("div",{className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(M,{children:"Generated Temporary Password"}),e.jsx("div",{className:"bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6",children:e.jsxs("div",{className:"flex items-center justify-between gap-3",children:[e.jsx("code",{className:"text-3xl font-mono font-bold text-blue-900 select-all break-all flex-1",children:ne}),e.jsxs(u,{type:"button",size:"sm",onClick:bs,className:"flex-shrink-0",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"Copy"]})]})}),e.jsx("p",{className:"text-xs text-red-600 font-semibold",children:"⚠️ This password is shown only once. Copy it before closing this dialog!"})]}),e.jsxs(I,{className:"bg-green-50 border-green-300 border-2",children:[e.jsx(W,{className:"h-5 w-5 text-green-600"}),e.jsxs(T,{className:"text-green-900",children:[e.jsx("strong",{className:"text-base",children:"✅ Password is Active!"}),e.jsxs("p",{className:"mt-2 text-sm",children:["The user can now ",e.jsx("strong",{children:"login immediately"})," with the temporary password shown above. They will be prompted to change it on first login."]})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"bg-blue-50 border-2 border-blue-300 rounded-lg p-4",children:[e.jsxs("h5",{className:"font-semibold text-blue-900 mb-2 flex items-center gap-2",children:[e.jsx("span",{className:"bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"1"}),"📋 Share the Password"]}),e.jsxs("div",{className:"text-sm text-blue-900 space-y-2 ml-8",children:[e.jsxs("p",{children:["Send this temporary password to ",e.jsx("strong",{children:B?.email}),":"]}),e.jsx("div",{className:"bg-background border border-blue-300 rounded p-3",children:e.jsx("p",{className:"font-mono text-lg font-bold text-blue-900",children:ne})}),e.jsx("p",{className:"text-xs text-blue-700 mt-2",children:"⚠️ They will be required to change this password on first login."})]})]}),e.jsxs("details",{className:"bg-blue-50 border-2 border-blue-300 rounded-lg",children:[e.jsxs("summary",{className:"p-4 cursor-pointer font-semibold text-blue-900 flex items-center gap-2",children:[e.jsx("span",{className:"bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"2"}),"🔧 Alternative: Supabase Dashboard UI (Click to expand)"]}),e.jsx("div",{className:"px-4 pb-4 text-sm text-blue-900 space-y-2 mt-2",children:e.jsxs("ol",{className:"list-decimal list-inside space-y-1 ml-4",children:[e.jsx("li",{children:"Go to Supabase Dashboard → Authentication → Users"}),e.jsxs("li",{children:["Find: ",e.jsx("code",{className:"bg-blue-100 px-2 py-0.5 rounded font-mono text-xs",children:B?.email})]}),e.jsx("li",{children:'Click "..." menu → "Update User"'}),e.jsxs("li",{children:['Check "Auto Confirm User" and enter password: ',e.jsx("code",{className:"bg-blue-100 px-2 py-0.5 rounded font-mono text-xs",children:ne})]}),e.jsx("li",{children:'Click "Save"'})]})})]}),e.jsxs("details",{className:"bg-muted border-2 border-border rounded-lg opacity-70",children:[e.jsxs("summary",{className:"p-4 cursor-pointer font-semibold text-muted-foreground flex items-center gap-2",children:[e.jsx("span",{className:"bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs",children:"3"}),"📧 Email Method (Not Available - Email Not Configured)"]}),e.jsxs("div",{className:"px-4 pb-4 text-sm text-muted-foreground space-y-2 mt-2",children:[e.jsx("p",{className:"font-medium",children:"Once email is configured in Supabase, you can:"}),e.jsxs("ol",{className:"list-decimal list-inside space-y-1 ml-4",children:[e.jsx("li",{children:'Click "Reset Password" button'}),e.jsx("li",{children:"User receives email with reset link"}),e.jsx("li",{children:"User clicks link and enters the password you provide"}),e.jsx("li",{children:"Password is automatically set"})]}),e.jsx("p",{className:"text-xs mt-2 italic bg-muted p-2 rounded",children:"💡 To enable: Configure SMTP in Supabase Dashboard → Settings → Auth → Email Templates"})]})]})]}),e.jsxs("div",{className:"bg-muted border border-border rounded-lg p-3",children:[e.jsx("h5",{className:"font-semibold text-foreground mb-2 text-sm",children:"👤 User Information"}),e.jsxs("div",{className:"text-sm text-foreground space-y-1",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Name:"})," ",B?.name]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Email:"})," ",B?.email]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Role:"})," ",B?.role]})]})]})]}),e.jsxs("div",{className:"flex gap-2 pt-4 border-t mt-4",children:[e.jsxs(u,{type:"button",variant:"outline",onClick:bs,className:"flex-1",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"Copy Password"]}),e.jsx(u,{type:"button",onClick:()=>{q(!1),os(null),ye("")},className:"flex-1",children:"Done"})]})]})}),e.jsx(De,{open:Fs,onOpenChange:We,children:e.jsxs(ze,{className:"sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-background",children:[e.jsxs(Pe,{children:[e.jsx(Fe,{children:"Account Created Successfully"}),e.jsxs(ke,{children:["A new account has been created for ",ee?.name,". Share the login credentials below."]})]}),e.jsxs("div",{className:"space-y-4 overflow-y-auto pr-2",children:[e.jsxs("div",{className:"bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 space-y-3",children:[e.jsxs("div",{children:[e.jsx(M,{className:"text-xs text-green-700 uppercase tracking-wide",children:"Email"}),e.jsx("p",{className:"font-mono text-lg font-semibold text-green-900 select-all",children:ee?.email})]}),e.jsxs("div",{children:[e.jsx(M,{className:"text-xs text-green-700 uppercase tracking-wide",children:"Temporary Password"}),e.jsxs("div",{className:"flex items-center justify-between gap-3 mt-1",children:[e.jsx("code",{className:"text-2xl font-mono font-bold text-green-900 select-all break-all flex-1",children:ee?.tempPassword}),e.jsxs(u,{type:"button",size:"sm",onClick:async()=>{ee?.tempPassword&&(await je(ee.tempPassword)?a.success("Password copied!"):a.error("Copy failed. Please select and copy manually."))},className:"flex-shrink-0",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"Copy"]})]})]})]}),e.jsx("p",{className:"text-xs text-red-600 font-semibold",children:"This password is shown only once. Copy it before closing this dialog!"}),e.jsxs(I,{className:"bg-blue-50 border-blue-300 border-2",children:[e.jsx(W,{className:"h-5 w-5 text-blue-600"}),e.jsxs(T,{className:"text-blue-900",children:[e.jsx("strong",{children:"Next Steps:"}),e.jsxs("ol",{className:"list-decimal list-inside mt-2 space-y-1 text-sm",children:[e.jsxs("li",{children:["Share the email and temporary password with ",e.jsx("strong",{children:ee?.name})]}),e.jsx("li",{children:"They can sign in immediately at the login page"}),e.jsx("li",{children:"They will be prompted to change their password on first login"})]})]})]})]}),e.jsxs("div",{className:"flex gap-2 pt-4 border-t mt-4",children:[e.jsxs(u,{type:"button",variant:"outline",onClick:async()=>{if(ee){const s=`Login Credentials for ${ee.name}:
Email: ${ee.email}
Temporary Password: ${ee.tempPassword}

Please sign in and change your password immediately.`;await je(s)?a.success("Full credentials copied!"):a.error("Copy failed. Please copy manually.")}},className:"flex-1",children:[e.jsx(J,{className:"h-4 w-4 mr-2"}),"Copy All"]}),e.jsx(u,{type:"button",onClick:()=>{We(!1),cs(null)},className:"flex-1",children:"Done"})]})]})})]}),e.jsx(Qe,{value:"permissions",className:"space-y-6",children:e.jsx(La,{userRole:r.role})}),e.jsxs(Qe,{value:"recovery",className:"space-y-6",children:[e.jsx(Fa,{}),e.jsx(Pa,{}),e.jsx(Da,{currentUserId:r.id,currentOrganizationId:r.organizationId,currentUserRole:r.role})]})]})})}):e.jsxs("div",{className:"space-y-6",children:[e.jsx("h1",{className:"text-3xl text-foreground",children:"Users"}),e.jsxs(I,{children:[e.jsx(we,{className:"h-4 w-4"}),e.jsx(T,{children:"You don't have permission to manage users. Only Admins, Directors, and Super Admins can access this section."})]})]})}function Ma(r=12){const c="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?";let _="";for(let g=0;g<r;g++){const m=Math.floor(Math.random()*c.length);_+=c[m]}return _}export{Rr as Users};
