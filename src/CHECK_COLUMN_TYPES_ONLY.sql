-- Check profiles table structure
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('id', 'organization_id', 'role')
ORDER BY column_name;

-- Check organizations table structure  
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'organizations'
AND column_name = 'id'
ORDER BY column_name;

-- Check contacts table structure
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contacts'
AND column_name = 'organization_id'
ORDER BY column_name;
