import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useHeaderEntrance, usePressAnim, useIconPop } from '../lib/animations';

export default function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const header = useHeaderEntrance();
  const logoPress = usePressAnim(0.91);
  const avatarPress = usePressAnim(0.88);
  const avatarPop = useIconPop(120);
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(titleOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, []);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'NN';

  function handleLogoPress() {
    Animated.sequence([
      Animated.spring(logoPress.scale, { toValue: 0.91, useNativeDriver: true }),
      Animated.spring(logoPress.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => navigation.navigate('Home'));
  }

  function handleAvatarPress() {
    Animated.sequence([
      Animated.spring(avatarPress.scale, { toValue: 0.88, useNativeDriver: true }),
      Animated.spring(avatarPress.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => navigation.navigate('Settings'));
  }

  return (
    <Animated.View style={[styles.wrapper, { backgroundColor: colors.header, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 8 }, header.style]}>
      <View style={styles.row}>
        {/* Logo */}
        <Pressable onPress={handleLogoPress} style={styles.logoWrap}>
          <Animated.View style={{ transform: [{ scale: logoPress.scale }] }}>
            <Image
                source={isDark
                  ? require('../../assets/icon-dark.png')
                  : require('../../assets/icon-light.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
          </Animated.View>
        </Pressable>

        {/* Title */}
        <Animated.Text style={[styles.pageTitle, { color: colors.accent, opacity: titleOpacity }]} numberOfLines={1}>
          {title}
        </Animated.Text>

        {/* Avatar */}
        <Pressable onPress={handleAvatarPress}>
          <Animated.View style={[styles.avatar, { backgroundColor: colors.accent, borderColor: colors.border, transform: [{ scale: Animated.multiply(avatarPress.scale, avatarPop) }] }]}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: 1, paddingHorizontal: 18, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoWrap: { marginRight: 'auto' as any },
  logoImg: { width: 40, height: 40 },
  pageTitle: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase',
    fontWeight: '700', pointerEvents: 'none',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, overflow: 'hidden',
  },
  avatarPhoto: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
