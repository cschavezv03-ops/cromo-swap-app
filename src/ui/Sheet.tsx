import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Props = Omit<BottomSheetModalProps, 'children'> & {
  children: ReactNode;
  snapPoints?: Array<string | number>;
};

/**
 * Wrapper de BottomSheetModal de @gorhom/bottom-sheet.
 *
 * Manejo del botón "back" de Android: cuando el sheet está abierto (index >=
 * 0), interceptamos el back y hacemos dismiss en vez de salir de la pantalla.
 * Cuando está cerrado, NO interceptamos (back vuelve a su comportamiento
 * normal de navegación).
 */
export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet(
  { children, snapPoints, onChange, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const internalRef = useRef<BottomSheetModal>(null);
  const [isOpen, setIsOpen] = useState(false);

  const points = useMemo(() => snapPoints ?? ['50%', '85%'], [snapPoints]);

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    [],
  );

  // Conectar el forwarded ref con el internal ref (necesario para que tanto
  // el consumidor como nuestro hook de back tengan acceso).
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(internalRef.current);
    } else if (ref) {
      (ref as React.MutableRefObject<BottomSheetModal | null>).current =
        internalRef.current;
    }
  }, [ref]);

  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      internalRef.current?.dismiss();
      return true; // consumimos el evento
    });
    return () => sub.remove();
  }, [isOpen]);

  const handleChange = useCallback(
    (index: number) => {
      setIsOpen(index >= 0);
      onChange?.(index, 0, 0);
    },
    [onChange],
  );

  return (
    <BottomSheetModal
      ref={internalRef}
      snapPoints={points}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleChange}
      backgroundStyle={{
        backgroundColor: colors.surfaceElev,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.borderStrong,
        width: 36,
        height: 4,
      }}
      {...rest}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
