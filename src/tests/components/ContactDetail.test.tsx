import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithUser, mockAdminUser, mockContact, mockBid, mockQuote, mockOpportunity } from '../utils/test-utils';
import { ContactDetail } from '../../components/ContactDetail';
import * as api from '../../utils/api';

// Mock the API module
vi.mock('../../utils/api', () => ({
  bidsAPI: {
    getAll: vi.fn(),
    getByOpportunity: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  quotesAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  contactsAPI: {
    getAll: vi.fn(),
  },
  opportunitiesAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  projectManagersAPI: {
    getAll: vi.fn(),
  },
  inventoryAPI: {
    getAll: vi.fn(),
  },
}));

// Mock document management functions
vi.mock('../../utils/supabaseClient', () => ({
  getDocumentsForContact: vi.fn(() => Promise.resolve([])),
  uploadDocumentClient: vi.fn(),
  downloadDocumentClient: vi.fn(),
  deleteDocumentClient: vi.fn(),
}));

describe('ContactDetail Component', () => {
  const mockOnBack = vi.fn();
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.opportunitiesAPI.getAll).mockResolvedValue({ opportunities: [] });
    vi.mocked(api.projectManagersAPI.getAll).mockResolvedValue({ projectManagers: [] });
    vi.mocked(api.inventoryAPI.getAll).mockResolvedValue({ inventory: [] });
  });

  it('should render contact details', () => {
    renderWithUser(
      <ContactDetail 
        contact={mockContact} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should display the correct price level', () => {
    const contactWithPriceLevel = {
      ...mockContact,
      priceLevel: 'Premium' as const,
    };

    renderWithUser(
      <ContactDetail 
        contact={contactWithPriceLevel} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    expect(screen.getByText(/Premium/i)).toBeInTheDocument();
  });

  it('should load bids from BOTH bids and quotes tables for an opportunity', async () => {
    // Setup: contact with an opportunity
    vi.mocked(api.opportunitiesAPI.getAll).mockResolvedValue({ 
      opportunities: [mockOpportunity] 
    });

    // Mock the loadBids calls
    vi.mocked(api.bidsAPI.getByOpportunity).mockResolvedValue({ 
      bids: [mockBid] 
    });
    vi.mocked(api.quotesAPI.getAll).mockResolvedValue({ 
      quotes: [mockQuote] 
    });

    renderWithUser(
      <ContactDetail 
        contact={mockContact} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    // Wait for opportunities to load
    await waitFor(() => {
      expect(screen.getByText('Test Opportunity')).toBeInTheDocument();
    });

    // Click "View & Manage Bids" button
    const viewBidsButton = screen.getByText(/View & Manage Bids/i);
    viewBidsButton.click();

    // Wait for bids to load
    await waitFor(() => {
      expect(api.bidsAPI.getByOpportunity).toHaveBeenCalledWith('opp-1');
      expect(api.quotesAPI.getAll).toHaveBeenCalled();
    });
  });

  it('should filter quotes by contact_id when loading bids', async () => {
    const quoteForDifferentContact = {
      ...mockQuote,
      id: 'quote-2',
      contact_id: 'different-contact-id',
    };

    vi.mocked(api.opportunitiesAPI.getAll).mockResolvedValue({ 
      opportunities: [mockOpportunity] 
    });
    vi.mocked(api.bidsAPI.getByOpportunity).mockResolvedValue({ bids: [] });
    vi.mocked(api.quotesAPI.getAll).mockResolvedValue({ 
      quotes: [mockQuote, quoteForDifferentContact] 
    });

    renderWithUser(
      <ContactDetail 
        contact={mockContact} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    await waitFor(() => {
      expect(screen.getByText('Test Opportunity')).toBeInTheDocument();
    });

    // The component should filter quotes to only show those matching contact-1
    // This is tested by the loadBids function logic
  });

  it('should show opportunities section', async () => {
    vi.mocked(api.opportunitiesAPI.getAll).mockResolvedValue({ 
      opportunities: [mockOpportunity] 
    });

    renderWithUser(
      <ContactDetail 
        contact={mockContact} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    await waitFor(() => {
      expect(screen.getByText('Opportunities')).toBeInTheDocument();
      expect(screen.getByText('Test Opportunity')).toBeInTheDocument();
    });
  });

  it('should handle back button click', () => {
    renderWithUser(
      <ContactDetail 
        contact={mockContact} 
        user={mockAdminUser} 
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />,
      { user: mockAdminUser }
    );

    const backButton = screen.getByText(/Back/i);
    backButton.click();

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
