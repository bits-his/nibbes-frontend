import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ServiceCharge {
  id: string;
  description: string;
  type: 'fixed' | 'percentage';
  amount: number;
  status: 'active' | 'inactive';
}

interface ServiceChargesContextType {
  serviceChargeRate: number;
  vatRate: number;
  isLoading: boolean;
  refreshCharges: () => Promise<void>;
}

const ServiceChargesContext = createContext<ServiceChargesContextType | undefined>(undefined);

const DEFAULT_CHARGES = {
  serviceCharge: 0,  // 0% - No service charge
  vat: 0             // 0% - No VAT
};

const CACHE_KEY = 'service_charges_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 'v2'; // Increment to invalidate old cache

export function ServiceChargesProvider({ children }: { children: ReactNode }) {
  const [serviceChargeRate, setServiceChargeRate] = useState(DEFAULT_CHARGES.serviceCharge);
  const [vatRate, setVatRate] = useState(DEFAULT_CHARGES.vat);
  const [isLoading, setIsLoading] = useState(true);

  const updateChargesFromData = (charges: ServiceCharge[]) => {
    // Find service charge and VAT
    const serviceCharge = charges.find(c => 
      c.description.toLowerCase().includes('service') && c.type === 'percentage'
    );
    const vat = charges.find(c => 
      c.description.toLowerCase().includes('vat') && c.type === 'percentage'
    );

    const newServiceCharge = serviceCharge?.amount || DEFAULT_CHARGES.serviceCharge;
    const newVat = vat?.amount || DEFAULT_CHARGES.vat;

    setServiceChargeRate(newServiceCharge);
    setVatRate(newVat);

    // Update cache
    const newCharges = {
      serviceCharge: newServiceCharge,
      vat: newVat,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(newCharges));
  };

  const fetchCharges = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/service-charges/active`);
      
      if (!response.ok) throw new Error('Failed to fetch charges');
      
      const charges: ServiceCharge[] = await response.json();
      
      updateChargesFromData(charges);
      
      const serviceChargeItem = charges.find(c => c.type === 'service_charge');
      const vatItem = charges.find(c => c.type === 'vat');
      
      return {
        serviceCharge: serviceChargeItem?.amount || DEFAULT_CHARGES.serviceCharge,
        vat: vatItem?.amount || DEFAULT_CHARGES.vat,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
    } catch (error) {
      console.error('Error fetching service charges:', error);
      // Use defaults on error
      return {
        serviceCharge: DEFAULT_CHARGES.serviceCharge,
        vat: DEFAULT_CHARGES.vat,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
    }
  };

  const loadCharges = async () => {
    setIsLoading(true);
    
    // Try to load from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        const age = Date.now() - cachedData.timestamp;
        
        // Check cache version and age
        if (cachedData.version === CACHE_VERSION && age < CACHE_DURATION) {
          setServiceChargeRate(cachedData.serviceCharge);
          setVatRate(cachedData.vat);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing cached charges:', e);
      }
    }

    // Cache expired, wrong version, or doesn't exist - fetch fresh data
    await fetchCharges();
    setIsLoading(false);
  };

  const refreshCharges = async () => {
    await fetchCharges();
  };

  useEffect(() => {
    loadCharges();
  }, []);

  // Listen for service charge updates from existing WebSocket connections
  useEffect(() => {
    const handleServiceChargesUpdate = (event: any) => {
      console.log('📢 Service charges updated via custom event:', event.detail);
      if (event.detail) {
        updateChargesFromData(event.detail);
      }
    };

    window.addEventListener('service-charges-updated', handleServiceChargesUpdate);

    return () => {
      window.removeEventListener('service-charges-updated', handleServiceChargesUpdate);
    };
  }, []);

  return (
    <ServiceChargesContext.Provider value={{ serviceChargeRate, vatRate, isLoading, refreshCharges }}>
      {children}
    </ServiceChargesContext.Provider>
  );
}

export function useServiceCharges() {
  const context = useContext(ServiceChargesContext);
  if (context === undefined) {
    throw new Error('useServiceCharges must be used within a ServiceChargesProvider');
  }
  return context;
}
