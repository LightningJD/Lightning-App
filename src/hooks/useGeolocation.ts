import { useState, useCallback } from 'react';

export interface GeolocationResult {
  lat: number;
  lng: number;
  cityName: string;
}

interface UseGeolocationReturn {
  detect: () => Promise<GeolocationResult>;
  isDetecting: boolean;
  error: string | null;
}

/**
 * Hook for GPS location detection + reverse geocoding via OpenStreetMap Nominatim.
 * Free, no API key required. Rate limit: 1 req/sec (fine for button-triggered use).
 */
export function useGeolocation(): UseGeolocationReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (): Promise<GeolocationResult> => {
    setIsDetecting(true);
    setError(null);

    try {
      // Check browser support
      if (!navigator.geolocation) {
        throw new Error('Location is not supported by your browser.');
      }

      // Get GPS coordinates (10s timeout)
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Faster, good enough for city-level
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Reverse geocode via Nominatim (free, no API key)
      let cityName = '';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
          {
            headers: { 'User-Agent': 'LightningApp/1.0' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || '';
          const state = addr.state || '';
          cityName = [city, state].filter(Boolean).join(', ');
        }
      } catch {
        // Nominatim failed — coordinates still valid, user can type city manually
        setError('Could not look up your city. Coordinates saved — you can type the city name manually.');
      }

      setIsDetecting(false);
      return { lat, lng, cityName: cityName || '' };

    } catch (err) {
      setIsDetecting(false);

      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access or type your city manually.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Could not determine your location. Please type your city manually.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again or type your city manually.');
            break;
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to detect location. Please type your city manually.');
      }

      throw err;
    }
  }, []);

  return { detect, isDetecting, error };
}
