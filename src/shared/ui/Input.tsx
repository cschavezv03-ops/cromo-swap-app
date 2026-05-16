import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { cn } from '@/shared/lib/cn';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  containerClassName?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, className, containerClassName, ...props },
  ref,
) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <Text variant="overline" className="text-ink-700">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#9C9789"
        className={cn(
          'h-12 rounded-2xl border border-ink-100 bg-white px-4 text-base text-ink-900',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});
