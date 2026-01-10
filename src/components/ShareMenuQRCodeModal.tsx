import { memo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { X, Copy } from "lucide-react";

interface ShareMenuQRCodeModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Optional override for the URL embedded in the QR code.
   * Defaults to the current origin.
   */
  baseUrl?: string;
}

function ShareMenuQRCodeModalBase({
  open,
  onClose,
  baseUrl = typeof window !== "undefined" ? window.location.origin : "https://nibblesfastfood.com",
}: ShareMenuQRCodeModalProps) {
  if (!open) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
    } catch (err) {
      console.error("Failed to copy QR link", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-background rounded-xl p-6 max-w-sm w-full border shadow-2xl">
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3"
          onClick={onClose}
          data-testid="button-close-qr-modal"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="text-center space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Scan to Share Menu</h3>
            <p className="text-sm text-muted-foreground">
              Let guests open the menu instantly from their phones.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="p-3 bg-white border rounded-xl">
              <QRCodeSVG
                value={baseUrl}
                size={200}
                level="H"
                includeMargin={true}
                className="drop-shadow-lg"
              />
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground bg-muted p-3 rounded-md text-left">
            <p className="font-medium text-foreground">How to share</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download or screenshot this QR code.</li>
              <li>Place it on table tents, receipts, or WhatsApp.</li>
              <li>Guests scan to open {baseUrl} instantly.</li>
            </ol>
          </div>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full"
            data-testid="button-copy-qr-link"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Site Link
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ShareMenuQRCodeModal = memo(ShareMenuQRCodeModalBase);

export default ShareMenuQRCodeModal;
