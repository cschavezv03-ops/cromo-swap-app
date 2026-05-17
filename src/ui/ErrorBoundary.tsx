import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
  fallback?: (err: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

/**
 * Cazador de errores de render. Útil para que un crash en una pantalla
 * no rompa toda la app — muestra un fallback y permite reintentar.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;
    if (!error) return children;
    if (fallback) return fallback(error, this.reset);
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-text-tertiary text-xs font-sans-semibold uppercase tracking-[0.2em]">
          Algo falló
        </Text>
        <Text className="mt-3 text-2xl font-sans-black text-text-primary text-center">
          Esta pantalla no se pudo cargar.
        </Text>
        <Text className="mt-3 text-sm text-text-secondary font-sans text-center">
          Si el problema continúa, cierra y abre la app de nuevo.
        </Text>
        {__DEV__ && (
          <Text className="mt-4 text-xs text-danger font-sans" numberOfLines={4}>
            {error.message}
          </Text>
        )}
        <Pressable
          onPress={this.reset}
          className="mt-6 rounded-pill bg-accent px-5 py-2.5"
        >
          <Text className="text-white font-sans-semibold">Reintentar</Text>
        </Pressable>
      </View>
    );
  }
}
