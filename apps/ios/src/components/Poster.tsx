import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, Path, Rect, Line, G } from 'react-native-svg';
import { router } from 'expo-router';
import type { Media, RankItem } from '@seen/contracts';
import { colors } from '../design/tokens';
import { Body, Badge, s } from './ui';

/** Original abstract poster geometry for fixtures; no third-party artwork or provider calls. */
export function Poster({
  media,
  width = 144,
  compact = false,
}: {
  media: Media;
  width?: number;
  compact?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (media.posterUrl && failedUrl !== media.posterUrl)
    return (
      <Image
        source={{ uri: media.posterUrl }}
        resizeMode="cover"
        accessible={false}
        onError={() => setFailedUrl(media.posterUrl ?? null)}
        style={{ width, height: width * 1.5, borderRadius: 8, backgroundColor: colors.surface }}
      />
    );
  if (media.source === 'tmdb')
    return (
      <View
        accessible={false}
        style={{
          width,
          height: width * 1.5,
          borderRadius: 8,
          backgroundColor: colors.surface,
          padding: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Body muted style={{ fontSize: compact ? 9 : 12, textAlign: 'center' }}>
          Poster unavailable
        </Body>
      </View>
    );
  const [background, accent, ink] = media.palette;
  return (
    <View
      style={{
        width,
        height: width * 1.5,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: background,
      }}
      accessible={false}
    >
      <Svg width="100%" height="100%" viewBox="0 0 200 300">
        <Rect width="200" height="300" fill={background} />
        {media.artwork === 'orbit' && (
          <G>
            <Circle cx="107" cy="132" r="64" fill="none" stroke={accent} strokeWidth="1" />
            <Circle cx="107" cy="132" r="47" fill={accent} opacity="0.8" />
            <Circle cx="93" cy="118" r="40" fill={background} />
            <Line x1="0" y1="220" x2="200" y2="170" stroke={ink} opacity="0.5" />
            <Circle cx="45" cy="78" r="2" fill={ink} />
            <Circle cx="161" cy="58" r="1.5" fill={ink} />
          </G>
        )}
        {media.artwork === 'stairs' && (
          <G>
            <Path
              d="M20 230H50V205H80V180H110V155H140V130H175"
              stroke={ink}
              strokeWidth="14"
              fill="none"
            />
            <Rect x="137" y="48" width="40" height="80" fill={accent} />
            <Rect x="143" y="54" width="28" height="74" fill={ink} opacity="0.6" />
          </G>
        )}
        {media.artwork === 'window' && (
          <G>
            <Rect x="30" y="55" width="140" height="175" fill={accent} />
            <Rect x="38" y="63" width="124" height="159" fill={background} />
            {[65, 105, 145].map((x) => (
              <Line key={x} x1={x} y1="63" x2={x} y2="222" stroke={accent} strokeWidth="6" />
            ))}
            {[103, 143, 183].map((y) => (
              <Line key={y} x1="38" y1={y} x2="162" y2={y} stroke={accent} strokeWidth="6" />
            ))}
            <Rect x="72" y="150" width="27" height="30" fill={ink} />
          </G>
        )}
        {media.artwork === 'pulse' && (
          <G>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Rect
                key={i}
                x={26 + i * 23}
                y={110 + (i % 3) * 15}
                width="9"
                height={104 - (i % 3) * 30}
                fill={i === 3 ? ink : accent}
              />
            ))}
            <Circle cx="100" cy="88" r="25" stroke={ink} strokeWidth="1" fill="none" />
          </G>
        )}
        {media.artwork === 'mountain' && (
          <G>
            <Circle cx="140" cy="96" r="50" fill={accent} />
            <Path d="M-20 242L90 100L211 252Z" fill={background} />
            <Path d="M-20 266L72 158L180 274Z" fill={accent} />
            <Path d="M-20 292L126 166L222 292Z" fill={ink} opacity="0.75" />
          </G>
        )}
        {media.artwork === 'maze' && (
          <G>
            {[0, 1, 2, 3, 4].map((i) => (
              <Path
                key={i}
                d={`M${25 + i * 15} ${230 - i * 12}V${60 + i * 15}H${175 - i * 15}V${230 - i * 12}`}
                stroke={i % 2 ? ink : accent}
                strokeWidth="4"
                fill="none"
              />
            ))}
          </G>
        )}
      </Svg>
      {!compact && (
        <View style={ps.lettering}>
          <Text style={[ps.posterTitle, { color: ink }]}>{media.title}</Text>
          <Text style={[ps.posterYear, { color: ink }]}>{media.year ?? 'Year unknown'}</Text>
        </View>
      )}
    </View>
  );
}
export function PosterTile({
  media,
  reason,
  width = 154,
}: {
  media: Media;
  reason?: string;
  width?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${media.title}, ${media.kind === 'movie' ? 'movie' : 'TV show'}, ${media.year ?? 'year unknown'}. ${reason ?? ''}`}
      onPress={() => router.push({ pathname: '/media/[id]', params: { id: media.id } })}
      style={{ width, gap: 5 }}
    >
      <Poster media={media} width={width} />
      <Body style={{ fontSize: 15, fontWeight: '600', lineHeight: 21 }}>{media.title}</Body>
      {reason && (
        <Body muted style={{ fontSize: 12, lineHeight: 18 }}>
          {reason}
        </Body>
      )}
    </Pressable>
  );
}
export function MediaRow({
  media,
  rank,
  trailing,
}: {
  media: Media;
  rank?: RankItem;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={ps.row}>
      {rank?.position !== undefined && rank.position !== null && (
        <Text style={ps.ordinal}>{rank.position}</Text>
      )}
      <Pressable
        onPress={() => router.push({ pathname: '/media/[id]', params: { id: media.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${media.title}, ${media.year ?? 'year unknown'}${rank?.position ? `, position ${rank.position}, your rank score ${rank.rankScore} out of 10, ${rank.evidence}` : ''}`}
        style={[s.row, { flex: 1 }]}
      >
        <Poster media={media} width={52} compact />
        <View style={{ flex: 1, gap: 3 }}>
          <Body style={{ fontWeight: '600', fontSize: 16, lineHeight: 23 }}>{media.title}</Body>
          <Body muted style={s.caption}>
            {media.year ?? 'Year unknown'} · {media.kind === 'movie' ? 'Movie' : 'TV'}
          </Body>
          {rank?.evidence === 'provisional' && <Badge label="Provisional" />}
        </View>
      </Pressable>
      {rank && (
        <Text
          accessibilityLabel={
            rank.rankScore === null
              ? 'Not yet scored'
              : `Your rank score ${rank.rankScore.toFixed(1)} out of 10`
          }
          style={[ps.score, rank.rankScore === null && { color: colors.muted }]}
        >
          {rank.rankScore === null ? '—' : rank.rankScore.toFixed(1)}
        </Text>
      )}
      {trailing}
    </View>
  );
}
const ps = StyleSheet.create({
  lettering: { position: 'absolute', top: 14, left: 12, right: 12 },
  posterTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  posterYear: { fontSize: 10, marginTop: 4, letterSpacing: 2 },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ordinal: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    width: 28,
    fontVariant: ['tabular-nums'],
  },
  score: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 59,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
  },
});
