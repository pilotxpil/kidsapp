import React from 'react';
import { View } from 'react-native';
import { CalmScreen, Sticker, Txt } from './ui';
import { usePremium } from '../lib/premium';

/** Legal texts name this placeholder address; the live one comes from GET /app/config. */
const PLACEHOLDER_SUPPORT = 'support@kids.synaboard.com';

/** Long-form legal / help page in the calm parent style. */
export function DocPage({
  title,
  updated,
  sections,
  children,
}: {
  title: string;
  updated: string;
  sections: { title: string; body: string }[];
  children?: React.ReactNode;
}) {
  const { config } = usePremium();
  const support = config.supportEmail || PLACEHOLDER_SUPPORT;
  return (
    <CalmScreen title={title} subtitle={`עודכן: ${updated}`} back tabs={false} contentStyle={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {children}
      {sections.map((s) => (
        <Sticker key={s.title} tone="calm" pad={16}>
          <View style={{ gap: 6 }}>
            <Txt v="title">{s.title}</Txt>
            <Txt v="body" muted style={{ lineHeight: 24 }}>
              {s.body.split(PLACEHOLDER_SUPPORT).join(support)}
            </Txt>
          </View>
        </Sticker>
      ))}
    </CalmScreen>
  );
}
