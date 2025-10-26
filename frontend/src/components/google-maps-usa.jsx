"use client";

import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, AlertTriangle, Maximize2, X } from "lucide-react";

// Google Maps API key - you'll need to add this to your .env.local file
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// USA state coordinates (approximate center points)
const USA_STATE_COORDINATES = {
  'CA': { lat: 36.7783, lng: -119.4179, name: 'California' },
  'NY': { lat: 42.1657, lng: -74.9481, name: 'New York' },
  'TX': { lat: 31.9686, lng: -99.9018, name: 'Texas' },
  'FL': { lat: 27.7663, lng: -82.6404, name: 'Florida' },
  'IL': { lat: 40.3363, lng: -89.0022, name: 'Illinois' },
  'PA': { lat: 41.2033, lng: -77.1945, name: 'Pennsylvania' },
  'OH': { lat: 40.3888, lng: -82.7649, name: 'Ohio' },
  'GA': { lat: 33.0406, lng: -83.6431, name: 'Georgia' },
  'NC': { lat: 35.6300, lng: -79.8064, name: 'North Carolina' },
  'MI': { lat: 43.3266, lng: -84.5361, name: 'Michigan' },
  'NJ': { lat: 40.2989, lng: -74.5210, name: 'New Jersey' },
  'VA': { lat: 37.7693, lng: -78.1699, name: 'Virginia' },
  'WA': { lat: 47.4009, lng: -121.4905, name: 'Washington' },
  'AZ': { lat: 33.7298, lng: -111.4312, name: 'Arizona' },
  'MA': { lat: 42.2373, lng: -71.5314, name: 'Massachusetts' },
  'TN': { lat: 35.7478, lng: -86.6923, name: 'Tennessee' },
  'IN': { lat: 39.8494, lng: -86.2583, name: 'Indiana' },
  'MO': { lat: 38.4561, lng: -92.2884, name: 'Missouri' },
  'MD': { lat: 39.0639, lng: -76.8021, name: 'Maryland' },
  'WI': { lat: 44.2685, lng: -89.6165, name: 'Wisconsin' },
  'CO': { lat: 39.0598, lng: -105.3111, name: 'Colorado' },
  'MN': { lat: 46.7296, lng: -94.6859, name: 'Minnesota' },
  'SC': { lat: 33.8569, lng: -80.9450, name: 'South Carolina' },
  'AL': { lat: 32.8067, lng: -86.7911, name: 'Alabama' },
  'LA': { lat: 30.4581, lng: -91.1403, name: 'Louisiana' },
  'KY': { lat: 37.6681, lng: -84.6701, name: 'Kentucky' },
  'OR': { lat: 44.5721, lng: -123.1730, name: 'Oregon' },
  'OK': { lat: 35.5653, lng: -96.9289, name: 'Oklahoma' },
  'CT': { lat: 41.5978, lng: -72.7554, name: 'Connecticut' },
  'UT': { lat: 40.1500, lng: -111.8624, name: 'Utah' },
  'IA': { lat: 42.0115, lng: -93.2105, name: 'Iowa' },
  'NV': { lat: 38.3135, lng: -117.0554, name: 'Nevada' },
  'AR': { lat: 34.9697, lng: -92.3731, name: 'Arkansas' },
  'MS': { lat: 32.7416, lng: -89.6787, name: 'Mississippi' },
  'KS': { lat: 38.5266, lng: -96.7265, name: 'Kansas' },
  'NM': { lat: 34.8405, lng: -106.2485, name: 'New Mexico' },
  'NE': { lat: 41.1254, lng: -98.2681, name: 'Nebraska' },
  'WV': { lat: 38.4912, lng: -80.9545, name: 'West Virginia' },
  'ID': { lat: 44.2405, lng: -114.4788, name: 'Idaho' },
  'HI': { lat: 21.0943, lng: -157.4983, name: 'Hawaii' },
  'NH': { lat: 43.4525, lng: -71.5639, name: 'New Hampshire' },
  'ME': { lat: 44.3235, lng: -69.7653, name: 'Maine' },
  'MT': { lat: 47.0526, lng: -110.4544, name: 'Montana' },
  'RI': { lat: 41.6809, lng: -71.5118, name: 'Rhode Island' },
  'DE': { lat: 39.3185, lng: -75.5071, name: 'Delaware' },
  'SD': { lat: 44.2998, lng: -99.4388, name: 'South Dakota' },
  'ND': { lat: 47.5289, lng: -99.7840, name: 'North Dakota' },
  'AK': { lat: 61.3707, lng: -152.4044, name: 'Alaska' },
  'DC': { lat: 38.9072, lng: -77.0369, name: 'District of Columbia' },
  'VT': { lat: 44.0459, lng: -72.7107, name: 'Vermont' },
  'WY': { lat: 42.7559, lng: -107.3025, name: 'Wyoming' }
};

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    case Status.FAILURE:
      return <div className="flex items-center justify-center h-96 text-red-600">Error loading map</div>;
    default:
      return null;
  }
};

