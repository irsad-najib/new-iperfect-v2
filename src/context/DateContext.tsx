import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import api from "@/utils/axios";

interface DateContextType {
  selectedDate: Dayjs;
  setSelectedDate: (date: Dayjs) => void;
  formattedDate: string;
  loading: boolean;
  error: string | null;
  externalData: ExternalData[];
  refreshData: () => Promise<void>;
}

interface ExternalData {
  key: number;
  profile_id: string;
  profile_name: string;
  completed: number;
  version: string;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('selectedDate');
      return savedDate ? dayjs(savedDate) : dayjs().subtract(1, "day");
    }
    return dayjs().subtract(1, "day");
  });
  const [externalData, setExternalData] = useState<ExternalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = selectedDate.format("YYYY-MM-DD");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedDate', selectedDate.format('YYYY-MM-DD'));
    }
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/external_data/status/${formattedDate}`);
      setExternalData(response.data);
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const memoizedFetchData = useCallback(fetchData, [formattedDate]);

  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        formattedDate,
        loading,
        error,
        externalData,
        refreshData: memoizedFetchData,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
}
