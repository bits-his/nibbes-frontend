import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Truck, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user has settings permission
  const userPermissions = user?.permissions || [];
  const hasSettingsPermission = userPermissions.includes('settings');

  // If user doesn't have permission, show access denied
  if (!hasSettingsPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldAlert className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access System Settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This page is restricted to administrators only. Please contact your system administrator if you need access to settings.
            </p>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeliveryToggle = async (enabled: boolean) => {
    try {
      await updateSettings({ deliveryEnabled: enabled });
      toast({
        title: 'Settings Updated',
        description: `Delivery ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update delivery settings',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your restaurant settings and preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Delivery Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Delivery Settings</CardTitle>
                <CardDescription>
                  Control delivery availability for your customers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="delivery-toggle" className="text-base font-medium">
                  Enable Delivery
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, customers can choose delivery as an option during checkout
                </p>
              </div>
              <Switch
                id="delivery-toggle"
                checked={settings.deliveryEnabled}
                onCheckedChange={handleDeliveryToggle}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
