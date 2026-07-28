/**
 * Phase N / C: nearby hospitals via Mapbox Search Box (category + optional text search).
 * Not an insurer cashless network.
 *
 * Secret: MAPBOX_ACCESS_TOKEN (Edge Function secrets — never ship in the app).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_RADIUS_M = 6000;
const MAX_RADIUS_M = 40000;
/** Category search allows up to 25; /forward text search caps at 10. */
const MAX_CATEGORY_RESULTS = 25;
const MAX_FORWARD_RESULTS = 10;
const CATEGORIES = ['hospital', 'clinic'] as const;

type RequestBody = {
  latitude?: number;
  longitude?: number;
  radius_m?: number;
  /** Optional hospital name / place text — uses Mapbox Search Box /forward. */
  query?: string;
};

type MapboxFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    address?: string;
    distance?: number;
  };
};

type MapboxCategoryResponse = {
  type?: string;
  features?: MapboxFeature[];
  message?: string;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchCategory(
  token: string,
  category: string,
  latitude: number,
  longitude: number,
  limit: number
): Promise<MapboxFeature[]> {
  const url = new URL(
    `https://api.mapbox.com/search/searchbox/v1/category/${encodeURIComponent(category)}`
  );
  url.searchParams.set('access_token', token);
  url.searchParams.set('proximity', `${longitude},${latitude}`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('language', 'en');
  url.searchParams.set('country', 'IN');

  const response = await fetch(url.toString());
  if (!response.ok) {
    const detail = await response.text();
    console.error('Mapbox category error', category, response.status, detail.slice(0, 200));
    throw new Error(`mapbox_${response.status}`);
  }
  const payload = (await response.json()) as MapboxCategoryResponse;
  return Array.isArray(payload.features) ? payload.features : [];
}

async function fetchForwardSearch(
  token: string,
  query: string,
  proximity: { latitude: number; longitude: number } | null,
  limit: number
): Promise<MapboxFeature[]> {
  const url = new URL('https://api.mapbox.com/search/searchbox/v1/forward');
  url.searchParams.set('q', query);
  url.searchParams.set('access_token', token);
  // Search Box /forward rejects limit > 10.
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), MAX_FORWARD_RESULTS)));
  url.searchParams.set('language', 'en');
  url.searchParams.set('country', 'IN');
  url.searchParams.set('types', 'poi');
  // Partial prefixes like "Mau" need autocomplete mode.
  url.searchParams.set('auto_complete', 'true');
  // Include pharmacy — nearby category often returns medical stores tagged as clinic/pharmacy.
  url.searchParams.set('poi_category', 'hospital,clinic,pharmacy');
  if (proximity) {
    url.searchParams.set('proximity', `${proximity.longitude},${proximity.latitude}`);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const detail = await response.text();
    console.error('Mapbox forward error', response.status, detail.slice(0, 400));
    // Retry once without category filter — some tokens/scopes reject poi_category values.
    if (response.status === 400 || response.status === 422) {
      const fallback = new URL('https://api.mapbox.com/search/searchbox/v1/forward');
      fallback.searchParams.set('q', query);
      fallback.searchParams.set('access_token', token);
      fallback.searchParams.set('limit', String(Math.min(Math.max(limit, 1), MAX_FORWARD_RESULTS)));
      fallback.searchParams.set('language', 'en');
      fallback.searchParams.set('country', 'IN');
      fallback.searchParams.set('types', 'poi');
      fallback.searchParams.set('auto_complete', 'true');
      if (proximity) {
        fallback.searchParams.set('proximity', `${proximity.longitude},${proximity.latitude}`);
      }
      const retry = await fetch(fallback.toString());
      if (!retry.ok) {
        const retryDetail = await retry.text();
        console.error('Mapbox forward retry error', retry.status, retryDetail.slice(0, 400));
        throw new Error(`mapbox_${retry.status}`);
      }
      const retryPayload = (await retry.json()) as MapboxCategoryResponse;
      return Array.isArray(retryPayload.features) ? retryPayload.features : [];
    }
    throw new Error(`mapbox_${response.status}`);
  }
  const payload = (await response.json()) as MapboxCategoryResponse;
  return Array.isArray(payload.features) ? payload.features : [];
}

