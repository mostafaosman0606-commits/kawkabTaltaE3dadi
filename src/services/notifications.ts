/**
 * Push Notification utilities for Kawkab Platform
 * Uses browser Notification API (no backend required)
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendBrowserNotification = (title: string, body: string, icon = '/logo.png') => {
  if (Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, { body, icon, dir: 'rtl', lang: 'ar' });
    setTimeout(() => notification.close(), 6000);
  } catch (e) {
    console.warn('Notification failed:', e);
  }
};

export const scheduleStudyReminder = () => {
  if (Notification.permission !== 'granted') return;
  // Check if user has studied today
  const today = new Date().toISOString().split('T')[0];
  const lastReminder = localStorage.getItem('kawkab_last_reminder');
  if (lastReminder === today) return;

  // Send reminder after 3 hours of inactivity (simplified: check on next app load if not studied)
  const lastActivity = localStorage.getItem('kawkab_last_activity');
  if (!lastActivity) return;

  const hoursSince = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
  if (hoursSince >= 3) {
    sendBrowserNotification(
      '🔥 لا تكسر سلسلتك!',
      'مضى وقت كبير بدون مذاكرة. تعال ذاكر درساً واحداً على الأقل! 🚀',
    );
    localStorage.setItem('kawkab_last_reminder', today);
  }
};

export const updateLastActivity = () => {
  localStorage.setItem('kawkab_last_activity', Date.now().toString());
};
