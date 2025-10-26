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
  Target,
  Clock
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

// Fraud Victim Profile Component
function FraudVictimProfile({ data }) {
  if (!data?.ageDemographics || data.ageDemographics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Find highest risk age group
  const highestRisk = data.ageDemographics.reduce((max, current) => 
    (current.fraudProbability || 0) > (max.fraudProbability || 0) ? current : max
  );

  // Find most common fraud category
  const topCategory = data.fraudCategories?.[0];

  // Calculate average fraud amount
  const avgFraudAmount = data.ageDemographics.reduce((sum, item) => 
    sum + (item.fraudAmount || 0), 0
  ) / data.ageDemographics.reduce((sum, item) => 
    sum + (item.fraudTransactions || 0), 0
  ) || 0;

  // Calculate risk patterns
  const totalFraudTransactions = data.ageDemographics.reduce((sum, item) => 
    sum + (item.fraudTransactions || 0), 0
  );
  const totalTransactions = data.ageDemographics.reduce((sum, item) => 
    sum + (item.totalTransactions || 0), 0
  );
  const overallFraudRate = totalTransactions > 0 ? (totalFraudTransactions / totalTransactions * 100) : 0;

  // Amount range analysis (if available)
  const amountRanges = data.amountRanges || [];
  const highValueFraud = amountRanges.find(range => 
    range.range?.includes('1K') || range.range?.includes('5K') || range.range?.includes('10K')
  );

  // Time pattern analysis
  const timePatterns = data.timePatterns || [];
  const peakFraudTime = timePatterns[0]; // Most common fraud time
  const totalFraudByTime = timePatterns.reduce((sum, pattern) => sum + pattern.fraudCount, 0);

  return (
    <div className="space-y-6">
      {/* Risk Level Badge */}
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
          (highestRisk.fraudProbability || 0) >= 15 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
          (highestRisk.fraudProbability || 0) >= 10 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
          (highestRisk.fraudProbability || 0) >= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }`}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          {highestRisk.fraudProbability || 0}% Fraud Risk
        </div>
      </div>

      {/* Profile Characteristics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Age Group */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Users className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Most Vulnerable Age</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {highestRisk.ageRange}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {highestRisk.fraudTransactions || 0} fraud cases
          </div>
        </div>

        {/* Transaction Category */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Target className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Top Target Category</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
            {topCategory?.category?.replace('_', ' ') || 'N/A'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {topCategory?.count || 0} fraud cases
          </div>
        </div>

        {/* Average Loss */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Loss</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ${avgFraudAmount.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Per fraud incident
          </div>
        </div>

        {/* Overall Fraud Rate */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Fraud Rate</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {overallFraudRate.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Across all age groups
          </div>
        </div>

        {/* High Value Fraud */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">High Value Fraud</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {highValueFraud?.count || 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {highValueFraud?.range || 'No data'} transactions
          </div>
        </div>


        {/* Total Impact */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Impact</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ${highestRisk.fraudAmount?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            In highest risk group
          </div>
        </div>
      </div>

      {/* Risk Insights */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Risk Insights & Behavioral Patterns</h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>{highestRisk.ageRange}</strong> age group shows highest fraud susceptibility ({highestRisk.fraudProbability?.toFixed(1)}%)</li>
          <li>• <strong>{topCategory?.category?.replace('_', ' ')}</strong> transactions are most targeted ({topCategory?.count || 0} cases)</li>
          <li>• Average loss per incident: <strong>${avgFraudAmount.toFixed(2)}</strong></li>
          <li>• Overall fraud rate across all demographics: <strong>{overallFraudRate.toFixed(2)}%</strong></li>
          {highValueFraud && (
            <li>• High-value fraud (${highValueFraud.range}): <strong>{highValueFraud.count} cases</strong></li>
          )}
          <li>• Focus protection efforts on {highestRisk.ageRange} demographic</li>
          <li>• Monitor {topCategory?.category?.replace('_', ' ')} transactions more closely</li>
        </ul>
      </div>
    </div>
  );
}

// Time Pattern Table Component
function TimePatternTable({ data, title, colors = CHART_COLORS }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No time data available</p>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.fraudCount - a.fraudCount);

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-3 border-b border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <div>Time</div>
            <div>Fraud Cases</div>
            <div>Risk Level</div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-slate-200 dark:divide-slate-600">
          {sortedData.slice(0, 12).map((item, index) => {
            const riskLevel = item.fraudCount > 5 ? 'High' : item.fraudCount > 2 ? 'Medium' : 'Low';
            const riskColor = riskLevel === 'High' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 
                             riskLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 
                             'text-green-600 bg-green-50 dark:bg-green-900/20';
            
            return (
              <div key={index} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Time */}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.hour}:00
                    </span>
                  </div>
                  
                  {/* Fraud Count */}
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.fraudCount} cases
                    </span>
                  </div>
                  
                  {/* Risk Level */}
                  <div className="flex justify-start">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColor}`}>
                      {riskLevel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Horizontal Bar Chart Component for Age Demographics
function HorizontalBarChart({ data, title, colors = CHART_COLORS }) {
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

  const maxCount = Math.max(...data.map(item => item.fraudProbability || item.count));

  return (
    <div className="w-full space-y-4">
      {data.map((item, index) => {
        const value = item.fraudProbability || item.count;
        const width = (value / maxCount) * 100;
        
        return (
          <div key={index} className="group">
            {/* Age Range Label */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.ageRange || item.range}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {value}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative w-full h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ 
                  width: `${Math.max(width, 5)}%`,
                  background: `linear-gradient(90deg, ${colors[index % colors.length]}, ${colors[index % colors.length]}dd)`
                }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              </div>
              
              {/* Value label on bar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-sm">
                  {value}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Transaction Volume Chart for Age Demographics
function TransactionVolumeChart({ data, title, colors = CHART_COLORS }) {
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

  const maxTotal = Math.max(...data.map(item => item.totalTransactions || 0));

  return (
    <div className="w-full space-y-3">
      {data.map((item, index) => {
        const total = item.totalTransactions || 0;
        const fraud = item.fraudTransactions || 0;
        const normal = item.normalTransactions || 0;
        const totalWidth = (total / maxTotal) * 100;
        const fraudWidth = total > 0 ? (fraud / total) * totalWidth : 0;
        
        return (
          <div key={index} className="group">
            {/* Age Range Label */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.ageRange || item.range}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {total} total
              </span>
            </div>
            
            {/* Stacked Bar */}
            <div className="relative w-full h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              {/* Normal transactions (bottom) */}
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ 
                  width: `${Math.max(totalWidth, 5)}%`,
                  background: `linear-gradient(90deg, ${colors[index % colors.length]}40, ${colors[index % colors.length]}60)`
                }}
              />
              
              {/* Fraud transactions (top) */}
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ 
                  width: `${Math.max(fraudWidth, 2)}%`,
                  background: `linear-gradient(90deg, ${colors[index % colors.length]}, ${colors[index % colors.length]}dd)`
                }}
              />
              
              {/* Value labels */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 drop-shadow-sm">
                  {fraud}/{total}
                </span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>Normal: {normal}</span>
              <span>Fraud: {fraud}</span>
            </div>
          </div>
        );
      })}
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
        {/* Fraud Victim Profile */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <Users className="h-6 w-6 text-purple-600 mr-3" />
                  Fraud Victim Profile
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Characteristics of most targeted victims
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <FraudVictimProfile data={analyticsData} />
          </CardContent>
        </Card>

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

      </div>

      {/* Age Analysis Row - SIDE BY SIDE */}
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* Age Demographics */}
        <Card className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <BarChart3 className="h-6 w-6 text-green-600 mr-3" />
                  Age Demographics
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Fraud probability by age group
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <HorizontalBarChart 
              data={analyticsData?.ageDemographics || []} 
              title="Age Demographics"
            />
          </CardContent>
        </Card>

        {/* Transaction Volume by Age */}
        <Card className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <BarChart3 className="h-6 w-6 text-purple-600 mr-3" />
                  Transaction Volume by Age
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Total transactions vs fraud cases by age group
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <TransactionVolumeChart 
              data={analyticsData?.ageDemographics || []} 
              title="Transaction Volume by Age"
            />
          </CardContent>
        </Card>
      </div>

      {/* Time Pattern Analysis */}
      <div className="mt-6">
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <Clock className="h-6 w-6 text-orange-600 mr-3" />
                  Fraud Time Patterns
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Fraud transactions per hour of the day
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <TimePatternTable 
              data={analyticsData?.timePatterns || []} 
              title="Fraud Time Patterns"
            />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

