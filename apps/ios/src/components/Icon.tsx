import { Platform } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../design/tokens';
const symbols = {
  search: 'magnifyingglass',
  home: 'house',
  discover: 'sparkle.magnifyingglass',
  rank: 'list.number',
  watchlist: 'bookmark',
  saved: 'bookmark.fill',
  profile: 'person.crop.circle',
  chevron: 'chevron.right',
  back: 'chevron.left',
  plus: 'plus',
  liked: 'hand.thumbsup',
  fine: 'face.smiling',
  disliked: 'hand.thumbsdown',
  check: 'checkmark.circle.fill',
  filter: 'slider.horizontal.3',
  clock: 'clock',
  close: 'xmark',
  undo: 'arrow.uturn.backward',
  settings: 'gearshape',
  lock: 'lock',
  star: 'star',
} satisfies Record<string, SymbolViewProps['name']>;
const fallback = {
  search: 'search-outline',
  home: 'home-outline',
  discover: 'compass-outline',
  rank: 'list-outline',
  watchlist: 'bookmark-outline',
  saved: 'bookmark',
  profile: 'person-circle-outline',
  chevron: 'chevron-forward',
  back: 'chevron-back',
  plus: 'add',
  liked: 'thumbs-up-outline',
  fine: 'happy-outline',
  disliked: 'thumbs-down-outline',
  check: 'checkmark-circle',
  filter: 'options-outline',
  clock: 'time-outline',
  close: 'close',
  undo: 'arrow-undo-outline',
  settings: 'settings-outline',
  lock: 'lock-closed-outline',
  star: 'star-outline',
} as const;
export type IconName = keyof typeof symbols;
export function Icon({
  name,
  size = 22,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return Platform.OS === 'ios' ? (
    <SymbolView name={symbols[name]} tintColor={color} style={{ width: size, height: size }} />
  ) : (
    <Ionicons name={fallback[name]} size={size} color={color} />
  );
}
