"use client";

import { useState } from 'react';
import { useRealtimeTransactions } from '@/hooks/use-realtime-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TransactionModal } from './transaction-modal';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  Building2,
  ShieldCheck
} from 'lucide-react';

export function TransactionDashboard() {
  const { transactions, stats, pagination, loading, error, lastUpdate, currentPage, refetch, changePage } = useRealtimeTransactions(1000);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
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
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Transactions</CardTitle>
            <Database className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.total?.toLocaleString() || 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All time processed
            </p>
          </CardContent>
        </Card>

        <Card className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm ${
          parseFloat(stats?.fraudRate || 0) > 5 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Fraud Rate
            </CardTitle>
            {parseFloat(stats?.fraudRate || 0) > 5 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              parseFloat(stats?.fraudRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
            }`}>
              {stats?.fraudRate || 0}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.fraud || 0} fraud / {stats?.nonFraud || 0} legitimate
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Recent Activity</CardTitle>
            <Activity className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.recentActivity || 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Last hour
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Update</CardTitle>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Auto-refresh every second
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 dark:text-slate-100">Transaction History</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Latest 100 transactions • Page {currentPage} of {pagination?.totalPages || 1}
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

