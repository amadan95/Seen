import { useState } from 'react';
import { Image, Linking, View, useWindowDimensions } from 'react-native';
import type { Availability as AvailabilityData } from '@seen/contracts';
import { Body, Button, Disclosure, InlineError, Segments, s } from './ui';
import { colors } from '../design/tokens';

function ProviderLogo({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      accessible={false}
      style={{ width: 48, height: 48, borderRadius: 10 }}
    />
  ) : (
    <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.elevated }} />
  );
}

export function Availability({ data, loading }: { data?: AvailabilityData; loading: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<'stream' | 'rent' | 'buy'>('stream');
  if (!data || data.status === 'unavailable')
    return (
      <Body muted>
        {loading ? 'Checking viewing options…' : 'Viewing options unavailable. Try again.'}
      </Body>
    );
  const cached = data.stale || Date.now() - Date.parse(data.checkedAt) > 900_000;
  const labels = {
    subscription: 'Subscription',
    free: 'Free',
    ads: 'With ads',
    rent: 'Rent',
    buy: 'Buy',
  } as const;
  // Keep each provider once in the chosen group; subscription/free/ad distinctions stay visible.
  const grouped = data.offers.filter((offer) =>
    group === 'stream'
      ? ['subscription', 'free', 'ads'].includes(offer.type)
      : offer.type === group,
  );
  const providers = [...new Map(grouped.map((offer) => [offer.providerId, offer])).values()];
  return (
    <View style={{ gap: 12 }}>
      <Segments
        options={[
          { value: 'stream', label: 'Stream' },
          { value: 'rent', label: 'Rent' },
          { value: 'buy', label: 'Buy' },
        ]}
        value={group}
        onChange={setGroup}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {providers.map((offer) => (
          <View
            key={offer.providerId}
            accessible
            accessibilityLabel={`${offer.name}, ${labels[offer.type]}`}
            style={{
              width: fontScale > 1.4 ? Math.max(150, (width - 56) / 2) : 90,
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ProviderLogo url={offer.logoUrl} />
            <Body style={[s.caption, { color: colors.text, textAlign: 'center' }]}>
              {offer.name}
            </Body>
            {group === 'stream' && (
              <Body muted style={[s.caption, { textAlign: 'center' }]}>
                {labels[offer.type]}
              </Body>
            )}
          </View>
        ))}
      </View>
      {!providers.length && (
        <Body muted style={s.caption}>
          {!data.offers.length
            ? 'No US offers reported.'
            : `No ${group === 'stream' ? 'streaming' : group === 'rent' ? 'rental' : 'purchase'} offers reported.`}
        </Body>
      )}
      {data.sourceUrl && (
        <Button
          label="View viewing options"
          secondary
          onPress={() =>
            void Linking.openURL(data.sourceUrl!).catch(() =>
              setError('Viewing options could not be opened.'),
            )
          }
        />
      )}
      <Body muted style={s.caption}>
        United States · JustWatch via TMDB
      </Body>
      <Disclosure title="Availability details">
        <Body muted style={s.caption}>
          {cached ? 'Cached · last checked' : 'Checked'} {new Date(data.checkedAt).toLocaleString()}
        </Body>
        <Body muted style={s.caption}>
          Offers and prices can change. TV availability can vary by season. Check the provider
          before watching.
        </Body>
      </Disclosure>
      <InlineError message={error} />
    </View>
  );
}
