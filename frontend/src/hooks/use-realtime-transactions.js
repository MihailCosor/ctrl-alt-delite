import { useState, useEffect, useCallback } from 'react';

export function useRealtimeTransactions(interval = 1000) {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLatestTransactions = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/transactions/latest?limit=20&page=${page}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
      setLastUpdate(data.timestamp);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    }
  }, []);

  const fetchData = useCallback(async (page = currentPage) => {
    await Promise.all([fetchLatestTransactions(page), fetchStats()]);
    setLoading(false);
  }, [fetchLatestTransactions, fetchStats, currentPage]);

  const changePage = useCallback((page) => {
    setCurrentPage(page);
    fetchLatestTransactions(page);
  }, [fetchLatestTransactions]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval for real-time updates (only refresh current page)
    const intervalId = setInterval(() => fetchData(currentPage), interval);

    return () => clearInterval(intervalId);
  }, [fetchData, interval, currentPage]);

  return {
    transactions,
    stats,
    pagination,
    loading,
    error,
    lastUpdate,
    currentPage,
    refetch: () => fetchData(currentPage),
    changePage
  };
}

