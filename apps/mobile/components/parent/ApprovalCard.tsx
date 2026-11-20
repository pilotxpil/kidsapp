import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { c } from '../../lib/i18n';
import { INK, INK_SOFT, WHITE } from '../../constants/themes';
import { AvatarSticker, Coin, Row, Sticker, ToyButton, Txt } from '../ui';

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.round(h / 24);
  return d === 1 ? 'אתמול' : `לפני ${d} ימים`;
}

/** One inbox item: who, what, how much — and two big thumbs. */
export function ApprovalCard({
  kidName,
  kidAvatar,
  verb,
  title,
  icon,
  points,
  when,
  photo,
  onApprove,
  onReject,
}: {
  kidName: string;
  kidAvatar: string;
  verb: string;
  title: string;
  icon?: string;
  points: number;
  when: string;
  photo?: string;
  onApprove: () => Promise<void>;
  onReject: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  return (
    <Sticker tone="calm" pad={14}>
      <View style={{ gap: 12 }}>
        <Row gap={10} align="flex-start">
          <AvatarSticker avatar={kidAvatar} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="caption" muted>
              {kidName} {verb}, {timeAgo(when)}
            </Txt>
            <Txt v="title" numberOfLines={2}>
              {icon ? `${icon} ` : ''}
              {title}
            </Txt>
            <Row gap={4}>
              <Coin size={16} />
              <Txt v="caption" num color={INK}>
                {points}
              </Txt>
            </Row>
          </View>
          {photo ? (
            <Pressable onPress={() => setZoom(true)} accessibilityLabel={c.parent.photo}>
              <Image source={{ uri: photo }} style={styles.thumb} />
            </Pressable>
          ) : null}
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <ToyButton
              title={c.parent.approve}
              icon="check"
              variant="success"
              size="md"
              full
              loading={busy}
              sound="coin"
              onPress={async () => {
                setBusy(true);
                try {
                  await onApprove();
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
          <ToyButton title={c.parent.reject} variant="secondary" size="md" onPress={onReject} sound={false} />
        </Row>
      </View>
      {photo ? (
        <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
          <Pressable style={styles.zoomBg} onPress={() => setZoom(false)}>
            <Image source={{ uri: photo }} style={styles.zoomImg} resizeMode="contain" />
            <Txt v="strong" color={WHITE} align="center">
              {c.parent.photo}
            </Txt>
          </Pressable>
        </Modal>
      ) : null}
    </Sticker>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64, borderRadius: 14, borderWidth: 2, borderColor: INK, backgroundColor: INK_SOFT },
  zoomBg: { flex: 1, backgroundColor: 'rgba(20,10,40,0.92)', justifyContent: 'center', padding: 20, gap: 12 },
  zoomImg: { width: '100%', height: '75%', borderRadius: 20 },
});
