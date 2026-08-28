import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { REWARD_CATEGORIES } from '@kidsapp/shared';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { colors, spacing, borderRadius } from '../constants/theme';
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
  const canAfford = userPoints >= reward.cost;
  const cat = REWARD_CATEGORIES[reward.category as RewardCategory];

  return (
    <FadeInUp index={index}>
    <Card style={!canAfford ? [styles.card, styles.cardDisabled] : styles.card} glow={canAfford && !pending}>
      <View style={[styles.content, rtl.cardRow]}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{reward.icon || cat?.icon || '🎁'}</Text>
        </View>
        <View style={styles.info}>
          <RtlText style={styles.title}>{reward.title}</RtlText>
          {reward.description ? (
            <RtlText style={styles.description}>{reward.description}</RtlText>
          ) : null}
          <View style={[styles.costRow, rtl.row]}>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>{cat?.label}</Text>
            </View>
            <Text style={[styles.cost, !canAfford && styles.costDisabled]}>
              {reward.cost} ⭐
            </Text>
          </View>
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

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  content: {
    marginBottom: spacing.md,
    width: '100%',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  costRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  cost: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 18,
  },
  costDisabled: {
    color: colors.textMuted,
  },
  categoryBadge: {
    backgroundColor: colors.bgCardLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  button: {
    marginTop: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: '#422006',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  pendingText: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
