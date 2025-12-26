-- Check Larry's organization assignment
SELECT 
  p.id as user_id,
  p.email,
  p.name,
  p.role,
  p.organization_id,
  o.name as org_name,
  o.ai_suggestions_enabled,
  o.appointments_enabled,
  o.documents_enabled,
  o.marketing_enabled,
  o.inventory_enabled,
  o.import_export_enabled,
  o.project_wizards_enabled
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'larry.lee@ronaatlantic.ca';
