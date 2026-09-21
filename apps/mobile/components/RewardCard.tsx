import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { REWARD_CATEGORIES } from '@kidsapp/shared';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { playSfx } from '../lib/sfx';
import { PointsMark } from './icons/ThemeGlyph';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: (reward: Reward) => void;
  loading?: boolean;
  pending?: boolean;
  index?: number;
  onSetGoal?: (reward: Reward) => void;
}

export function RewardCard({
  reward,
  userPoints,
  onRedeem,
  loading,
  pending,
  index = 0,
  onSetGoal,
}: RewardCardProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const canAfford = userPoints >= reward.cost;
  const cat = REWARD_CATEGORIES[reward.category as RewardCategory];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardWrap: { width: '100%', alignSelf: 'stretch' },
        card: {
          marginBottom: spacing.sm,
          alignSelf: 'stretch',
          paddingVertical: 10,
          paddingHorizontal: spacing.sm + 4,
        },
        cardDisabled: { opacity: 0.6 },
        row: { width: '100%', alignItems: 'center', gap: spacing.sm },
        info: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
        title: { color: colors.text, fontSize: 15, fontWeight: '800', ...type.title },
        description: { color: colors.textMuted, fontSize: 12, marginTop: 2, ...type.body },
        meta: {
          alignItems: 'center',
          marginTop: 4,
          gap: 6,
          flexWrap: 'wrap',
        },
        cost: { color: colors.emerald, fontWeight: '800', fontSize: 13, ...type.title },
        costDisabled: { color: colors.textMuted },
        costPair: { gap: 3, flexGrow: 0 },
        categoryText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', ...type.ui },
        action: { flexShrink: 0, alignItems: 'flex-start' },
        pendingBadge: ember
          ? {
              backgroundColor: 'rgba(107,58,24,0.7)',
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.3)',
            }
          : {
              backgroundColor: colors.secondary,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: borderRadius.full,
              ...cardBorder(1),
            },
        pendingText: { color: colors.text, fontWeight: '600', fontSize: 12, ...type.ui },
        goalLink: { marginTop: 4 },
        goalText: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', ...type.ui },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, type.body, type.ui]
  );

  const badgeIcon = ember ? '' : reward.icon || cat?.icon || '📦';

  const action = pending ? (
    <View style={styles.pendingBadge}>
      <Text style={[styles.pendingText, rtl.textCenter]}>{t('pending')}</Text>
    </View>
  ) : (
    <Button
      title={canAfford ? t('redeem') : t('notEnoughPoints')}
      onPress={() => onRedeem(reward)}
      loading={loading}
      disabled={!canAfford}
      variant={canAfford ? 'primary' : 'outline'}
      compact
    />
  );

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={!canAfford ? [styles.card, styles.cardDisabled] : styles.card} glow={canAfford && !pending}>
        <View style={[styles.row, rtl.headerSplit]}>
          <View style={styles.action}>{action}</View>
          <View style={styles.info}>
            <RtlText style={styles.title} numberOfLines={1}>
              {reward.title}
            </RtlText>
            {reward.description ? (
              <RtlText style={styles.description} numberOfLines={1}>
                {reward.description}
              </RtlText>
            ) : null}
            <View style={[styles.meta, rtl.rowInline]}>
              <View style={[styles.costPair, rtl.rowInline]}>
                <Text style={[styles.cost, !canAfford && styles.costDisabled]}>{reward.cost}</Text>
                <PointsMark size={12} />
              </View>
              <Text style={styles.categoryText}>
                {badgeIcon ? `${badgeIcon} ` : ''}
                {cat?.label}
              </Text>
            </View>
            {onSetGoal ? (
              <TouchableOpacity
                onPress={() => {
                  playSfx('tap');
                  onSetGoal(reward);
                }}
                style={styles.goalLink}
                hitSlop={6}
              >
                <RtlText style={styles.goalText}>{t('setPersonalGoal')}</RtlText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Card>
    </FadeInUp>
  );
}
