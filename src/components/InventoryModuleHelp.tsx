import { Filter, Package, Plus, Search, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface InventoryModuleHelpProps {
  userId: string;
  totalItems: number;
  lowStockItems: number;
  onSearchExample: (query: string) => void;
  onFilterByStatus: (status: 'active' | 'inactive' | 'discontinued') => void;
  onShowOutOfStock: () => void;
  onClearFilters: () => void;
  onOpenAddItem: () => void;
}

export function InventoryModuleHelp({
  userId,
  totalItems,
  lowStockItems,
  onSearchExample,
  onFilterByStatus,
  onShowOutOfStock,
  onClearFilters,
  onOpenAddItem,
}: InventoryModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="inventory-help"
      userId={userId}
      title="Inventory Module Interactive Help"
      description="Manage stock faster with guided steps and one-click inventory actions."
      moduleIcon={Package}
      triggerLabel="Inventory Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Use search and filters to identify the right item set before stock or pricing updates are made.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Monitor out-of-stock risk and validate quantity/cost assumptions so purchasing and estimating stay aligned.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Save validated updates and hand off reliable inventory data to quoting, procurement, and operations.',
        },
      ]}
      badges={[
        { label: 'Items In View', value: totalItems },
        { label: 'Out of Stock', value: lowStockItems, variant: 'outline' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Search Example',
          icon: Search,
          variant: 'outline',
          onClick: () => onSearchExample('tools under $50'),
        },
        {
          label: 'Show Active Items',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('active'),
        },
        {
          label: 'Show Inactive Items',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('inactive'),
        },
        {
          label: 'Show Out of Stock Items',
          icon: Filter,
          variant: 'outline',
          onClick: onShowOutOfStock,
        },
        {
          label: 'Clear Search and Filters',
          icon: X,
          variant: 'outline',
          onClick: onClearFilters,
          fullWidth: true,
        },
        {
          label: 'Open Add Item Form',
          icon: Plus,
          onClick: onOpenAddItem,
          fullWidth: true,
        },
      ]}
      howToGuides={[
        {
          title: 'How to add a new inventory item',
          steps: [
            'Discovery: Open Inventory and click Add Item.',
            'Scope Lock: Enter required fields such as Name, SKU, Category, and Unit.',
            'Estimate: Set quantity, cost, and pricing tiers.',
            'Estimate: Add optional details (supplier, barcode, location, image, notes).',
            'Approval/Handoff: Save and verify the new item appears for downstream teams.',
          ],
        },
        {
          title: 'How to update stock on an existing item',
          steps: [
            'Discovery: Search by name or SKU to locate the item.',
            'Scope Lock: Open Edit and confirm the target item/context.',
            'Estimate: Adjust on-hand/on-order quantities and pricing fields.',
            'Approval: Review status/category and save the update.',
            'Handoff: Confirm updated values in list/card view for team consumption.',
          ],
        },
      ]}
    />
  );
}