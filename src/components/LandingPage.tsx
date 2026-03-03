import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import logo3d from 'figma:asset/4cd72a4f09d0fbe8ab643136b41fdb815e72afdb.png';
import { 
  Building2, 
  Users, 
  Target, 
  FileText, 
  Calendar, 
  Package, 
  TrendingUp,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Mail,
  Clock,
  DollarSign,
  ArrowRight,
  Sparkles,
  Lock,
  Info
} from 'lucide-react';
import { ModuleDetail } from './ModuleDetail';
import { About } from './About';

interface LandingPageProps {
  onGetStarted: () => void;
  onMemberLogin?: () => void;
}

export function LandingPage({ onGetStarted, onMemberLogin }: LandingPageProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  // If showing About page
  if (showAbout) {
    return <About onClose={() => setShowAbout(false)} />;
  }

  // If a module is selected, show the detail page
  if (selectedModule) {
    return <ModuleDetail moduleId={selectedModule} onBack={() => setSelectedModule(null)} />;
  }

  const features = [
    {
      id: 'contact-management',
      icon: Users,
      title: 'Contact Management',
      description: 'Organize and track all your customer relationships in one place',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'opportunities',
      icon: Target,
      title: 'Opportunities',
      description: 'Track sales pipeline and convert leads into customers',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'smart-bidding',
      icon: FileText,
      title: 'Smart Bidding',
      description: 'Create professional bids with automated tax calculations',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'tasks',
      icon: CheckCircle2,
      title: 'Tasks',
      description: 'Manage to-dos, deadlines, and team assignments',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      id: 'appointments',
      icon: Calendar,
      title: 'Appointments',
      description: 'Schedule and manage meetings with integrated calendar',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'documents',
      icon: FileText,
      title: 'Documents',
      description: 'Store, organize, and share files securely',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Email',
      description: 'Manage customer communications and email campaigns',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'inventory',
      icon: Package,
      title: 'Inventory',
      description: 'Track products, stock levels, and pricing in real-time',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      id: 'marketing',
      icon: Mail,
      title: 'Marketing Automation',
      description: 'Engage customers with automated email campaigns',
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: 'project-wizards',
      icon: Zap,
      title: 'Project Wizards',
      description: 'Design decks, garages, roofs, and sheds with powerful planning tools',
      color: 'from-violet-500 to-purple-500',
    },
    {
      id: 'reports',
      icon: BarChart3,
      title: 'Reports & Analytics',
      description: 'Comprehensive insights into sales, marketing, and operations',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: 'notes',
      icon: FileText,
      title: 'Notes',
      description: 'Capture important information and track customer interactions',
      color: 'from-amber-500 to-yellow-500',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built with modern tech for blazing performance',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security with role-based access',
    },
    {
      icon: BarChart3,
      title: 'Powerful Analytics',
      description: 'Real-time insights and reporting dashboards',
    },
    {
      icon: Clock,
      title: 'Save Time',
      description: 'Automate workflows and focus on what matters',
    },
  ];

  const stats = [
    { label: 'Active Users', value: '10K+', icon: Users },
    { label: 'Deals Closed', value: '$50M+', icon: DollarSign },
    { label: 'Time Saved', value: '40%', icon: Clock },
    { label: 'Satisfaction', value: '98%', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-white light">
      {/* Top bar - Logo and Member Login */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src={logo3d} alt="ProSpaces Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">ProSpaces CRM</span>
        </div>

        {onMemberLogin && (
          <button
            onClick={onMemberLogin}
            className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-2 bg-white/80 hover:bg-gray-50 backdrop-blur-md px-5 py-2.5 rounded-full border border-gray-200 shadow-sm"
          >
            <Lock className="h-4 w-4" />
            Member Login
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        {/* Subtle background blob for visual interest but keeping center white for logo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 sm:pt-40 sm:pb-24">
          <div className="text-center">
            <div className="flex flex-col items-center justify-center mb-10">
              <img 
                src={logo3d} 
                alt="ProSpaces Logo" 
                className="relative h-40 w-40 sm:h-52 sm:w-52 hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>
            <h1 className="text-5xl sm:text-7xl text-gray-900 font-bold tracking-tight mb-6">
              ProSpaces CRM
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Complete solution for sales, marketing, and project management. Designed from the ground up for the Home Renovations Industry.
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              Streamline your business operations with our all-in-one CRM platform. 
              Track opportunities, manage contacts, automate marketing, and close more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={onGetStarted}
                className="bg-purple-600 text-white hover:bg-purple-700 px-8 py-6 text-lg group shadow-lg shadow-purple-200"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border border-gray-100 shadow-xl">
                <CardContent className="pt-6 text-center">
                  <Icon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
            Everything you need to grow
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you manage your business more effectively
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer"
                onClick={() => setSelectedModule(feature.id)}
              >
                <CardContent className="pt-6">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 mb-3">{feature.description}</p>
                  <p className="text-sm text-purple-600 group-hover:text-purple-700 font-medium flex items-center gap-1">
                    Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
              Why choose ProSpaces?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with the latest technology to give you the competitive edge
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl mb-2 text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 py-24">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl text-white mb-6">
            Ready to transform your business?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of businesses already using ProSpaces CRM to streamline operations and increase revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={onGetStarted}
              className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-6 text-lg group"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <p className="mt-6 text-white/80 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src={logo3d} alt="ProSpaces Logo" className="h-10 w-10 rounded-lg" />
              <span className="text-xl font-bold">ProSpaces CRM</span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex items-center gap-4 text-sm">
                <button 
                  onClick={() => setShowAbout(true)}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Info className="h-3.5 w-3.5" />
                  About
                </button>
                <span className="text-gray-600">|</span>
                <a href="?view=privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <span className="text-gray-600">|</span>
                <a href="?view=terms-of-service" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </div>
              <div className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} ProSpaces CRM. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}