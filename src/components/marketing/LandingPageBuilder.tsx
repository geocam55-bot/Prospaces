import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import type { User } from '../../App';

interface LandingPageBuilderProps {
  user: User;
}

export function LandingPageBuilder({ user }: LandingPageBuilderProps) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

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
    { icon: Type, name: 'Heading', category: 'Text' },
    { icon: FileText, name: 'Paragraph', category: 'Text' },
    { icon: ImageIcon, name: 'Image', category: 'Media' },
    { icon: Video, name: 'Video', category: 'Media' },
    { icon: Layout, name: 'Button', category: 'Interactive' },
    { icon: FileText, name: 'Form', category: 'Interactive' },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Landing Page Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create high-converting landing pages with drag-and-drop</p>
        </div>
        <Button className="flex items-center gap-2">
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
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="builder">Builder</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-4 mt-4">
                {/* Element Palette */}
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">Drag elements to build your page</p>
                  <div className="grid grid-cols-2 gap-2">
                    {builderElements.map((element) => {
                      const Icon = element.icon;
                      return (
                        <div
                          key={element.name}
                          className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-move transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-sm text-gray-900">{element.name}</p>
                              <p className="text-xs text-gray-500">{element.category}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="border-2 border-gray-200 rounded-lg p-8 min-h-96 bg-white">
                  <div className="text-center text-gray-400">
                    <Layout className="h-12 w-12 mx-auto mb-4" />
                    <p>Drag elements here to build your landing page</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Page Title</label>
                    <Input placeholder="Enter page title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">URL Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">/landing/</span>
                      <Input placeholder="url-slug" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">SEO Meta Description</label>
                    <Input placeholder="Brief description for search engines" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Conversion Goal</label>
                    <Input placeholder="e.g., Form submission, Download" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Tracking Code</label>
                    <Input placeholder="Google Analytics, Facebook Pixel, etc." />
                  </div>
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
                        value="https://yoursite.com/landing/product-launch"
                        readOnly
                        className="text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="bg-white p-8 min-h-96">
                    <div className="max-w-2xl mx-auto text-center">
                      <h1 className="text-4xl text-gray-900 mb-4">Your Landing Page Title</h1>
                      <p className="text-lg text-gray-600 mb-8">
                        Compelling description that converts visitors into customers
                      </p>
                      <Button size="lg">Get Started</Button>
                    </div>
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
              >
                <div className={`h-32 bg-${template.color}-100 rounded mb-3 flex items-center justify-center`}>
                  <Layout className={`h-12 w-12 text-${template.color}-600`} />
                </div>
                <h3 className="text-sm text-gray-900">{template.name}</h3>
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
