import React, { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MAX_PROOF_PHOTO_CHARS, displayTaskIcon, type Task } from '@kidsapp/shared';
import { api } from '../../lib/api';
import { c } from '../../lib/i18n';
import { INK } from '../../constants/themes';
import { useErrorHandler } from '../../lib/premium';
import { Row, Sheet, ToyButton, Txt, toast } from '../ui';
import { RewardBurst } from './RewardBurst';

/**
 * "I finished!" flow shared by kid home and kid tasks:
 * optional proof photo → send for approval → celebration.
 */
export function useCompleteTask(onSent: (taskId: string) => void) {
  const [task, setTask] = useState<Task | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  const onError = useErrorHandler();

  const pick = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('צריך לאשר גישה כדי לצרף תמונה', 'info');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.3,
      base64: true,
      allowsEditing: Platform.OS !== 'web',
      aspect: [4, 3],
    };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset?.base64) return;
    const uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    if (uri.length > MAX_PROOF_PHOTO_CHARS) {
      toast(c.kid.photoTooBig, 'error');
      return;
    }
    setPhoto(uri);
  };

  const send = async (withPhoto: boolean) => {
    if (!task) return;
    setBusy(true);
    try {
      await api.completeTask(task._id, withPhoto && photo ? photo : undefined);
      onSent(task._id);
      setTask(null);
      setPhoto(null);
      setBurst(true);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const ui = (
    <>
      <Sheet visible={!!task} onClose={() => setTask(null)} title={c.kid.completeTitle} subtitle={c.kid.completeBody}>
        {task ? (
          <Txt v="h2" align="center">
            {displayTaskIcon(task.icon, task.category)} {task.title}
          </Txt>
        ) : null}
        {photo ? <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" /> : null}
        <Row gap={10}>
          {Platform.OS !== 'web' ? (
            <View style={{ flex: 1 }}>
              <ToyButton title={c.kid.takePhoto} icon="camera" variant="secondary" size="md" full onPress={() => pick('camera')} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <ToyButton title={c.kid.pickPhoto} icon="photo" variant="secondary" size="md" full onPress={() => pick('library')} />
          </View>
        </Row>
        {photo ? (
          <ToyButton title={c.kid.sendWithPhoto} variant="success" full loading={busy} onPress={() => send(true)} sound="complete" />
        ) : (
          <ToyButton title={c.kid.sendNoPhoto} variant="success" full loading={busy} onPress={() => send(false)} sound="complete" />
        )}
      </Sheet>
      <RewardBurst visible={burst} title={c.kid.sentTitle} body={c.kid.sentBody} onClose={() => setBurst(false)} />
    </>
  );

  return {
    start: (t: Task) => {
      setPhoto(null);
      setTask(t);
    },
    busyId: busy ? task?._id ?? null : null,
    ui,
  };
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 190, borderRadius: 18, borderWidth: 2.5, borderColor: INK },
});
