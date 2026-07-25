import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'section'
    | 'stat'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'label'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'heading' && styles.heading,
        type === 'section' && styles.section,
        type === 'stat' && styles.stat,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'label' && styles.label,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  /** Large display heading — hero banners. */
  title: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  /** Screen title. */
  subtitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
    letterSpacing: -0.4,
  },
  /** Card / hero secondary heading. */
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  /** Section titles between card groups. */
  section: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 700,
    letterSpacing: -0.2,
  },
  /** Big numeric stat. */
  stat: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  /** Fine print / metadata. */
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: 500,
  },
  /** Uppercase micro-label above values. */
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
