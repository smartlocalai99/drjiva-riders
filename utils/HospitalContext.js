import { createContext, useContext, useEffect, useState } from 'react';
import { listHospitals } from '../lib/hospitals';

const HospitalContext = createContext(null);
const STORAGE_KEY = 'medisin_current_hospital_id';

export function HospitalProvider({ children }) {
  const [hospitals, setHospitals] = useState([]);
  const [currentHospitalId, setCurrentHospitalIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHospitals()
      .then((data) => {
        setHospitals(data);
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const validStored = data.find((h) => h.id === stored);
        setCurrentHospitalIdState(validStored ? stored : data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setCurrentHospitalId = (id) => {
    setCurrentHospitalIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const currentHospital = hospitals.find((h) => h.id === currentHospitalId) ?? null;

  return (
    <HospitalContext.Provider
      value={{ hospitals, currentHospital, currentHospitalId, setCurrentHospitalId, loading }}
    >
      {children}
    </HospitalContext.Provider>
  );
}

export const useHospital = () => useContext(HospitalContext);
