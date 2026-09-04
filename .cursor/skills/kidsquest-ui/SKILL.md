---
name: kidsquest-ui
description: Implements KidsQuest mobile UI with themes, RTL Hebrew, shared primitives, and i18n. Use when adding or editing Expo screens, components, styles, tabs, animations, or user-visible copy in apps/mobile.
---

# KidsQuest UI

Hebrew-first, themed, RTL. Do not ship English chrome or a custom color island.

## Screen shell

```tsx
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { spacing } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { rtl } from '../../lib/rtl';

export default function ExampleScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors, borderRadius }) => ({
    title: { color: colors.text, fontSize: 20 },
  }));
  return (
    <ThemedScreen tabs>
      {/* content */}
    </ThemedScreen>
  );
}
```

`useThemedStyles` must depend on theme identity (it already keys on `theme.id`).

## Rules

| Do | Don't |
|----|--------|
| `t('newKey')` after adding to `lib/i18n.ts` | Hardcoded Hebrew/English in JSX (except debug) |
| `Button` / `Card` / `Input` | Ad-hoc `Pressable`+hex for primary actions |
| `spacing.xs`–`xl` | Magic padding numbers when `spacing` fits |
| `rtl.row`, `rtl.text`, `rtl.headerSplit` | `forceRTL` or assuming LTR flex |
| `useFocusLoad(load)` for fetches | Fetch only once in `useEffect` on tab screens |
| `playSfx('tap' \| 'complete' \| ...)` | Silent primary actions on kid screens |

## Themes

Ids: `ember` | `minecraft` | `brawl` | `roblox` | `sparkle`. Source: `constants/themes.ts`. Persist with `setUiTheme`. Auth screens may use static `kidAuthTheme` / parent Roblox defaults from `constants/theme.ts`.

## Navigation

expo-router file routes. Kid group `(kid)`, parent group `(parent)`, protected in `app/_layout.tsx`. New tab = file + `Tabs.Screen` in the group `_layout.tsx`.

## Expo

SDK **57** only: https://docs.expo.dev/versions/v57.0.0/
