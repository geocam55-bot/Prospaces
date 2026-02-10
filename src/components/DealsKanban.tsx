import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, DollarSign, User, MoreVertical, Eye, FileText, AlertCircle, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

// Duplicate interface to avoid circular dependency
export interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  discount: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  priceTier: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'completed';
  validUntil: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxPercent2?: number;
  taxAmount: number;
  taxAmount2?: number;
  total: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  readAt?: string;
}

interface DealsKanbanProps {
  quotes: Quote[];
  onStatusChange: (quote: Quote, newStatus: Quote['status']) => void;
  onEdit: (quote: Quote) => void;
  onPreview: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onEmail: (quote: Quote) => void;
}

const ItemTypes = {
  DEAL: 'deal',
};

interface DragItem {
  id: string;
  type: string;
  status: string;
}

const DealCard = ({ 
  quote, 
  onEdit, 
  onPreview, 
  onDelete,
  onEmail
}: { 
  quote: Quote; 
  onEdit: (q: Quote) => void; 
  onPreview: (q: Quote) => void; 
  onDelete: (id: string) => void;
  onEmail: (q: Quote) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DEAL,
    item: { id: quote.id, type: ItemTypes.DEAL, status: quote.status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [quote.id, quote.status]);

  const isViewed = quote.status === 'sent' && quote.readAt;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div
      ref={drag}
      className={`mb-2 touch-none ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-l-4" 
        style={{ 
          borderLeftColor: 
            quote.status === 'accepted' ? '#22c55e' : 
            quote.status === 'completed' ? '#14b8a6' :
            quote.status === 'rejected' ? '#ef4444' : 
            quote.status === 'viewed' ? '#6366f1' :
            quote.status === 'sent' ? (isViewed ? '#6366f1' : '#3b82f6') : 
            quote.status === 'expired' ? '#f97316' : 
            '#9ca3af' 
        }}
      >
        <CardContent className="p-2 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 leading-tight">
              {quote.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => onEdit(quote)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPreview(quote)}>
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEmail(quote)}>
                  <Send className="h-3 w-3 mr-2" />
                  {quote.status === 'sent' ? 'Resend' : 'Send Quote'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(quote.id)} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-mono">{quote.quoteNumber}</span>
            <div className="flex items-center gap-1 font-medium text-gray-900">
              <DollarSign className="h-3 w-3 text-gray-400" />
              {formatCurrency(quote.total)}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <User className="h-3 w-3 text-gray-400" />
            <span className="truncate max-w-[140px]">{quote.contactName || 'No Contact'}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar className="h-3 w-3" />
              {new Date(quote.createdAt).toLocaleDateString()}
            </div>
            {isViewed && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0 flex gap-1">
                <Eye className="h-2.5 w-2.5" /> Viewed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KanbanColumn = ({ 
  title, 
  status, 
  quotes, 
  onDrop, 
  onEdit, 
  onPreview, 
  onDelete,
  onEmail
}: { 
  title: string; 
  status: string; 
  quotes: Quote[]; 
  onDrop: (item: DragItem, newStatus: string) => void;
  onEdit: (q: Quote) => void;
  onPreview: (q: Quote) => void;
  onDelete: (id: string) => void;
  onEmail: (q: Quote) => void;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.DEAL,
    drop: (item: DragItem) => onDrop(item, status),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDrop, status]);

  const totalValue = quotes.reduce((sum, q) => sum + q.total, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'accepted': return 'bg-green-50 border-green-200 text-green-700';
      case 'completed': return 'bg-teal-50 border-teal-200 text-teal-700';
      case 'rejected': return 'bg-red-50 border-red-200 text-red-700';
      case 'sent': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'expired': return 'bg-orange-50 border-orange-200 text-orange-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div 
      ref={drop}
      className={`flex-shrink-0 w-64 md:w-72 flex flex-col h-full rounded-lg transition-colors ${
        isOver ? 'bg-slate-200 ring-2 ring-blue-400 ring-inset' : 'bg-slate-100'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3 border-b-2 rounded-t-lg flex flex-col gap-1 sticky top-0 bg-inherit z-10 ${getStatusColor(status).replace('bg-', 'border-').split(' ')[2]}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <Badge variant="secondary" className="text-xs bg-white text-gray-700">{quotes.length}</Badge>
        </div>
        <div className="text-xs font-medium opacity-80">
          {formatCurrency(totalValue)}
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2 flex-1 overflow-y-auto min-h-[100px] scrollbar-thin scrollbar-thumb-gray-200">
        {quotes.map(quote => (
          <DealCard 
            key={quote.id} 
            quote={quote} 
            onEdit={onEdit} 
            onPreview={onPreview} 
            onDelete={onDelete}
            onEmail={onEmail}
          />
        ))}
        {quotes.length === 0 && (
          <div className="h-24 flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg m-1">
            <span className="mb-1">No deals</span>
            <span className="opacity-50">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function DealsKanban({ quotes, onStatusChange, onEdit, onPreview, onDelete, onEmail }: DealsKanbanProps) {
  const columns = [
    { id: 'draft', title: 'Draft' },
    { id: 'sent', title: 'Sent' },
    { id: 'viewed', title: 'Viewed' },
    { id: 'accepted', title: 'Accepted' },
    { id: 'completed', title: 'Completed' },
    { id: 'rejected', title: 'Rejected' },
    { id: 'expired', title: 'Expired' },
  ];

  const handleDrop = (item: DragItem, newStatus: string) => {
    // Determine effective current status (handling the implicit "viewed" state)
    const quote = quotes.find(q => q.id === item.id);
    if (!quote) return;

    const currentEffectiveStatus = (quote.status === 'sent' && quote.readAt) ? 'viewed' : quote.status;

    if (currentEffectiveStatus !== newStatus) {
        onStatusChange(quote, newStatus as Quote['status']);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            title={col.title}
            status={col.id}
            quotes={quotes.filter(q => {
              if (col.id === 'viewed') return q.status === 'viewed' || (q.status === 'sent' && !!q.readAt);
              if (col.id === 'sent') return q.status === 'sent' && !q.readAt;
              return q.status === col.id;
            })}
            onDrop={handleDrop}
            onEdit={onEdit}
            onPreview={onPreview}
            onDelete={onDelete}
            onEmail={onEmail}
          />
        ))}
      </div>
    </DndProvider>
  );
}
