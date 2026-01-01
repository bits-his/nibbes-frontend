// This file is deprecated and no longer used
// PDF receipt functionality has been moved to inline display in checkout.tsx
// and new tab display in order-management.tsx

export const usePrint = () => {
  console.warn('usePrint hook is deprecated. Use inline PDF display instead.')
  
  return {
    printInvoice: () => {},
    pdfData: null,
    showPdfModal: false,
    closePdfModal: () => {}
  }
}
