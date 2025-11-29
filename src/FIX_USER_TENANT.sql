-- ============================================
-- DIAGNOSE AND FIX USER TENANT ASSIGNMENT
-- For: larry.lee@ronaatlantic.ca
-- ============================================

-- Step 1: Check if user exists in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'organizationId' as organization_id,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Step 2: Check if user exists in profiles table
SELECT 
  id,
  email,
  name,
  role,
  organization_id,
  status,
  created_at,
  last_login
FROM public.profiles
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Step 3: Check all organizations in the system
SELECT 
  id,
  name,
  status,
  created_at
FROM public.organizations
ORDER BY created_at DESC;

-- Step 4: Count users per organization
SELECT 
  o.id,
  o.name,
  o.status,
  COUNT(p.id) as user_count
FROM public.organizations o
LEFT JOIN public.profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name, o.status
ORDER BY user_count DESC, o.name;

-- ============================================
-- FIX OPTIONS
-- ============================================

-- OPTION A: User exists in auth.users but NOT in profiles
-- Sync user from auth.users to profiles (choose an organization ID from Step 3)
/*
INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Larry Lee') as name,
  COALESCE(raw_user_meta_data->>'role', 'standard_user') as role,
  'YOUR_ORGANIZATION_ID_HERE' as organization_id,  -- Replace with actual org ID
  'active' as status,
  created_at
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca'
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  status = EXCLUDED.status;

-- Also update auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    raw_user_meta_data,
    '{organizationId}',
    '"YOUR_ORGANIZATION_ID_HERE"'::jsonb  -- Replace with actual org ID
  ),
  '{name}',
  '"Larry Lee"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
*/

-- OPTION B: User exists in profiles but has wrong/missing organization
-- Update existing user's organization (choose an organization ID from Step 3)
/*
UPDATE public.profiles
SET 
  organization_id = 'YOUR_ORGANIZATION_ID_HERE',  -- Replace with actual org ID
  status = 'active'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Also update auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"YOUR_ORGANIZATION_ID_HERE"'::jsonb  -- Replace with actual org ID
)
WHERE email = 'larry.lee@ronaatlantic.ca';
*/

-- OPTION C: Create a new organization for Rona Atlantic
/*
-- First, create the organization
INSERT INTO public.organizations (id, name, status, created_at, updated_at)
VALUES (
  'rona-atlantic',  -- Or use gen_random_uuid()::text for a UUID
  'Rona Atlantic',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING
RETURNING id, name;

-- Then assign the user to it
UPDATE public.profiles
SET 
  organization_id = 'rona-atlantic',
  status = 'active'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Update auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"rona-atlantic"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
*/

-- ============================================
-- VERIFICATION
-- ============================================

-- After applying a fix, verify it worked:
SELECT 
  p.email,
  p.name,
  p.role,
  p.organization_id,
  o.name as organization_name,
  p.status,
  p.created_at
FROM public.profiles p
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE p.email = 'larry.lee@ronaatlantic.ca';

-- Also check auth.users metadata
SELECT 
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'organizationId' as organization_id
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca';
