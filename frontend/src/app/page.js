// src/app/page.js

"use client";

import { TransactionDashboard } from "@/components/transaction-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Database, Shield, BarChart3, MapPin, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <main className="container mx-auto py-8 px-4">
        {/* Navigation Taskbar */}
        <div className="mb-8 flex justify-end">
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-1">
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors">
              <Shield className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors">
              <MapPin className="h-4 w-4" />
              <span>Geo-Analysis</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors">
              <Activity className="h-4 w-4" />
              <span>Live Feed</span>
            </button>
          </div>
        </div>

        {/* Status Alert */}
        <Alert className="mb-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <Database className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-slate-900 dark:text-slate-100">System Status: Online</AlertTitle>
          <AlertDescription className="text-slate-600 dark:text-slate-400">
            Connected to MongoDB • Auto-refresh every second • ML fraud detection active
          </AlertDescription>
        </Alert>

        {/* Dashboard */}
        <TransactionDashboard />
      </main>
    </div>
  );
}
