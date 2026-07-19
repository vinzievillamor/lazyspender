import { Snackbar } from 'react-native-paper';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * Prompts mobile web visitors to install LazySpender as a home-screen app.
 * No-op on native (the underlying hook never becomes visible there).
 */
export default function InstallPwaPrompt() {
  const { visible, variant, promptInstall, dismiss } = useInstallPrompt();

  return (
    <Snackbar
      visible={visible}
      onDismiss={dismiss}
      duration={Infinity}
      action={{
        label: variant === 'android' ? 'Install' : 'Got it',
        onPress: variant === 'android' ? promptInstall : dismiss,
      }}
    >
      {variant === 'android'
        ? 'Install LazySpender for quicker access.'
        : 'Install LazySpender: tap Share, then "Add to Home Screen".'}
    </Snackbar>
  );
}
