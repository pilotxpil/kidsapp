import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { REWARD_CATEGORIES } from '@kidsapp/shared';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: (reward: Reward) => void;
  loading?: boolean;
  pending?: boolean;
  index?: number;
}

export function RewardCard({ reward, userPoints, onRedeem, loading, pending, index = 0 }: RewardCardProps) {
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const canAfford = userPoints >= reward.cost;
  const cat = REWARD_CATEGORIES[reward.category as RewardCategory];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardWrap: { width: '100%', alignSelf: 'stretch' },
        card: { marginBottom: spacing.md, alignSelf: 'stretch' },
        cardDisabled: { opacity: 0.6 },
        header: { marginBottom: spacing.md, width: '100%' },
        title: { color: colors.text, fontSize: 18, fontWeight: '700' },
        description: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
        costRow: { alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
        cost: { color: colors.emerald, fontWeight: '800', fontSize: 18 },
        costDisabled: { color: colors.textMuted },
        categoryBadge: {
          backgroundColor: colors.bgCardLight,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          borderRadius: borderRadius.sm,
          ...cardBorder(1),
        },
        categoryText: { color: colors.text, fontSize: 12, fontWeight: '700' },
        button: { marginTop: spacing.sm },
        pendingBadge: {
          backgroundColor: colors.secondary,
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          ...cardBorder(1),
        },
        pendingText: { color: colors.text, fontWeight: '600' },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const badgeIcon = reward.icon || cat?.icon || '📦';

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={!canAfford ? [styles.card, styles.cardDisabled] : styles.card} glow={canAfford && !pending}>
        <View style={styles.header}>
          <RtlText style={styles.title}>{reward.title}</RtlText>
          {reward.description ? (
            <RtlText style={styles.description}>{reward.description}</RtlText>
          ) : null}
          <View style={[styles.costRow, rtl.row]}>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>
                {badgeIcon} {cat?.label}
              </Text>
            </View>
            <Text style={[styles.cost, !canAfford && styles.costDisabled]}>
              {reward.cost} {pointsEmoji}
            </Text>
          </View>
        </View>
        {pending ? (
          <View style={styles.pendingBadge}>
            <Text style={[styles.pendingText, rtl.textCenter]}>⏳ {t('pending')}</Text>
          </View>
        ) : (
          <Button
            title={canAfford ? t('redeem') : t('notEnoughPoints')}
            onPress={() => onRedeem(reward)}
            loading={loading}
            disabled={!canAfford}
            variant={canAfford ? 'primary' : 'outline'}
            style={styles.button}
          />
        )}
      </Card>
    </FadeInUp>
  );
}
