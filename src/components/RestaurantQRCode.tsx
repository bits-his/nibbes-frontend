import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Copy, Check, Smartphone, Printer, QrCode, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge'; // Assuming you have Badge component

interface RestaurantQRCodeProps {
  baseUrl?: string;
  size?: number;
}

export function RestaurantQRCode({
  baseUrl = 'https://nibblesfastfood.com',
  size = 280
}: RestaurantQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [qrColor, setQrColor] = useState('#50BAA8'); // Restaurant brand color

  const qrCodeUrl = `${baseUrl}`;

  const handleDownloadPNG = () => {
    const canvas = document.createElement('canvas');
    const svg = document.getElementById('restaurant-qr-code') as unknown as SVGElement;

    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Create a rounded rectangle background
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 30);
        ctx.fill();

        // Draw QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw fork and knife icon in center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const iconSize = 40;
        
        // Draw white background circle for icon
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, iconSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border around icon
        ctx.strokeStyle = '#50BAA8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, iconSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = 'nibbles-kitchen-qr-code.png';
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDownloadSVG = () => {
    const svg = document.getElementById('restaurant-qr-code') as unknown as SVGElement;
    if (!svg) return;

    // Create a copy of the SVG to add the fork and knife icon
    const svgClone = svg.cloneNode(true) as SVGElement;
    
    // Create fork and knife icon group
    const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    iconGroup.setAttribute('transform', `translate(${size/2}, ${size/2})`);
    
    // Create white background circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '20');
    circle.setAttribute('fill', 'white');
    circle.setAttribute('stroke', '#50BAA8');
    circle.setAttribute('stroke-width', '2');
    
    // Create fork and knife icon (simplified SVG path)
    const utensilsIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    utensilsIcon.setAttribute('d', 'M-12,-6 L-12,6 M-10,-8 L-10,8 M-8,-10 L-8,10 L-4,6 L-4,14 L-2,16 L-2,6 L0,4 L0,-4 L-2,-6 L-2,-16 L-4,-14 L-4,-6 L-8,-10 M12,-6 L12,6 M10,-8 L10,8 M8,-10 L8,10 L4,6 L4,14 L2,16 L2,6 L0,4 L0,-4 L2,-6 L2,-16 L4,-14 L4,-6 L8,-10');
    utensilsIcon.setAttribute('stroke', '#50BAA8');
    utensilsIcon.setAttribute('stroke-width', '2');
    utensilsIcon.setAttribute('stroke-linecap', 'round');
    utensilsIcon.setAttribute('stroke-linejoin', 'round');
    utensilsIcon.setAttribute('fill', 'none');
    
    iconGroup.appendChild(circle);
    iconGroup.appendChild(utensilsIcon);
    svgClone.appendChild(iconGroup);

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.download = 'nibbles-kitchen-qr-code.svg';
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-emerald-50/50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Utensils className="h-8 w-8 text-amber-700" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Restaurant QR Code
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate and download a beautiful QR code for your restaurant tables, menus, and marketing materials.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - QR Code Display */}
          <Card className="border-2 border-gray-100 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5" />
                Your QR Code
              </CardTitle>
              <CardDescription>
                Scan this code to visit Nibbles Kitchen
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* QR Code Container with Decorative Frame */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-emerald-400/20 rounded-3xl blur-xl" />
                <div className="relative p-8 bg-white rounded-2xl border-2 border-gray-100 shadow-inner">
                  <div className="relative flex justify-center">
                    <QRCodeSVG
                      id="restaurant-qr-code"
                      value={qrCodeUrl}
                      size={size}
                      level="H"
                      includeMargin={true}
                      fgColor={qrColor}
                      bgColor="#ffffff"
                      className="drop-shadow-lg"
                    />
                    
                    {/* Fork and Knife Icon Overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-white p-2 rounded-full shadow-lg border-2 border-emerald-500">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Utensils className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL Display */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Website URL</label>
                  <Badge variant="outline" className="text-xs">
                    Live Preview
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono truncate">
                    {qrCodeUrl}
                  </div>
                  <Button
                    variant={copied ? "default" : "outline"}
                    size="icon"
                    onClick={handleCopyUrl}
                    className={`shrink-0 ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1 animate-in fade-in">
                    <Check className="h-3 w-3" /> Copied to clipboard!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Controls & Information */}
          <div className="space-y-6">
            {/* Download Section */}
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Options
                </CardTitle>
                <CardDescription>
                  Choose the format that fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Button
                    onClick={handleDownloadPNG}
                    className="h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Download PNG</div>
                        <div className="text-sm opacity-90">High resolution for printing</div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={handleDownloadSVG}
                    variant="outline"
                    className="h-14 border-2"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-semibold">Download SVG</div>
                        <div className="text-sm text-gray-600">Vector format for editing</div>
                      </div>
                    </div>
                  </Button>
                </div>
                
                <div className="text-sm text-gray-500 text-center">
                  <p>Files include restaurant branding and fork & knife icon</p>
                </div>
              </CardContent>
            </Card>

            {/* Usage Guide */}
            <Card className="border-2 border-amber-100 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Smartphone className="h-5 w-5" />
                  How to Use This QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-700 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Download & Print</h4>
                      <p className="text-sm text-gray-600">
                        Download the QR code with the fork & knife icon and print it on table tents, menus, or posters.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Place in Restaurant</h4>
                      <p className="text-sm text-gray-600">
                        Place QR codes at tables, near the entrance, or on takeout packaging for easy scanning.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Customers Scan</h4>
                      <p className="text-sm text-gray-600">
                        Customers scan with their phone camera to instantly access your digital menu and ordering.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Icon Preview */}
            <Card className="border-2 border-gray-100">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    QR Code Features
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Utensils className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Custom Restaurant Icon:</strong> The fork & knife icon in the center makes your QR code instantly recognizable as restaurant-related.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                      High-contrast design for easy scanning
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                      Restaurant-themed color scheme
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                      Professional fork & knife branding
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This QR code will always direct to <span className="font-mono text-gray-700">nibblesfastfood.com</span>
          </p>
          <p className="mt-1">
            Icon: <span className="font-medium">Fork & Knife</span> • Color: <span className="font-medium">Emerald Green</span>
          </p>
        </div>
      </div>
    </div>
  );
}