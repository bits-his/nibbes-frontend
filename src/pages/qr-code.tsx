import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Utensils } from 'lucide-react'; // Added Utensils for logo example

// Placeholder for a small logo (e.g., a simplified Nibbles icon)
// In a real app, you would import a small PNG/SVG or use a dedicated component.
const LOGO_BASE64 = 'data:image/png;base64,...'; // Replace with an actual base64 image string

export default function QRCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const qrCodeRef = useRef<HTMLImageElement>(null);

  // --- Configuration for Unique Design ---
  const PRIMARY_COLOR = '#50BAA8'; // A distinct, unique color for the QR code
  const BACKGROUND_COLOR = '#FFFFFF'; // White or a light color
  // ----------------------------------------

  useEffect(() => {
    const generateQrCode = (url: string) => {
      // **MODIFIED:** Added `color` option for a unique look
      QRCode.toDataURL(url, { 
        width: 300, 
        margin: 2, 
        color: {
          dark: PRIMARY_COLOR,   // Color of the modules (the "dark" parts)
          light: BACKGROUND_COLOR // Color of the background (the "light" parts)
        },
        errorCorrectionLevel: 'H' // Use High ECC to allow for a logo overlay
      })
        .then(setQrCodeUrl)
        .catch((error) => {
          console.error('Error generating QR code:', error);
        });
    };
    
    // Logic to determine the display URL (using window.location.origin as before)
    const displayUrl = window.location.origin;
    
    setIpAddress(displayUrl);
    generateQrCode(displayUrl);
  }, []);

  const handleDownloadPDF = () => {
    if (!qrCodeUrl) {
      console.error('No QR code available to download');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const qrWidth = 100;
      const qrHeight = 100;
      const x = (pdfWidth - qrWidth) / 2;
      const y = (pdfHeight - qrHeight) / 2 - 10;
      
      // Add title
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40); // Dark text color
      pdf.text('Nibbles', pdfWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text('Scan this Unique QR Code to access the menu', pdfWidth / 2, 30, { align: 'center' });
      
      // Add the URL
      pdf.setFontSize(10);
      pdf.text(`URL: ${ipAddress}`, pdfWidth / 2, 40, { align: 'center' });
      
      // Add the QR code image
      pdf.addImage(qrCodeUrl, 'PNG', x, y, qrWidth, qrHeight);

      // (Optional: Add Logo Overlay to PDF) - This is complex and usually requires embedding the logo on the QR code *image* before converting to data URL.
      // For simplicity, we'll rely on the colored QR code.
      
      // Add instructions
      if (ipAddress.includes('192.168.') || ipAddress.includes('localhost') || ipAddress.includes('127.0.0.1')) {
        pdf.setFontSize(8);
        pdf.text('Make sure your device is on the same network', pdfWidth / 2, pdfHeight - 20, { align: 'center' });
      }
      
      pdf.save(`nibbles-kitchen-qr-code-unique-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif text-[#50BAA8]">Nibbles</CardTitle>
          <CardDescription>Scan this **uniquely styled** QR code to access the menu directly</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {qrCodeUrl ? (
            // **MODIFIED:** Added a container for the logo overlay
            <div className="p-4 bg-white rounded-lg relative shadow-xl">
              <img 
                src={qrCodeUrl} 
                alt="Unique QR Code for menu access" 
                className="w-64 h-64 object-contain"
                ref={qrCodeRef}
              />
              {/* --- Unique Element: Centered Logo Overlay --- */}
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div 
                  className="bg-white rounded-xl p-2 shadow-lg" 
                  style={{ width: '20%', height: '20%' }}
                >
                  {/* Using an icon for demonstration */}
                  <Utensils className="w-full h-full text-[#50BAA8]" />
                  {/* Or you could use: <img src={LOGO_BASE64} alt="Logo" className="w-full h-full object-contain"/> */}
                </div>
              </div>
              {/* ------------------------------------------- */}
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-muted-foreground">Generating unique QR code...</div>
            </div>
          )}
          
          <div className="pt-4 w-full flex flex-col gap-2">
            <Button 
              className="w-full bg-[#50BAA8] hover:bg-[#45a089] text-white" 
              onClick={handleDownloadPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Unique PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// new design
// import { useEffect, useState, useRef, useCallback } from 'react';
// import QRCode from 'qrcode';
// import { jsPDF } from 'jspdf';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Download, Sparkles } from 'lucide-react'; 

// // --- Configuration moved OUTSIDE the component function (Essential for JSX access) ---
// const QR_SIZE = 400; 
// const MODULE_COLOR_START = '#fcae47';
// const MODULE_COLOR_END = '#50BAA8';  
// const BACKGROUND_COLOR = '#f8f9fa';
// const LOGO_SIZE_RATIO = 0.22; 
// const BORDER_THICKNESS = 15;
// const INNER_PADDING = 20;
// const QR_DOT_RADIUS_RATIO = 0.4;
// // -----------------------------------------------------------------------------------

// export default function QRCodePage() {
//   const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
//   const [ipAddress, setIpAddress] = useState<string>('');
//   const [isDrawing, setIsDrawing] = useState(true); // Added state to manage loading overlay
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   // Note: All constants are now globally accessible

//   const drawUniqueQRCode = useCallback(async (url: string) => {
//     // 1. Critical Check: Ensure ref is attached and context is available
//     if (!canvasRef.current) return;
//     setIsDrawing(true); // Start drawing status

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) {
//         setIsDrawing(false);
//         return;
//     }

//     // Clear canvas for redraw
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     try {
//       // We don't need qrData, only the QR object for custom drawing
//       const qr = await QRCode.create(url, { errorCorrectionLevel: 'H' });
//       const moduleCount = qr.modules.length;
//       const moduleSize = QR_SIZE / moduleCount;

//       // Set canvas dimensions
//       canvas.width = QR_SIZE + (BORDER_THICKNESS * 2) + (INNER_PADDING * 2);
//       canvas.height = QR_SIZE + (BORDER_THICKNESS * 2) + (INNER_PADDING * 2);
      
//       const totalOffset = BORDER_THICKNESS + INNER_PADDING;


//       // 2. Draw Background
//       ctx.fillStyle = BACKGROUND_COLOR;
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
      
//       const gradientBg = ctx.createRadialGradient(
//         canvas.width / 2, canvas.height / 2, 0,
//         canvas.width / 2, canvas.height / 2, canvas.width / 2
//       );
//       gradientBg.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
//       gradientBg.addColorStop (1, 'rgba(240, 240, 240, 0.8)');
//       ctx.fillStyle = gradientBg;
//       ctx.fillRect(0, 0, canvas.width, canvas.height);

//       // 3. Draw the Custom Frame 
//       ctx.strokeStyle = MODULE_COLOR_START; 
//       ctx.lineWidth = 2; 

//       const frameX = BORDER_THICKNESS / 2;
//       const frameY = BORDER_THICKNESS / 2;
//       const frameWidth = canvas.width - BORDER_THICKNESS;
//       const frameHeight = canvas.height - BORDER_THICKNESS;
//       const frameCornerRadius = 25; 

//       ctx.beginPath();
//       ctx.moveTo(frameX + frameCornerRadius, frameY);
//       ctx.arcTo(frameX + frameWidth, frameY, frameX + frameWidth, frameY + frameHeight, frameCornerRadius);
//       ctx.arcTo(frameX + frameWidth, frameY + frameHeight, frameX, frameY + frameHeight, frameCornerRadius);
//       ctx.arcTo(frameX, frameY + frameHeight, frameX, frameY, frameCornerRadius);
//       ctx.arcTo(frameX, frameY, frameX + frameWidth, frameY, frameCornerRadius);
//       ctx.closePath();
      
//       ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
//       ctx.fill();
//       ctx.stroke();

//       // Inner frame detail
//       ctx.strokeStyle = MODULE_COLOR_END;
//       ctx.lineWidth = 1;
//       ctx.beginPath();
//       ctx.moveTo(totalOffset - INNER_PADDING + 10, totalOffset - INNER_PADDING);
//       ctx.lineTo(canvas.width - totalOffset + INNER_PADDING - 10, totalOffset - INNER_PADDING);
//       ctx.stroke();
//       ctx.beginPath();
//       ctx.moveTo(totalOffset - INNER_PADDING + 10, canvas.height - totalOffset + INNER_PADDING);
//       ctx.lineTo(canvas.width - totalOffset + INNER_PADDING - 10, canvas.height - totalOffset + INNER_PADDING);
//       ctx.stroke();


//       // 4. Draw the QR Modules with Gradient and Rounded Dots
//       const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
//       gradient.addColorStop(0, MODULE_COLOR_START);
//       gradient.addColorStop(1, MODULE_COLOR_END);
//       ctx.fillStyle = gradient;

//       for (let row = 0; row < moduleCount; row++) {
//         for (let col = 0; col < moduleCount; col++) {
//           // Skip drawing modules in the center logo area
//           const isCenter = col > (moduleCount / 2 - moduleCount * LOGO_SIZE_RATIO / 2) && 
//                            col < (moduleCount / 2 + moduleCount * LOGO_SIZE_RATIO / 2) && 
//                            row > (moduleCount / 2 - moduleCount * LOGO_SIZE_RATIO / 2) && 
//                            row < (moduleCount / 2 + moduleCount * LOGO_SIZE_RATIO / 2);
                           
//           if (qr.modules[row][col] && !isCenter) { 
//             const x = col * moduleSize + totalOffset + moduleSize / 2;
//             const y = row * moduleSize + totalOffset + moduleSize / 2;
//             const dotRadius = moduleSize * QR_DOT_RADIUS_RATIO;

//             ctx.beginPath();
//             ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
//             ctx.fill();
//           }
//         }
//       }

//       // 5. Integrate a Stylized Logo in the Center
//       const logoWidth = QR_SIZE * LOGO_SIZE_RATIO;
//       const logoHeight = QR_SIZE * LOGO_SIZE_RATIO;
      
//       const centerX = totalOffset + QR_SIZE / 2;
//       const centerY = totalOffset + QR_SIZE / 2;

//       // Create a clear circle behind the logo for better readability
//       const clearZoneRadius = (logoWidth / 2) * 1.2; 
//       ctx.beginPath();
//       ctx.arc(centerX, centerY, clearZoneRadius, 0, Math.PI * 2);
//       ctx.fillStyle = 'white'; 
//       ctx.fill();

//       // Draw the stylized logo (Circle with 'N')
//       ctx.beginPath();
//       ctx.arc(centerX, centerY, logoWidth / 3, 0, Math.PI * 2);
//       ctx.fillStyle = MODULE_COLOR_END;
//       ctx.fill();
      
//       ctx.save();
//       ctx.font = `${logoHeight * 0.4}px sans-serif`; 
//       ctx.textAlign = 'center';
//       ctx.textBaseline = 'middle';
//       ctx.fillStyle = 'white';
//       ctx.fillText('N', centerX, centerY + 2);
//       ctx.restore();


//       // Finally, set the data URL and stop drawing state
//       setQrCodeUrl(canvas.toDataURL('image/png'));
//       setIsDrawing(false); 

//     } catch (error) {
//       console.error('Error drawing unique QR code:', error);
//       setQrCodeUrl(null);
//       setIsDrawing(false); // Ensure loading state is turned off on error
//     }
//   }, []);

//   useEffect(() => {
//     const displayUrl = window.location.origin;
//     setIpAddress(displayUrl);
    
//     // Check ref synchronously after mount
//     if (canvasRef.current) {
//         drawUniqueQRCode(displayUrl);
//     }
//     // Dependency on drawUniqueQRCode ensures it runs when the function is defined
//   }, [drawUniqueQRCode]); 
  
//   // --- PDF Download Handler ---
//   const handleDownloadPDF = () => {
//     if (!qrCodeUrl) {
//       console.error('No QR code available to download');
//       return;
//     }

//     try {
//       const pdf = new jsPDF('p', 'mm', 'a4');
//       const pdfWidth = pdf.internal.pageSize.getWidth();
//       const pdfHeight = pdf.internal.pageSize.getHeight();
      
//       const qrPdfWidth = 120; 
//       const qrPdfHeight = 120;
//       const x = (pdfWidth - qrPdfWidth) / 2;
//       const y = (pdfHeight - qrPdfHeight) / 2 - 15;
      
//       pdf.setFontSize(22);
//       pdf.setTextColor('#fcae47'); 
//       pdf.text('Nibbles', pdfWidth / 2, 25, { align: 'center' });
      
//       pdf.setFontSize(14);
//       pdf.setTextColor(60, 60, 60);
//       pdf.text('Scan this Enchanted Menu QR Code', pdfWidth / 2, 35, { align: 'center' });
      
//       pdf.setFontSize(10);
//       pdf.text(`Access URL: ${ipAddress}`, pdfWidth / 2, 45, { align: 'center' });
      
//       pdf.addImage(qrCodeUrl, 'PNG', x, y, qrPdfWidth, qrPdfHeight);
      
//       if (ipAddress.includes('192.168.') || ipAddress.includes('localhost') || ipAddress.includes('127.0.0.1')) {
//         pdf.setFontSize(8);
//         pdf.text('Ensure your device is on the same local network for access.', pdfWidth / 2, pdfHeight - 20, { align: 'center' });
//       }
      
//       pdf.save(`nibbles-kitchen-enchanted-qr-code-${new Date().toISOString().slice(0, 10)}.pdf`);
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-lg bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl">
//         <CardHeader className="text-center p-6">
//           <CardTitle className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#fcae47] to-[#50BAA8]">
//             Nibbles
//           </CardTitle>
//           <CardDescription className="text-md text-gray-700">
//             Immerse yourself! Scan this intensely beautiful QR code for our menu.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="flex flex-col items-center space-y-8 p-6">
          
//           <div className="relative border-4 border-white rounded-3xl shadow-2xl overflow-hidden group">
            
//             {/* FIX: The canvas is now ALWAYS rendered, allowing the ref to attach */}
//             <canvas 
//               ref={canvasRef} 
//               className={`block max-w-full h-auto transition-opacity duration-500 ${isDrawing ? 'opacity-0' : 'opacity-100'}`}
//               style={{ width: `${QR_SIZE}px`, height: `${QR_SIZE}px` }} 
//               role="img" 
//               aria-label="Enchanted QR Code for Nibbles Menu"
//             />
            
//             {/* Show loading overlay when isDrawing is true */}
//             {isDrawing && (
//               <div 
//                 className="absolute inset-0 flex items-center justify-center bg-gray-100/90"
//                 style={{ width: `${QR_SIZE}px`, height: `${QR_SIZE}px` }} // Use QR_SIZE for the loading box for consistent size
//               >
//                 <div className="text-gray-500 font-semibold text-lg animate-pulse">Crafting Beauty...</div>
//               </div>
//             )}
            
//             {/* Show hover effect when drawing is complete */}
//             {!isDrawing && (
//               <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
//                  <Sparkles className="w-20 h-20 text-white animate-pulse" />
//               </div>
//             )}
//           </div>
          
//           <div className="w-full flex flex-col gap-3">
//             <Button 
//               className="w-full text-lg py-3 rounded-full bg-gradient-to-r from-[#fcae47] to-[#50BAA8] text-white font-semibold shadow-lg 
//                          hover:from-[#e09a3c] hover:to-[#45a089] transition-all duration-300 transform hover:scale-105" 
//               onClick={handleDownloadPDF}
//               // Disable button if drawing is still in progress
//               disabled={isDrawing || !qrCodeUrl}
//             >
//               <Download className="w-5 h-5 mr-3" />
//               Download Enchanted Menu PDF
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }