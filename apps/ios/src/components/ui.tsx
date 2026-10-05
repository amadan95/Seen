import { type ReactNode, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../design/tokens';
import { Icon, type IconName } from './Icon';

export function Body({ muted = false, style, ...props }: TextProps & { muted?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const custom = StyleSheet.flatten(style);
  const fontSize = custom?.fontSize ?? s.body.fontSize;
  const lineHeight = Math.max(
    custom?.lineHeight ?? Math.ceil(fontSize * 1.47),
    Math.ceil(fontSize * 1.2),
  );
  return (
    <Text
      {...props}
      allowFontScaling={false}
      style={[
        s.body,
        muted && { color: colors.muted },
        style,
        { fontSize: fontSize * fontScale, lineHeight: lineHeight * fontScale },
      ]}
    />
  );
}
export function Heading({ children, large = false }: { children: ReactNode; large?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const size = large ? 34 : 22;
  return (
    <Text
      accessibilityRole="header"
      allowFontScaling={false}
      style={[
        large ? s.title : s.heading,
        { fontSize: size * fontScale, lineHeight: Math.ceil(size * 1.25) * fontScale },
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  children,
  title,
  action,
  scroll = true,
  inStack = false,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  scroll?: boolean;
  inStack?: boolean;
}) {
  const content = (
    <>
      {title && (
        <View style={s.header}>
          <Heading large>{title}</Heading>
          {action}
        </View>
      )}
      {children}
    </>
  );
  return (
    <SafeAreaView style={s.screen} edges={inStack ? ['left', 'right'] : ['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {content}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }]}>{content}</View>
      )}
    </SafeAreaView>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : s.primary,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {icon && <Icon name={icon} color={secondary ? colors.text : colors.background} size={20} />}
      <Text
        allowFontScaling={false}
        style={[
          s.buttonText,
          {
            color: secondary ? colors.text : colors.background,
            fontSize: 16 * fontScale,
            lineHeight: 22 * fontScale,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Section({
  title,
  action,
  children,
  inset = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  inset?: boolean;
}) {
  return (
    <View style={[s.section, inset && { marginTop: 0 }]}>
      <View style={s.sectionHeader}>
        <Heading>{title}</Heading>
        {action}
      </View>
      {children}
    </View>
  );
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[
          s.row,
          {
            minHeight: 48,
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Body style={{ flex: 1 }}>{title}</Body>
        <Icon name={open ? 'close' : 'plus'} size={18} color={colors.muted} />
      </Pressable>
      {open && children}
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      {icon && <Icon name={icon} size={17} color={selected ? colors.background : colors.muted} />}
      <Text
        allowFontScaling={false}
        style={[
          s.chipText,
          {
            color: selected ? colors.background : colors.text,
            fontSize: 14 * fontScale,
            lineHeight: 20 * fontScale,
            flexShrink: 1,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={s.segments}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[s.segment, o.value === value && { backgroundColor: colors.accent }]}
        >
          <Text
            allowFontScaling={false}
            style={[
              s.segmentText,
              {
                color: o.value === value ? colors.background : colors.muted,
                fontSize: 15 * fontScale,
                lineHeight: 21 * fontScale,
                flexShrink: 1,
                textAlign: 'center',
              },
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Badge({ label }: { label: string }) {
  return (
    <View style={s.badge}>
      <Body muted style={s.caption}>
        {label}
      </Body>
    </View>
  );
}
export function PreviewNotice() {
  return (
    <View style={s.notice}>
      <Icon name="lock" size={14} color={colors.muted} />
      <Body muted style={s.caption}>
        Local preview · saved only on this device
      </Body>
    </View>
  );
}
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Heading>{title}</Heading>
      <Body muted style={{ textAlign: 'center' }}>
        {message}
      </Body>
      {action}
    </View>
  );
}
export function InlineError({ message }: { message: string | null }) {
  return message ? (
    <Body accessibilityRole="alert" accessibilityLiveRegion="assertive" style={s.error}>
      {message}
    </Body>
  ) : null;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 100, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: typography.editorial,
    fontWeight: '400',
    letterSpacing: -0.7,
    flexShrink: 1,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontFamily: typography.editorial,
    fontWeight: '400',
    flexShrink: 1,
  },
  editorial: { color: colors.text, fontFamily: typography.editorial, fontWeight: '400' },
  eyebrow: { color: colors.muted, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  body: { color: colors.text, fontSize: 17, lineHeight: 25 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  segments: {
    padding: 3,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    padding: 9,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: { fontSize: 15, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8 },
  empty: { paddingVertical: 32, gap: 12, alignItems: 'center' },
  error: { color: colors.danger, fontSize: 15, lineHeight: 22, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 17,
    padding: 14,
    minHeight: 48,
  },
});
