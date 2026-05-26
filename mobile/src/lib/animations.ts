import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/** Fade + slide-up entrance. Returns style-ready animated values. */
export function useEntrance(delay = 0, distance = 24) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, translateY, style: { opacity, transform: [{ translateY }] } };
}

/** Fade + slide from left entrance. */
export function useEntranceX(delay = 0, distance = -22) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(distance)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, translateX, style: { opacity, transform: [{ translateX }] } };
}

/** Header slides down from above on mount. */
export function useHeaderEntrance() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, translateY, style: { opacity, transform: [{ translateY }] } };
}

/** Spring scale pop — good for icons and badges on mount. */
export function useIconPop(delay = 0) {
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, delay, useNativeDriver: true } as any).start();
  }, []);
  return scale;
}

/** Press feedback: spring scale in/out. */
export function usePressAnim(pressedValue = 0.93) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: pressedValue, friction: 6, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

/** Continuous subtle pulse — use on FAB or active icons. */
export function usePulse(min = 1, max = 1.07, duration = 900) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: max, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}

/** Continuous spin — use for loading indicators. */
export function useSpin(duration = 900) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
}

/** Animated numeric count-up from 0 to `value`. Returns interpolated string. */
export function useCountUp(value: number, delay = 0, duration = 600) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration, delay, useNativeDriver: false }).start();
  }, [value]);
  return anim.interpolate({ inputRange: [0, Math.max(value, 1)], outputRange: ['0', String(value)], extrapolate: 'clamp' });
}

/** Shimmer opacity loop — use on skeleton placeholders. */
export function useShimmer() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}
