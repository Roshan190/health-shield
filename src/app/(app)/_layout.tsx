import AppTabs from '@/components/app-tabs';
import { useReminderResyncOnForeground } from '@/hooks/use-reminder-resync';
import { useSideloadUpdatePrompt } from '@/hooks/use-sideload-update-prompt';

export default function AppLayout() {
  useReminderResyncOnForeground();
  useSideloadUpdatePrompt();
  return <AppTabs />;
}
