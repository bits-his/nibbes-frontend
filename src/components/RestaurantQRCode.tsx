import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface RestaurantQRCodeProps {
  baseUrl?: string;
  size?: number;
}

export function RestaurantQRCode({
  baseUrl = 'https://nibbleskitchen.netlify.app',
  size = 256
}: RestaurantQRCodeProps) {
  const [copied, setCopied] = useState(false);

  // QR Code URL with UTM parameters for tracking
  const qrCodeUrl = `${baseUrl}/?utm_source=restaurant_qr&utm_medium=scan&utm_campaign=offline_marketing`;

  const handleDownloadPNG = () => {
    const canvas = document.createElement('canvas');
    const svg = document.getElementById('restaurant-qr-code') as unknown as SVGElement;

    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = size * 2; // Higher resolution
      canvas.height = size * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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

    const svgData = new XMLSerializer().serializeToString(svg);
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Restaurant QR Code</CardTitle>
        <CardDescription>
          Scan to visit Nibbles Kitchen website with tracking parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center p-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <QRCodeSVG
            id="restaurant-qr-code"
            value={qrCodeUrl}
            size={size}
            level="H"
            includeMargin={true}
            fgColor="#50BAA8"
            bgColor="#ffffff"
          />
        </div>

        {/* URL Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">QR Code URL:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={qrCodeUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyUrl}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* UTM Parameters Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900">Tracking Parameters:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>Source:</strong> restaurant_qr</li>
            <li><strong>Medium:</strong> scan</li>
            <li><strong>Campaign:</strong> offline_marketing</li>
          </ul>
          <p className="text-xs text-blue-700 mt-2">
            These parameters will help track how many customers visit from scanning the QR code
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleDownloadPNG}
            className="flex-1 bg-[#50BAA8] hover:bg-[#50BAA8]/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PNG (High Res)
          </Button>
          <Button
            onClick={handleDownloadSVG}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Download SVG (Vector)
          </Button>
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-gray-900">How to Use:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Download the QR code in your preferred format (PNG for printing, SVG for editing)</li>
            <li>Print the QR code on table tents, menus, or posters in your restaurant</li>
            <li>Customers can scan it with their phone camera to visit your menu</li>
            <li>Track scans through your analytics dashboard using the UTM parameters</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
