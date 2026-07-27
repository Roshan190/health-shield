import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { confirmAction } from '@/lib/confirm';
import {
  acceptHouseholdInvite,
  cancelHouseholdInvite,
  createHouseholdInvite,
  listIncomingPendingInvites,
  listJoinedMemberships,
  listOutgoingInvites,
  listOwnedMemberships,
  revokeVaultMembership,
} from '@/lib/sharing/api';
import { getSupabase } from '@/lib/supabase/client';
import type { HouseholdInvite, VaultMembership } from '@/lib/supabase/database.types';

const emailSchema = z.string().trim().email('Enter a valid email');

export default function FamilySharingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [outgoing, setOutgoing] = useState<HouseholdInvite[]>([]);
  const [incoming, setIncoming] = useState<HouseholdInvite[]>([]);
  const [owned, setOwned] = useState<VaultMembership[]>([]);
  const [joined, setJoined] = useState<VaultMembership[]>([]);
  const [emailByMemberId, setEmailByMemberId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [out, inc, own, join, acceptedInvites] = await Promise.all([
        listOutgoingInvites(user.id),
        listIncomingPendingInvites(),
        listOwnedMemberships(user.id),
        listJoinedMemberships(user.id),
        getSupabase()
          .from('household_invites')
          .select('invitee_user_id, invitee_email')
          .eq('owner_user_id', user.id)
          .eq('status', 'accepted'),
      ]);
      setOutgoing(out.filter((i) => i.status === 'pending' || i.status === 'accepted'));
      setIncoming(inc.filter((i) => i.owner_user_id !== user.id));
      setOwned(own);
      setJoined(join);
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
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const pendingOutgoing = useMemo(
    () => outgoing.filter((i) => i.status === 'pending'),
    [outgoing]
  );

  async function onInvite() {
    if (!user) {
      return;
    }
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await createHouseholdInvite(user.id, parsed.data);
      setEmail('');
      setStatus('Invite saved. They will see it after signing in with that email.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create invite.');
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(invite: HouseholdInvite) {
    setBusy(true);
    setError(null);
    try {
      await acceptHouseholdInvite(invite.id);
      setStatus('Invite accepted. Ask them to share specific policies or records with you.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept invite.');
    } finally {
      setBusy(false);
    }
  }

  async function onCancelInvite(invite: HouseholdInvite) {
    setBusy(true);
    setError(null);
    try {
      await cancelHouseholdInvite(invite.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel invite.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevoke(membership: VaultMembership) {
    const ok = await confirmAction({
      title: 'Revoke access?',
      message: 'They will lose view access to every item you shared with them.',
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    await onRevoke(membership);
  }

  async function onRevoke(membership: VaultMembership) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await revokeVaultMembership(membership.id);
      setStatus('Access revoked. Shared items are no longer visible to them.');
      await load();
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : e instanceof Error
            ? e.message
            : 'Could not revoke access.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Sharing" subtitle="Invite a login. Share items explicitly.">
      <Card variant="tinted" style={styles.infoCard}>
        <IconBadge icon="information-circle" tint="blue" size={40} />
        <View style={styles.infoBody}>
          <ThemedText type="smallBold">How sharing works</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            1) Invite their email. 2) They accept in the app (same email). 3) You open a policy or
            record and tap Share. Family profiles on your account are still not separate logins.
          </ThemedText>
        </View>
      </Card>

      {incoming.length > 0 ? (
        <Card style={styles.section}>
          <ThemedText type="section">Invites for you</ThemedText>
          {incoming.map((invite) => (
            <View key={invite.id} style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.rowBody}>
                <ThemedText type="smallBold">Household invite</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  For {invite.invitee_email}
                </ThemedText>
              </View>
              <Button
                label="Accept"
                size="sm"
                loading={busy}
                onPress={() => {
                  void onAccept(invite);
                }}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <ThemedText type="section">Invite someone</ThemedText>
        <TextField
          label="Their email"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="mom@example.com"
        />
        <Button label="Send invite" icon="send" loading={busy} onPress={onInvite} />
        <ThemedText type="caption" themeColor="textSecondary">
          No email is sent yet — they must open HealthShield signed in with this address.
        </ThemedText>
      </Card>

      <Card style={styles.section}>
        <ThemedText type="section">Pending invites you sent</ThemedText>
        {loading ? (
          <ThemedText type="caption" themeColor="textSecondary">
            Loading…
          </ThemedText>
        ) : pendingOutgoing.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            None pending.
          </ThemedText>
        ) : (
          pendingOutgoing.map((invite) => (
            <View key={invite.id} style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.rowBody}>
                <ThemedText type="smallBold">{invite.invitee_email}</ThemedText>
                <Chip label="Pending" tint="amber" icon="time" />
              </View>
              <Button
                label="Cancel"
                size="sm"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  void onCancelInvite(invite);
                }}
              />
            </View>
          ))
        )}
      </Card>

      <Card style={styles.section}>
        <ThemedText type="section">People with access</ThemedText>
        {owned.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No one has accepted yet.
          </ThemedText>
        ) : (
          owned.map((m) => (
            <View key={m.id} style={[styles.row, { backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.rowBody}>
                <ThemedText type="smallBold">
                  {emailByMemberId[m.member_user_id] ?? 'Household member'}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  View-only on items you share
                </ThemedText>
              </View>
              <Button
                label="Revoke"
                size="sm"
                variant="danger"
                disabled={busy}
                loading={busy}
                onPress={() => {
                  void confirmRevoke(m);
                }}
              />
            </View>
          ))
        )}
      </Card>

      {joined.length > 0 ? (
        <Card style={styles.section}>
          <ThemedText type="section">Vaults you can view</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Shared policies and records appear in your Policies and Health → Records lists with a
            Shared label.
          </ThemedText>
          <Chip label={`${joined.length} active link${joined.length === 1 ? '' : 's'}`} tint="teal" />
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
      {status ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.noticeText}>
            {status}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.half,
    alignItems: 'flex-start',
  },
  infoBody: {
    flex: 1,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + Spacing.half,
    borderRadius: 12,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
