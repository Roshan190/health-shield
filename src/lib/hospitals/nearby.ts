import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '@/lib/supabase/client';

const CACHE_KEY = 'healthshield.nearby_hospitals.v1';
/** Serve/fall back to cache within this age. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Treat locations within ~1.1km grid cell as the same area. */
const GRID_DECIMALS = 2;

export type NearbyHospital = {
  place_id: string;
  name: string;
  vicinity: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
  maps_url: string;
};

export type NearbyHospitalsResult = {
  hospitals: NearbyHospital[];
  disclaimer: string;
  fromCache?: boolean;
  cachedAt?: string;
};

export class NearbyHospitalsError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'NearbyHospitalsError';
    this.code = code;
  }
}

type FunctionErrorBody = {
  error?: string;
  code?: string;
};

type CacheEntry = {
  gridKey: string;
  latitude: number;
  longitude: number;
  savedAt: string;
  hospitals: NearbyHospital[];
  disclaimer: string;
};

function gridKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(GRID_DECIMALS)},${longitude.toFixed(GRID_DECIMALS)}`;
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      !parsed?.gridKey ||
      !parsed.savedAt ||
      !Array.isArray(parsed.hospitals) ||
      typeof parsed.disclaimer !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Best-effort; ignore quota / private mode failures.
  }
}

function cacheStillValid(entry: CacheEntry, latitude: number, longitude: number) {
  if (entry.gridKey !== gridKey(latitude, longitude)) {
    return false;
  }
  const age = Date.now() - new Date(entry.savedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= CACHE_MAX_AGE_MS;
}

async function invokeNearbyLive(params: {
  latitude: number;
  longitude: number;
  radiusM?: number;
}): Promise<NearbyHospitalsResult> {
  const { data, error } = await getSupabase().functions.invoke('nearby-hospitals', {
    body: {
      latitude: params.latitude,
      longitude: params.longitude,
      radius_m: params.radiusM,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.clone().json()) as FunctionErrorBody;
        if (body.error) {
          throw new NearbyHospitalsError(body.error, body.code);
        }
      } catch (e) {
        if (e instanceof NearbyHospitalsError) {
          throw e;
        }
      }
    }
    throw new NearbyHospitalsError(error.message || 'Could not load nearby hospitals.');
  }

  const payload = data as (NearbyHospitalsResult & FunctionErrorBody) | null;
  if (payload?.error) {
    throw new NearbyHospitalsError(payload.error, payload.code);
  }

  return {
    hospitals: Array.isArray(payload?.hospitals) ? payload.hospitals : [],
    disclaimer:
      payload?.disclaimer ??
      'Hospitals near you from Mapbox. This is not a cashless or insurer network list — confirm coverage with your insurer before admission.',
  };
}

/**
 * Fetch nearby hospitals. Tries live Overpass first; on failure falls back to
 * a same-area AsyncStorage cache (up to 24h). Successful live results refresh the cache.
 */
export async function fetchNearbyHospitals(params: {
  latitude: number;
  longitude: number;
  radiusM?: number;
}): Promise<NearbyHospitalsResult> {
  try {
    const live = await invokeNearbyLive(params);
    await writeCache({
      gridKey: gridKey(params.latitude, params.longitude),
      latitude: params.latitude,
      longitude: params.longitude,
      savedAt: new Date().toISOString(),
      hospitals: live.hospitals,
      disclaimer: live.disclaimer,
    });
    return { ...live, fromCache: false };
  } catch (liveError) {
    const cached = await readCache();
    if (cached && cacheStillValid(cached, params.latitude, params.longitude)) {
      return {
        hospitals: cached.hospitals,
        disclaimer: cached.disclaimer,
        fromCache: true,
        cachedAt: cached.savedAt,
      };
    }
    throw liveError;
  }
}

export function formatHospitalDistance(meters: number) {
  if (meters < 1000) {
    return `${meters} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatNearbyCacheAge(cachedAt: string) {
  const ageMs = Date.now() - new Date(cachedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 'earlier';
  }
  const mins = Math.round(ageMs / 60_000);
  if (mins < 2) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins} min ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return 'earlier today or yesterday';
}
