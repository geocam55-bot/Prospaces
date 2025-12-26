import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { 
  Mail, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  BarChart3,
  Globe,
  Plus
} from 'lucide-react';
import { MarketingDashboard } from './marketing/MarketingDashboard';
import { CampaignManager } from './marketing/CampaignManager';
import { LeadScoring } from './marketing/LeadScoring';
import { JourneyBuilder } from './marketing/JourneyBuilder';
import { LandingPageBuilder } from './marketing/LandingPageBuilder';
import { MarketingAnalytics } from './marketing/MarketingAnalytics';
import type { User } from '../App';

interface MarketingProps {
  user: User;
}

export function Marketing({ user }: MarketingProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Marketing Automation</h1>
          <p className="text-gray-600 mt-1">Engage, nurture, and convert leads across all channels</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Target className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Lead Scoring</span>
            </TabsTrigger>
            <TabsTrigger value="journeys" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Journeys</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Landing Pages</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-6">
          <MarketingDashboard user={user} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignManager user={user} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <LeadScoring user={user} />
        </TabsContent>

        <TabsContent value="journeys" className="mt-6">
          <JourneyBuilder user={user} />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <LandingPageBuilder user={user} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <MarketingAnalytics user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}