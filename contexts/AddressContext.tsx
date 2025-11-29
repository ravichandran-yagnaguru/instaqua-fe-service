import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface Address {
  id: string;
  label: string;
  fullAddress: string;
  coordinates: { latitude: number; longitude: number };
  isDefault: boolean;
}

export interface AddressContextType {
  selectedAddress: Address | null;
  setAddress: (address: Address | null) => void;
  refreshDefault: () => Promise<void>;
  initialized: boolean;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Persist selected address in localStorage (or AsyncStorage for React Native)
  const STORAGE_KEY = 'instaqua_selected_address_id';

  const refreshDefault = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setAddress(null);
      setInitialized(true);
      return;
    }
    // Get all addresses
    const allSnap = await getDocs(collection(db, `users/${user.uid}/addresses`));
    const addresses: Address[] = allSnap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        label: data.label || '',
        fullAddress: data.fullAddress || data.address || '',
        coordinates: data.coordinates || { latitude: 0, longitude: 0 },
        isDefault: !!data.isDefault,
      };
    });
    // Try to get selected address from storage
    let selectedId: string | null = null;
    try {
      selectedId = localStorage.getItem(STORAGE_KEY);
    } catch {}
    let selected: Address | null = null;
    if (selectedId) {
      selected = addresses.find(a => a.id === selectedId) || null;
    }
    if (!selected) {
      // Fallback to default address
      selected = addresses.find(a => a.isDefault) || null;
    }
    setAddress(selected || null);
    setInitialized(true);
  }, []);

  // When user selects an address, persist it
  const setSelectedAddress = (addr: Address | null) => {
    setAddress(addr);
    try {
      if (addr) {
        localStorage.setItem(STORAGE_KEY, addr.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  };

  useEffect(() => {
    if (auth.currentUser && !initialized) {
      refreshDefault();
    }
    // Optionally, listen for auth changes and refresh
    // eslint-disable-next-line
  }, [refreshDefault, initialized]);

  return (
    <AddressContext.Provider value={{ selectedAddress: address, setAddress: setSelectedAddress, refreshDefault, initialized }}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress must be used within an AddressProvider');
  return ctx;
}
