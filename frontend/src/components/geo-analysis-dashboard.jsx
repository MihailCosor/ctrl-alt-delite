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
import { GoogleMapsUSA } from './google-maps-usa';

// US State codes to full names mapping
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

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
      {/* USA Map with Google Maps - Now First */}
      <GoogleMapsUSA geoData={geoData} onRefresh={fetchGeoData} />

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
            {geoData?.topCities?.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {geoData.topCities.map((city, index) => (
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
                            {STATE_NAMES[city.state] || city.state || 'Unknown State'}
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

        {/* Top 10 States at Risk */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
                  <Globe className="h-6 w-6 text-orange-600 mr-3" />
                  Top 10 States at Risk
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  US states with highest fraud activity
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchGeoData} className="border-slate-300 dark:border-slate-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {geoData?.topCountries?.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {geoData.topCountries.map((country, index) => (
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
                            {STATE_NAMES[country.country] || country.country || 'Unknown'}
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
    </div>
  );
}
