import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from '@/lib/queryClient';
import { resetPasswordSchema } from '@shared/schema';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Extract token from URL query parameters
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const token = urlParams.get('token');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/reset-password', { 
        token,
        newPassword 
      });
      await response.json();
      
      setMessage('Password reset successfully. You can now log in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-500">The password reset link is invalid or has expired.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              type="button" 
              onClick={() => setLocation('/forgot-password')}
            >
              Request New Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            {message && (
              <div className="text-green-500 text-sm text-center">{message}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Button 
                type="button" 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => setLocation('/login')}
              >
                Back to Login
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}