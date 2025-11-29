import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Search, Plus, Mail, Phone, Building, MoreVertical, Edit, Trash2, Loader2, Calendar, DollarSign, ArrowLeft, UserPlus, MapPin, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { contactsAPI, projectManagersAPI } from '../utils/api';
import type { User } from '../App';
import { PermissionGate, PermissionButton } from './PermissionGate';
import { canAdd, canChange, canDelete } from '../utils/permissions';
import { ContactDetail } from './ContactDetail';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  ownerId: string;
  createdAt: string;
  priceLevel: 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard';
  legacyNumber?: string;
  accountOwnerNumber?: string;
  ptdSales?: number;
  ptdGpPercent?: number;
  ytdSales?: number;
  ytdGpPercent?: number;
  lyrSales?: number;
  lyrGpPercent?: number;
  address?: string;
  notes?: string;
}

interface ProjectManager {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  mailingAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactsProps {
  user: User;
}

export function Contacts({ user }: ContactsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [showMyContactsOnly, setShowMyContactsOnly] = useState(false); // Filter toggle
  const [isAssigningOwner, setIsAssigningOwner] = useState(false); // Bulk update state
  
  // ⚡ Performance: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'Prospect',
    priceLevel: 'Retail' as 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard',
    legacyNumber: '',
    accountOwnerNumber: user.email || '', // Default to logged in user's email
    address: '',
    notes: '',
    ptdSales: '',
    ptdGpPercent: '',
    ytdSales: '',
    ytdGpPercent: '',
    lyrSales: '',
    lyrGpPercent: ''
  });
  
  // Project Manager state
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [isAddPMDialogOpen, setIsAddPMDialogOpen] = useState(false);
  const [isEditPMDialogOpen, setIsEditPMDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<ProjectManager | null>(null);
  const [newPM, setNewPM] = useState({
    name: '',
    email: '',
    phone: '',
    mailingAddress: ''
  });

  useEffect(() => {
    loadContacts();
  }, [showMyContactsOnly]); // Reload when filter changes

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      // If showMyContactsOnly is true, filter by logged-in user's email
      const filterValue = showMyContactsOnly ? user.email : undefined;
      const { contacts: loadedContacts } = await contactsAPI.getAll(filterValue);
      setContacts(loadedContacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ⚡ Performance: Memoize filtered contacts to avoid re-filtering on every render
  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      contact.company.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // ⚡ Performance: Paginate filtered contacts - only render current page
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const contactData = {
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        company: newContact.company,
        status: newContact.status,
        priceLevel: newContact.priceLevel,
        legacyNumber: newContact.legacyNumber,
        accountOwnerNumber: newContact.accountOwnerNumber,
        address: newContact.address,
        notes: newContact.notes,
        ptdSales: newContact.ptdSales ? parseFloat(newContact.ptdSales) : undefined,
        ptdGpPercent: newContact.ptdGpPercent ? parseFloat(newContact.ptdGpPercent) : undefined,
        ytdSales: newContact.ytdSales ? parseFloat(newContact.ytdSales) : undefined,
        ytdGpPercent: newContact.ytdGpPercent ? parseFloat(newContact.ytdGpPercent) : undefined,
        lyrSales: newContact.lyrSales ? parseFloat(newContact.lyrSales) : undefined,
        lyrGpPercent: newContact.lyrGpPercent ? parseFloat(newContact.lyrGpPercent) : undefined
      };
      
      console.log('Submitting contact data:', contactData); // Debug log
      
      const { contact } = await contactsAPI.create(contactData);
      setContacts([...contacts, contact]);
      setNewContact({ name: '', email: '', phone: '', company: '', status: 'Prospect', priceLevel: 'Retail', legacyNumber: '', accountOwnerNumber: user.email || '', address: '', notes: '', ptdSales: '', ptdGpPercent: '', ytdSales: '', ytdGpPercent: '', lyrSales: '', lyrGpPercent: '' });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to create contact:', error);
      const errorMessage = error?.message || 'Failed to create contact. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await contactsAPI.delete(id);
      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setIsSaving(true);

    try {
      const { contact } = await contactsAPI.update(editingContact.id, {
        name: editingContact.name,
        email: editingContact.email,
        phone: editingContact.phone,
        company: editingContact.company,
        status: editingContact.status,
        priceLevel: editingContact.priceLevel,
        legacyNumber: editingContact.legacyNumber,
        accountOwnerNumber: editingContact.accountOwnerNumber,
        address: editingContact.address,
        notes: editingContact.notes,
        ptdSales: editingContact.ptdSales,
        ptdGpPercent: editingContact.ptdGpPercent,
        ytdSales: editingContact.ytdSales,
        ytdGpPercent: editingContact.ytdGpPercent,
        lyrSales: editingContact.lyrSales,
        lyrGpPercent: editingContact.lyrGpPercent
      });
      setContacts(contacts.map(c => (c.id === contact.id ? contact : c)));
      // Update the selected contact if we're viewing its detail page
      if (selectedContact && selectedContact.id === contact.id) {
        setSelectedContact(contact);
      }
      setEditingContact(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update contact:', error);
      alert('Failed to update contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.create({
        ...newPM,
        customerId: selectedContact?.id || '',
      });
      setProjectManagers([...projectManagers, projectManager]);
      setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
      setIsAddPMDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project manager:', error);
      alert('Failed to create project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProjectManager = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project manager?')) return;

    try {
      await projectManagersAPI.delete(id);
      setProjectManagers(projectManagers.filter(pm => pm.id !== id));
    } catch (error) {
      console.error('Failed to delete project manager:', error);
      alert('Failed to delete project manager. Please try again.');
    }
  };

  const handleEditProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPM) return;
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.update(editingPM.id, {
        name: editingPM.name,
        email: editingPM.email,
        phone: editingPM.phone,
        mailingAddress: editingPM.mailingAddress,
      });
      setProjectManagers(projectManagers.map(pm => (pm.id === projectManager.id ? projectManager : pm)));
      setEditingPM(null);
      setIsEditPMDialogOpen(false);
    } catch (error) {
      console.error('Failed to update project manager:', error);
      alert('Failed to update project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClaimUnassignedContacts = async () => {
    setIsAssigningOwner(true);

    try {
      const { contacts: updatedContacts } = await contactsAPI.claimUnassigned(user.email);
      setContacts(updatedContacts);
    } catch (error) {
      console.error('Failed to claim unassigned contacts:', error);
      alert('Failed to claim unassigned contacts. Please try again.');
    } finally {
      setIsAssigningOwner(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show contact detail view if a contact is selected
  if (selectedContact) {
    return (
      <>
        <ContactDetail
          contact={selectedContact}
          user={user}
          onBack={() => setSelectedContact(null)}
          onEdit={(contact) => {
            setEditingContact(contact);
            setIsEditDialogOpen(true);
          }}
        />
        
        {/* Edit Contact Dialog - Available from Detail View */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>
                Update the contact's information and settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditContact} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingContact?.name || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, name: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingContact?.email || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, email: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editingContact?.phone || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, phone: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={editingContact?.company || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, company: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editingContact?.status || 'Prospect'}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, status: e.target.value } : null)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Prospect">Prospect</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priceLevel">Price Level</Label>
                <select
                  id="edit-priceLevel"
                  value={editingContact?.priceLevel || 'Retail'}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, priceLevel: e.target.value as 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard' } : null)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Premium">Premium</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-legacyNumber">Legacy #</Label>
                <Input
                  id="edit-legacyNumber"
                  value={editingContact?.legacyNumber || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, legacyNumber: e.target.value } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-accountOwnerNumber">Account Owner #</Label>
                <Input
                  id="edit-accountOwnerNumber"
                  value={editingContact?.accountOwnerNumber || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, accountOwnerNumber: e.target.value } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingContact?.address || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, address: e.target.value } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingContact?.notes || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, notes: e.target.value } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ptdSales">PTD Sales</Label>
                <Input
                  id="edit-ptdSales"
                  type="number"
                  step="0.01"
                  value={editingContact?.ptdSales || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ptdGpPercent">PTD GP%</Label>
                <Input
                  id="edit-ptdGpPercent"
                  type="number"
                  step="0.01"
                  value={editingContact?.ptdGpPercent || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ytdSales">YTD Sales</Label>
                <Input
                  id="edit-ytdSales"
                  type="number"
                  step="0.01"
                  value={editingContact?.ytdSales || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ytdGpPercent">YTD GP%</Label>
                <Input
                  id="edit-ytdGpPercent"
                  type="number"
                  step="0.01"
                  value={editingContact?.ytdGpPercent || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lyrSales">LYR Sales</Label>
                <Input
                  id="edit-lyrSales"
                  type="number"
                  step="0.01"
                  value={editingContact?.lyrSales || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lyrGpPercent">LYR GP%</Label>
                <Input
                  id="edit-lyrGpPercent"
                  type="number"
                  step="0.01"
                  value={editingContact?.lyrGpPercent || ''}
                  onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditingContact(null);
                    setIsEditDialogOpen(false);
                  }} 
                  className="flex-1" 
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <PermissionGate user={user} module="contacts" action="view">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-1">Manage your customer relationships</p>
          </div>
          {canAdd('contacts', user.role) && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Create a new contact with their information and assigned price level.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddContact} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceLevel">Price Level</Label>
                    <select
                      id="priceLevel"
                      value={newContact.priceLevel}
                      onChange={(e) => setNewContact({ ...newContact, priceLevel: e.target.value as 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard' })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Premium">Premium</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legacyNumber">Legacy #</Label>
                    <Input
                      id="legacyNumber"
                      value={newContact.legacyNumber}
                      onChange={(e) => setNewContact({ ...newContact, legacyNumber: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountOwnerNumber">Account Owner #</Label>
                    <Input
                      id="accountOwnerNumber"
                      value={newContact.accountOwnerNumber}
                      onChange={(e) => setNewContact({ ...newContact, accountOwnerNumber: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newContact.address}
                      onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newContact.notes}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ptdSales">PTD Sales</Label>
                    <Input
                      id="ptdSales"
                      type="number"
                      step="0.01"
                      value={newContact.ptdSales}
                      onChange={(e) => setNewContact({ ...newContact, ptdSales: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ptdGpPercent">PTD GP%</Label>
                    <Input
                      id="ptdGpPercent"
                      type="number"
                      step="0.01"
                      value={newContact.ptdGpPercent}
                      onChange={(e) => setNewContact({ ...newContact, ptdGpPercent: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ytdSales">YTD Sales</Label>
                    <Input
                      id="ytdSales"
                      type="number"
                      step="0.01"
                      value={newContact.ytdSales}
                      onChange={(e) => setNewContact({ ...newContact, ytdSales: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ytdGpPercent">YTD GP%</Label>
                    <Input
                      id="ytdGpPercent"
                      type="number"
                      step="0.01"
                      value={newContact.ytdGpPercent}
                      onChange={(e) => setNewContact({ ...newContact, ytdGpPercent: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lyrSales">LYR Sales</Label>
                    <Input
                      id="lyrSales"
                      type="number"
                      step="0.01"
                      value={newContact.lyrSales}
                      onChange={(e) => setNewContact({ ...newContact, lyrSales: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lyrGpPercent">LYR GP%</Label>
                    <Input
                      id="lyrGpPercent"
                      type="number"
                      step="0.01"
                      value={newContact.lyrGpPercent}
                      onChange={(e) => setNewContact({ ...newContact, lyrGpPercent: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1" disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSaving}>
                      {isSaving ? 'Adding...' : 'Add Contact'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showMyContactsOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMyContactsOnly(!showMyContactsOnly)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showMyContactsOnly ? 'My Contacts' : 'All Contacts'}
                </Button>
                {showMyContactsOnly && (
                  <span className="text-sm text-gray-600">
                    Showing contacts assigned to: <span className="font-medium">{user.email}</span>
                  </span>
                )}
                {!showMyContactsOnly && canChange('contacts', user.role) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClaimUnassignedContacts}
                      disabled={isAssigningOwner}
                      className="flex items-center gap-2"
                    >
                      {isAssigningOwner ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {isAssigningOwner ? 'Assigning...' : 'Claim Unassigned Contacts'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Phone</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Company</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Account Owner</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Price Level</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((contact) => (
                    <tr 
                      key={contact.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {canChange('contacts', user.role) && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setSelectedContact(contact)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details & Project Managers
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingContact(contact);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete('contacts', user.role) && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteContact(contact.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            {contact.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900">{contact.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          {contact.company}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {contact.accountOwnerNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          contact.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                          {contact.priceLevel ? contact.priceLevel.replace('tier', 'Tier ') : 'Tier 1'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredContacts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        No contacts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* ⚡ Pagination Controls */}
            {filteredContacts.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show first page, last page, current page, and pages around current
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the contact's information and settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingContact?.name || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editingContact?.email || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, email: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editingContact?.phone || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, phone: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editingContact?.company || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, company: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={editingContact?.status || 'Prospect'}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, status: e.target.value } : null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Prospect">Prospect</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priceLevel">Price Level</Label>
              <select
                id="edit-priceLevel"
                value={editingContact?.priceLevel || 'Retail'}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, priceLevel: e.target.value as 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard' } : null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Contractor">Contractor</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-legacyNumber">Legacy #</Label>
              <Input
                id="edit-legacyNumber"
                value={editingContact?.legacyNumber || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, legacyNumber: e.target.value } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accountOwnerNumber">Account Owner #</Label>
              <Input
                id="edit-accountOwnerNumber"
                value={editingContact?.accountOwnerNumber || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, accountOwnerNumber: e.target.value } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editingContact?.address || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, address: e.target.value } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editingContact?.notes || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, notes: e.target.value } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ptdSales">PTD Sales</Label>
              <Input
                id="edit-ptdSales"
                type="number"
                step="0.01"
                value={editingContact?.ptdSales || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ptdGpPercent">PTD GP%</Label>
              <Input
                id="edit-ptdGpPercent"
                type="number"
                step="0.01"
                value={editingContact?.ptdGpPercent || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ytdSales">YTD Sales</Label>
              <Input
                id="edit-ytdSales"
                type="number"
                step="0.01"
                value={editingContact?.ytdSales || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ytdGpPercent">YTD GP%</Label>
              <Input
                id="edit-ytdGpPercent"
                type="number"
                step="0.01"
                value={editingContact?.ytdGpPercent || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lyrSales">LYR Sales</Label>
              <Input
                id="edit-lyrSales"
                type="number"
                step="0.01"
                value={editingContact?.lyrSales || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lyrGpPercent">LYR GP%</Label>
              <Input
                id="edit-lyrGpPercent"
                type="number"
                step="0.01"
                value={editingContact?.lyrGpPercent || ''}
                onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingContact(null);
                  setIsEditDialogOpen(false);
                }} 
                className="flex-1" 
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Project Manager Dialog */}
      <Dialog open={isAddPMDialogOpen} onOpenChange={setIsAddPMDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Project Manager</DialogTitle>
            <DialogDescription>
              Add a new project manager for the selected contact.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pm-name">Name</Label>
              <Input
                id="pm-name"
                value={newPM.name}
                onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-email">Email</Label>
              <Input
                id="pm-email"
                type="email"
                value={newPM.email}
                onChange={(e) => setNewPM({ ...newPM, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-phone">Phone</Label>
              <Input
                id="pm-phone"
                value={newPM.phone}
                onChange={(e) => setNewPM({ ...newPM, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-mailingAddress">Mailing Address</Label>
              <Textarea
                id="pm-mailingAddress"
                value={newPM.mailingAddress}
                onChange={(e) => setNewPM({ ...newPM, mailingAddress: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddPMDialogOpen(false)} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Project Manager'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Manager Dialog */}
      <Dialog open={isEditPMDialogOpen} onOpenChange={setIsEditPMDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project Manager</DialogTitle>
            <DialogDescription>
              Update the project manager's information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pm-name">Name</Label>
              <Input
                id="edit-pm-name"
                value={editingPM?.name || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-email">Email</Label>
              <Input
                id="edit-pm-email"
                type="email"
                value={editingPM?.email || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, email: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-phone">Phone</Label>
              <Input
                id="edit-pm-phone"
                value={editingPM?.phone || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, phone: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-mailingAddress">Mailing Address</Label>
              <Textarea
                id="edit-pm-mailingAddress"
                value={editingPM?.mailingAddress || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, mailingAddress: e.target.value } : null)}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingPM(null);
                  setIsEditPMDialogOpen(false);
                }} 
                className="flex-1" 
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}