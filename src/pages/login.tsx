import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@shared/schema';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth(); // Use the auth context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      
      // Use context login function to update state
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
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = (role: 'admin' | 'kitchen' | 'customer') => {
    // This is for demonstration - in real app, you'd have actual guest accounts
    // For now, we'll just set a mock user and redirect
    const mockUser = {
      id: `mock-${role}-id`,
      username: `${role}_user`,
      email: `${role}@example.com`,
      role: role
    };
    
    // Use context login function with mock data
    login(mockUser, 'mock-token');
    
    switch(role) {
      case 'admin':
        setLocation('/orders');
        break;
      case 'kitchen':
        setLocation('/kitchen');
        break;
      case 'customer':
        setLocation('/');
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
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
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <div className="mb-4">
                Demo accounts:
                <div className="flex flex-col gap-2 mt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleGuestLogin('admin')}
                  >
                    Admin Login
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleGuestLogin('kitchen')}
                  >
                    Kitchen Staff Login
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleGuestLogin('customer')}
                  >
                    Customer Login
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => setLocation('/signup')}
                >
                  Create an account
                </Button>
                <div className="mt-2">
                  <Button 
                    type="button" 
                    variant="link" 
                    className="p-0 h-auto"
                    onClick={() => setLocation('/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}