import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { signupSchema } from '@shared/schema';

export default function Signup() {
  const [, setLocation] = useLocation();
  const { login } = useAuth(); // Use the auth context
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/register', { 
        username, 
        email, 
        password 
      });
      const data = await response.json();
      
      // Login automatically after successful signup
      login(data.user, data.token);
      
      // Redirect based on user role
      switch(data.user.role) {
        case 'admin':
          setLocation('/orders');
          break;
        case 'kitchen':
          setLocation('/kitchen');
          break;
        case 'customer':
          setLocation('/');
          break;
        default:
          setLocation('/');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
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
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button 
                type="button" 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => setLocation('/login')}
              >
                Sign in
              </Button>
            </div>
            
            <div className="mt-2 text-center text-sm text-muted-foreground">
              <Button 
                type="button" 
                variant="link" 
                className="p-0 h-auto"
                onClick={() => setLocation('/forgot-password')}
              >
                Forgot password?
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}