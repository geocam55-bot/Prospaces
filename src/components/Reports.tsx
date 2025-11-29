import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  CheckSquare, 
  Mail, 
  MessageSquare,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { SalesPipelineReports } from './reports/SalesPipelineReports';
import { BidProposalReports } from './reports/BidProposalReports';
import { ContactCustomerReports } from './reports/ContactCustomerReports';
import { TaskProductivityReports } from './reports/TaskProductivityReports';
import { MarketingPerformanceReports } from './reports/MarketingPerformanceReports';
import { NotesActivityReports } from './reports/NotesActivityReports';
import { ManagerSummaryReports } from './reports/ManagerSummaryReports';
import type { User } from '../App';

interface ReportsProps {
  user: User;
}

export function Reports({ user }: ReportsProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [showCost, setShowCost] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your business performance</p>
        </div>
        
        {/* Price/Cost Toggle Switch */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="price-toggle" 
              className={`text-sm cursor-pointer transition-colors ${!showCost ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Selling Price
            </Label>
            <Switch
              id="price-toggle"
              checked={showCost}
              onCheckedChange={setShowCost}
            />
            <Label 
              htmlFor="price-toggle" 
              className={`text-sm cursor-pointer transition-colors ${showCost ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Cost
            </Label>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Sales</span>
          </TabsTrigger>
          <TabsTrigger value="bids" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Bids</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <ManagerSummaryReports user={user} showCost={showCost} />
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <SalesPipelineReports user={user} showCost={showCost} />
        </TabsContent>

        <TabsContent value="bids" className="mt-6">
          <BidProposalReports user={user} showCost={showCost} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactCustomerReports user={user} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TaskProductivityReports user={user} />
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <MarketingPerformanceReports user={user} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <NotesActivityReports user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}