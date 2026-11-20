import type { ImageSourcePropType } from 'react-native';
import type { UiThemeId } from '@kidsapp/shared';

export type ThemeTabArtKey = 'home' | 'tasks' | 'learn' | 'shop' | 'profile';

export type ThemeArt = {
  hero?: ImageSourcePropType;
  gem?: ImageSourcePropType;
  picker?: ImageSourcePropType;
  bg?: ImageSourcePropType;
  chest?: ImageSourcePropType;
  map?: ImageSourcePropType;
  icons?: Partial<Record<ThemeTabArtKey, ImageSourcePropType>>;
};

/**
 * The redesign draws every world in SVG (components/ui/Screen.tsx), so no raster theme art ships
 * any more. Kept as an empty map so older components fall back to their vector/emoji rendering.
 */
export const THEME_ART: Partial<Record<UiThemeId, ThemeArt>> = {};

export function getThemeArt(id: UiThemeId): ThemeArt | undefined {
  return THEME_ART[id];
}
