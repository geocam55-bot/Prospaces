import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  ArrowLeft,
  CheckCircle2,
  Users,
  Target,
  FileText,
  Calendar,
  Package,
  Mail,
  BarChart3,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ModuleDetailProps {
  moduleId: string;
  onBack: () => void;
}

export function ModuleDetail({ moduleId, onBack }: ModuleDetailProps) {
  // Scroll to top when component mounts or moduleId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [moduleId]);

  const modules = {
    'contact-management': {
      icon: Users,
      title: 'Contact Management',
      subtitle: 'Comprehensive customer relationship tracking',
      color: 'from-blue-500 to-cyan-500',
      description: 'Build and maintain strong customer relationships with our comprehensive contact management system. Track every interaction, manage communication history, and gain deep insights into your customer base.',
      images: [
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'
      ],
      features: [
        'Centralized contact database with custom fields',
        'Communication history tracking (calls, emails, meetings)',
        'Contact segmentation and tagging',
        'Social media integration',
        'Import/export contacts (CSV, Excel)',
        'Duplicate detection and merging',
        'Custom contact fields and data types',
        'Activity timeline and notes',
        'Contact scoring and prioritization',
        'Multi-organization tenant isolation'
      ],
      benefits: [
        'Never lose track of important customer details',
        'Access complete interaction history instantly',
        'Segment contacts for targeted campaigns',
        'Improve customer service with context'
      ],
      useCases: [
        {
          title: 'Sales Teams',
          description: 'Track prospect interactions and conversion paths to close more deals faster.'
        },
        {
          title: 'Customer Support',
          description: 'Access complete customer history to provide personalized, efficient support.'
        },
        {
          title: 'Marketing',
          description: 'Segment contacts for targeted campaigns and track engagement metrics.'
        }
      ]
    },
    'opportunities': {
      icon: Target,
      title: 'Opportunities & Pipeline',
      subtitle: 'Visual sales pipeline management',
      color: 'from-purple-500 to-pink-500',
      description: 'Transform your sales process with visual pipeline management. Track deals from first contact to close, forecast revenue, and identify bottlenecks in your sales funnel.',
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'
      ],
      features: [
        'Visual drag-and-drop pipeline stages',
        'Customizable sales stages and workflows',
        'Revenue forecasting and projections',
        'Win/loss analysis and reporting',
        'Automated stage progression rules',
        'Deal scoring and prioritization',
        'Activity tracking per opportunity',
        'Probability-based forecasting',
        'Team collaboration on deals',
        'Pipeline performance analytics'
      ],
      benefits: [
        'Visualize your entire sales pipeline at a glance',
        'Identify and address bottlenecks quickly',
        'Accurate revenue forecasting',
        'Data-driven sales strategy decisions'
      ],
      useCases: [
        {
          title: 'Sales Managers',
          description: 'Monitor team performance, forecast revenue, and identify coaching opportunities.'
        },
        {
          title: 'Sales Reps',
          description: 'Manage individual deals, track progress, and prioritize high-value opportunities.'
        },
        {
          title: 'Executives',
          description: 'Get real-time visibility into sales performance and pipeline health.'
        }
      ]
    },
    'smart-bidding': {
      icon: FileText,
      title: 'Smart Bidding',
      subtitle: 'Professional bid creation with automation',
      color: 'from-orange-500 to-red-500',
      description: 'Create professional, accurate bids in minutes with automated calculations, tax handling, and customizable templates. Win more projects with competitive, error-free proposals.',
      images: [
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800'
      ],
      features: [
        'Automated tax calculations (GST, PST, HST)',
        'Multi-region tax compliance',
        'Customizable bid templates',
        'Line item management with formulas',
        'Discount and markup automation',
        'Professional PDF generation',
        'Bid versioning and revisions',
        'Approval workflows',
        'Cost estimation tools',
        'Historical bid analytics'
      ],
      benefits: [
        'Eliminate calculation errors',
        'Save hours on bid preparation',
        'Professional, consistent proposals',
        'Win rate improvement through accuracy'
      ],
      useCases: [
        {
          title: 'Construction',
          description: 'Create detailed project bids with material costs, labor, and regional taxes.'
        },
        {
          title: 'Consulting',
          description: 'Generate professional service proposals with clear pricing breakdowns.'
        },
        {
          title: 'Manufacturing',
          description: 'Quote complex products with multi-component pricing and volume discounts.'
        }
      ]
    },
    'appointments': {
      icon: Calendar,
      title: 'Appointments & Scheduling',
      subtitle: 'Integrated calendar management',
      color: 'from-green-500 to-emerald-500',
      description: 'Streamline your scheduling with integrated calendar management. Book meetings, set reminders, and ensure your team never misses an important appointment.',
      images: [
        'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
        'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800'
      ],
      features: [
        'Visual calendar with multiple views (day, week, month)',
        'Appointment scheduling and management',
        'Automated email reminders',
        'Calendar sharing and permissions',
        'Conflict detection and prevention',
        'Recurring appointment support',
        'Meeting notes and attachments',
        'Integration with contacts and opportunities',
        'Team availability tracking',
        'Mobile-responsive calendar'
      ],
      benefits: [
        'Never double-book appointments',
        'Reduce no-shows with automated reminders',
        'Coordinate team schedules effortlessly',
        'Keep meeting context with linked records'
      ],
      useCases: [
        {
          title: 'Sales Teams',
          description: 'Schedule demos, follow-ups, and client meetings with automatic reminders.'
        },
        {
          title: 'Service Providers',
          description: 'Manage appointments, track availability, and prevent scheduling conflicts.'
        },
        {
          title: 'Consultants',
          description: 'Coordinate client meetings and track billable time efficiently.'
        }
      ]
    },
    'inventory': {
      icon: Package,
      title: 'Inventory Management',
      subtitle: 'Real-time stock tracking',
      color: 'from-indigo-500 to-blue-500',
      description: 'Keep perfect track of your products, stock levels, and pricing. Get low-stock alerts, manage suppliers, and maintain accurate inventory across multiple locations.',
      images: [
        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800',
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800'
      ],
      features: [
        'Real-time stock level tracking',
        'Multi-location inventory management',
        'Low stock alerts and notifications',
        'Product categorization and SKUs',
        'Pricing management with history',
        'Supplier tracking and relationships',
        'Purchase order management',
        'Inventory valuation reports',
        'Barcode and QR code support',
        'Stock movement history and audit trail'
      ],
      benefits: [
        'Never run out of critical stock',
        'Reduce carrying costs with accurate tracking',
        'Multi-location visibility',
        'Data-driven purchasing decisions'
      ],
      useCases: [
        {
          title: 'Retail',
          description: 'Track inventory across multiple stores with real-time stock updates.'
        },
        {
          title: 'Manufacturing',
          description: 'Manage raw materials, components, and finished goods inventory.'
        },
        {
          title: 'Distributors',
          description: 'Track products across warehouses and manage supplier relationships.'
        }
      ]
    },
    'marketing': {
      icon: Mail,
      title: 'Marketing Automation',
      subtitle: 'Engage and convert customers',
      color: 'from-pink-500 to-rose-500',
      description: 'Create, launch, and track marketing campaigns that convert. Build automated email sequences, landing pages, and nurture leads through your sales funnel.',
      images: [
        'https://images.unsplash.com/photo-1557838923-2985c318be48?w=800',
        'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=800'
      ],
      features: [
        'Visual email campaign builder',
        'Landing page builder with templates',
        'Marketing automation workflows',
        'Contact segmentation and targeting',
        'A/B testing for campaigns',
        'Campaign performance analytics',
        'Email template library',
        'Lead scoring and nurturing',
        'Integration with contact database',
        'ROI tracking and reporting'
      ],
      benefits: [
        'Automate repetitive marketing tasks',
        'Personalize customer communications',
        'Track campaign performance in real-time',
        'Increase conversion rates with targeted messaging'
      ],
      useCases: [
        {
          title: 'B2B Marketing',
          description: 'Nurture leads through automated email sequences and track engagement.'
        },
        {
          title: 'E-commerce',
          description: 'Create product launch campaigns and abandoned cart recovery flows.'
        },
        {
          title: 'SaaS',
          description: 'Build onboarding sequences and feature announcement campaigns.'
        }
      ]
    }
  };

  const module = modules[moduleId as keyof typeof modules];

  if (!module) {
    return (
      <div className="min-h-screen bg-white light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-gray-900 mb-4">Module not found</h2>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const Icon = module.icon;

  return (
    <div className="min-h-screen bg-white light">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={onBack} className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`bg-gradient-to-br ${module.color} py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl text-white mb-2">{module.title}</h1>
              <p className="text-xl text-white/90">{module.subtitle}</p>
            </div>
          </div>
          <p className="text-lg text-white/90 max-w-3xl">
            {module.description}
          </p>
        </div>
      </div>

      {/* Images Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {module.images.map((image, index) => (
            <div key={index} className="rounded-xl overflow-hidden shadow-lg">
              <img 
                src={image} 
                alt={`${module.title} screenshot ${index + 1}`}
                className="w-full h-80 object-cover"
              />
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-gray-900 mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {module.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-gray-900 mb-8">Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {module.benefits.map((benefit, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-gray-700 pt-1">{benefit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mb-16">
          <h2 className="text-3xl text-gray-900 mb-8">Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {module.useCases.map((useCase, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <h3 className="text-xl mb-3 text-gray-900">{useCase.title}</h3>
                  <p className="text-gray-600">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12">
          <h2 className="text-3xl text-gray-900 mb-4">
            Ready to get started with {module.title}?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using ProSpaces CRM to streamline their operations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={onBack} className={`bg-gradient-to-br ${module.color} text-white hover:opacity-90`}>
              Explore More Modules
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 ProSpaces CRM. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}