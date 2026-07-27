import AppTabs from '@/components/app-tabs';
import { useReminderResyncOnForeground } from '@/hooks/use-reminder-resync';

export default function AppLayout() {
  useReminderResyncOnForeground();
  return <AppTabs />;
}
