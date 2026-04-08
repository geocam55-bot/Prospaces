// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithUser } from '../utils/test-utils';
import { Tenants } from '../../components/Tenants';
import * as api from '../../utils/api';

const mockProfiles = [
  {
    id: 'user-1',
    email: 'owner@acme.com',
    name: 'Acme Owner',
    role: 'admin',
    status: 'active',
    billing_plan: 'starter',
    updated_at: '2026-04-01T12:00:00Z',
  },
];

vi.mock('../../utils/api', () => ({
  tenantsAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  subscriptionAgreementAPI: {
    get: vi.fn().mockResolvedValue({ agreement: null }),
    save: vi.fn().mockResolvedValue({ success: true }),
  },
  settingsAPI: {
    getOrganizationSettings: vi.fn().mockResolvedValue({ tax_rate: 0, tax_rate_2: 0 }),
  },
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      }),
    }),
  }),
}));

vi.mock('../../components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: any }) => children,
}));

vi.mock('../../utils/permissions', () => ({
  canView: vi.fn(() => true),
  canAdd: vi.fn(() => true),
  canChange: vi.fn(() => true),
  canDelete: vi.fn(() => true),
}));

vi.mock('../../utils/settings-client', () => ({
  getOrgMode: vi.fn().mockResolvedValue({ user_mode: 'multi' }),
  setOrgMode: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: any }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: any }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: any }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: { children: any; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const superAdminUser = {
  id: 'super-admin-1',
  email: 'superadmin@prospaces.com',
  role: 'super_admin',
  organizationId: 'root-org',
  organization_id: 'root-org',
} as any;

describe('Tenants organization billing flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('currentOrgId', 'root-org');
  });

  it('keeps the selected organization agreement visible and prefilled from Billing for super admins', async () => {
    vi.mocked(api.tenantsAPI.getAll).mockResolvedValue({
      tenants: [
        {
          id: 'org-1',
          name: 'Acme Corp',
          status: 'active',
          plan: 'starter',
          userCount: 1,
          contactsCount: 4,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
          features: ['Core CRM'],
          billingEmail: 'billing@acme.com',
          address: '123 Main St',
          ai_suggestions_enabled: true,
          marketing_enabled: true,
          inventory_enabled: true,
          import_export_enabled: true,
          documents_enabled: true,
        },
      ],
    });

    renderWithUser(<Tenants user={superAdminUser} />, { user: superAdminUser });

    await screen.findAllByText('Acme Corp');

    expect(await screen.findByText('View Agreement')).toBeTruthy();

    fireEvent.click(await screen.findByText('View Billing'));

    await screen.findByText('Billing Breakdown');
    await waitFor(() => {
      expect(screen.getByText('SOFTWARE SUBSCRIPTION AGREEMENT')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('Acme Corp')).toBeTruthy();
    expect(screen.getByDisplayValue('billing@acme.com')).toBeTruthy();
    expect(screen.getByDisplayValue('123 Main St')).toBeTruthy();
  });
});