function MapComponent({ geoData, onRefresh, onFullScreen }) {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        zoom: 4,
        styles: [
          {
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{ color: "#f5f5f5" }]
          },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: "#e1f5fe" }]
          },
          {
            featureType: "administrative.country",
            elementType: "geometry.stroke",
            stylers: [{ color: "#bdbdbd", weight: 1 }]
          }
        ]
      });
      setMap(newMap);
    }
  }, [ref, map]);

  useEffect(() => {
    if (map && geoData?.fraudCountries) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers = [];

      // Create markers for states with fraud
      geoData.fraudCountries.forEach((country) => {
        const stateData = USA_STATE_COORDINATES[country.country];
        if (stateData) {
          const marker = new window.google.maps.Marker({
            position: { lat: stateData.lat, lng: stateData.lng },
            map: map,
            title: `${stateData.name}: ${country.fraudCount} fraud incidents`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: Math.min(Math.max(country.fraudCount / 5, 8), 20), // Scale based on fraud count
              fillColor: '#ef4444',
              fillOpacity: 0.8,
              strokeColor: '#dc2626',
              strokeWeight: 2
            }
          });

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-bold text-lg">${stateData.name}</h3>
                <p class="text-sm text-gray-600">Fraud Incidents: <span class="font-semibold text-red-600">${country.fraudCount}</span></p>
                <p class="text-sm text-gray-600">Total Amount: <span class="font-semibold">$${country.totalAmount?.toLocaleString()}</span></p>
                <p class="text-sm text-gray-600">Affected Cities: <span class="font-semibold">${country.affectedCitiesCount}</span></p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);
    }
  }, [map, geoData?.fraudCountries]);

  return (
    <div className="relative">
      <div ref={ref} className="w-full h-96 rounded-lg" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onFullScreen}
          className="bg-white shadow-lg border-slate-300"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Full Screen
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="bg-white shadow-lg border-slate-300"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white rounded-lg p-3 shadow-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
            <span className="text-sm text-slate-600">No Fraud</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Fraud Detected</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Circle size = fraud count
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandedMapComponent({ geoData, onRefresh }) {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
        zoom: 4,
        styles: [
          {
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{ color: "#f5f5f5" }]
          },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: "#e1f5fe" }]
          },
          {
            featureType: "administrative.country",
            elementType: "geometry.stroke",
            stylers: [{ color: "#bdbdbd", weight: 1 }]
          }
        ]
      });
      setMap(newMap);
    }
  }, [ref, map]);

  useEffect(() => {
    if (map && geoData?.fraudCountries) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers = [];

      // Create markers for states with fraud
      geoData.fraudCountries.forEach((country) => {
        const stateData = USA_STATE_COORDINATES[country.country];
        if (stateData) {
          const marker = new window.google.maps.Marker({
            position: { lat: stateData.lat, lng: stateData.lng },
            map: map,
            title: `${stateData.name}: ${country.fraudCount} fraud incidents`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: Math.min(Math.max(country.fraudCount / 5, 8), 20), // Scale based on fraud count
              fillColor: '#ef4444',
              fillOpacity: 0.8,
              strokeColor: '#dc2626',
              strokeWeight: 2
            }
          });

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-bold text-lg">${stateData.name}</h3>
                <p class="text-sm text-gray-600">Fraud Incidents: <span class="font-semibold text-red-600">${country.fraudCount}</span></p>
                <p class="text-sm text-gray-600">Total Amount: <span class="font-semibold">$${country.totalAmount?.toLocaleString()}</span></p>
                <p class="text-sm text-gray-600">Affected Cities: <span class="font-semibold">${country.affectedCitiesCount}</span></p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);
    }
  }, [map, geoData?.fraudCountries]);

  return (
    <div className="relative h-full">
      <div ref={ref} className="w-full h-full rounded-lg" />
      
      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white rounded-lg p-3 shadow-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
            <span className="text-sm text-slate-600">No Fraud</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Fraud Detected</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Circle size = fraud count
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoogleMapsUSA({ geoData, onRefresh }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
            <MapPin className="h-6 w-6 text-blue-600 mr-3" />
            USA Fraud Map
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Interactive map showing fraud activity across US states.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Google Maps API Key Required
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Please add your Google Maps API key to .env.local:
              </p>
              <code className="bg-slate-200 dark:bg-slate-600 px-3 py-2 rounded text-sm">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-xl text-slate-900 dark:text-slate-100 flex items-center">
          <MapPin className="h-6 w-6 text-blue-600 mr-3" />
          USA Fraud Map
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Interactive map showing fraud activity across US states.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
          <MapComponent geoData={geoData} onRefresh={onRefresh} onFullScreen={() => setIsFullScreen(true)} />
        </Wrapper>
      </CardContent>
      
      {/* Full Screen Map Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Close Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              className="absolute top-4 right-4 z-10 bg-white shadow-lg border-slate-300"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            
            {/* Full Screen Map */}
            <div className="w-full h-full">
              <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
                <ExpandedMapComponent geoData={geoData} onRefresh={onRefresh} />
              </Wrapper>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
