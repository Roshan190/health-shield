import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ASK_DOCUMENT_DISCLAIMER,
  askDocument,
  AskDocumentError,
  type AskDocumentHistoryTurn,
  type AskDocumentKind,
} from '@/lib/ai/ask-document';

type Message = {
  id: number;
  role: 'user' | 'assistant' | 'error';
  text: string;
};

type DocumentQaCardProps = {
  kind: AskDocumentKind;
  itemId: string;
  hasDocument: boolean;
  isOwner: boolean;
  disabled?: boolean;
};

const SUGGESTIONS: Record<AskDocumentKind, string[]> = {
  policy: [
    'What is the sum insured?',
    'Is accidental hospitalization covered?',
    'Are there waiting periods or exclusions?',
  ],
  record: [
    'What date is on this report?',
    'Who issued this document?',
    'What tests or items does it list?',
  ],
};

export function DocumentQaCard({
  kind,
  itemId,
  hasDocument,
  isOwner,
  disabled,
}: DocumentQaCardProps) {
  const theme = useTheme();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [disclaimer, setDisclaimer] = useState(ASK_DOCUMENT_DISCLAIMER);
  const [loading, setLoading] = useState(false);
  const nextId = useRef(0);

  const canAsk = isOwner && hasDocument && !disabled;

  const hint = !isOwner
    ? 'Only the owner can ask about this file.'
    : !hasDocument
      ? 'Attach a PDF or JPEG/PNG/WebP on this item first.'
      : kind === 'policy'
        ? 'Chats about the attached policy PDF only — not your other vault files.'
        : 'Chats about the first attached file on this record only.';

  function pushMessage(role: Message['role'], text: string) {
    nextId.current += 1;
    const message = { id: nextId.current, role, text };
    setMessages((prev) => [...prev, message]);
    return message;
  }

  async function send(raw: string) {
    const trimmed = raw.trim();
    if (loading || !canAsk) {
      return;
    }
    if (trimmed.length < 4) {
      pushMessage('error', 'Type a short question (at least 4 characters).');
      return;
    }

    // Session-only history: prior successful turns, oldest first.
    const history: AskDocumentHistoryTurn[] = messages
      .filter((m) => m.role !== 'error')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    pushMessage('user', trimmed);
    setQuestion('');
    setLoading(true);
    try {
      const result = await askDocument({ kind, id: itemId, question: trimmed, history });
      pushMessage('assistant', result.answer);
      setDisclaimer(result.disclaimer);
    } catch (e) {
      const message =
        e instanceof AskDocumentError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not answer from this file.';
      pushMessage('error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <IconBadge icon="chatbubble-ellipses" tint="violet" size={34} />
        <View style={styles.titleCopy}>
          <ThemedText type="section">Ask about this file</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {hint}
          </ThemedText>
        </View>
      </View>

      {messages.length === 0 && canAsk ? (
        <View style={styles.chips}>
          {SUGGESTIONS[kind].map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              disabled={loading}
              onPress={() => {
                void send(suggestion);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed ? theme.primaryMuted : theme.surfaceMuted,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="small" themeColor="primary">
                {suggestion}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {messages.length > 0 ? (
        <View style={styles.thread}>
          {messages.map((message) =>
            message.role === 'user' ? (
              <View
                key={message.id}
                style={[styles.bubble, styles.userBubble, { backgroundColor: theme.primaryMuted }]}>
                <ThemedText type="small" style={styles.bubbleText}>
                  {message.text}
                </ThemedText>
              </View>
            ) : message.role === 'assistant' ? (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  styles.assistantBubble,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                ]}>
                <ThemedText type="small" style={styles.bubbleText}>
                  {message.text}
                </ThemedText>
              </View>
            ) : (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  styles.assistantBubble,
                  styles.errorBubble,
                  { backgroundColor: theme.dangerMuted },
                ]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <ThemedText type="small" themeColor="danger" style={styles.bubbleText}>
                  {message.text}
                </ThemedText>
              </View>
            )
          )}
          {loading ? (
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                styles.typingBubble,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
              ]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Reading your file…
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <TextField
            placeholder={
              kind === 'policy' ? 'Ask about this policy…' : 'Ask about this record…'
            }
            value={question}
            onChangeText={setQuestion}
            editable={!loading && canAsk}
            multiline
            style={styles.questionInput}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          disabled={loading || !canAsk || question.trim().length === 0}
          onPress={() => {
            void send(question);
          }}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: theme.primary,
              opacity: loading || !canAsk || question.trim().length === 0 ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <ThemedText type="caption" themeColor="textSecondary">
        {disclaimer}
      </ThemedText>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
  },
  thread: {
    gap: Spacing.two,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.sm - 2,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radius.sm - 2,
  },
  errorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 0,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bubbleText: {
    lineHeight: 21,
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inputField: {
    flex: 1,
  },
  questionInput: {
    minHeight: 44,
    maxHeight: 110,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
});
