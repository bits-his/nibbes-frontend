import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from '@/lib/queryClient';
import { forgotPasswordSchema } from '@shared/schema';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordInputs, setShowPasswordInputs] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password/verify', { email });
      const data = await response.json();
      
      if (data.emailExists === false) {
        setError('No account found with this email address. Please check your email and try again.');
      } else {
        // Email exists, show the password inputs
        setShowPasswordInputs(true);
        setEmailVerified(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmNewPassword) {
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
      const response = await apiRequest('POST', '/api/auth/forgot-password/reset-direct', { 
        email,
        newPassword 
      });
      await response.json();
      
      setMessage('Password updated successfully!');
      // Reset form
      setNewPassword('');
      setConfirmNewPassword('');
      setEmail('');
      setShowPasswordInputs(false);
      setEmailVerified(false);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>
            {showPasswordInputs 
              ? "Enter your new password" 
              : "Enter your email to reset your password"}
          </CardDescription>
        </CardHeader>
        
        {!showPasswordInputs ? (
          <form onSubmit={handleVerifyEmail}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => setLocation('/login')}
                >
                  Sign in
                </Button>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset}>
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
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
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
                  onClick={() => {
                    setShowPasswordInputs(false);
                    setEmailVerified(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                >
                  Back to email verification
                </Button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}