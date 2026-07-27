import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  listOwnedMemberships,
  listSharesForResource,
  shareVaultItem,
  unshareVaultItem,
} from '@/lib/sharing/api';
import { getSupabase } from '@/lib/supabase/client';
import type { VaultItemShare, VaultMembership, VaultResourceType } from '@/lib/supabase/database.types';

type VaultItemShareCardProps = {
  ownerUserId: string;
  resourceType: VaultResourceType;
  resourceId: string;
};

/** Owner-only: share this saved item with active household members. */
export function VaultItemShareCard({
  ownerUserId,
  resourceType,
  resourceId,
}: VaultItemShareCardProps) {
  const theme = useTheme();
  const [members, setMembers] = useState<VaultMembership[]>([]);
  const [shares, setShares] = useState<VaultItemShare[]>([]);
  const [emailByMemberId, setEmailByMemberId] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberships, itemShares, acceptedInvites] = await Promise.all([
        listOwnedMemberships(ownerUserId),
        listSharesForResource(ownerUserId, resourceType, resourceId),
        getSupabase()
          .from('household_invites')
          .select('invitee_user_id, invitee_email')
          .eq('owner_user_id', ownerUserId)
          .eq('status', 'accepted'),
      ]);
      setMembers(memberships);
      setShares(itemShares);
      const map: Record<string, string> = {};
      for (const row of acceptedInvites.data ?? []) {
        if (row.invitee_user_id) {
          map[row.invitee_user_id] = row.invitee_email;
        }
      }
      setEmailByMemberId(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sharing.');
    } finally {
      setLoading(false);
    }
  }, [ownerUserId, resourceId, resourceType]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleShare(member: VaultMembership) {
    const existing = shares.find((s) => s.member_user_id === member.member_user_id);
    setBusyId(member.id);
    setError(null);
    try {
      if (existing) {
        await unshareVaultItem(existing.id);
      } else {
        await shareVaultItem({
          ownerUserId,
          memberUserId: member.member_user_id,
          resourceType,
          resourceId,
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update share.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <IconBadge icon="share-social" tint="teal" size={34} />
        <View style={styles.titleCopy}>
          <ThemedText type="section">Share with household</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            View-only. Invite someone under Family → Sharing first. Tagging a family profile is not
            the same as sharing with their login.
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Loading…
        </ThemedText>
      ) : members.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No active household members yet. Invite their email and ask them to accept in the app.
        </ThemedText>
      ) : (
        members.map((member) => {
          const shared = shares.some((s) => s.member_user_id === member.member_user_id);
          const label = emailByMemberId[member.member_user_id] ?? 'Household member';
          return (
            <View
              key={member.id}
              style={[styles.memberRow, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.memberCopy}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {label}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {shared ? 'Can view this item' : 'Not shared'}
                </ThemedText>
              </View>
              <Button
                label={shared ? 'Unshare' : 'Share'}
                size="sm"
                variant={shared ? 'secondary' : 'primary'}
                loading={busyId === member.id}
                disabled={busyId != null}
                onPress={() => {
                  void toggleShare(member);
                }}
              />
            </View>
          );
        })
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.half,
  },
  titleCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + Spacing.half,
    borderRadius: 12,
  },
  memberCopy: {
    flex: 1,
    gap: Spacing.half,
  },
});
