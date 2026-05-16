import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { cn } from '@/shared/utils/cn';

type Props = {
  length: number;
  value: string;
  onChange: (next: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
};

/**
 * Numeric OTP input that adapts to any length (6 or 8 — read from env).
 * One hidden TextInput owns the keyboard; N cells render the digits.
 */
export function OtpInput({
  length,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  error = false,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChange(digits);
      if (digits.length === length) {
        onComplete?.(digits);
      }
    },
    [length, onChange, onComplete],
  );

  const cells = useMemo(() => {
    const arr: { char: string; active: boolean }[] = [];
    for (let i = 0; i < length; i++) {
      arr.push({
        char: value[i] ?? '',
        active: focused && i === value.length,
      });
    }
    return arr;
  }, [length, value, focused]);

  return (
    <View className="relative">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        caretHidden
      />
      <View
        className="flex-row justify-center gap-2"
        onTouchStart={() => inputRef.current?.focus()}
      >
        {cells.map((cell, i) => (
          <View
            key={i}
            className={cn(
              'h-14 w-12 items-center justify-center rounded-md border bg-surface',
              cell.active ? 'border-accent' : 'border-border',
              error && 'border-danger',
            )}
          >
            <Text className="text-2xl font-mono text-text-primary">{cell.char}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