function mapFeaturesToHospitals(
  features: MapboxFeature[],
  origin: { latitude: number; longitude: number } | null,
  radius: number | null
) {
  const seen = new Set<string>();
  return features
    .map((feature) => {
      const coords = feature.geometry?.coordinates;
      const lng = coords?.[0];
      const lat = coords?.[1];
      const props = feature.properties ?? {};
      const mapboxId = props.mapbox_id?.trim();
      const name = props.name?.trim();
      if (
        !mapboxId ||
        !name ||
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return null;
      }

      const place_id = `mapbox:${mapboxId}`;
      if (seen.has(place_id)) {
        return null;
      }
      seen.add(place_id);

      const distance_m =
        typeof props.distance === 'number' && Number.isFinite(props.distance)
          ? Math.round(props.distance)
          : origin
            ? haversineMeters(origin.latitude, origin.longitude, lat, lng)
            : 0;

      if (radius != null && origin && distance_m > radius) {
        return null;
      }

      const vicinity =
        props.full_address?.trim() ||
        props.place_formatted?.trim() ||
        props.address?.trim() ||
        null;

      return {
        place_id,
        name,
        vicinity,
        latitude: lat,
        longitude: lng,
        distance_m,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lng}`)}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => a.distance_m - b.distance_m);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: 'Supabase environment is not configured on this function.' });
  }
  if (!mapboxToken) {
    return json(503, {
      error:
        'Nearby hospitals are not configured yet. Set the MAPBOX_ACCESS_TOKEN secret on the Edge Functions.',
      code: 'missing_mapbox_token',
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing authorization.' });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const query =
    typeof body.query === 'string' ? body.query.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
  const hasQuery = query.length >= 2;

  const latitude = typeof body.latitude === 'number' ? body.latitude : NaN;
  const longitude = typeof body.longitude === 'number' ? body.longitude : NaN;
  const hasCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasQuery && !hasCoords) {
    return json(400, {
      error: 'Body must include valid latitude/longitude, or a search query (2+ characters).',
      code: 'bad_request',
    });
  }

  let radius =
    typeof body.radius_m === 'number' && Number.isFinite(body.radius_m)
      ? Math.round(body.radius_m)
      : DEFAULT_RADIUS_M;
  radius = Math.min(Math.max(radius, 500), MAX_RADIUS_M);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return json(401, { error: 'Unauthorized.' });
  }

  const origin = hasCoords ? { latitude, longitude } : null;

  let features: MapboxFeature[] = [];
  try {
    if (hasQuery) {
      features = await fetchForwardSearch(mapboxToken, query, origin, MAX_FORWARD_RESULTS);
    } else if (origin) {
      const batches = await Promise.all(
        CATEGORIES.map((category) =>
          fetchCategory(mapboxToken, category, origin.latitude, origin.longitude, 10)
        )
      );
      features = batches.flat();
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    console.error('Mapbox request failed', detail);
    return json(502, {
      error: 'Could not reach Mapbox. Check the access token and try again.',
      code: 'mapbox_error',
      detail,
    });
  }

  // Text search: don't hard-cut by nearby radius (user may look up a hospital by name elsewhere).
  const hospitals = mapFeaturesToHospitals(
    features,
    origin,
    hasQuery ? null : radius
  ).slice(0, hasQuery ? MAX_FORWARD_RESULTS : MAX_CATEGORY_RESULTS);

  return json(200, {
    hospitals,
    mode: hasQuery ? 'search' : 'nearby',
    query: hasQuery ? query : null,
    disclaimer: hasQuery
      ? 'Hospital search results from Mapbox. This is not a cashless or insurer network list — confirm coverage with your insurer before admission.'
      : 'Hospitals near you from Mapbox. This is not a cashless or insurer network list — confirm coverage with your insurer before admission.',
  });
});
