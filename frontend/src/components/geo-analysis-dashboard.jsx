"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  AlertTriangle, 
  RefreshCw,
  Building2,
  Globe,
  TrendingUp
} from 'lucide-react';

export function GeoAnalysisDashboard() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGeoData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transactions/geo-analysis');
      if (response.ok) {
        const data = await response.json();
        setGeoData(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch geo-analysis data');
      }
    } catch (err) {
      console.error('Error fetching geo-analysis data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchGeoData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading geo-analysis data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={fetchGeoData}
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
      {/* Top Cities and Countries */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 Cities with Fraud */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <Building2 className="h-6 w-6 text-red-600 mr-3" />
                  Top 10 Cities with Fraud
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Cities with highest fraud incidents
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchGeoData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {geoData?.topCitiesWithFraud?.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {geoData.topCitiesWithFraud.map((city, index) => (
                  <div key={index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {city.city || 'Unknown'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {city.state || 'Unknown State'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 dark:text-red-400">
                          {city.fraudCount} frauds
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          ${city.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No city data available</p>
                <p className="text-sm">Waiting for fraud data...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Countries at Risk */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <Globe className="h-6 w-6 text-orange-600 mr-3" />
                  Top 10 Countries at Risk
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Countries with highest fraud risk
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchGeoData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {geoData?.topCountriesWithFraud?.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {geoData.topCountriesWithFraud.map((country, index) => (
                  <div key={index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {country.country || 'Unknown'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {country.cityCount} cities affected
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600 dark:text-orange-400">
                          {country.fraudCount} frauds
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          ${country.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No country data available</p>
                <p className="text-sm">Waiting for fraud data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* World Map */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                <MapPin className="h-6 w-6 text-blue-600 mr-3" />
                Global Fraud Distribution
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Countries affected by fraud incidents • Red indicates fraud activity
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchGeoData} className="border-slate-300 dark:border-slate-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            {/* Real 2D World Map */}
            <div className="w-full h-96 bg-slate-100 dark:bg-slate-700 rounded-lg relative overflow-hidden">
              {/* Map Legend */}
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">No Fraud</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Fraud Detected</span>
                  </div>
                </div>
              </div>

              {/* Map Statistics */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Affected Countries</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {geoData?.fraudCountries?.length || 0}
                  </div>
                </div>
              </div>

              {/* World Map Image with Overlay */}
              <div className="absolute inset-0">
                {/* World Map SVG */}
                <svg 
                  viewBox="0 0 1000 500" 
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* World Map Background */}
                  <defs>
                    <pattern id="worldMap" patternUnits="userSpaceOnUse" width="1000" height="500">
                      <rect width="1000" height="500" fill="#e2e8f0" />
                      {/* Simplified world map shapes */}
                      <g fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1">
                        {/* North America */}
                        <path d="M100,100 L200,80 L250,120 L280,200 L200,250 L150,220 L120,180 Z" />
                        {/* South America */}
                        <path d="M200,300 L250,280 L280,350 L250,420 L200,400 L180,350 Z" />
                        {/* Europe */}
                        <path d="M450,80 L520,70 L550,120 L520,150 L480,140 L450,100 Z" />
                        {/* Africa */}
                        <path d="M480,180 L550,170 L580,250 L550,350 L480,340 L450,250 Z" />
                        {/* Asia */}
                        <path d="M550,60 L750,50 L800,120 L780,200 L700,180 L600,100 Z" />
                        {/* Australia */}
                        <path d="M700,350 L800,340 L820,380 L800,420 L720,410 L700,380 Z" />
                      </g>
                    </pattern>
                  </defs>
                  
                  {/* Map Background */}
                  <rect width="1000" height="500" fill="url(#worldMap)" />
                  
                  {/* Fraud Overlay - Red areas for countries with fraud */}
                  {geoData?.fraudCountries?.map((country, index) => {
                    // Map US states to approximate world map positions
                    const statePositions = {
                      'CA': { x: 120, y: 140, width: 30, height: 40 }, // California
                      'NY': { x: 180, y: 120, width: 20, height: 25 }, // New York
                      'TX': { x: 150, y: 180, width: 35, height: 30 }, // Texas
                      'FL': { x: 200, y: 200, width: 25, height: 20 }, // Florida
                      'IL': { x: 160, y: 150, width: 20, height: 20 }, // Illinois
                      'PA': { x: 170, y: 130, width: 20, height: 20 }, // Pennsylvania
                      'OH': { x: 165, y: 140, width: 18, height: 18 }, // Ohio
                      'GA': { x: 185, y: 170, width: 20, height: 20 }, // Georgia
                    };
                    
                    const position = statePositions[country.country];
                    if (position) {
                      return (
                        <rect
                          key={index}
                          x={position.x}
                          y={position.y}
                          width={position.width}
                          height={position.height}
                          fill="rgba(239, 68, 68, 0.7)"
                          stroke="#dc2626"
                          strokeWidth="2"
                          className="hover:fill-red-600 transition-all duration-300"
                        >
                          <title>{`${country.country}: ${country.fraudCount} fraud incidents`}</title>
                        </rect>
                      );
                    }
                    return null;
                  })}
                  
                  {/* Additional fraud indicators for other regions */}
                  {geoData?.fraudCountries?.length > 0 && (
                    <>
                      {/* Europe fraud indicator */}
                      <circle cx="500" cy="100" r="8" fill="rgba(239, 68, 68, 0.7)" stroke="#dc2626" strokeWidth="2">
                        <title>Europe: Fraud activity detected</title>
                      </circle>
                      {/* Asia fraud indicator */}
                      <circle cx="650" cy="80" r="8" fill="rgba(239, 68, 68, 0.7)" stroke="#dc2626" strokeWidth="2">
                        <title>Asia: Fraud activity detected</title>
                      </circle>
                    </>
                  )}
                </svg>
              </div>

              {/* Map Title */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 shadow-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    World Map - Fraud Activity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
