import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

interface DealsTabProps {
  opportunities: any[];
  users: any[];
}

export function DealsTab({ opportunities, users }: DealsTabProps) {
  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? (user.name || user.email) : 'Unknown';
  };

  const getRottenDays = (updatedAt: string) => {
    if (!updatedAt) return 0;
    const diff = new Date().getTime() - new Date(updatedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getProbability = (stage: string) => {
    // Calculate probability based on stage
    const stageLower = (stage || '').toLowerCase();
    if (stageLower.includes('lead')) return '10%';
    if (stageLower.includes('contact')) return '20%';
    if (stageLower.includes('needs') || stageLower.includes('qualified')) return '30%';
    if (stageLower.includes('proposal')) return '50%';
    if (stageLower.includes('negotiation')) return '80%';
    return '25%'; // Default
  };
  
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-white border-b uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Probability</th>
                <th className="px-4 py-3 font-medium text-right">Rotten days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((opp) => {
                const rottenDays = getRottenDays(opp.updatedAt);
                const isRotten = rottenDays > 30;
                
                return (
                  <tr key={opp.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{opp.id.substring(0, 4)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{opp.title}</td>
                    <td className="px-4 py-3 text-gray-600">{getUserName(opp.ownerId)}</td>
                    <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {opp.stage || opp.status || 'Unknown'}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{opp.status}</td>
                    <td className="px-4 py-3">
                        <Badge variant="outline" className="font-normal text-gray-500">
                            Business
                        </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                        ${parseFloat(opp.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                        {getProbability(opp.stage)}
                    </td>
                    <td className={`px-4 py-3 text-right ${isRotten ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {rottenDays > 0 ? rottenDays : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {opportunities.length === 0 && (
             <div className="p-8 text-center text-muted-foreground">
                 No deals found
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}