"use client";

import { useRealtimeTransactions } from '@/hooks/use-realtime-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Database,
  RefreshCw,
  ShieldCheck,
  Brain,
  Zap,
  Eye,
  Lock,
  TrendingUp,
  Target
} from 'lucide-react';

export function TransactionDashboard() {
  const { stats, loading, error, refetch } = useRealtimeTransactions(1000);

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
      {/* First Line: Fraud Rate Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm ${
          parseFloat(stats?.fraudRate || 0) > 5 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Overall Fraud Rate
            </CardTitle>
            {parseFloat(stats?.fraudRate || 0) > 5 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${
              parseFloat(stats?.fraudRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
            }`}>
              {stats?.fraudRate || 0}%
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {stats?.fraud || 0} fraud transactions out of {stats?.total || 0} total
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Transactions</CardTitle>
            <Database className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats?.total?.toLocaleString() || 0}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              All time processed transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Line: Time-based Alert Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Last Minute Alerts */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Minute</CardTitle>
            <Clock className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.lastMinute?.fraudRate || 0}%
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats?.lastMinute?.fraud || 0} alerts / {stats?.lastMinute?.total || 0} transactions
            </p>
          </CardContent>
        </Card>

        {/* Last Hour Alerts */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Hour</CardTitle>
            <Activity className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.lastHour?.fraudRate || 0}%
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats?.lastHour?.fraud || 0} alerts / {stats?.lastHour?.total || 0} transactions
            </p>
          </CardContent>
        </Card>

        {/* Last 24 Hours Alerts */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Last 24 Hours</CardTitle>
            <AlertTriangle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.last24Hours?.fraudRate || 0}%
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats?.last24Hours?.fraud || 0} alerts / {stats?.last24Hours?.total || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Overview */}
      <div className="mt-12">
        <div className="max-w-7xl mx-auto px-4">
              {/* Header */}
              <div className="flex flex-row items-center justify-center mb-12">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    <img
                      src="/icon.png"
                      alt="Hive Guard Logo"
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <ShieldCheck className="h-8 w-8 text-blue-600 hidden" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hive Guard Platform</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Advanced fraud detection system with real-time monitoring
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {/* Purpose */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Protection</h4>
                  </div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Real-time fraud detection
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Transaction monitoring
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Risk assessment
                    </li>
                  </ul>
                </div>

                {/* Business Value */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Value</h4>
                  </div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Reduce losses
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Build trust
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Stay compliant
                    </li>
                  </ul>
                </div>

                {/* Core Features */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Technology</h4>
                  </div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Machine learning
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Geographic analysis
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Auto alerts
                    </li>
                  </ul>
                </div>

                {/* Usability */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                      <Eye className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Usability</h4>
                  </div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Intuitive interface
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Easy setup
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Seamless integration
                    </li>
                  </ul>
                </div>
              </div>
        </div>
      </div>

    </div>
  );
}

