import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Globe,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Eye,
  BarChart3,
  Layout,
  Type,
  Image as ImageIcon,
  Video,
  FileText,
  GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import type { User } from '../../App';

interface LandingPageBuilderProps {
  user: User;
}

interface PageElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'button' | 'form';
  content: string;
  styles?: {
    alignment?: 'left' | 'center' | 'right';
    size?: string;
  };
}

interface PageSettings {
  title: string;
  slug: string;
  metaDescription: string;
  conversionGoal: string;
  trackingCode: string;
}

export function LandingPageBuilder({ user }: LandingPageBuilderProps) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [pageElements, setPageElements] = useState<PageElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    title: '',
    slug: '',
    metaDescription: '',
    conversionGoal: '',
    trackingCode: ''
  });

  const pages = [
    {
      id: 1,
      name: 'Product Launch 2025',
      url: '/landing/product-launch',
      status: 'Published',
      views: 12450,
      conversions: 892,
      conversionRate: 7.2,
      lastEdited: '2 days ago'
    },
    {
      id: 2,
      name: 'Free Trial Signup',
      url: '/landing/free-trial',
      status: 'Published',
      views: 8932,
      conversions: 1234,
      conversionRate: 13.8,
      lastEdited: '5 days ago'
    },
    {
      id: 3,
      name: 'Webinar Registration',
      url: '/landing/webinar-2025',
      status: 'Draft',
      views: 0,
      conversions: 0,
      conversionRate: 0,
      lastEdited: '1 hour ago'
    },
    {
      id: 4,
      name: 'eBook Download',
      url: '/landing/ebook-guide',
      status: 'Published',
      views: 5432,
      conversions: 456,
      conversionRate: 8.4,
      lastEdited: '1 week ago'
    },
  ];

  const builderElements = [
    { icon: Type, name: 'Heading', type: 'heading' as const, category: 'Text', defaultContent: 'Your Heading Here' },
    { icon: FileText, name: 'Paragraph', type: 'paragraph' as const, category: 'Text', defaultContent: 'Add your paragraph text here. You can customize this content to match your message.' },
    { icon: ImageIcon, name: 'Image', type: 'image' as const, category: 'Media', defaultContent: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800' },
    { icon: Video, name: 'Video', type: 'video' as const, category: 'Media', defaultContent: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { icon: Layout, name: 'Button', type: 'button' as const, category: 'Interactive', defaultContent: 'Click Here' },
    { icon: FileText, name: 'Form', type: 'form' as const, category: 'Interactive', defaultContent: 'Email Signup Form' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return 'bg-green-100 text-green-700';
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      case 'Archived':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddElement = (type: PageElement['type'], defaultContent: string) => {
    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type,
      content: defaultContent,
      styles: {
        alignment: 'center',
        size: type === 'heading' ? 'large' : 'medium'
      }
    };
    setPageElements([...pageElements, newElement]);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added to page`);
  };

  const handleUpdateElement = (id: string, content: string) => {
    setPageElements(pageElements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  const handleDeleteElement = (id: string) => {
    setPageElements(pageElements.filter(el => el.id !== id));
    setSelectedElement(null);
    toast.success('Element removed');
  };

  const handleMoveElement = (id: string, direction: 'up' | 'down') => {
    const index = pageElements.findIndex(el => el.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const newElements = [...pageElements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      setPageElements(newElements);
    } else if (direction === 'down' && index < pageElements.length - 1) {
      const newElements = [...pageElements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      setPageElements(newElements);
    }
  };

  const renderElement = (element: PageElement, isPreview: boolean = false) => {
    const isSelected = selectedElement === element.id;
    const alignment = element.styles?.alignment || 'center';
    
    const alignmentClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }[alignment];

    switch (element.type) {
      case 'heading':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <Input
                value={element.content}
                onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                className="text-3xl font-bold text-gray-900 text-center"
              />
            ) : (
              <h1 className="text-4xl font-bold text-gray-900">{element.content}</h1>
            )}
          </div>
        );
      
      case 'paragraph':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <Textarea
                value={element.content}
                onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                className="text-gray-700 min-h-24"
                rows={4}
              />
            ) : (
              <p className="text-lg text-gray-700">{element.content}</p>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-2">
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  placeholder="Image URL"
                />
                <img src={element.content} alt="Preview" className="w-full max-w-2xl mx-auto rounded-lg" />
              </div>
            ) : (
              <img src={element.content} alt="Content" className="w-full max-w-2xl mx-auto rounded-lg" />
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <div className="space-y-2">
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  placeholder="Video embed URL"
                />
                <iframe
                  src={element.content}
                  className="w-full max-w-2xl mx-auto aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <iframe
                src={element.content}
                className="w-full max-w-2xl mx-auto aspect-video rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        );
      
      case 'button':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            {!isPreview && isSelected ? (
              <Input
                value={element.content}
                onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                className="text-center"
              />
            ) : (
              <Button size="lg" className="text-lg px-8 py-6">{element.content}</Button>
            )}
          </div>
        );
      
      case 'form':
        return (
          <div className={`${alignmentClass} ${!isPreview && 'cursor-pointer hover:bg-blue-50 p-4 rounded-lg transition-colors'} ${isSelected && !isPreview ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}>
            <div className="max-w-md mx-auto space-y-4 p-6 bg-gray-50 rounded-lg">
              {!isPreview && isSelected ? (
                <Input
                  value={element.content}
                  onChange={(e) => handleUpdateElement(element.id, e.target.value)}
                  placeholder="Form title"
                  className="text-center font-semibold"
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">{element.content}</h3>
              )}
              <Input placeholder="Enter your email" type="email" />
              <Button className="w-full">Submit</Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Landing Page Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create high-converting landing pages with drag-and-drop</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => {
          setPageElements([]);
          setPageSettings({
            title: '',
            slug: '',
            metaDescription: '',
            conversionGoal: '',
            trackingCode: ''
          });
          toast.success('New page created');
        }}>
          <Plus className="h-4 w-4" />
          New Landing Page
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pages List */}
        <div className="space-y-4">
          {pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{page.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">{page.url}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(page.status)}>{page.status}</Badge>
                        <span className="text-xs text-gray-500">• {page.lastEdited}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Opening editor...')}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Opening preview...')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Viewing analytics...')}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Page duplicated')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => toast.success('Page deleted')}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-lg text-gray-900 mt-1">{page.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conversions</p>
                    <p className="text-lg text-gray-900 mt-1">{page.conversions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conv. Rate</p>
                    <p className="text-lg text-green-600 mt-1">{page.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Page Builder Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Page Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="builder">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3">
                  <TabsTrigger value="builder" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Builder</TabsTrigger>
                  <TabsTrigger value="settings" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Settings</TabsTrigger>
                  <TabsTrigger value="preview" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Preview</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="builder" className="space-y-4 mt-4">
                {/* Element Palette */}
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">Add Elements</p>
                  <div className="grid grid-cols-2 gap-2">
                    {builderElements.map((element) => {
                      const Icon = element.icon;
                      return (
                        <button
                          key={element.name}
                          onClick={() => handleAddElement(element.type, element.defaultContent)}
                          className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-sm text-gray-900 font-medium">{element.name}</p>
                              <p className="text-xs text-gray-500">{element.category}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="border-2 border-gray-200 rounded-lg p-6 min-h-96 bg-white space-y-4">
                  {pageElements.length === 0 ? (
                    <div className="text-center text-gray-400 py-20">
                      <Layout className="h-12 w-12 mx-auto mb-4" />
                      <p className="font-medium">Click elements above to build your page</p>
                      <p className="text-sm mt-2">Elements will appear here</p>
                    </div>
                  ) : (
                    pageElements.map((element) => (
                      <div key={element.id} className="relative group">
                        {selectedElement !== element.id && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMoveElement(element.id, 'up')}
                              className="h-8 w-8 p-0"
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMoveElement(element.id, 'down')}
                              className="h-8 w-8 p-0"
                            >
                              ↓
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteElement(element.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div onClick={() => setSelectedElement(element.id)}>
                          {renderElement(element)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {pageElements.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={() => toast.success('Page saved!')}>
                      Save Page
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setPageElements([]);
                      setSelectedElement(null);
                      toast.success('Canvas cleared');
                    }}>
                      Clear Canvas
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 font-medium">Page Title</label>
                    <Input 
                      placeholder="Enter page title" 
                      value={pageSettings.title}
                      onChange={(e) => setPageSettings({...pageSettings, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 font-medium">URL Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">/landing/</span>
                      <Input 
                        placeholder="url-slug" 
                        value={pageSettings.slug}
                        onChange={(e) => setPageSettings({...pageSettings, slug: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 font-medium">SEO Meta Description</label>
                    <Textarea 
                      placeholder="Brief description for search engines" 
                      value={pageSettings.metaDescription}
                      onChange={(e) => setPageSettings({...pageSettings, metaDescription: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 font-medium">Conversion Goal</label>
                    <Input 
                      placeholder="e.g., Form submission, Download" 
                      value={pageSettings.conversionGoal}
                      onChange={(e) => setPageSettings({...pageSettings, conversionGoal: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 font-medium">Tracking Code</label>
                    <Textarea 
                      placeholder="Google Analytics, Facebook Pixel, etc." 
                      value={pageSettings.trackingCode}
                      onChange={(e) => setPageSettings({...pageSettings, trackingCode: e.target.value})}
                      rows={4}
                    />
                  </div>
                  <Button onClick={() => toast.success('Settings saved!')}>
                    Save Settings
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                      </div>
                      <Input
                        value={`https://yoursite.com/landing/${pageSettings.slug || 'your-page'}`}
                        readOnly
                        className="text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="bg-white p-8 min-h-96 space-y-6">
                    {pageElements.length === 0 ? (
                      <div className="max-w-2xl mx-auto text-center py-20">
                        <h1 className="text-4xl text-gray-900 mb-4">Your Landing Page Title</h1>
                        <p className="text-lg text-gray-600 mb-8">
                          Compelling description that converts visitors into customers
                        </p>
                        <Button size="lg">Get Started</Button>
                      </div>
                    ) : (
                      pageElements.map((element) => (
                        <div key={element.id}>
                          {renderElement(element, true)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Landing Page Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Lead Capture', description: 'Simple form-focused design', color: 'blue' },
              { name: 'Product Launch', description: 'Showcase new products', color: 'purple' },
              { name: 'Webinar Registration', description: 'Event sign-up optimized', color: 'green' },
              { name: 'eBook Download', description: 'Content offer template', color: 'orange' },
              { name: 'Free Trial', description: 'SaaS trial signup', color: 'indigo' },
              { name: 'Coming Soon', description: 'Pre-launch page', color: 'pink' },
            ].map((template) => (
              <div
                key={template.name}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => {
                  // Load a template
                  if (template.name === 'Lead Capture') {
                    setPageElements([
                      { id: 'temp-1', type: 'heading', content: 'Get Your Free Guide', styles: { alignment: 'center' } },
                      { id: 'temp-2', type: 'paragraph', content: 'Join thousands of professionals who have already transformed their business with our expert insights.', styles: { alignment: 'center' } },
                      { id: 'temp-3', type: 'form', content: 'Download Now', styles: { alignment: 'center' } },
                    ]);
                    toast.success('Template loaded!');
                  } else {
                    toast.success(`${template.name} template loaded!`);
                  }
                }}
              >
                <div className={`h-32 bg-${template.color}-100 rounded mb-3 flex items-center justify-center`}>
                  <Layout className={`h-12 w-12 text-${template.color}-600`} />
                </div>
                <h3 className="text-sm text-gray-900 font-medium">{template.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
