-- =====================================================
-- AUTOMATED FIX FOR ORGANIZATION ASSIGNMENTS
-- =====================================================
-- This script automatically fixes organization assignments
-- without needing to manually lookup IDs
-- =====================================================

DO $$
DECLARE
    v_prospaces_org_id UUID;
    v_rona_org_id UUID;
    v_affected_count INTEGER;
BEGIN
    -- Get ProSpaces CRM organization ID
    SELECT id INTO v_prospaces_org_id
    FROM organizations
    WHERE name = 'ProSpaces CRM'
    LIMIT 1;

    -- Get RONA Atlantic organization ID
    SELECT id INTO v_rona_org_id
    FROM organizations
    WHERE name = 'RONA Atlantic'
    LIMIT 1;

    -- Verify both organizations exist
    IF v_prospaces_org_id IS NULL THEN
        RAISE EXCEPTION 'ProSpaces CRM organization not found!';
    END IF;

    IF v_rona_org_id IS NULL THEN
        RAISE EXCEPTION 'RONA Atlantic organization not found!';
    END IF;

    RAISE NOTICE 'ProSpaces CRM ID: %', v_prospaces_org_id;
    RAISE NOTICE 'RONA Atlantic ID: %', v_rona_org_id;

    -- Move george.campbell@prospaces.com to ProSpaces CRM
    UPDATE profiles
    SET organization_id = v_prospaces_org_id
    WHERE email = 'george.campbell@prospaces.com';
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    RAISE NOTICE 'Moved % user(s) to ProSpaces CRM', v_affected_count;

    -- Move all other users to RONA Atlantic
    UPDATE profiles
    SET organization_id = v_rona_org_id
    WHERE email != 'george.campbell@prospaces.com'
      AND email IS NOT NULL;
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    RAISE NOTICE 'Moved % user(s) to RONA Atlantic', v_affected_count;

    -- Show final assignments
    RAISE NOTICE '=== FINAL ORGANIZATION ASSIGNMENTS ===';
    
END $$;

-- Verify the results
SELECT 
    p.email,
    p.full_name,
    p.role,
    o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;
