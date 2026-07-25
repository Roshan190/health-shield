import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  invalid?: boolean;
};

export function TextField({
  label,
  icon,
  hint,
  invalid,
  style,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = invalid ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="smallBold" themeColor={focused ? 'primary' : 'textSecondary'}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.fieldWrap,
          multiline && styles.fieldWrapMultiline,
          {
            backgroundColor: theme.surface,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? theme.primary : theme.textTertiary}
            style={multiline && styles.iconMultiline}
          />
        ) : null}
        <TextInput
          placeholderTextColor={theme.textTertiary}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.field, { color: theme.text }, style]}
          {...rest}
        />
      </View>
      {hint ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {hint}
        </ThemedText>
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
  },
  fieldWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  iconMultiline: {
    marginTop: Spacing.two,
  },
  field: {
    flex: 1,
    minHeight: 52,
    fontSize: 16,
    paddingVertical: 0,
  },
});
