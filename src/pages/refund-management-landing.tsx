import { useLocation } from 'wouter';
import { FileText, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function RefundManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };

  const canCreate = hasPermission('refund_request_create');
  const canApprove = hasPermission('refund_request_approve');

  const visibleSections = [];

  if (canCreate) {
    visibleSections.push({
      title: 'Create Refund Request',
      description: 'Submit a new refund request for approval',
      icon: FileText,
      path: '/refund-management/request',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    });
  }

  if (canApprove) {
    visibleSections.push({
      title: 'Approve Requests',
      description: 'Review and approve pending refund requests',
      icon: CheckSquare,
      path: '/refund-management/approvals',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Refund Management</h1>
        <p className="text-sm text-muted-foreground">Manage customer refunds and replacements</p>
      </div>

      <div className={`grid gap-6 mx-auto ${visibleSections.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2 max-w-4xl'}`}>
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation(section.path)}>
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
