import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function QRCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');

  useEffect(() => {
    // In development, we'll use a placeholder IP - in production, this would use the actual server IP
    // For development purposes, we'll construct the IP address based on a common pattern
    // This is a simplified approach - in a real environment, you'd get the IP from the server
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If running on localhost, show a typical local IP
    let displayUrl = protocol + '//' + hostname + (port ? ':' + port : '');
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Replace localhost with a generic local IP
      const localIP = '192.168.1.136'; // This should be replaced with actual IP detection
      displayUrl = protocol + '//' + localIP + (port ? ':' + port : '');
    }
    
    setIpAddress(displayUrl);
    
    // Generate QR code for the display URL
    QRCode.toDataURL(displayUrl, { width: 300, margin: 2 })
      .then(setQrCodeUrl)
      .catch((error) => {
        console.error('Error generating QR code:', error);
      });
  }, []);

  // Function to get the actual IP (would need backend support to be truly accurate)
  const getActualIP = async () => {
    try {
      // This service can provide the public IP, but for local access you'd need your actual local IP
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      console.log('Public IP:', data.ip);
      
      // In a real app, you'd need to get the local IP from your backend or network configuration
      // For now, we'll use a placeholder approach
    } catch (error) {
      console.error('Error getting IP:', error);
    }
  };

  const handleRefresh = async () => {
    await getActualIP();
    
    // Refresh the QR code with current IP
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    let displayUrl = protocol + '//' + hostname + (port ? ':' + port : '');
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const localIP = '192.168.1.136'; // Replace with actual IP in your environment
      displayUrl = protocol + '//' + localIP + (port ? ':' + port : '');
    }
    
    setIpAddress(displayUrl);
    
    QRCode.toDataURL(displayUrl, { width: 300, margin: 2 })
      .then(setQrCodeUrl)
      .catch((error) => {
        console.error('Error generating QR code:', error);
      });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">Nibbles Kitchen</CardTitle>
          <CardDescription>Scan this QR code to access the menu directly</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {qrCodeUrl ? (
            <div className="p-4 bg-white rounded-lg">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for menu access" 
                className="w-64 h-64 object-contain"
              />
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-muted-foreground">Generating QR code...</div>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Access URL:
            </p>
            <p className="font-mono text-lg font-semibold">
              {ipAddress}
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure your device is on the same network
            </p>
          </div>
          
          <div className="pt-4 w-full">
            <Button 
              className="w-full" 
              onClick={handleRefresh}
              variant="outline"
            >
              Refresh QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}