import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { isSfxMuted, setSfxMuted, playSfx, initSfx } from '../lib/sfx';
import { isBgmMuted, setBgmMuted, startBgm, initBgm } from '../lib/bgm';
import { hapticsEnabled, setHapticsEnabled, haptic } from '../lib/haptics';
import { c } from '../lib/i18n';
import { Divider, Icon, Row, Toggle, Txt, type IconName } from './ui';
import { INK_SOFT } from '../constants/themes';

function SettingRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row justify="between" style={{ paddingVertical: 10 }}>
      <Row gap={10}>
        <Icon name={icon} size={22} color={INK_SOFT} />
        <Txt v="title">{label}</Txt>
      </Row>
      <Toggle value={value} onChange={onChange} label={label} />
    </Row>
  );
}

/** Sounds, music and vibration switches (stored per device). */
export function SoundSettings({ music = true }: { music?: boolean }) {
  const { id: themeId } = useTheme();
  const [sound, setSound] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [vibe, setVibe] = useState(true);

  useEffect(() => {
    void (async () => {
      await initSfx();
      await initBgm();
      setSound(!isSfxMuted());
      setBgm(!isBgmMuted());
      setVibe(hapticsEnabled());
    })();
  }, []);

  return (
    <View>
      <SettingRow
        icon="volume"
        label={c.kid.sounds}
        value={sound}
        onChange={async (v) => {
          setSound(v);
          await setSfxMuted(!v);
          if (v) playSfx('tap');
        }}
      />
      {music ? (
        <>
          <Divider />
          <SettingRow
            icon="music"
            label={c.kid.music}
            value={bgm}
            onChange={async (v) => {
              setBgm(v);
              await setBgmMuted(!v);
              if (v) void startBgm(themeId);
            }}
          />
        </>
      ) : null}
      <Divider />
      <SettingRow
        icon="vibrate"
        label={c.kid.vibration}
        value={vibe}
        onChange={async (v) => {
          setVibe(v);
          await setHapticsEnabled(v);
          if (v) haptic.press();
        }}
      />
    </View>
  );
}
