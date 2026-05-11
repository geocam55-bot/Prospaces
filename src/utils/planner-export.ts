import {
  buildCsv,
  buildCustomText,
  buildXml,
  downloadTextFile,
  sanitizeFilename,
  type CustomExportTemplate,
} from './export-engine';

export interface PlannerSavedDesignLike {
  name: string;
  description?: string | null;
  total_cost?: number;
  materials?: any[];
  created_at?: string;
}

export function buildPlannerExportRows(design: PlannerSavedDesignLike, projectType: string): Record<string, unknown>[] {
  const designMeta = {
    project_type: projectType,
    design_name: design.name,
    description: design.description || '',
    total_cost: design.total_cost ?? 0,
    saved_at: design.created_at || '',
    material_count: Array.isArray(design.materials) ? design.materials.length : 0,
  };

  if (!Array.isArray(design.materials) || design.materials.length === 0) {
    return [
      {
        ...designMeta,
        material_name: '',
        sku: '',
        category: '',
        quantity: '',
        unit_price: '',
        line_total: '',
      },
    ];
  }

  return design.materials.map((item: any) => {
    const quantity = item.quantity ?? item.qty ?? '';
    const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? '';
    const lineTotal =
      item.total ?? item.line_total ?? (Number(quantity || 0) * Number(unitPrice || 0));

    return {
      ...designMeta,
      material_name: item.name || item.material || item.description || '',
      sku: item.sku || '',
      category: item.category || '',
      quantity,
      unit_price: unitPrice,
      line_total: Number.isFinite(lineTotal) ? lineTotal : '',
    };
  });
}

export function exportPlannerDesign(
  design: PlannerSavedDesignLike,
  projectType: string,
  format: 'csv' | 'xml' | 'custom',
  templates: CustomExportTemplate[],
  customTemplateId?: string
): { ok: boolean; error?: string } {
  const rows = buildPlannerExportRows(design, projectType);
  const safeName = sanitizeFilename(design.name || `${projectType}-design`);
  const datePart = new Date().toISOString().split('T')[0];

  if (format === 'xml') {
    const xmlContent = buildXml(rows, `${projectType}_designs`, 'design_row');
    downloadTextFile(xmlContent, `${safeName}_${datePart}.xml`, 'application/xml;charset=utf-8;');
    return { ok: true };
  }

  if (format === 'custom') {
    const template = templates.find((item) => item.id === customTemplateId);
    if (!template) {
      return { ok: false, error: 'Choose a custom export template before exporting.' };
    }

    const content = buildCustomText(rows, template);
    const extension = (template.file_extension || 'txt').replace(/^\./, '');
    const templateName = sanitizeFilename(template.name || 'custom');
    downloadTextFile(
      content,
      `${safeName}_${templateName}_${datePart}.${extension}`,
      'text/plain;charset=utf-8;'
    );
    return { ok: true };
  }

  const csvContent = buildCsv(rows);
  downloadTextFile(csvContent, `${safeName}_${datePart}.csv`, 'text/csv;charset=utf-8;');
  return { ok: true };
}
