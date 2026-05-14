/**
 * BottomSheet — custom slide-up sheet primitive.
 * Modal + Animated.View + PanResponder. No new dependencies.
 *
 * ui-ux-pro-max guidance applied:
 * - Animated.spring enter (natural physics, from below = deeper hierarchy)
 * - Animated.timing exit (exit faster than enter: 200ms vs 300ms)
 * - Backdrop scrim rgba(21,20,15,0.45) — meets 40-60% modal legibility standard
 * - Dual dismiss: backdrop tap + close × button (escape-routes rule)
 * - Drag-to-dismiss: PanResponder with 80px threshold; snaps back if below
 * - Safe area bottom inset for gesture bar clearance
 * - Close × button: 44×44pt touch target, accessibilityRole=button
 * - useNativeDriver: true on translateY (only transform animated — no layout thrashing)
 * - Sheet sheet stays interactive during animate-in (no blocking animation)
 */
import React, {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, radii, spacing, FONTS } from '@/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;
const DRAG_DISMISS_THRESHOLD = 80;
const ENTER_DURATION = 300;
const EXIT_DURATION = 200;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate in
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
        stiffness: 200,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  // Animate out and call onClose
  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [translateY, backdropOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      // Reset position before animating in
      translateY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);
      animateIn();
    }
  }, [visible, animateIn, translateY, backdropOpacity]);

  // Drag-to-dismiss via PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_e, gs) => gs.dy > 0,
      onMoveShouldSetPanResponder: (_e, gs) => gs.dy > 5,
      onPanResponderMove: (_e, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dy > DRAG_DISMISS_THRESHOLD) {
          // Dismiss
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SHEET_HEIGHT,
              duration: EXIT_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: EXIT_DURATION,
              useNativeDriver: true,
            }),
          ]).start(() => animateOut());
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateOut}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        accessibilityElementsHidden
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={animateOut}
          accessibilityRole="button"
          accessibilityLabel="Cerrar panel"
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], paddingBottom: insets.bottom + spacing[4] },
        ]}
      >
        {/* Drag handle — PanResponder attached here */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.handle} />
        </View>

        {/* Close button */}
        <Pressable
          style={styles.closeBtn}
          onPress={animateOut}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 20, 15, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: C.paper,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    overflow: 'hidden',
  },
  dragArea: {
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: C.faint,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[4],
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FONTS.manropeSemiBold,
    fontSize: 16,
    color: C.muted,
  },
  content: {
    flex: 1,
  },
});

export type { BottomSheetProps };
