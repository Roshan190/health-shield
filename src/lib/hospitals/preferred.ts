import { getSupabase } from '@/lib/supabase/client';
import type { PreferredHospital } from '@/lib/supabase/database.types';
import type { NearbyHospital } from '@/lib/hospitals/nearby';

export async function listPreferredHospitals(): Promise<PreferredHospital[]> {
  const { data, error } = await getSupabase()
    .from('preferred_hospitals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function addPreferredHospital(params: {
  userId: string;
  hospital: Pick<
    NearbyHospital,
    'place_id' | 'name' | 'vicinity' | 'latitude' | 'longitude' | 'maps_url'
  >;
  notes?: string | null;
}): Promise<PreferredHospital> {
  const { data, error } = await getSupabase()
    .from('preferred_hospitals')
    .upsert(
      {
        user_id: params.userId,
        place_id: params.hospital.place_id,
        name: params.hospital.name,
        address: params.hospital.vicinity,
        latitude: params.hospital.latitude,
        longitude: params.hospital.longitude,
        maps_url: params.hospital.maps_url,
        notes: params.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,place_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not save preferred hospital');
  }
  return data;
}

export async function removePreferredHospital(placeId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('preferred_hospitals')
    .delete()
    .eq('place_id', placeId);

  if (error) {
    throw error;
  }
}
