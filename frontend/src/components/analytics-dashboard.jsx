"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  PieChart, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Target
} from 'lucide-react';

// Enhanced color palette for charts
const CHART_COLORS = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0891b2', 
  '#2563eb', '#7c3aed', '#db2777', '#65a30d', '#ca8a04',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'
];

// Pie Chart Component
function PieChartComponent({ data, title, colors = CHART_COLORS }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  let cumulativePercentage = 0;

  return (
    <div className="w-full h-80 relative">
      {/* Chart Container with Background */}
      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 mb-4">
        <svg viewBox="0 0 200 200" className="w-full h-64 drop-shadow-sm">
          {/* Center circle for donut effect */}
          <circle cx="100" cy="100" r="60" fill="white" className="dark:fill-slate-800" />
          
          {data.map((item, index) => {
            const percentage = (item.count / total) * 100;
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
            
            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
            
            const largeArcFlag = percentage > 50 ? 1 : 0;
            
            const x1 = 100 + 80 * Math.cos(startAngleRad);
            const y1 = 100 + 80 * Math.sin(startAngleRad);
            const x2 = 100 + 80 * Math.cos(endAngleRad);
            const y2 = 100 + 80 * Math.sin(endAngleRad);
            
            const pathData = [
              `M 100 100`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');

            cumulativePercentage += percentage;

            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="3"
                className="hover:opacity-90 transition-all duration-200 cursor-pointer hover:drop-shadow-md"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              >
                <title>{`${item.category || item.gender || item.range}: ${item.count} (${percentage.toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>
        
        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Legend */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <div className="grid grid-cols-1 gap-2 text-sm max-h-32 overflow-y-auto">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {item.category || item.gender || item.range}
                </span>
              </div>
              <div className="text-right">
                <div className="text-slate-900 dark:text-slate-100 font-bold">
                  {item.count}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {((item.count / total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bar Chart Component
function BarChartComponent({ data, title, colors = CHART_COLORS }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(item => item.count));

  return (
    <div className="w-full h-80">
      {/* Chart Container with Background */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 mb-4">
        {/* Y-axis Grid Lines */}
        <div className="relative h-48 mb-4">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <div
              key={value}
              className="absolute w-full border-t border-slate-200 dark:border-slate-600 opacity-30"
              style={{ bottom: `${value}%` }}
            />
          ))}
          
          {/* Y-axis labels */}
          <div className="absolute -left-8 top-0 h-full flex flex-col justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{maxCount}</span>
            <span>{Math.round(maxCount * 0.75)}</span>
            <span>{Math.round(maxCount * 0.5)}</span>
            <span>{Math.round(maxCount * 0.25)}</span>
            <span>0</span>
          </div>
          
          {/* Bars */}
          <div className="h-full flex items-end justify-between space-x-2 ml-4">
            {data.map((item, index) => {
              const height = (item.count / maxCount) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 group">
                  {/* Bar with gradient */}
                  <div 
                    className="w-full rounded-t-lg transition-all duration-300 hover:opacity-90 cursor-pointer relative shadow-sm hover:shadow-md"
                    style={{ 
                      height: `${Math.max(height, 8)}%`,
                      background: `linear-gradient(135deg, ${colors[index % colors.length]}, ${colors[index % colors.length]}dd)`,
                      minHeight: '8px'
                    }}
                    title={`${item.ageRange || item.range}: ${item.count} frauds`}
                  >
                    {/* Value on top of bar */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm">
                      {item.count}
                    </div>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-transparent to-white opacity-20" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Enhanced X-axis Labels */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex justify-between space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 text-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
                {item.ageRange || item.range}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {item.count} cases
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ globalFilters }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters from global filters
      const params = new URLSearchParams();
      if (globalFilters?.startDate) params.append('startDate', globalFilters.startDate);
      if (globalFilters?.endDate) params.append('endDate', globalFilters.endDate);
      if (globalFilters?.startTime) params.append('startTime', globalFilters.startTime);
      if (globalFilters?.endTime) params.append('endTime', globalFilters.endTime);

      const response = await fetch(`/api/transactions/analytics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    const intervalId = setInterval(fetchAnalyticsData, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  // Refetch data when global filters change
  useEffect(() => {
    if (globalFilters) {
      fetchAnalyticsData();
    }
  }, [globalFilters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-4 w-full" /></CardHeader></Card>
          <Card><CardHeader><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-4 w-full" /></CardHeader></Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-4 w-full" /></CardHeader></Card>
          <Card><CardHeader><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-4 w-full" /></CardHeader></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading analytics data: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchAnalyticsData}
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
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Categories</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {analyticsData?.fraudCategories?.length || 0}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Fraud Cases</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {analyticsData?.fraudCategories?.reduce((sum, cat) => sum + cat.count, 0) || 0}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Amount</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  ${analyticsData?.fraudCategories?.reduce((sum, cat) => sum + cat.totalAmount, 0)?.toLocaleString() || 0}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Age Groups</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {analyticsData?.ageDemographics?.length || 0}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fraud Categories Pie Chart */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <PieChart className="h-6 w-6 text-blue-600 mr-3" />
                  Fraud Categories
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Distribution of fraud by transaction category
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <PieChartComponent 
              data={analyticsData?.fraudCategories || []} 
              title="Fraud Categories"
            />
          </CardContent>
        </Card>

        {/* Age Demographics Bar Chart */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <BarChart3 className="h-6 w-6 text-green-600 mr-3" />
                  Age Demographics
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Fraud victims by age group
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <BarChartComponent 
              data={analyticsData?.ageDemographics || []} 
              title="Age Demographics"
            />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

