import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';
import {
  formatDisplayDate,
  parseISODate,
  toISODateFromPicker,
  toPickerDate,
} from '@/lib/dates';

type DateFieldProps = {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const webInputStyle: TextStyle = {
  flex: 1,
  minHeight: 52,
  fontSize: 16,
  paddingVertical: 0,
};

export function DateField({
  label,
  icon = 'calendar',
  hint,
  placeholder = 'Select date',
  value,
  onChange,
  minimumDate,
  maximumDate,
  clearable = true,
  disabled = false,
  style,
}: DateFieldProps) {
  const theme = useTheme();
  const themeName = useThemeName();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseISODate(value) ?? new Date());

  const display = value ? formatDisplayDate(value) : '';
  const localValue = parseISODate(value) ?? draft;
  /** UTC-noon twin so Android `toISOString()` keeps the same calendar day. */
  const pickerValue = toPickerDate(localValue);

  function openPicker() {
    if (disabled) {
      return;
    }
    const next = parseISODate(value) ?? new Date();
    setDraft(toPickerDate(next));
    setOpen(true);
  }

  function commit(date: Date) {
    onChange(toISODateFromPicker(date));
    setOpen(false);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <ThemedText type="smallBold" themeColor={open ? 'primary' : 'textSecondary'}>
          {label}
        </ThemedText>
      ) : null}

      {Platform.OS === 'web' ? (
        <View
          style={[
            styles.fieldWrap,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              opacity: disabled ? 0.55 : 1,
            },
          ]}>
          <Ionicons name={icon} size={19} color={value ? theme.primary : theme.textTertiary} />
          <TextInput
            {...({ type: 'date' } as Record<string, string>)}
            editable={!disabled}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textTertiary}
            style={[webInputStyle, { color: theme.text }]}
          />
          {clearable && value && !disabled ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear date" hitSlop={8} onPress={clear}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ?? 'Date'}
          disabled={disabled}
          onPress={openPicker}
          style={({ pressed }) => [
            styles.fieldWrap,
            {
              backgroundColor: theme.surface,
              borderColor: open ? theme.primary : theme.border,
              borderWidth: open ? 1.5 : 1,
              opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
            },
          ]}>
          <Ionicons
            name={icon}
            size={19}
            color={open || value ? theme.primary : theme.textTertiary}
          />
          <ThemedText
            type="small"
            themeColor={display ? 'text' : 'textTertiary'}
            style={styles.value}
            numberOfLines={1}>
            {display || placeholder}
          </ThemedText>
          {clearable && value && !disabled ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear date" hitSlop={8} onPress={clear}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
          )}
        </Pressable>
      )}

      {hint ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {hint}
        </ThemedText>
      ) : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          presentation="dialog"
          accentColor={theme.primary}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_event, selectedDate) => {
            commit(selectedDate);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}

      {Platform.OS === 'ios' && open ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.iosBackdrop} onPress={() => setOpen(false)}>
            <View style={[styles.iosSheet, { backgroundColor: theme.surface }]}>
              <View style={styles.iosHeader}>
                <ThemedText type="smallBold">{label ?? 'Select date'}</ThemedText>
                <View style={styles.sheetActionsRight}>
                  {clearable && value ? (
                    <Button label="Clear" variant="ghost" size="sm" onPress={clear} />
                  ) : null}
                  <Button label="Done" size="sm" onPress={() => commit(draft)} />
                </View>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                themeVariant={themeName}
                accentColor={theme.primary}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onValueChange={(_event, selectedDate) => {
                  setDraft(toPickerDate(selectedDate));
                }}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one + Spacing.half,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
  iosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 28, 0.4)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.one,
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
  sheetActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
