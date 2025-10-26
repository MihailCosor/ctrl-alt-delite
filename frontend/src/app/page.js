// src/app/page.js

"use client";

import { useEffect, useState } from "react";
import { TransactionDashboard } from "@/components/transaction-dashboard";
import { LiveFeedDashboard } from "@/components/live-feed-dashboard";
import { GeoAnalysisDashboard } from "@/components/geo-analysis-dashboard";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Terminal, Database, Shield, BarChart3, MapPin, Activity, Calendar, Clock, Filter, Zap, RotateCcw } from "lucide-react";

export default function Home() {

  useEffect(() => {
    document.title = "Hive Guard";
  }, []);

  const [activeTab, setActiveTab] = useState('overview');
  
  // Global filter state
  const [globalFilters, setGlobalFilters] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: ''
  });

  // Helper function to get current datetime in local format
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  };

  // Initialize with current datetime
  useEffect(() => {
    const current = getCurrentDateTime();
    setGlobalFilters({
      startDate: current.date,
      endDate: current.date,
      startTime: '00:00',
      endTime: current.time
    });
  }, []);

  // Check if current tab should show filters
  const shouldShowFilters = activeTab === 'analytics' || activeTab === 'geo-analysis';

  // Preset filter functions
  const setPresetFilter = (preset) => {
    const current = getCurrentDateTime();
    const now = new Date();
    
    switch (preset) {
      case 'today':
        setGlobalFilters({
          startDate: current.date,
          endDate: current.date,
          startTime: '00:00',
          endTime: current.time
        });
        break;
      case 'yesterday':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        setGlobalFilters({
          startDate: yesterdayDate,
          endDate: yesterdayDate,
          startTime: '00:00',
          endTime: '23:59'
        });
        break;
      case 'last7days':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAgoDate = weekAgo.toISOString().split('T')[0];
        setGlobalFilters({
          startDate: weekAgoDate,
          endDate: current.date,
          startTime: '00:00',
          endTime: current.time
        });
        break;
      case 'last24hours':
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayAgoDate = dayAgo.toISOString().split('T')[0];
        const dayAgoTime = dayAgo.toTimeString().slice(0, 5);
        setGlobalFilters({
          startDate: dayAgoDate,
          endDate: current.date,
          startTime: dayAgoTime,
          endTime: current.time
        });
        break;
      case 'thisMonth':
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayDate = firstDay.toISOString().split('T')[0];
        setGlobalFilters({
          startDate: firstDayDate,
          endDate: current.date,
          startTime: '00:00',
          endTime: current.time
        });
        break;
    }
  };

  // Reset filters to current day
  const resetFilters = () => setPresetFilter('today');
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <main className="container mx-auto py-8 px-4">
        {/* Navigation Taskbar */}
        <div className="mb-8 flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-2 px-6">
            <div className="flex items-center justify-center w-10 h-10">
              <img 
                src="/icon.png" 
                alt="Hive Guard Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <Shield className="h-6 w-6 text-blue-600 hidden" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Hive Guard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-tight">Fraud Detection System</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-3 px-6 py-3 text-base font-medium rounded-md transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-3 px-6 py-3 text-base font-medium rounded-md transition-colors ${
                activeTab === 'analytics' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Analytics</span>
            </button>
            <button 
              onClick={() => setActiveTab('geo-analysis')}
              className={`flex items-center space-x-3 px-6 py-3 text-base font-medium rounded-md transition-colors ${
                activeTab === 'geo-analysis' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <MapPin className="h-5 w-5" />
              <span>Geo-Analysis</span>
            </button>
            <button 
              onClick={() => setActiveTab('live-feed')}
              className={`flex items-center space-x-3 px-6 py-3 text-base font-medium rounded-md transition-colors ${
                activeTab === 'live-feed' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <Activity className="h-5 w-5" />
              <span>Live Feed</span>
            </button>
          </div>
        </div>

        {/* Global Filters - Only show for Analytics and Geo-Analysis */}
        {shouldShowFilters && (
          <div className="mb-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4">
              {/* Header with Quick Presets */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Filter className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Time Range</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400">Filter your data by date and time</p>
                  </div>
                </div>
                
                {/* Quick Preset Buttons */}
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetFilter('last24hours')}
                    className="text-sm px-4 py-2 h-8 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Last 24h
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetFilter('today')}
                    className="text-sm px-4 py-2 h-8 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetFilter('last7days')}
                    className="text-sm px-4 py-2 h-8 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetFilter('thisMonth')}
                    className="text-sm px-4 py-2 h-8 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    This Month
                  </Button>
                </div>
              </div>

              {/* Custom Date/Time Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From */}
                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-700 dark:text-slate-300 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    From
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={globalFilters.startDate}
                      onChange={(e) => setGlobalFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="flex-1 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Input
                      type="time"
                      value={globalFilters.startTime}
                      onChange={(e) => setGlobalFilters(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-24 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-700 dark:text-slate-300 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-slate-400" />
                    To
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={globalFilters.endDate}
                      onChange={(e) => setGlobalFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="flex-1 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Input
                      type="time"
                      value={globalFilters.endTime}
                      onChange={(e) => setGlobalFilters(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-24 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filter Display */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <Filter className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <span className="text-base text-slate-600 dark:text-slate-400">
                    {globalFilters.startDate} {globalFilters.startTime} → {globalFilters.endDate} {globalFilters.endTime}
                  </span>
                </div>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters}
                    className="text-base text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
        </div>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <TransactionDashboard />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard globalFilters={globalFilters} />
        )}

        {activeTab === 'geo-analysis' && (
          <GeoAnalysisDashboard globalFilters={globalFilters} />
        )}

        {activeTab === 'live-feed' && (
          <LiveFeedDashboard />
        )}
      </main>
    </div>
  );
}
