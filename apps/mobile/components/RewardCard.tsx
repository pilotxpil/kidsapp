import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { REWARD_CATEGORIES } from '@kidsapp/shared';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { spacing } from '../constants/theme';
import { getThemeArt } from '../constants/theme-art';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { PointsMark } from './icons/ThemeGlyph';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: (reward: Reward) => void;
  loading?: boolean;
  pending?: boolean;
  index?: number;
}

export function RewardCard({ reward, userPoints, onRedeem, loading, pending, index = 0 }: RewardCardProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const type = useType();
  const art = getThemeArt(themeId);
  const ember = themeId === 'ember';
  const canAfford = userPoints >= reward.cost;
  const cat = REWARD_CATEGORIES[reward.category as RewardCategory];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardWrap: { width: '100%', alignSelf: 'stretch' },
        card: { marginBottom: spacing.md, alignSelf: 'stretch' },
        cardDisabled: { opacity: 0.6 },
        header: { marginBottom: spacing.md, width: '100%' },
        title: { color: colors.text, fontSize: 18, fontWeight: '700', ...type.title },
        description: { color: colors.textMuted, fontSize: 14, marginTop: 4, ...type.body },
        costRow: { alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
        cost: { color: colors.emerald, fontWeight: '800', fontSize: 18, ...type.title },
        costDisabled: { color: colors.textMuted },
        costPair: { alignItems: 'center', gap: 4 },
        thumb: { width: 56, height: 56, marginBottom: spacing.sm },
        categoryBadge: ember
          ? {
              backgroundColor: 'rgba(255,90,0,0.14)',
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.35)',
            }
          : {
              backgroundColor: colors.bgCardLight,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: borderRadius.sm,
              ...cardBorder(1),
            },
        categoryText: { color: colors.text, fontSize: 12, fontWeight: '700', ...type.ui },
        button: { marginTop: spacing.sm },
        pendingBadge: ember
          ? {
              backgroundColor: 'rgba(107,58,24,0.7)',
              padding: spacing.sm,
              borderRadius: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.3)',
            }
          : {
              backgroundColor: colors.secondary,
              padding: spacing.sm,
              borderRadius: borderRadius.sm,
              alignItems: 'center',
              ...cardBorder(1),
            },
        pendingText: { color: colors.text, fontWeight: '600', ...type.ui },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, type.body, type.ui]
  );

  const badgeIcon = ember ? '' : reward.icon || cat?.icon || '📦';

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={!canAfford ? [styles.card, styles.cardDisabled] : styles.card} glow={canAfford && !pending}>
        <View style={styles.header}>
          {ember && art?.chest ? <Image source={art.chest} style={styles.thumb} resizeMode="contain" /> : null}
          <RtlText style={styles.title}>{reward.title}</RtlText>
          {reward.description ? (
            <RtlText style={styles.description}>{reward.description}</RtlText>
          ) : null}
          <View style={[styles.costRow, rtl.row]}>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>
                {badgeIcon ? `${badgeIcon} ` : ''}
                {cat?.label}
              </Text>
            </View>
            <View style={[styles.costPair, rtl.row]}>
              <Text style={[styles.cost, !canAfford && styles.costDisabled]}>{reward.cost}</Text>
              <PointsMark size={16} />
            </View>
          </View>
        </View>
        {pending ? (
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
            style={styles.button}
          />
        )}
      </Card>
    </FadeInUp>
  );
}
