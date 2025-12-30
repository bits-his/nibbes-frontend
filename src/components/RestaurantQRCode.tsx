import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import { useState } from 'react';

export function RestaurantQRCode() {
  const [copied, setCopied] = useState(false);
  const qrUrl = 'https://nibbleskitchen.netlify.app';
  const brandColor = "#50BAA8";

  return (
    <div className="w-full max-w-md mx-auto bg-slate-50 rounded-[2rem] p-6 shadow-2xl border border-white">
      {/* QR Stage */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#50BAA8] to-emerald-400 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-white rounded-[1.5rem] p-8 flex flex-col items-center justify-center shadow-sm">
          <div className="relative p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <QRCodeSVG
              id="restaurant-qr-code"
              value={qrUrl}
              size={200}
              level="H"
              fgColor={brandColor}
              includeMargin={false}
              // This makes the QR "dots" look like rounded pixels
              imageSettings={{
                src: "/logo-icon.png", // Path to your logo
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-xl font-bold text-slate-900">Nibbles Kitchen</h3>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
              Live Menu <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </p>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Actions</span>
          <a href={qrUrl} target="_blank" className="text-xs text-[#50BAA8] hover:underline flex items-center gap-1">
            Preview Link <ExternalLink size={12} />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={() => {/* download logic */}}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all active:scale-95"
          >
            <Download className="mr-2 h-4 w-4" />
            Export High-Res PNG
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 h-12 rounded-xl border-slate-200"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            
            <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200">
              <Zap className="h-4 w-4 text-amber-500" />
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="p-4 bg-white/50 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-medium text-slate-500">Scan Reliability</span>
            <span className="text-[11px] font-bold text-emerald-600">Excellent</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[98%]" />
          </div>
        </div>
      </div>
    </div>
  );
}