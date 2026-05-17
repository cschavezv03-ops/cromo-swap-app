import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/shared/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

type Props = Omit<TextInputProps, 'placeholderTextColor'> & {
  label?: string;
  helper?: string;
  error?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, helper, error, leftSlot, rightSlot, className, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      {label && (
        <Text className="mb-2 text-[11px] font-sans-semibold uppercase tracking-[0.16em] text-text-tertiary">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center rounded-md border bg-surface px-3.5',
          focused ? 'border-text-primary' : 'border-transparent',
          error && 'border-danger',
          className,
        )}
      >
        {leftSlot}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          className="flex-1 py-3 text-[15px] text-text-primary font-sans"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot}
      </View>
      {(helper || error) && (
        <Text
          className={cn('mt-1.5 text-xs font-sans', error ? 'text-danger' : 'text-text-tertiary')}
        >
          {error ?? helper}
        </Text>
      )}
    </View>
  );
});
