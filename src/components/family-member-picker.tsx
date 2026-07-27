import { StyleSheet, View } from 'react-native';

import { SelectChip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { FamilyMember } from '@/lib/supabase/database.types';

type FamilyMemberPickerProps = {
  members: FamilyMember[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  disabled?: boolean;
  /** When true, hide the whole control if there are no members. */
  hideWhenEmpty?: boolean;
  label?: string;
  hint?: string;
  emptyHint?: string;
};

/**
 * Optional household-member link (owner-managed profiles only — D-008).
 * Not invite/shared login access.
 */
export function FamilyMemberPicker({
  members,
  value,
  onChange,
  disabled = false,
  hideWhenEmpty = false,
  label = 'Family member',
  hint = 'Optional. Helps you find this person’s documents later.',
  emptyHint = 'Add someone under Family to tag items for them. Profiles stay on your account — they do not get a separate login yet.',
}: FamilyMemberPickerProps) {
  if (members.length === 0) {
    if (hideWhenEmpty) {
      return null;
    }
    return (
      <View style={styles.block}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {emptyHint}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="caption" themeColor="textTertiary">
        {hint}
      </ThemedText>
      <View style={styles.chips}>
        <SelectChip
          label="Unassigned"
          selected={value === null}
          onPress={() => onChange(null)}
          disabled={disabled}
        />
        {members.map((member) => (
          <SelectChip
            key={member.id}
            label={member.full_name}
            selected={value === member.id}
            onPress={() => onChange(member.id)}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
