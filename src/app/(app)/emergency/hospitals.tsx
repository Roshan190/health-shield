import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectChip } from '@/components/chip';
import {
  HospitalsMap,
  type HospitalsMapMarker,
  type HospitalsMapRegion,
} from '@/components/hospitals-map';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  ensureForegroundLocationPermission,
  getCurrentSosCoords,
} from '@/lib/emergency/location';
import {
  fetchNearbyHospitals,
  formatHospitalDistance,
  formatNearbyCacheAge,
  NearbyHospitalsError,
  type NearbyHospital,
} from '@/lib/hospitals/nearby';
import {
  addPreferredHospital,
  listPreferredHospitals,
  removePreferredHospital,
} from '@/lib/hospitals/preferred';
import type { PreferredHospital } from '@/lib/supabase/database.types';

type ViewMode = 'list' | 'map';

type MapSelection = {
  place_id: string;
  name: string;
  vicinity: string | null;
  latitude: number;
  longitude: number;
  maps_url: string;
  distance_m?: number;
  source: 'nearby' | 'preferred';
};

const MAP_DELTA = 0.06;
const mapsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export default function NearbyHospitalsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [preferred, setPreferred] = useState<PreferredHospital[]>([]);
  const [nearby, setNearby] = useState<NearbyHospital[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionHint, setPermissionHint] = useState<string | null>(null);
  const [showSettingsLink, setShowSettingsLink] = useState(false);
  const [loadingPreferred, setLoadingPreferred] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [togglingPlaceId, setTogglingPlaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(mapsSupported ? 'list' : 'list');
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);

  const preferredIds = useMemo(() => new Set(preferred.map((p) => p.place_id)), [preferred]);

  const mapRegion: HospitalsMapRegion | null = useMemo(() => {
    if (userCoords) {
      return {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };
    }
    if (nearby[0]) {
      return {
        latitude: nearby[0].latitude,
        longitude: nearby[0].longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };
    }
    if (preferred[0]) {
      return {
        latitude: preferred[0].latitude,
        longitude: preferred[0].longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };
    }
    return null;
  }, [userCoords, nearby, preferred]);

  const refreshPreferred = useCallback(async () => {
    setLoadingPreferred(true);
    try {
      const rows = await listPreferredHospitals();
      setPreferred(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load preferred hospitals');
    } finally {
      setLoadingPreferred(false);
    }
  }, []);

  const refreshNearby = useCallback(async () => {
    setError(null);
    setCacheNotice(null);
    setPermissionHint(null);
    setShowSettingsLink(false);
    setLoadingNearby(true);
    try {
      const permission = await ensureForegroundLocationPermission('hospitals');
      if (!permission.ok) {
        setPermissionHint(permission.message);
        setShowSettingsLink(!permission.canAskAgain);
        setNearby([]);
        setUserCoords(null);
        return;
      }

      const coords = await getCurrentSosCoords();
      if (!coords) {
        setError('Could not read your current location. Try again outdoors or near a window.');
        setNearby([]);
        setUserCoords(null);
        return;
      }

      setUserCoords({ latitude: coords.latitude, longitude: coords.longitude });

      const result = await fetchNearbyHospitals({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setNearby(result.hospitals);
      setDisclaimer(result.disclaimer);
      if (result.fromCache) {
        setCacheNotice(
          `Mapbox was busy — showing saved results from ${formatNearbyCacheAge(result.cachedAt ?? '')}. Tap Refresh to try again.`
        );
      }
      if (result.hospitals.length === 0) {
        setError('No hospitals found nearby. Try again later or open Maps manually.');
      }
    } catch (e) {
      if (e instanceof NearbyHospitalsError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Could not load nearby hospitals');
      }
      setNearby([]);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refreshPreferred();
        if (active) {
          await refreshNearby();
        }
      })();
      return () => {
        active = false;
      };
    }, [refreshPreferred, refreshNearby])
  );

  async function openMapsUrl(
    url: string | null | undefined,
    fallbackLat?: number,
    fallbackLng?: number
  ) {
    const target =
      url?.trim() ||
      (fallbackLat != null && fallbackLng != null
        ? `https://www.google.com/maps/search/?api=1&query=${fallbackLat},${fallbackLng}`
        : null);
    if (!target) {
      return;
    }
    try {
      await Linking.openURL(target);
    } catch {
      setError('Could not open Maps on this device.');
    }
  }

  async function togglePreferred(hospital: NearbyHospital) {
    if (!user) {
      setError('Not signed in');
      return;
    }
    setTogglingPlaceId(hospital.place_id);
    setError(null);
    try {
      if (preferredIds.has(hospital.place_id)) {
        await removePreferredHospital(hospital.place_id);
        setPreferred((prev) => prev.filter((p) => p.place_id !== hospital.place_id));
      } else {
        const saved = await addPreferredHospital({ userId: user.id, hospital });
        setPreferred((prev) => [saved, ...prev.filter((p) => p.place_id !== saved.place_id)]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update preferred hospital');
    } finally {
      setTogglingPlaceId(null);
    }
  }

  async function togglePreferredFromSelection(item: MapSelection) {
    await togglePreferred({
      place_id: item.place_id,
      name: item.name,
      vicinity: item.vicinity,
      latitude: item.latitude,
      longitude: item.longitude,
      maps_url: item.maps_url,
      distance_m: item.distance_m ?? 0,
    });
  }

  async function unmarkPreferred(placeId: string) {
    setTogglingPlaceId(placeId);
    setError(null);
    try {
      await removePreferredHospital(placeId);
      setPreferred((prev) => prev.filter((p) => p.place_id !== placeId));
      if (selected?.place_id === placeId) {
        setSelected((prev) => (prev ? { ...prev, source: 'nearby' } : prev));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove preferred hospital');
    } finally {
      setTogglingPlaceId(null);
    }
  }

  const mapMarkers: HospitalsMapMarker[] = useMemo(() => {
    const fromNearby: HospitalsMapMarker[] = nearby.map((hospital) => ({
      id: `n-${hospital.place_id}`,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      title: hospital.name,
      description: hospital.vicinity
        ? `${formatHospitalDistance(hospital.distance_m)} · ${hospital.vicinity}`
        : formatHospitalDistance(hospital.distance_m),
      pinColor: preferredIds.has(hospital.place_id) ? '#D97706' : '#0D9488',
      onPress: () =>
        setSelected({
          place_id: hospital.place_id,
          name: hospital.name,
          vicinity: hospital.vicinity,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          maps_url: hospital.maps_url,
          distance_m: hospital.distance_m,
          source: preferredIds.has(hospital.place_id) ? 'preferred' : 'nearby',
        }),
    }));

    const fromPreferredOnly: HospitalsMapMarker[] = preferred
      .filter((row) => !nearby.some((n) => n.place_id === row.place_id))
      .map((row) => ({
        id: `p-${row.place_id}`,
        latitude: row.latitude,
        longitude: row.longitude,
        title: row.name,
        description: row.address ?? 'Preferred',
        pinColor: '#D97706',
        onPress: () =>
          setSelected({
            place_id: row.place_id,
            name: row.name,
            vicinity: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            maps_url:
              row.maps_url ??
              `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`,
            source: 'preferred',
          }),
      }));

    return [...fromNearby, ...fromPreferredOnly];
  }, [nearby, preferred, preferredIds]);

  const selectedIsPreferred = selected ? preferredIds.has(selected.place_id) : false;

  return (
    <Screen
      title="Nearby hospitals"
      subtitle="Find hospitals near you. Mark preferred ones you trust or believe are cashless."
      headerRight={
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </Pressable>
      }
      scroll
      scrollEnabled={!mapScrollLocked}>
      <Card variant="muted" style={styles.noticeRow}>
        <Ionicons name="information-circle" size={18} color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
          This is not an insurer cashless network list. Preferred = hospitals you marked. Always
          confirm coverage with your insurer before admission. Ratings are not available.
        </ThemedText>
      </Card>

      {mapsSupported ? (
        <View style={styles.viewToggle}>
          <SelectChip
            label="List"
            selected={viewMode === 'list'}
            onPress={() => {
              setMapScrollLocked(false);
              setViewMode('list');
            }}
          />
          <SelectChip
            label="Map"
            selected={viewMode === 'map'}
            onPress={() => {
              setMapScrollLocked(false);
              setViewMode('map');
            }}
          />
        </View>
      ) : (
        <ThemedText type="caption" themeColor="textSecondary">
          Map view is available on the iOS/Android app.
        </ThemedText>
      )}

      {/* Preferred (always in list mode; compact on map) */}
      {viewMode === 'list' || !mapsSupported ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="star" tint="amber" size={34} />
            <ThemedText type="section">Preferred</ThemedText>
          </View>
          {loadingPreferred ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : preferred.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              None yet. Mark hospitals from the Nearby list or map.
            </ThemedText>
          ) : (
            preferred.map((row) => (
              <View
                key={row.id}
                style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {row.name}
                  </ThemedText>
                  {row.address ? (
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                      {row.address}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open in Maps"
                    onPress={() => openMapsUrl(row.maps_url, row.latitude, row.longitude)}
                    hitSlop={8}
                    style={styles.iconBtn}>
                    <Ionicons name="navigate" size={20} color={theme.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove preferred"
                    disabled={togglingPlaceId === row.place_id}
                    onPress={() => unmarkPreferred(row.place_id)}
                    hitSlop={8}
                    style={styles.iconBtn}>
                    <Ionicons name="star" size={20} color={theme.warning} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {/* Nearby list */}
      {viewMode === 'list' || !mapsSupported ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="medkit" tint="teal" size={34} />
            <View style={styles.flex}>
              <ThemedText type="section">Nearby</ThemedText>
              {disclaimer ? (
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3}>
                  {disclaimer}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <Button
            label={loadingNearby ? 'Finding hospitals…' : 'Refresh nearby'}
            icon="locate"
            variant="secondary"
            size="md"
            loading={loadingNearby}
            onPress={refreshNearby}
            disabled={loadingNearby}
          />

          {permissionHint ? (
            <View style={styles.noticeRow}>
              <Ionicons name="location" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {permissionHint}
              </ThemedText>
            </View>
          ) : null}

          {cacheNotice ? (
            <View style={styles.noticeRow}>
              <Ionicons name="time-outline" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {cacheNotice}
              </ThemedText>
            </View>
          ) : null}

          {showSettingsLink ? (
            <Button
              label="Open Settings"
              icon="settings"
              variant="ghost"
              size="md"
              onPress={() => Linking.openSettings()}
            />
          ) : null}

          {!loadingNearby && nearby.length === 0 && !permissionHint && !error ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hospitals loaded yet.
            </ThemedText>
          ) : null}

          {nearby.map((hospital) => {
            const isPreferred = preferredIds.has(hospital.place_id);
            return (
              <View
                key={hospital.place_id}
                style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {hospital.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {formatHospitalDistance(hospital.distance_m)}
                    {hospital.vicinity ? ` · ${hospital.vicinity}` : ''}
                  </ThemedText>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open in Maps"
                    onPress={() =>
                      openMapsUrl(hospital.maps_url, hospital.latitude, hospital.longitude)
                    }
                    hitSlop={8}
                    style={styles.iconBtn}>
                    <Ionicons name="navigate" size={20} color={theme.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isPreferred ? 'Remove preferred' : 'Mark preferred'}
                    disabled={togglingPlaceId === hospital.place_id}
                    onPress={() => togglePreferred(hospital)}
                    hitSlop={8}
                    style={styles.iconBtn}>
                    <Ionicons
                      name={isPreferred ? 'star' : 'star-outline'}
                      size={20}
                      color={isPreferred ? theme.warning : theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      {/* Map view */}
      {viewMode === 'map' && mapsSupported ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="map" tint="teal" size={34} />
            <View style={styles.flex}>
              <ThemedText type="section">Map</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Blue = you · Teal = nearby · Amber = preferred. Tap a pin to see details.
              </ThemedText>
            </View>
          </View>

          <Button
            label={loadingNearby ? 'Finding hospitals…' : 'Refresh nearby'}
            icon="locate"
            variant="secondary"
            size="md"
            loading={loadingNearby}
            onPress={refreshNearby}
            disabled={loadingNearby}
          />

          {permissionHint ? (
            <View style={styles.noticeRow}>
              <Ionicons name="location" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {permissionHint}
              </ThemedText>
            </View>
          ) : null}

          {cacheNotice ? (
            <View style={styles.noticeRow}>
              <Ionicons name="time-outline" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {cacheNotice}
              </ThemedText>
            </View>
          ) : null}

          {selected ? (
            <View style={[styles.selectedCard, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.selectedHeader}>
                <IconBadge
                  icon={selectedIsPreferred ? 'star' : 'medkit'}
                  tint={selectedIsPreferred ? 'amber' : 'teal'}
                  size={34}
                />
                <View style={styles.flex}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {selected.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3}>
                    {selected.distance_m != null
                      ? `${formatHospitalDistance(selected.distance_m)} away`
                      : 'Distance unknown'}
                    {selectedIsPreferred ? ' · Preferred' : ''}
                    {selected.vicinity ? `\n${selected.vicinity}` : ''}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.selectedActions}>
                <Button
                  label="Open in Maps"
                  icon="navigate"
                  variant="secondary"
                  size="md"
                  onPress={() =>
                    openMapsUrl(selected.maps_url, selected.latitude, selected.longitude)
                  }
                />
                <Button
                  label={selectedIsPreferred ? 'Remove preferred' : 'Mark preferred'}
                  icon={selectedIsPreferred ? 'star' : 'star-outline'}
                  variant="secondary"
                  size="md"
                  loading={togglingPlaceId === selected.place_id}
                  onPress={() => togglePreferredFromSelection(selected)}
                  disabled={togglingPlaceId === selected.place_id}
                />
              </View>
            </View>
          ) : (
            <ThemedText type="caption" themeColor="textSecondary">
              Tap a hospital pin to see name, distance, and actions here.
            </ThemedText>
          )}

          {mapRegion ? (
            <HospitalsMap
              region={mapRegion}
              markers={mapMarkers}
              userLocation={userCoords}
              onGestureActiveChange={setMapScrollLocked}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Allow location to center the map, or mark preferred hospitals first.
            </ThemedText>
          )}
        </Card>
      ) : null}

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sectionCard: {
    gap: Spacing.three,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.half,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + Spacing.half,
    borderRadius: Radius.lg,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconBtn: {
    padding: Spacing.one,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
  selectedCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.half,
  },
  selectedActions: {
    gap: Spacing.two,
  },
});
