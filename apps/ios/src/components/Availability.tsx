import { useState } from 'react';
import { Image, Linking, View } from 'react-native';
import type { Availability as AvailabilityData } from '@seen/contracts';
import { Body, Button, InlineError, s } from './ui';

function ProviderLogo({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      accessible={false}
      style={{ width: 28, height: 28, borderRadius: 6 }}
    />
  ) : null;
}

export function Availability({ data, loading }: { data?: AvailabilityData; loading: boolean }) {
  const [error, setError] = useState<string | null>(null);
  if (!data || data.status === 'unavailable')
    return (
      <Body muted>
        {loading
          ? 'Checking US availability…'
          : 'US availability could not be checked. Retry title details.'}
      </Body>
    );
  const cached = data.stale || Date.now() - Date.parse(data.checkedAt) > 900_000;
  const labels = {
    subscription: 'Subscription',
    free: 'Free',
    ads: 'Free with ads',
    rent: 'Rent',
    buy: 'Buy',
  } as const;
  return (
    <View style={{ gap: 14 }}>
      <Body muted style={s.caption}>
        United States
      </Body>
      {Object.entries(labels).map(([type, label]) => {
        const offers = data.offers.filter((offer) => offer.type === type);
        return offers.length ? (
          <View key={type} style={{ gap: 8 }}>
            <Body style={{ fontWeight: '600' }}>{label}</Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {offers.map((offer) => (
                <View key={`${type}-${offer.providerId}`} style={[s.row, { gap: 7 }]}>
                  <ProviderLogo url={offer.logoUrl} />
                  <Body muted style={{ fontSize: 15 }}>
                    {offer.name}
                  </Body>
                </View>
              ))}
            </View>
          </View>
        ) : null;
      })}
      {!data.offers.length && (
        <Body muted>No US streaming, rental or purchase offers reported for this title.</Body>
      )}
      <Body muted style={s.caption}>
        Availability data: JustWatch via TMDB · {cached ? 'Cached; last checked' : 'Checked'}{' '}
        {new Date(data.checkedAt).toLocaleString()}.
      </Body>
      <Body muted style={s.caption}>
        Offers can change. Check the provider for access and pricing. TV coverage can vary by
        season.
      </Body>
      {data.sourceUrl && (
        <Button
          label="Check viewing options"
          secondary
          onPress={() =>
            void Linking.openURL(data.sourceUrl!).catch(() =>
              setError('Viewing options could not be opened.'),
            )
          }
        />
      )}
      <InlineError message={error} />
    </View>
  );
}
