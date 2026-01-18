import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface Settings {
  deliveryEnabled: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: Settings = {
  deliveryEnabled: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiRequest('GET', '/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || defaultSettings);
      } else {
        // If API fails, use localStorage as fallback
        const stored = localStorage.getItem('restaurant_settings');
        if (stored) {
          setSettings(JSON.parse(stored));
        } else {
          setSettings(defaultSettings);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('restaurant_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      } else {
        setSettings(defaultSettings);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Try API first
      const response = await apiRequest('POST', '/api/settings', { settings: updatedSettings });
      
      if (response.ok) {
        setSettings(updatedSettings);
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('API failed, using localStorage:', error);
      // Fallback to localStorage
      const updatedSettings = { ...settings, ...newSettings };
      localStorage.setItem('restaurant_settings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
