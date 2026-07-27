import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMapboxPublicToken } from '@/lib/mapbox/token';

export type HospitalsMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  pinColor: string;
  onPress: () => void;
};

export type HospitalsMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type HospitalsMapUserLocation = {
  latitude: number;
  longitude: number;
};

type HospitalsMapProps = {
  region: HospitalsMapRegion;
  markers: HospitalsMapMarker[];
  /** Shown as a blue “You” marker so distance to hospitals is obvious. */
  userLocation?: HospitalsMapUserLocation | null;
  /** Lock the parent ScrollView while the user pans/zooms the map. */
  onGestureActiveChange?: (active: boolean) => void;
};

function zoomFromDelta(latitudeDelta: number): number {
  const delta = Math.max(latitudeDelta, 0.002);
  return Math.min(16, Math.max(10, Math.log2(360 / delta)));
}

function buildMapHtml(input: {
  token: string;
  latitude: number;
  longitude: number;
  zoom: number;
  markers: { id: string; latitude: number; longitude: number; pinColor: string }[];
  userLocation: HospitalsMapUserLocation | null;
}): string {
  const payload = JSON.stringify({
    token: input.token,
    center: [input.longitude, input.latitude],
    zoom: input.zoom,
    markers: input.markers,
    userLocation: input.userLocation
      ? [input.userLocation.longitude, input.userLocation.latitude]
      : null,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e8eef5; }
    .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { opacity: 0.85; }
    .you-label {
      background: #2563EB;
      color: #fff;
      font: 600 11px/1.2 -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 4px 8px;
      border-radius: 999px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var cfg = ${payload};
      function post(msg) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        } catch (e) {}
      }
      if (!cfg.token || !window.mapboxgl) {
        post({ type: 'error', message: 'Mapbox failed to load' });
        return;
      }
      mapboxgl.accessToken = cfg.token;
      var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: cfg.center,
        zoom: cfg.zoom,
        attributionControl: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      function selectHospital(id) {
        if (!id) return;
        post({ type: 'marker', id: String(id) });
      }

      map.on('load', function () {
        map.addSource('hospitals', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: (cfg.markers || []).map(function (m) {
              return {
                type: 'Feature',
                properties: { id: m.id, pinColor: m.pinColor },
                geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
              };
            }),
          },
        });
        map.addLayer({
          id: 'hospitals-hit',
          type: 'circle',
          source: 'hospitals',
          paint: {
            'circle-radius': 18,
            'circle-color': '#000000',
            'circle-opacity': 0.01,
          },
        });
        map.addLayer({
          id: 'hospitals-circles',
          type: 'circle',
          source: 'hospitals',
          paint: {
            'circle-radius': 9,
            'circle-color': ['get', 'pinColor'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });

        if (cfg.userLocation) {
          map.addSource('you', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: cfg.userLocation },
            },
          });
          map.addLayer({
            id: 'you-halo',
            type: 'circle',
            source: 'you',
            paint: {
              'circle-radius': 16,
              'circle-color': '#2563EB',
              'circle-opacity': 0.2,
            },
          });
          map.addLayer({
            id: 'you-dot',
            type: 'circle',
            source: 'you',
            paint: {
              'circle-radius': 7,
              'circle-color': '#2563EB',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          });
          var el = document.createElement('div');
          el.className = 'you-label';
          el.textContent = 'You';
          new mapboxgl.Marker({ element: el, offset: [0, -22] })
            .setLngLat(cfg.userLocation)
            .addTo(map);
        }

        map.on('click', 'hospitals-hit', function (e) {
          var f = e.features && e.features[0];
          selectHospital(f && f.properties && f.properties.id);
        });
        map.on('click', 'hospitals-circles', function (e) {
          var f = e.features && e.features[0];
          selectHospital(f && f.properties && f.properties.id);
        });
        map.on('click', function (e) {
          var feats = map.queryRenderedFeatures(e.point, {
            layers: ['hospitals-hit', 'hospitals-circles'],
          });
          if (feats && feats[0] && feats[0].properties) {
            selectHospital(feats[0].properties.id);
          }
        });
        post({ type: 'ready' });
      });
      map.on('error', function () {
        post({ type: 'error', message: 'Mapbox tile error — check the public token' });
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Mapbox Streets via WebView (Mapbox GL JS).
 * Works in Expo Go — no Google key, no @rnmapbox/maps native rebuild.
 */
export function HospitalsMap({
  region,
  markers,
  userLocation,
  onGestureActiveChange,
}: HospitalsMapProps) {
  const theme = useTheme();
  const token = getMapboxPublicToken();
  const onPressById = useRef(new Map<string, () => void>());

  onPressById.current = new Map(markers.map((m) => [m.id, m.onPress]));

  const html = useMemo(() => {
    if (!token) {
      return null;
    }
    return buildMapHtml({
      token,
      latitude: region.latitude,
      longitude: region.longitude,
      zoom: zoomFromDelta(region.latitudeDelta),
      markers: markers.map((m) => ({
        id: m.id,
        latitude: m.latitude,
        longitude: m.longitude,
        pinColor: m.pinColor,
      })),
      userLocation: userLocation ?? null,
    });
  }, [
    token,
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    markers,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
      };
      if (data.type === 'marker' && data.id) {
        onPressById.current.get(data.id)?.();
      }
    } catch {
      // ignore malformed messages
    }
  }

  if (!token || !html) {
    return (
      <View style={[styles.mapWrap, styles.fallback, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.fallbackText}>
          Map needs EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN (public pk. token) in .env. Restart Expo after
          adding it. List still works without it.
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.mapWrap, { borderColor: theme.border }]}
      onTouchStart={() => onGestureActiveChange?.(true)}
      onTouchEnd={() => onGestureActiveChange?.(false)}
      onTouchCancel={() => onGestureActiveChange?.(false)}>
      <WebView
        key={`${region.latitude.toFixed(4)}-${region.longitude.toFixed(4)}-${markers.length}-${userLocation ? 'you' : 'no'}`}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://api.mapbox.com' }}
        style={styles.map}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mixedContentMode="always"
        androidLayerType="hardware"
        nestedScrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 320,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  fallbackText: {
    textAlign: 'center',
  },
});
