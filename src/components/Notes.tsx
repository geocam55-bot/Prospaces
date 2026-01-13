import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Search, Plus, StickyNote, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { User } from '../App';
import { useDebounce } from '../utils/useDebounce';
import { notesAPI, contactsAPI } from '../utils/api';
import { toast } from 'sonner';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  linkedTo?: string;
  ownerId: string;
}

interface NotesProps {
  user: User;
}

export function Notes({ user }: NotesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    linkedTo: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [{ notes: notesData }, { contacts: contactsData }] = await Promise.all([
        notesAPI.getAll(),
        contactsAPI.getAll()
      ]);
      
      setContacts(contactsData || []);
      
      // Map DB fields to component interface
      const mappedNotes: Note[] = notesData.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled Note',
        content: item.content || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        linkedTo: item.contact_id || undefined, // Display ID for now if linked
        ownerId: item.owner_id,
      }));

      setNotes(mappedNotes);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const { notes: data } = await notesAPI.getAll();
      const mappedNotes: Note[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled Note',
        content: item.content || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        linkedTo: item.contact_id || undefined,
        ownerId: item.owner_id,
      }));
      setNotes(mappedNotes);
    } catch (error) {
      console.error('Failed to reload notes:', error);
    }
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return contactId; // Fallback to ID if not found
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown Contact';
  };

  const filteredNotes = notes.filter(note => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const contactName = getContactName(note.linkedTo);
    
    // 🔍 Enhanced search: search across multiple fields
    return note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      (contactName && contactName.toLowerCase().includes(query));
  });

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Append linkedTo info to content if provided, as schema might only support contact_id
      // If the user provided a valid UUID in linkedTo, we could use it as contact_id, 
      // but for free text we'll save it in content to preserve it.
      let contentToSave = newNote.content;
      let contactId = null;

      if (newNote.linkedTo) {
        contactId = newNote.linkedTo;
      }

      await notesAPI.create({
        title: newNote.title,
        content: contentToSave,
        contact_id: contactId
      });

      toast.success('Note created successfully');
      setNewNote({ title: '', content: '', linkedTo: '' });
      setIsAddDialogOpen(false);
      loadNotes(); // Reload list
    } catch (error: any) {
      console.error('Failed to create note:', error);
      toast.error(error.message || 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await notesAPI.delete(id);
      toast.success('Note deleted');
      setNotes(notes.filter(n => n.id !== id));
    } catch (error: any) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
              <DialogDescription>Enter the details of your new note.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedTo">Link to Contact (optional)</Label>
                <Select
                  value={newNote.linkedTo}
                  onValueChange={(value) => setNewNote({ ...newNote, linkedTo: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name || contact.last_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : contact.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes by title, content, or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notes found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-yellow-600" />
                      <h3 className="text-sm text-gray-900">{note.title}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                  {note.linkedTo && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        Link: {getContactName(note.linkedTo)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}