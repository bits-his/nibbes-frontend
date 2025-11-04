import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function QRCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isUsingCustomUrl, setIsUsingCustomUrl] = useState<boolean>(false);
  const qrCodeRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const generateQrCode = (url: string) => {
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then(setQrCodeUrl)
        .catch((error) => {
          console.error('Error generating QR code:', error);
        });
    };
    
    let displayUrl: string;
    
    if (isUsingCustomUrl && customUrl) {
      // Use the custom URL if provided
      displayUrl = customUrl;
    } else {
      // Get the current origin (protocol + host) and generate QR code
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      // If running on localhost, show the actual server IP instead of localhost
      displayUrl = protocol + '//' + hostname + (port ? ':' + port : '');
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Replace localhost with a generic local IP
        const localIP = '192.168.1.37'; // This should be replaced with actual IP detection
        displayUrl = protocol + '//' + localIP + (port ? ':' + port : '');
      }
    }
    
    setIpAddress(displayUrl);
    generateQrCode(displayUrl);
  }, [isUsingCustomUrl, customUrl]);

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

  const handleDownloadPDF = () => {
    if (!qrCodeUrl) {
      console.error('No QR code available to download');
      return;
    }

    try {
      // Create a new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit the QR code nicely on the page
      const qrWidth = 100; // Width of the QR code in mm
      const qrHeight = 100; // Height of the QR code in mm
      
      // Calculate position to center the QR code
      const x = (pdfWidth - qrWidth) / 2;
      const y = (pdfHeight - qrHeight) / 2 - 10; // Slightly above center to account for title
      
      // Add title to the PDF
      pdf.setFontSize(18);
      pdf.text('Nibbles Kitchen', pdfWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text('Scan this QR code to access the menu', pdfWidth / 2, 30, { align: 'center' });
      
      // Add the URL to the PDF
      pdf.setFontSize(10);
      pdf.text(`URL: ${ipAddress}`, pdfWidth / 2, 40, { align: 'center' });
      
      // Add the QR code image to the PDF
      pdf.addImage(qrCodeUrl, 'PNG', x, y, qrWidth, qrHeight);
      
      // Add instructions at the bottom based on URL type
      if (ipAddress.includes('192.168.') || ipAddress.includes('localhost') || ipAddress.includes('127.0.0.1')) {
        pdf.setFontSize(8);
        pdf.text('Make sure your device is on the same network', pdfWidth / 2, pdfHeight - 20, { align: 'center' });
      }
      
      // Save the PDF with a meaningful name
      pdf.save(`nibbles-kitchen-qr-code-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // const handleRefresh = async () => {
  //   await getActualIP();
    
  //   // Refresh the QR code with current settings
  //   let displayUrl: string;
    
  //   if (isUsingCustomUrl && customUrl) {
  //     // Use the custom URL if provided
  //     displayUrl = customUrl;
  //   } else {
  //     // Get the current origin (protocol + host) and generate QR code
  //     const protocol = window.location.protocol;
  //     const hostname = window.location.hostname;
  //     const port = window.location.port;
      
  //     // If running on localhost, show the actual server IP instead of localhost
  //     displayUrl = protocol + '//' + hostname + (port ? ':' + port : '');
  //     if (hostname === 'localhost' || hostname === '127.0.0.1') {
  //       // Replace localhost with a generic local IP
  //       const localIP = '192.168.1.137'; // This should be replaced with actual IP detection
  //       displayUrl = protocol + '//' + localIP + (port ? ':' + port : '');
  //     }
  //   }
    
  //   setIpAddress(displayUrl);
    
  //   // Regenerate the QR code
  //   QRCode.toDataURL(displayUrl, { width: 300, margin: 2 })
  //     .then(setQrCodeUrl)
  //     .catch((error) => {
  //       console.error('Error generating QR code:', error);
  //     });
  // };

  const handleRefresh = async () => {
    await getActualIP();
    
    // Refresh the QR code with current IP
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    let displayUrl = protocol + '//' + hostname + (port ? ':' + port : '');
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const localIP = '192.168.1.137'; // Replace with actual IP in your environment
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
          
          {/* <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Access URL:
            </p>
            <p className="font-mono text-lg font-semibold">
              {ipAddress}
            </p>
            
            {/* Custom URL Input Section */}
            {/* <div className="pt-4 space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUsingCustomUrl}
                    onChange={(e) => setIsUsingCustomUrl(e.target.checked)}
                    className="rounded text-[#50BAA8] focus:ring-[#50BAA8]"
                  />
                  <span className="text-sm">Use custom URL</span>
                </label>
              </div>
              
              {isUsingCustomUrl && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Enter custom URL (e.g., https://yourdomain.com)"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter your deployed URL to generate QR code for production
                  </p>
                </div>
              )}
            </div>
           */}
          <div className="pt-4 w-full flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={handleDownloadPDF}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download as PDF
            </Button>
            {/* <Button 
              className="w-full" 
              onClick={handleRefresh}
              variant="outline"
            >
              Refresh QR Code
            </Button> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}