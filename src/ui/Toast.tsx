import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { cn } from '@/shared/utils/cn';

type ToastKind = 'info' | 'success' | 'warning' | 'danger';
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <SafeAreaView
        edges={['top']}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <View className="px-4">
          {items.map((t) => (
            <ToastBubble key={t.id} item={t} />
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

function ToastBubble({ item }: { item: ToastItem }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      className={cn('mt-2 rounded-md px-4 py-3 shadow-md', kindToBg(item.kind))}
    >
      <Text className="text-base font-sans-medium text-white">{item.message}</Text>
    </Animated.View>
  );
}

function kindToBg(kind: ToastKind): string {
  switch (kind) {
    case 'success':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'danger':
      return 'bg-danger';
    default:
      return 'bg-text-primary';
  }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }
  return ctx;
}

