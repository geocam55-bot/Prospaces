import React, { useState, useEffect } from 'react';
import { KitchenConfig } from '../../types/kitchen';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Save, Trash2, FolderOpen, Calendar } from 'lucide-react';
import type { User } from '../../App';
import { toast } from 'sonner@2.0.3';

interface SavedKitchenDesignsProps {
  user: User;
  onLoadDesign: (config: KitchenConfig) => void;
}

interface SavedDesign {
  id: string;
  name: string;
  description: string;
  config: KitchenConfig;
  created_at: string;
  updated_at: string;
}

export function SavedKitchenDesigns({ user, onLoadDesign }: SavedKitchenDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<SavedDesign | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    try {
      setLoading(true);
      // TODO: Load from Supabase
      // For now, load from localStorage
      const saved = localStorage.getItem(`kitchen_designs_${user.organizationId}`);
      if (saved) {
        setDesigns(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading designs:', error);
      toast.error('Failed to load saved designs');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    onLoadDesign(design.config);
    toast.success(`Loaded design: ${design.name}`);
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const updated = designs.filter(d => d.id !== id);
      setDesigns(updated);
      localStorage.setItem(`kitchen_designs_${user.organizationId}`, JSON.stringify(updated));
      toast.success('Design deleted successfully');
    } catch (error) {
      console.error('Error deleting design:', error);
      toast.error('Failed to delete design');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading designs...</div>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Saved Designs</h3>
          <p className="text-gray-600 mb-4">
            Save your kitchen designs to access them later. Create a design in the Design tab and click "Save Design" to get started.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Saved Kitchen Designs</h2>
        <p className="text-sm text-gray-600">Load a previously saved design to continue working</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map((design) => (
          <Card key={design.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="mb-3">
              <h3 className="font-semibold text-lg mb-1">{design.name}</h3>
              {design.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{design.description}</p>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(design.created_at)}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Layout: {design.config.layoutStyle}</p>
                <p>Room: {design.config.roomWidth}' × {design.config.roomLength}'</p>
                <p>Cabinets: {design.config.cabinets.length}</p>
                <p>Finish: {design.config.cabinetFinish}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleLoadDesign(design)}
                className="flex-1"
                size="sm"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
              </Button>
              <Button
                onClick={() => handleDeleteDesign(design.id)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
