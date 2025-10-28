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
  const [location, setLocation] = useLocation();
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
      
      // Check for redirect parameter in the URL
      const urlParams = new URLSearchParams(location.split('?')[1]);
      const redirectPath = urlParams.get('redirect') || '/';
      
      // If there was a pending checkout cart, restore it
      if (redirectPath === '/checkout') {
        const pendingCart = localStorage.getItem("pendingCheckoutCart");
        if (pendingCart) {
          localStorage.setItem("cart", pendingCart);
          localStorage.removeItem("pendingCheckoutCart"); // Clean up
        }
      }
      
      // Redirect to the original destination or based on user role
      if (redirectPath && ['/checkout', '/docket'].includes(redirectPath)) {
        setLocation(redirectPath);
      } else {
        // Redirect based on user role for other cases
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
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Registration state and function
  const [isRegistering, setIsRegistering] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      setRegLoading(false);
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: 'customer' // Default to customer role for registration
      });
      const data = await response.json();
      
      // Automatically login after successful registration
      login(data.user, data.token);
      
      // Check for redirect parameter in the URL
      const urlParams = new URLSearchParams(location.split('?')[1]);
      const redirectPath = urlParams.get('redirect') || '/';
      
      // If there was a pending checkout cart, restore it
      if (redirectPath === '/checkout') {
        const pendingCart = localStorage.getItem("pendingCheckoutCart");
        if (pendingCart) {
          localStorage.setItem("cart", pendingCart);
          localStorage.removeItem("pendingCheckoutCart"); // Clean up
        }
      }
      
      // Redirect to the original destination or based on user role
      if (redirectPath && ['/checkout', '/docket'].includes(redirectPath)) {
        setLocation(redirectPath);
      } else {
        // For new customers, go to the home page after registration
        setLocation('/');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
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
          <CardTitle className="text-2xl">Nibbles Kitchen</CardTitle>
          <CardDescription>
            {isRegistering ? 'Create an account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        {isRegistering ? (
          // Registration Form
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {regError && (
                <div className="text-red-500 text-sm text-center">{regError}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  type="text"
                  placeholder="Enter username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="m@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                <Input
                  id="reg-confirm-password"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={regLoading}>
                {regLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsRegistering(false)}
              >
                Already have an account? Sign In
              </Button>
            </CardFooter>
          </form>
        ) : (
          // Login Form
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
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsRegistering(true)}
              >
                Don't have an account? Sign Up
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
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
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}