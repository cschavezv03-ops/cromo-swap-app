import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;
const isPostHogConfigured = Boolean(apiKey && apiKey !== 'phc_your_project_token_here');

if (__DEV__) {
  console.log('[PostHog]', { configured: isPostHogConfigured, host });
}

export const posthog = new PostHog(apiKey || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
});
