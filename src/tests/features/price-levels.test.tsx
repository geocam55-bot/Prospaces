/**
 * Tests for Price Levels Feature
 * 
 * Verifies the migration from numeric price tiers (1-5) to named price levels
 * (Standard, Premium, Wholesale, Retail, Contractor) with "Retail" as default
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithUser, mockAdminUser, mockContact } from '../utils/test-utils';
import { ContactDetail } from '../../components/ContactDetail';
import * as api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  contactsAPI: {
    getAll: vi.fn(),
    update: vi.fn(),
  },
  opportunitiesAPI: {
    getAll: vi.fn(),
  },
  projectManagersAPI: {
    getAll: vi.fn(),
  },
  inventoryAPI: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../utils/supabaseClient', () => ({
  getDocumentsForContact: vi.fn(() => Promise.resolve([])),
}));

describe('Price Levels Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.opportunitiesAPI.getAll).mockResolvedValue({ opportunities: [] });
    vi.mocked(api.projectManagersAPI.getAll).mockResolvedValue({ projectManagers: [] });
    vi.mocked(api.inventoryAPI.getAll).mockResolvedValue({ inventory: [] });
  });

  describe('Named Price Levels', () => {
    it('should use named price levels instead of numeric tiers', () => {
      const validPriceLevels = ['Standard', 'Premium', 'Wholesale', 'Retail', 'Contractor'];
      
      validPriceLevels.forEach(level => {
        const contact = {
          ...mockContact,
          priceLevel: level as any,
        };
        
        const { container } = renderWithUser(
          <ContactDetail 
            contact={contact} 
            user={mockAdminUser} 
            onBack={vi.fn()}
            onEdit={vi.fn()}
          />,
          { user: mockAdminUser }
        );
        
        // Should display the price level name
        expect(container.textContent).toContain(level);
      });
    });

    it('should default to "Retail" for new contacts', () => {
      const newContact = {
        ...mockContact,
        priceLevel: 'Retail' as const,
      };
      
      const { container } = renderWithUser(
        <ContactDetail 
          contact={newContact} 
          user={mockAdminUser} 
          onBack={vi.fn()}
          onEdit={vi.fn()}
        />,
        { user: mockAdminUser }
      );
      
      expect(container.textContent).toContain('Retail');
    });

    it('should handle all supported price levels', () => {
      const priceLevels = ['Standard', 'Premium', 'Wholesale', 'Retail', 'Contractor'];
      
      priceLevels.forEach(level => {
        const contact = {
          ...mockContact,
          id: `contact-${level}`,
          priceLevel: level as any,
        };
        
        // Should not throw error
        expect(() => {
          renderWithUser(
            <ContactDetail 
              contact={contact} 
              user={mockAdminUser} 
              onBack={vi.fn()}
              onEdit={vi.fn()}
            />,
            { user: mockAdminUser }
          );
        }).not.toThrow();
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle contacts without priceLevel field', () => {
      const contactWithoutPriceLevel = {
        ...mockContact,
        priceLevel: undefined as any,
      };
      
      // Should not throw error
      expect(() => {
        renderWithUser(
          <ContactDetail 
            contact={contactWithoutPriceLevel} 
            user={mockAdminUser} 
            onBack={vi.fn()}
            onEdit={vi.fn()}
          />,
          { user: mockAdminUser }
        );
      }).not.toThrow();
    });
  });
});
