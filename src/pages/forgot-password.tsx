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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password', { email });
      await response.json();
      
      setMessage('Password reset instructions have been sent to your email.');
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>Enter your email to reset your password</CardDescription>
        </CardHeader>
        {!emailSent ? (
          <form onSubmit={handleForgotPassword}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              {message && (
                <div className="text-green-500 text-sm text-center">{message}</div>
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
                {loading ? 'Sending...' : 'Send Reset Instructions'}
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
          <CardContent className="text-center py-8">
            <p className="text-green-500 mb-4">Password reset instructions have been sent to your email.</p>
            <Button 
              type="button" 
              onClick={() => setLocation('/login')}
            >
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}