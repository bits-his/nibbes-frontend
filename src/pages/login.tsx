import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@shared/schema';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth(); // Use the auth context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    // Set the form fields based on the selected role
    switch(role) {
      case 'admin':
        setEmail('admin@example.com');
        setPassword('admin123');
        break;
      case 'kitchen':
        setEmail('kitchen@example.com');
        setPassword('kitchen123');
        break;
      case 'customer':
        setEmail('customer@example.com');
        setPassword('customer123');
        break;
    }
    
    // Optional: Set focus to the login button
    setTimeout(() => {
      const loginButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (loginButton) loginButton.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/nibbles.jpg" 
              alt="Nibbles Kitchen Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl sr-only">Nibbles Kitchen</CardTitle>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {/* <div className="mb-4">
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
              </div> */}
              
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