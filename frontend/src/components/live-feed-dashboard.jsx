"use client";

import { useState, useEffect } from 'react';
import { useRealtimeTransactions } from '@/hooks/use-realtime-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TransactionModal } from './transaction-modal';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  Building2,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export function LiveFeedDashboard() {
  const { transactions, stats, pagination, loading, error, lastUpdate, currentPage, refetch, changePage } = useRealtimeTransactions(1000);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fraudTrend, setFraudTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);

  // Fetch fraud trend data
  const fetchFraudTrend = async () => {
    try {
      const response = await fetch('/api/transactions/fraud-trend');
      if (response.ok) {
        const data = await response.json();
        setFraudTrend(data);
      }
    } catch (err) {
      console.error('Error fetching fraud trend:', err);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudTrend();
    // Refresh trend data every 30 seconds
    const interval = setInterval(fetchFraudTrend, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading transaction data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Alert */}
      <Alert className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <Database className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-slate-900 dark:text-slate-100">System Status: Online</AlertTitle>
        <AlertDescription className="text-slate-600 dark:text-slate-400">
          Connected to MongoDB • Auto-refresh every second • ML fraud detection active
        </AlertDescription>
      </Alert>

      {/* Fraud Trend Graph */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
                Fraud Trend (Last 24 Hours)
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                1-hour intervals • Real-time fraud rate monitoring
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchFraudTrend} className="border-slate-300 dark:border-slate-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {trendLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : fraudTrend && fraudTrend.trendData ? (
            <div className="space-y-4">
              {/* Line chart representation */}
              <div className="relative h-48 overflow-x-auto">
                <div className="min-w-[600px] h-full relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-500 dark:text-slate-400 pr-2">
                    <span>50%</span>
                    <span>40%</span>
                    <span>30%</span>
                    <span>20%</span>
                    <span>10%</span>
                    <span>0%</span>
                  </div>
                  
                  {/* Chart area */}
                  <div className="ml-8 mr-4 h-full relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 10, 20, 30, 40, 50].map((value) => (
                        <div
                          key={value}
                          className="absolute w-full border-t border-slate-200 dark:border-slate-700"
                          style={{ bottom: `${(value / 50) * 100}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* Line chart */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Fraud rate line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.4"
                        points={fraudTrend.trendData.map((data, index) => {
                          const x = (index / (fraudTrend.trendData.length - 1)) * 100;
                          const y = 100 - (parseFloat(data.fraudRate) / 50) * 100;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                      
                      {/* Data points */}
                      {fraudTrend.trendData.map((data, index) => {
                        const x = (index / (fraudTrend.trendData.length - 1)) * 100;
                        const y = 100 - (parseFloat(data.fraudRate) / 50) * 100;
                        const isHighFraud = parseFloat(data.fraudRate) > 5;
                        
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="1.5"
                            fill={isHighFraud ? "#ef4444" : "#3b82f6"}
                            stroke="white"
                            strokeWidth="0.2"
                            className="hover:r-2 transition-all duration-200"
                          >
                            <title>{`${data.time}: ${data.fraudRate}% (${data.fraud}/${data.total})`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      {fraudTrend.trendData.filter((_, index) => index % 4 === 0).map((data, index) => (
                        <span key={index} className="transform -rotate-45 origin-left">
                          {data.time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend and summary */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Normal Rate</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">High Risk</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Last updated: {fraudTrend.timestamp ? new Date(fraudTrend.timestamp).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No trend data available</p>
              <p className="text-sm">Waiting for fraud trend data...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Feed Header */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                <Activity className="h-6 w-6 text-blue-600 mr-3" />
                Live Transaction Feed
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Real-time transaction monitoring • Latest 100 transactions • Page {currentPage} of {pagination?.totalPages || 1}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} className="border-slate-300 dark:border-slate-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No transactions found</p>
              <p className="text-sm">Waiting for transaction data...</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.map((transaction, index) => {
                  const tx = transaction.transaction;
                  const isFraud = transaction.classification === 1;
                  
                  return (
                    <div
                      key={transaction._id || index}
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                        isFraud ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
                      }`}
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setIsModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Status indicator */}
                          <div className={`p-2 rounded-full ${
                            isFraud ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            {isFraud ? (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          
                          {/* Transaction details */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-slate-500" />
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  ${parseFloat(tx?.amt || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {tx?.merchant || 'Unknown'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {tx?.first} {tx?.last}
                              </span>
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {tx?.city}, {tx?.state}
                              </span>
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {tx?.trans_date} {tx?.trans_time}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={isFraud ? "destructive" : "default"} 
                            className={`text-xs ${
                              isFraud 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}
                          >
                            {isFraud ? 'FRAUD' : 'LEGITIMATE'}
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => changePage(pageNum)}
                            className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300 dark:border-slate-600"}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
        }}
      />
    </div>
  );
}
