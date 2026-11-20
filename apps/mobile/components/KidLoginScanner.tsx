import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseKidLoginQr } from '@kidsapp/shared';
import { INK, WHITE } from '../constants/themes';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { Piko, ToyButton, Txt } from './ui';

interface KidLoginScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (payload: { familyCode: string; username: string; displayName?: string }) => void;
}

/** Scan the login QR a parent shows from the Family screen. */
export function KidLoginScanner({ visible, onClose, onScan }: KidLoginScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  React.useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    const payload = parseKidLoginQr(data);
    if (!payload) return;
    setScanned(true);
    haptic.success();
    onScan(payload);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={{ gap: 4 }}>
            <Txt v="h1">{t('scanKidLogin')}</Txt>
            <Txt v="body" muted>
              {t('kidLoginQrScanHint')}
            </Txt>
          </View>

          {Platform.OS === 'web' ? (
            <Txt v="body" muted align="center">
              {t('kidLoginQrWebUnsupported')}
            </Txt>
          ) : (
            <View style={styles.cameraWrap}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanned ? undefined : handleBarcode}
                />
              ) : (
                <View style={styles.ask}>
                  <Piko size={72} mood="wink" />
                  <Txt v="strong" align="center" color={WHITE}>
                    {t('cameraPermissionNeeded')}
                  </Txt>
                  <ToyButton title={t('allowCamera')} icon="camera" size="md" onPress={() => void requestPermission()} style={{ alignSelf: 'center' }} />
                </View>
              )}
            </View>
          )}

          <ToyButton title={t('cancel')} variant="secondary" size="md" full onPress={onClose} sound={false} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36,21,71,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: INK,
    padding: 18,
    gap: 14,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    boxShadow: `0px 6px 0px ${INK}`,
  },
  cameraWrap: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1B1240',
    borderWidth: 2.5,
    borderColor: INK,
  },
  ask: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
});
