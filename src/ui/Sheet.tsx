import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';

type Props = Omit<BottomSheetModalProps, 'children'> & {
  children: ReactNode;
  snapPoints?: Array<string | number>;
};

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet(
  { children, snapPoints, ...rest },
  ref,
) {
  const { colors } = useTheme();

  const points = useMemo(() => snapPoints ?? ['50%', '85%'], [snapPoints]);

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surfaceElev }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      {...rest}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
