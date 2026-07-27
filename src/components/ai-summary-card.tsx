import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const AI_SUMMARY_DISCLAIMER =
  'HealthShield rewrites what you already saved. This is not medical or insurance advice, and it does not diagnose or prescribe.';

type AiSummaryCardProps = {
  /** Saved-row summary from the Edge Function. */
  summary: string | null;
  disclaimer?: string | null;
  error: string | null;
  loading: boolean;
  disabled?: boolean;
  onSummarize: () => void;
  /** Extra hint under the title (e.g. save-first reminder). */
  hint?: string;
};

type SummaryBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'fact'; label: string; value: string }
  | { type: 'bullet'; text: string };

/** Strip common markdown so RN Text does not show raw `**`. */
function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/, '')
    .trim();
}

function parseSummaryBlocks(summary: string): SummaryBlock[] {
  const lines = summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: SummaryBlock[] = [];

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const content = stripInlineMarkdown(bullet ? bullet[1] : line);
    if (!content) {
      continue;
    }

    const fact = content.match(/^([^:]{2,40}):\s+(.+)$/);
    if (bullet && fact) {
      blocks.push({ type: 'fact', label: fact[1].trim(), value: fact[2].trim() });
      continue;
    }
    if (bullet) {
      blocks.push({ type: 'bullet', text: content });
      continue;
    }
    blocks.push({ type: 'paragraph', text: content });
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: stripInlineMarkdown(summary) }];
}

function SummaryBody({ summary }: { summary: string }) {
  const theme = useTheme();
  const blocks = parseSummaryBlocks(summary);

  return (
    <View style={[styles.summaryBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
      {blocks.map((block, index) => {
        if (block.type === 'fact') {
          return (
            <View
              key={`fact-${index}`}
              style={[
                styles.factRow,
                index < blocks.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
              ]}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.factLabel}>
                {block.label}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.factValue}>
                {block.value}
              </ThemedText>
            </View>
          );
        }
        if (block.type === 'bullet') {
          return (
            <View key={`bullet-${index}`} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="small" style={styles.bulletText}>
                {block.text}
              </ThemedText>
            </View>
          );
        }
        return (
          <ThemedText key={`p-${index}`} type="small" style={styles.paragraph}>
            {block.text}
          </ThemedText>
        );
      })}
    </View>
  );
}

export function AiSummaryCard({
  summary,
  disclaimer,
  error,
  loading,
  disabled,
  onSummarize,
  hint = 'Uses the details you saved on this screen — not attached PDFs or photos.',
}: AiSummaryCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <IconBadge icon="sparkles" tint="violet" size={34} />
        <View style={styles.titleCopy}>
          <ThemedText type="section">Plain-language summary</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {hint}
          </ThemedText>
        </View>
      </View>

      {summary ? <SummaryBody summary={summary} /> : null}

      {error ? (
        <View style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="caption" themeColor="textSecondary">
        {disclaimer ?? AI_SUMMARY_DISCLAIMER}
      </ThemedText>

      <Button
        label={summary ? 'Summarize again' : 'Summarize'}
        icon="sparkles"
        variant="secondary"
        size="md"
        loading={loading}
        disabled={disabled}
        onPress={onSummarize}
      />
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
  summaryBox: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  paragraph: {
    lineHeight: 22,
  },
  factRow: {
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  factLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  factValue: {
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
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
