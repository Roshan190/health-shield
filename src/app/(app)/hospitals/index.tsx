import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectChip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import {
  HospitalsMap,
  type HospitalsMapMarker,
  type HospitalsMapRegion,
} from '@/components/hospitals-map';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  ensureForegroundLocationPermission,
  getCurrentSosCoords,
} from '@/lib/emergency/location';
import {
  buildPolicyCashlessLinks,
  CASHLESS_ASSIST_DISCLAIMER,
  type PolicyCashlessLink,
} from '@/lib/hospitals/insurers';
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
import { getSupabase } from '@/lib/supabase/client';
import type { PreferredHospital } from '@/lib/supabase/database.types';

type HubSegment = 'nearby' | 'preferred' | 'cashless';

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

export default function HospitalsHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [segment, setSegment] = useState<HubSegment>('nearby');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferred, setPreferred] = useState<PreferredHospital[]>([]);
  /** Full nearby category results (kept while searching so local filter still works). */
  const [nearbyAll, setNearbyAll] = useState<NearbyHospital[]>([]);
  /** Extra Mapbox text-search hits (beyond local nearby filter). */
  const [remoteSearch, setRemoteSearch] = useState<NearbyHospital[]>([]);
  const [cashlessLinks, setCashlessLinks] = useState<PolicyCashlessLink[]>([]);
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
  const [loadingCashless, setLoadingCashless] = useState(false);
  const [togglingPlaceId, setTogglingPlaceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);
  const nearbyAllRef = useRef<NearbyHospital[]>([]);
  nearbyAllRef.current = nearbyAll;

  const preferredIds = useMemo(() => new Set(preferred.map((p) => p.place_id)), [preferred]);
  const showMap = mapsSupported && segment !== 'cashless';
  const isTextSearch = searchQuery.trim().length >= 2;

  const preferredFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || segment !== 'preferred') {
      return preferred;
    }
    return preferred.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.address?.toLowerCase().includes(q) ?? false)
    );
  }, [preferred, searchQuery, segment]);

  /** Nearby list shown in UI: local name filter + remote Mapbox hits when searching. */
  const nearby = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      return nearbyAll;
    }
    const localHits = nearbyAll.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.vicinity?.toLowerCase().includes(q) ?? false)
    );
    const seen = new Set(localHits.map((h) => h.place_id));
    const merged = [...localHits];
    for (const hit of remoteSearch) {
      if (!seen.has(hit.place_id)) {
        seen.add(hit.place_id);
        merged.push(hit);
      }
    }
    return merged;
  }, [nearbyAll, remoteSearch, searchQuery]);

  const mapRegion: HospitalsMapRegion | null = useMemo(() => {
    if (isTextSearch && nearby[0]) {
      return {
        latitude: nearby[0].latitude,
        longitude: nearby[0].longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };
    }
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
  }, [userCoords, nearby, preferred, isTextSearch]);

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

  const refreshCashless = useCallback(async () => {
    setLoadingCashless(true);
    try {
      const { data, error: qError } = await getSupabase()
        .from('policies')
        .select('id, insurer, policy_number')
        .order('updated_at', { ascending: false });
      if (qError) {
        throw new Error(qError.message);
      }
      setCashlessLinks(buildPolicyCashlessLinks(data ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load policies for cashless assist');
    } finally {
      setLoadingCashless(false);
    }
  }, []);

  const loadHospitalResults = useCallback(async (queryOverride?: string) => {
    const q = (queryOverride ?? '').trim();
    const searching = q.length >= 2;

    setError(null);
    setCacheNotice(null);
    setPermissionHint(null);
    setShowSettingsLink(false);
    setLoadingNearby(true);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      const permission = await ensureForegroundLocationPermission('hospitals');
      if (permission.ok) {
        const current = await getCurrentSosCoords();
        if (current) {
          coords = { latitude: current.latitude, longitude: current.longitude };
          setUserCoords(coords);
        }
      } else if (!searching) {
        setPermissionHint(permission.message);
        setShowSettingsLink(!permission.canAskAgain);
        setNearbyAll([]);
        setRemoteSearch([]);
        setUserCoords(null);
        return;
      }

      if (!searching && !coords) {
        setError('Could not read your current location. Try again outdoors or near a window.');
        setNearbyAll([]);
        setRemoteSearch([]);
        return;
      }

      if (searching) {
        // Keep existing nearbyAll for local substring filter ("Mau" → "Mauli…").
        // If nearby hasn't loaded yet, fetch it in parallel with text search.
        const nearbyPromise =
          nearbyAllRef.current.length === 0 && coords
            ? fetchNearbyHospitals({
                latitude: coords.latitude,
                longitude: coords.longitude,
              }).then((r) => {
                setNearbyAll(r.hospitals);
                return r;
              })
            : Promise.resolve(null);

        const [result] = await Promise.all([
          fetchNearbyHospitals({
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            query: q,
          }),
          nearbyPromise,
        ]);
        setRemoteSearch(result.hospitals);
        setDisclaimer(
          result.mode === 'search' && result.query
            ? `Search “${result.query}” · filters nearby list and Mapbox · ${result.disclaimer}`
            : result.disclaimer
        );
      } else {
        const result = await fetchNearbyHospitals({
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
        setNearbyAll(result.hospitals);
        setRemoteSearch([]);
        setDisclaimer(result.disclaimer);
        if (result.fromCache) {
          setCacheNotice(
            `Mapbox was busy — showing saved results from ${formatNearbyCacheAge(result.cachedAt ?? '')}. Tap Refresh to try again.`
          );
        }
        if (result.hospitals.length === 0) {
          setError('No hospitals found nearby. Try again later or open Maps manually.');
        }
      }
    } catch (e) {
      if (e instanceof NearbyHospitalsError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Could not load hospitals');
      }
      if (!searching) {
        setNearbyAll([]);
      }
      setRemoteSearch([]);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  // After search debounce, if merged nearby is empty, show empty message.
  useEffect(() => {
    if (!isTextSearch || loadingNearby) {
      return;
    }
    if (nearby.length === 0) {
      setError(`No hospitals matched “${searchQuery.trim()}”. Try another name or city.`);
    } else {
      setError((prev) =>
        prev?.startsWith('No hospitals matched') ? null : prev
      );
    }
  }, [isTextSearch, loadingNearby, nearby.length, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refreshPreferred();
        await refreshCashless();
        if (active && searchQuery.trim().length < 2) {
          await loadHospitalResults();
        }
      })();
      return () => {
        active = false;
      };
      // Initial load only; search debounce owns query-driven fetches.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshPreferred, refreshCashless, loadHospitalResults])
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (segment === 'preferred') {
      return;
    }
    if (segment !== 'nearby') {
      return;
    }
    if (q.length === 0) {
      return;
    }
    if (q.length < 2) {
      return;
    }
    const handle = setTimeout(() => {
      void loadHospitalResults(q);
    }, 450);
    return () => clearTimeout(handle);
  }, [searchQuery, segment, loadHospitalResults]);

  async function clearSearch() {
    setSearchQuery('');
    setRemoteSearch([]);
    setError(null);
    await loadHospitalResults();
  }

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

  async function openExternalUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open the insurer website on this device.');
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

    if (segment === 'preferred') {
      return preferred.map((row) => ({
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
            source: 'preferred' as const,
          }),
      }));
    }
    return [...fromNearby, ...fromPreferredOnly];
  }, [nearby, preferred, preferredIds, segment]);

  const selectedIsPreferred = selected ? preferredIds.has(selected.place_id) : false;

  return (
    <Screen
      title="Hospitals"
      subtitle="Nearby places, your preferred list, and official insurer cashless tools."
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
          Nearby is not an insurer cashless network. Preferred = hospitals you marked. Cashless
          opens the insurer’s official site — always confirm coverage before admission. Ratings are
          not available.
        </ThemedText>
      </Card>

      <View style={styles.segmentRow}>
        <SelectChip
          label="Nearby"
          selected={segment === 'nearby'}
          onPress={() => {
            setMapScrollLocked(false);
            setSegment('nearby');
          }}
        />
        <SelectChip
          label="Preferred"
          selected={segment === 'preferred'}
          onPress={() => {
            setMapScrollLocked(false);
            setSegment('preferred');
          }}
        />
        <SelectChip
          label="Cashless"
          selected={segment === 'cashless'}
          onPress={() => {
            setMapScrollLocked(false);
            setSegment('cashless');
          }}
        />
      </View>

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : null}

      {segment === 'nearby' || segment === 'preferred' ? (
        <Card style={styles.sectionCard}>
          <TextField
            label={segment === 'nearby' ? 'Search hospitals' : 'Filter preferred'}
            icon="search"
            placeholder={
              segment === 'nearby'
                ? 'Filter nearby or search farther (e.g. Mauli, Fortis)'
                : 'Filter by name or address'
            }
            value={searchQuery}
            onChangeText={(text) => {
              const wasSearching = searchQuery.trim().length >= 2;
              setSearchQuery(text);
              if (segment === 'nearby' && text.trim().length === 0 && wasSearching) {
                void loadHospitalResults();
              }
            }}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (segment === 'nearby' && searchQuery.trim().length >= 2) {
                void loadHospitalResults(searchQuery);
              }
            }}
          />
          {segment === 'nearby' && searchQuery.trim().length > 0 ? (
            <View style={styles.searchActions}>
              {searchQuery.trim().length >= 2 ? (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                  {loadingNearby
                    ? 'Searching Mapbox…'
                    : 'Filters the nearby list (instant) and adds Mapbox matches farther away.'}
                </ThemedText>
              ) : (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                  Type at least 2 characters to search.
                </ThemedText>
              )}
              <Button label="Clear" variant="ghost" size="sm" onPress={() => void clearSearch()} />
            </View>
          ) : null}
        </Card>
      ) : null}

      {showMap ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="map" tint="teal" size={34} />
            <View style={styles.flex}>
              <ThemedText type="section">Map</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Blue = you · Teal = nearby · Amber = preferred. Tap a pin for actions.
              </ThemedText>
            </View>
          </View>

          {segment === 'nearby' && !isTextSearch ? (
            <Button
              label={loadingNearby ? 'Finding hospitals…' : 'Refresh nearby'}
              icon="locate"
              variant="secondary"
              size="md"
              loading={loadingNearby}
              onPress={() => void loadHospitalResults()}
              disabled={loadingNearby}
            />
          ) : null}

          {permissionHint && segment === 'nearby' && !isTextSearch ? (
            <View style={styles.noticeRow}>
              <Ionicons name="location" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {permissionHint}
              </ThemedText>
            </View>
          ) : null}

          {cacheNotice && segment === 'nearby' && !isTextSearch ? (
            <View style={styles.noticeRow}>
              <Ionicons name="time-outline" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {cacheNotice}
              </ThemedText>
            </View>
          ) : null}

          {showSettingsLink && segment === 'nearby' && !isTextSearch ? (
            <Button
              label="Open Settings"
              icon="settings"
              variant="ghost"
              size="md"
              onPress={() => Linking.openSettings()}
            />
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
              Tap a hospital pin to see name, distance, and actions.
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

      {segment === 'nearby' ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="medkit" tint="teal" size={34} />
            <View style={styles.flex}>
              <ThemedText type="section">Nearby list</ThemedText>
              {disclaimer ? (
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3}>
                  {disclaimer}
                </ThemedText>
              ) : null}
            </View>
          </View>

          {!mapsSupported && !isTextSearch ? (
            <Button
              label={loadingNearby ? 'Finding hospitals…' : 'Refresh nearby'}
              icon="locate"
              variant="secondary"
              size="md"
              loading={loadingNearby}
              onPress={() => void loadHospitalResults()}
              disabled={loadingNearby}
            />
          ) : null}

          {!loadingNearby && nearby.length === 0 && !permissionHint && !error ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hospitals in this list yet. Allow location and tap Refresh, or search a hospital
              name.
            </ThemedText>
          ) : null}

          {nearby.map((hospital) => {
            const isPreferred = preferredIds.has(hospital.place_id);
            return (
              <HospitalRow
                key={hospital.place_id}
                title={hospital.name}
                subtitle={`${formatHospitalDistance(hospital.distance_m)}${
                  hospital.vicinity ? ` · ${hospital.vicinity}` : ''
                }`}
                isPreferred={isPreferred}
                toggling={togglingPlaceId === hospital.place_id}
                onOpenMaps={() =>
                  openMapsUrl(hospital.maps_url, hospital.latitude, hospital.longitude)
                }
                onTogglePreferred={() => togglePreferred(hospital)}
              />
            );
          })}
        </Card>
      ) : null}

      {segment === 'preferred' ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="star" tint="amber" size={34} />
            <ThemedText type="section">Preferred</ThemedText>
          </View>
          {loadingPreferred ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : preferredFiltered.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {preferred.length === 0
                ? 'None yet. Star a hospital from Nearby or the map — preferred stays even if location is off.'
                : 'No preferred hospitals match this filter.'}
            </ThemedText>
          ) : (
            preferredFiltered.map((row) => (
              <HospitalRow
                key={row.id}
                title={row.name}
                subtitle={row.address ?? 'Preferred'}
                isPreferred
                toggling={togglingPlaceId === row.place_id}
                onOpenMaps={() => openMapsUrl(row.maps_url, row.latitude, row.longitude)}
                onTogglePreferred={() => unmarkPreferred(row.place_id)}
              />
            ))
          )}
        </Card>
      ) : null}

      {segment === 'cashless' ? (
        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <IconBadge icon="link" tint="blue" size={34} />
            <View style={styles.flex}>
              <ThemedText type="section">Cashless on insurer site</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {CASHLESS_ASSIST_DISCLAIMER}
              </ThemedText>
            </View>
          </View>

          {loadingCashless ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading policies…
            </ThemedText>
          ) : cashlessLinks.length === 0 ? (
            <EmptyState
              icon="link"
              tint="blue"
              title="No policy to match yet"
              message="Add a health policy, then return here to open that insurer’s official network tool. HealthShield does not verify cashless empanelment.">
              <Button
                label="Add policy"
                icon="add-circle"
                variant="secondary"
                onPress={() => router.push('/policies/new')}
              />
            </EmptyState>
          ) : (
            cashlessLinks.map((link) => (
              <View
                key={link.policyId}
                style={[styles.cashlessRow, { backgroundColor: theme.surfaceMuted }]}>
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {link.entry?.canonicalName ?? link.policyLabel}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                    {link.entry
                      ? `Matched from “${link.insurerText}”`
                      : `No curated link for “${link.insurerText}” — search your insurer’s app or website.`}
                  </ThemedText>
                  {link.entry?.helpline ? (
                    <ThemedText type="caption" themeColor="textSecondary">
                      Helpline {link.entry.helpline}
                    </ThemedText>
                  ) : null}
                </View>
                {link.entry ? (
                  <Button
                    label="Open"
                    icon="open-outline"
                    variant="secondary"
                    size="sm"
                    onPress={() => openExternalUrl(link.entry!.networkHospitalsUrl)}
                  />
                ) : (
                  <Button
                    label="Edit"
                    icon="create-outline"
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push(`/policies/${link.policyId}`)}
                  />
                )}
              </View>
            ))
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

function HospitalRow({
  title,
  subtitle,
  isPreferred,
  toggling,
  onOpenMaps,
  onTogglePreferred,
}: {
  title: string;
  subtitle: string;
  isPreferred: boolean;
  toggling: boolean;
  onOpenMaps: () => void;
  onTogglePreferred: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open in Maps"
          onPress={onOpenMaps}
          hitSlop={8}
          style={styles.iconBtn}>
          <Ionicons name="navigate" size={20} color={theme.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPreferred ? 'Remove preferred' : 'Mark preferred'}
          disabled={toggling}
          onPress={onTogglePreferred}
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
}

const styles = StyleSheet.create({
  segmentRow: {
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
  cashlessRow: {
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
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
