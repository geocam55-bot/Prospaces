import { Filter, Plus, Search, Users, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface CustomerModuleHelpProps {
  userId: string;
  totalContacts: number;
  onSearchExample: (query: string) => void;
  onFilterByStatus: (status: 'Active' | 'Prospect' | 'Inactive') => void;
  onClearFilters: () => void;
  onOpenAddContact: () => void;
}

export function CustomerModuleHelp({
  userId,
  totalContacts,
  onSearchExample,
  onFilterByStatus,
  onClearFilters,
  onOpenAddContact,
}: CustomerModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="customer-help"
      userId={userId}
      title="Customer Module Interactive Help"
      description="Learn the workflow and run quick actions directly from this guide."
      moduleIcon={Users}
      triggerLabel="Customer Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Use search and status filters to confirm the right customer record before planning and pricing work begins.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Maintain complete customer context (owner, price level, tags, notes) so estimate assumptions stay accurate.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Open customer details to finalize updates, align stakeholders, and support downstream project handoff.',
        },
      ]}
      badges={[
        { label: 'Current Customers', value: totalContacts },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Search Example',
          icon: Search,
          variant: 'outline',
          onClick: () => onSearchExample('show active customers'),
        },
        {
          label: 'Show Active Customers',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('Active'),
        },
        {
          label: 'Show Prospects',
          icon: Filter,
          variant: 'outline',
          onClick: () => onFilterByStatus('Prospect'),
        },
        {
          label: 'Clear Search and Filters',
          icon: X,
          variant: 'outline',
          onClick: onClearFilters,
        },
        {
          label: 'Open Add Contact Form',
          icon: Plus,
          fullWidth: true,
          onClick: onOpenAddContact,
        },
      ]}
      howToGuides={[
        {
          title: 'How to add a new customer',
          steps: [
            'Discovery: Open Contacts and click Add Contact.',
            'Scope Lock: Enter required details (Name, Email, Phone, Company).',
            'Scope Lock: Set Status and Price Level for your workflow.',
            'Estimate: Add optional context such as Address, Notes, Tags, and sales metrics.',
            'Approval: Click Add Contact to save the new record.',
            'Handoff: Reopen/search the contact and verify details before team use.',
          ],
        },
        {
          title: 'How to edit an existing customer',
          steps: [
            'Discovery: Search for the customer and open the row menu.',
            'Scope Lock: Open Edit from row actions or customer detail view.',
            'Estimate: Update fields such as status, price level, tags, notes, or contact details.',
            'Approval: Click Save Changes to apply updates.',
            'Handoff: Reopen the detail view and confirm the latest values are visible.',
          ],
        },
      ]}
    />
  );
}
