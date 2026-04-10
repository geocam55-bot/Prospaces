import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectQuoteGenerator } from './ProjectQuoteGenerator';

const getAllMock = vi.fn();
const getOrganizationSettingsMock = vi.fn();

vi.mock('../utils/api', () => ({
  contactsAPI: {
    getAll: (...args: any[]) => getAllMock(...args),
  },
  quotesAPI: {
    create: vi.fn(),
  },
  settingsAPI: {
    getOrganizationSettings: (...args: any[]) => getOrganizationSettingsMock(...args),
  },
}));

describe('ProjectQuoteGenerator', () => {
  beforeEach(() => {
    getAllMock.mockReset();
    getOrganizationSettingsMock.mockReset();
    getOrganizationSettingsMock.mockResolvedValue({ tax_rate: 0, tax_rate_2: 0 });
  });

  it('lets planner users find CRM contacts when creating a quote', async () => {
    getAllMock.mockResolvedValue({
      contacts: [
        {
          id: 'contact-1',
          name: 'George Campbell',
          email: 'george@example.com',
          company: 'Campbell Projects',
          priceLevel: 'VIP A',
        },
      ],
    });

    render(
      <ProjectQuoteGenerator
        user={{
          id: 'user-1',
          full_name: 'Designer One',
          email: 'designer@example.com',
          role: 'designer',
          organizationId: 'org-123',
        }}
        projectType="deck"
        materials={[]}
        totalCost={1000}
        projectData={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /create quote for contact/i }));

    const input = await screen.findByPlaceholderText('Search customers by name, email, or company...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('George Campbell')).toBeInTheDocument();
    });
  });
});
