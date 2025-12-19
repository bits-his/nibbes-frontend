import { RestaurantQRCode } from '@/components/RestaurantQRCode';
import { SEO } from '@/components/SEO';

export default function QRCodePage() {
  // Get the production URL from environment variable or use Netlify URL as fallback
  const baseUrl = import.meta.env.VITE_PRODUCTION_URL || 'https://192.168.1.136:5173';

  return (
    <>
      <SEO
        title="Restaurant QR Code"
        description="Download the Nibbles Kitchen QR code for your restaurant. Customers can scan to access our menu and place orders online."
        keywords="restaurant QR code, menu QR code, scan to order, contactless menu"
        ogUrl={`${baseUrl}/qr-code`}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <RestaurantQRCode baseUrl={baseUrl} size={300} />
      </div>
    </>
  );
}
