import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, 
  Plus, 
  DollarSign, 
  MoreVertical, 
  Edit, 
  Trash2, 
  TrendingUp, 
  Calendar,
  FileText,
  Target,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ArrowRight,
  Receipt
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Alert, AlertDescription } from './ui/alert';
import { opportunitiesAPI, contactsAPI, bidsAPI } from '../utils/api';
import type { User } from '../App';
import { PermissionGate, PermissionButton } from './PermissionGate';
import { OpportunityDetail } from './OpportunityDetail';
import { OpportunityChat } from './OpportunityChat';
import { canAdd, canChange, canDelete } from '../utils/permissions';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  status: 'open' | 'in_progress' | 'won' | 'lost';
  value: number;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface Bid {
  id: string;
  opportunityId: string;
  title: string;
  bidAmount: number;
  submissionDate: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  taggedProjectManagers: string[];
  notes?: string;
}

interface OpportunitiesProps {
  user: User;
}

export function Opportunities({ user }: OpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  
  // ⚡ Performance: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [opportunityBids, setOpportunityBids] = useState<Bid[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerId: '',
    status: 'open' as 'open' | 'in_progress' | 'won' | 'lost',
    value: 0,
    expectedCloseDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [opportunitiesData, contactsData] = await Promise.all([
        opportunitiesAPI.getAll(),
        contactsAPI.getAll(),
      ]);
      
      setOpportunities(opportunitiesData.opportunities || []);
      setContacts(contactsData.contacts || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('error', 'Failed to load opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBidsForOpportunity = async (opportunityId: string) => {
    try {
      const { bids } = await bidsAPI.getByOpportunity(opportunityId);
      setOpportunityBids(bids || []);
    } catch (error) {
      console.error('Failed to load bids:', error);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // ⚡ Performance: Memoize filtered opportunities to avoid re-filtering on every render
  const filteredOpportunities = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return opportunities.filter(opp => {
      const matchesSearch = 
        opp.title.toLowerCase().includes(query) ||
        opp.customerName?.toLowerCase().includes(query) ||
        opp.description.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || opp.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [opportunities, searchQuery, statusFilter]);

  // ⚡ Performance: Paginate filtered opportunities - only render current page
  const paginatedOpportunities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOpportunities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOpportunities, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredOpportunities.length / itemsPerPage);

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const selectedContact = contacts.find(c => c.id === formData.customerId);
      const { opportunity } = await opportunitiesAPI.create({
        ...formData,
        customerName: selectedContact?.name || '',
      });
      
      setOpportunities([...opportunities, opportunity]);
      resetForm();
      setIsAddDialogOpen(false);
      showAlert('success', 'Opportunity created successfully');
    } catch (error: any) {
      console.error('Failed to create opportunity:', error);
      
      // Provide helpful error messages based on the error
      let errorMessage = 'Failed to create opportunity';
      if (error.message && error.message.includes('migration')) {
        errorMessage = 'Database migration required. Please run SIMPLE-OPPORTUNITIES-FIX.sql in Supabase SQL Editor.';
      } else if (error.message && error.message.includes('schema')) {
        errorMessage = 'Database schema error. Please check FIX-ERRORS-README.md for instructions.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert('error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpportunity) return;

    setIsSaving(true);

    try {
      const selectedContact = contacts.find(c => c.id === formData.customerId);
      const { opportunity } = await opportunitiesAPI.update(editingOpportunity.id, {
        ...formData,
        customerName: selectedContact?.name || editingOpportunity.customerName,
      });

      setOpportunities(opportunities.map(o => 
        o.id === editingOpportunity.id ? opportunity : o
      ));
      
      setIsEditDialogOpen(false);
      setEditingOpportunity(null);
      resetForm();
      showAlert('success', 'Opportunity updated successfully');
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      showAlert('error', 'Failed to update opportunity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity? All associated bids will also be deleted.')) return;

    try {
      await opportunitiesAPI.delete(id);
      setOpportunities(opportunities.filter(o => o.id !== id));
      showAlert('success', 'Opportunity deleted successfully');
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      showAlert('error', 'Failed to delete opportunity');
    }
  };

  const openEditDialog = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description,
      customerId: opportunity.customerId,
      status: opportunity.status,
      value: opportunity.value,
      expectedCloseDate: opportunity.expectedCloseDate,
    });
    setIsEditDialogOpen(true);
  };

  const openOpportunityDetails = async (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    await loadBidsForOpportunity(opportunity.id);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      customerId: '',
      status: 'open',
      value: 0,
      expectedCloseDate: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Open', variant: 'default' as const, icon: Target },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: Clock },
      won: { label: 'Won', variant: 'default' as const, icon: CheckCircle2 },
      lost: { label: 'Lost', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalValue = () => {
    return filteredOpportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
  };

  if (selectedOpportunity) {
    // Show opportunity chat/progress view with bids comparison
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => setSelectedOpportunity(null)}
          className="mb-4"
        >
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back to Opportunities
        </Button>
        <OpportunityChat
          opportunityId={selectedOpportunity.id}
          user={user}
          opportunity={{
            id: selectedOpportunity.id,
            title: selectedOpportunity.title,
            description: selectedOpportunity.description,
            customerName: selectedOpportunity.customerName,
            status: selectedOpportunity.status,
            value: selectedOpportunity.value,
            expectedCloseDate: selectedOpportunity.expectedCloseDate,
            createdAt: selectedOpportunity.createdAt
          }}
          onClose={() => setSelectedOpportunity(null)}
          onEdit={() => {
            setSelectedOpportunity(null);
            openEditDialog(selectedOpportunity);
          }}
        />
      </div>
    );
  }

  // Main opportunities list view
  return (
    <PermissionGate user={user} module="opportunities" action="view">
      <div className="p-6 space-y-6">
        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-gray-600 mt-1">Track and manage sales opportunities</p>
        </div>
        <PermissionGate user={user} module="opportunities" action="add">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
                <DialogDescription>
                  Track a new sales opportunity for a customer
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOpportunity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., New Office Construction Project"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the opportunity..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                    >
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} {contact.company ? `(${contact.company})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Value ($) *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.value || ''}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="closeDate">Expected Close Date *</Label>
                    <Input
                      id="closeDate"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Opportunity'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-semibold truncate">{formatCurrency(getTotalValue())}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold">
                  {opportunities.filter(o => o.status === 'open').length}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">
                  {opportunities.filter(o => o.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Won</p>
                <p className="text-2xl font-bold">
                  {opportunities.filter(o => o.status === 'won').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first opportunity'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paginatedOpportunities.map(opportunity => (
            <Card 
              key={opportunity.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openOpportunityDetails(opportunity)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Action Menu - Moved to Left */}
                  <PermissionGate user={user} module="opportunities" action="change">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking menu
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openOpportunityDetails(opportunity);
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          // Open the OpportunityDetail component which shows bids
                          setSelectedOpportunity(opportunity);
                        }}>
                          <Receipt className="h-4 w-4 mr-2" />
                          View &{'&'} Manage Bids
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(opportunity);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <PermissionGate user={user} module="opportunities" action="delete">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOpportunity(opportunity.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </PermissionGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGate>
                  
                  {/* Opportunity Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg hover:text-blue-600">
                        {opportunity.title}
                      </h3>
                      {getStatusBadge(opportunity.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{opportunity.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {opportunity.customerName}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(opportunity.value)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Close: {formatDate(opportunity.expectedCloseDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ⚡ Pagination Controls */}
      {filteredOpportunities.length > itemsPerPage && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOpportunities.length)} of {filteredOpportunities.length} opportunities
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
          </CardContent>
        </Card>
      )}

      {/* Edit Opportunity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>
              Update the opportunity information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateOpportunity} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-customer">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger id="edit-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.company ? `(${contact.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-value">Value ($) *</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-closeDate">Expected Close Date *</Label>
                <Input
                  id="edit-closeDate"
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </PermissionGate>
  );
}