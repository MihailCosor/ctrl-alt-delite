// src/app/page.js

"use client";

import { useState } from "react";
import { TransactionDashboard } from "@/components/transaction-dashboard";
import { LiveFeedDashboard } from "@/components/live-feed-dashboard";
import { GeoAnalysisDashboard } from "@/components/geo-analysis-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Database, Shield, BarChart3, MapPin, Activity } from "lucide-react";

export default function Home() {

  document.title = "Hive Guard";

  const [activeTab, setActiveTab] = useState('overview');
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <main className="container mx-auto py-8 px-4">
        {/* Navigation Taskbar */}
        <div className="mb-8 flex justify-end">
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

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <TransactionDashboard />
        )}

        {activeTab === 'analytics' && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <CardHeader className="text-center">
                <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">Analytics Dashboard</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Advanced analytics and reporting features coming soon
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  This page will contain detailed analytics, charts, and insights about transaction patterns and fraud detection metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'geo-analysis' && (
          <GeoAnalysisDashboard />
        )}

        {activeTab === 'live-feed' && (
          <LiveFeedDashboard />
        )}
      </main>
    </div>
  );
}
