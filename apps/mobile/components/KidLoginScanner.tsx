import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseKidLoginQr } from '@kidsapp/shared';
import { Button } from './Button';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface KidLoginScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (payload: { familyCode: string; username: string; displayName?: string }) => void;
}

export function KidLoginScanner({ visible, onClose, onScan }: KidLoginScannerProps) {
  const { colors, borderRadius, cardBorder } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  React.useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        card: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          maxWidth: 400,
          width: '100%',
          alignSelf: 'center',
          ...cardBorder(2),
        },
        header: {
          padding: spacing.lg,
          paddingBottom: spacing.sm,
        },
        title: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          textAlign: 'center',
        },
        hint: {
          color: colors.textMuted,
          fontSize: 13,
          textAlign: 'center',
          marginTop: spacing.sm,
        },
        cameraWrap: {
          aspectRatio: 1,
          width: '100%',
          backgroundColor: '#000',
        },
        camera: { flex: 1 },
        footer: {
          padding: spacing.lg,
          gap: spacing.sm,
        },
        denied: {
          color: colors.textMuted,
          textAlign: 'center',
          padding: spacing.xl,
        },
      }),
    [colors, borderRadius, cardBorder]
  );

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    const payload = parseKidLoginQr(data);
    if (!payload) return;
    setScanned(true);
    onScan(payload);
    onClose();
  };

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.denied, rtl.textFull]}>{t('kidLoginQrWebUnsupported')}</Text>
            <View style={styles.footer}>
              <Button title={t('close')} onPress={onClose} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.title, rtl.textFull]}>{t('scanKidLogin')}</Text>
            <Text style={[styles.hint, rtl.textFull]}>{t('kidLoginQrScanHint')}</Text>
          </View>

          <View style={styles.cameraWrap}>
            {!permission?.granted ? (
              <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.denied, rtl.textFull]}>{t('cameraPermissionNeeded')}</Text>
                <Button title={t('allowCamera')} onPress={() => void requestPermission()} />
              </View>
            ) : (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Button title={t('cancel')} onPress={onClose} variant="outline" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
