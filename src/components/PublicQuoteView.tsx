import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';

interface PublicQuoteViewProps {
  // No props needed, reads from URL
}

export function PublicQuoteView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const orgId = params.get('orgId');
      const type = params.get('type') || 'quote';

      if (!id || !orgId) {
        setError('Invalid link: Missing ID or Organization ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/public/view?id=${id}&orgId=${orgId}&type=${type}`, {
            headers: {
                'Authorization': `Bearer ${publicAnonKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load ${type}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        
        setData(result.data);
      } catch (err: any) {
        console.error('Error loading public view:', err);
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600">Loading document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">Unable to View Document</CardTitle>
            <CardDescription>
              {error || 'The document you are looking for could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
             <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Determine title based on type
  const quoteNumber = data.quoteNumber || data.quote_number;
  const title = quoteNumber ? `Quote #${quoteNumber}` : (data.title || 'Document');
  
  // Parse line items if they are a string
  let lineItems = data.lineItems || data.line_items;
  if (typeof lineItems === 'string') {
    try {
        lineItems = JSON.parse(lineItems);
    } catch (e) {
        lineItems = [];
    }
  }

  const contactName = data.contactName || data.contact_name || 'Valued Customer';
  const contactEmail = data.contactEmail || data.contact_email;
  const validUntil = data.validUntil || data.valid_until;
  const taxAmount = data.taxAmount ?? data.tax_amount ?? 0;
  const discountAmount = data.discountAmount ?? data.discount_amount ?? 0;
  const organizationName = data.organizationName || data.organization_name || 'ProSpaces';

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-t-4 border-t-blue-600">
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Issued: {new Date(data.created_at || data.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Total Amount</div>
                    <div className="text-3xl font-bold text-blue-600">{formatCurrency(data.total)}</div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header / Meta Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">To</h3>
                    <div className="font-medium">{contactName}</div>
                    <div className="text-slate-600">{contactEmail}</div>
                </div>
                {validUntil && (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Valid Until</h3>
                        <div>{new Date(validUntil).toLocaleDateString()}</div>
                    </div>
                )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-y border-slate-200">
                            <th className="py-3 px-6 font-semibold text-slate-700">Item</th>
                            <th className="py-3 px-6 font-semibold text-slate-700">Description</th>
                            <th className="py-3 px-6 font-semibold text-slate-700 text-center">Qty</th>
                            <th className="py-3 px-6 font-semibold text-slate-700 text-right">Price</th>
                            <th className="py-3 px-6 font-semibold text-slate-700 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lineItems?.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                                <td className="py-4 px-6 font-medium">{item.itemName || item.title || item.item_name || 'Item'}</td>
                                <td className="py-4 px-6 text-slate-600">{item.description}</td>
                                <td className="py-4 px-6 text-center">{item.quantity || 1}</td>
                                <td className="py-4 px-6 text-right font-mono text-slate-600">
                                    {formatCurrency(item.unitPrice || item.price || item.unit_price)}
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-medium">
                                    {formatCurrency(item.total || ((item.quantity || 1) * (item.unitPrice || item.price || item.unit_price)))}
                                </td>
                            </tr>
                        ))}
                        {(!lineItems || lineItems.length === 0) && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                    No items listed.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-200">
                <div className="flex flex-col gap-2 ml-auto max-w-xs">
                    <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(data.subtotal)}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                            <span>Tax:</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                     {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-300 pt-2 mt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(data.total)}</span>
                    </div>
                </div>
            </div>
            
            {/* Notes */}
            {data.notes && (
                <div className="p-6 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{data.notes}</p>
                </div>
            )}
            
             {/* Terms */}
            {data.terms && (
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Terms & Conditions</h3>
                    <p className="text-slate-600 text-xs whitespace-pre-wrap">{data.terms}</p>
                </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
