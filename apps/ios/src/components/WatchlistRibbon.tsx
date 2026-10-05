import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Media } from '@seen/contracts';
import { setWatchlist } from '@seen/domain';
import { useLibrary } from '../local/LibraryProvider';
import { colors } from '../design/tokens';
import seenEye from '../../assets/icon.png';

/** Independent poster action: membership changes only after the local save commits. */
export function WatchlistRibbon({ media, compact }: { media: Media; compact: boolean }) {
  const { library, mutate, cacheMedia, busy } = useLibrary();
  const saved = library.watchlist.some((item) => item.mediaId === media.id);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const ribbonWidth = compact ? 26 : 34;
  const ribbonHeight = compact ? 39 : 51;
  async function toggle() {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    const present = !saved;
    try {
      cacheMedia([media]);
      await mutate((state) => setWatchlist(state, media.id, present, new Date().toISOString()));
      if (Platform.OS !== 'web')
        AccessibilityInfo.announceForAccessibility(
          `${media.title} ${present ? 'added to' : 'removed from'} your watchlist.`,
        );
    } catch {
      const message = `Could not ${present ? 'add' : 'remove'} ${media.title}. Your watchlist has not changed. Try again.`;
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Watchlist could not save', message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${saved ? 'Remove' : 'Add'} ${media.title} ${saved ? 'from' : 'to'} watchlist`}
      accessibilityHint="Changes your watchlist without opening the title."
      accessibilityState={{ selected: saved, busy: pending, disabled: busy || pending }}
      disabled={busy || pending}
      onPress={(event) => {
        event.stopPropagation();
        void toggle();
      }}
      style={({ pressed }) => [
        styles.target,
        { height: Math.max(44, ribbonHeight + 2), opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View pointerEvents="none" style={{ width: ribbonWidth, height: ribbonHeight }}>
        <Svg width={ribbonWidth} height={ribbonHeight} viewBox="0 0 34 51">
          <Path
            d="M1 1H33V49L17 41L1 49Z"
            fill="#11066A"
            stroke={saved ? colors.accent : colors.muted}
            strokeWidth={saved ? 2 : 1}
          />
        </Svg>
        <Image
          source={seenEye}
          accessible={false}
          resizeMode="contain"
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: ribbonWidth - 4,
            height: ribbonWidth - 4,
          }}
        />
        <View style={[styles.status, { top: ribbonWidth - 2 }]}>
          {pending ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
          ) : (
            <Svg width={12} height={12} viewBox="0 0 12 12" accessible={false}>
              <Path
                d={saved ? 'M2 6L4.5 8.5L10 3' : 'M6 2V10M2 6H10'}
                fill="none"
                stroke={colors.accent}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  target: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 3,
    zIndex: 1,
  },
  status: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  spinner: { width: 12, height: 12, transform: [{ scale: 0.6 }] },
});
