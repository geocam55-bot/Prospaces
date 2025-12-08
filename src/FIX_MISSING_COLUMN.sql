-- =====================================================
-- FIX: Add Missing needs_password_change Column
-- =====================================================
-- Run this if you're getting: column "needs_password_change" does not exist

-- Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- Verify it worked
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'needs_password_change';

-- Should show: needs_password_change | boolean | YES | false

SELECT '✅ Column added successfully!' as status;
