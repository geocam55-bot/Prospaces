import { settingsAPI } from './api';
import { filterTemplatesByModule, type CustomExportTemplate } from './export-engine';

function getLocalExportTemplates(organizationId: string): CustomExportTemplate[] {
  const collected = new Map<string, CustomExportTemplate>();

  const collectTemplatesFromStorageValue = (stored: string | null) => {
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const templates = Array.isArray(parsed.exportTemplates) ? parsed.exportTemplates : [];

      for (const template of templates) {
        if (template?.id) {
          collected.set(template.id, template);
        }
      }
    } catch {
      // Ignore malformed local cache entries.
    }
  };

  try {
    const orgId = localStorage.getItem('currentOrgId') || organizationId;
    collectTemplatesFromStorageValue(localStorage.getItem(`global_settings_${orgId}`));

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('global_settings_') || key === `global_settings_${orgId}`) {
        continue;
      }

      collectTemplatesFromStorageValue(localStorage.getItem(key));
    }

    return Array.from(collected.values());
  } catch {
    return Array.from(collected.values());
  }
}

function mergeTemplates(
  serverTemplates: CustomExportTemplate[],
  localTemplates: CustomExportTemplate[]
): CustomExportTemplate[] {
  const merged = new Map<string, CustomExportTemplate>();

  for (const template of serverTemplates) {
    if (template?.id) merged.set(template.id, template);
  }

  for (const template of localTemplates) {
    if (template?.id) merged.set(template.id, template);
  }

  return Array.from(merged.values());
}

export async function loadPlannerExportTemplates(organizationId: string): Promise<CustomExportTemplate[]> {
  const localTemplates = getLocalExportTemplates(organizationId);

  const normalizePlannerTemplates = (templates: CustomExportTemplate[]): CustomExportTemplate[] => {
    const plannerTemplates = filterTemplatesByModule(templates, 'planners');
    if (plannerTemplates.length > 0) return plannerTemplates;

    return templates.filter((template) => template?.enabled !== false);
  };

  try {
    const settings = await settingsAPI.getOrganizationSettings(organizationId);
    const serverTemplates = Array.isArray(settings?.export_templates)
      ? (settings.export_templates as CustomExportTemplate[])
      : [];

    return normalizePlannerTemplates(mergeTemplates(serverTemplates, localTemplates));
  } catch {
    return normalizePlannerTemplates(localTemplates);
  }
}