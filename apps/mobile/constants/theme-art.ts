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

/** Optional illustrated art per theme. Ember is the first full pack. */
export const THEME_ART: Partial<Record<UiThemeId, ThemeArt>> = {
  ember: {
    hero: require('../assets/themes/ember/hero.jpg'),
    gem: require('../assets/themes/ember/gem.jpg'),
    picker: require('../assets/themes/ember/picker.png'),
    bg: require('../assets/themes/ember/bg.jpg'),
    chest: require('../assets/themes/ember/chest.jpg'),
    map: require('../assets/themes/ember/map.jpg'),
    icons: {
      home: require('../assets/themes/ember/icons/home.png'),
      tasks: require('../assets/themes/ember/icons/tasks.png'),
      learn: require('../assets/themes/ember/icons/learn.png'),
      shop: require('../assets/themes/ember/icons/shop.png'),
      profile: require('../assets/themes/ember/icons/profile.png'),
    },
  },
  brawl: {
    hero: require('../assets/themes/brawl/hero.jpg'),
    gem: require('../assets/themes/brawl/gem.jpg'),
    picker: require('../assets/themes/brawl/picker.png'),
  },
  minecraft: {
    picker: require('../assets/themes/minecraft/picker.png'),
  },
  roblox: {
    picker: require('../assets/themes/roblox/picker.png'),
  },
  sparkle: {
    picker: require('../assets/themes/sparkle/picker.png'),
  },
};

export function getThemeArt(id: UiThemeId): ThemeArt | undefined {
  return THEME_ART[id];
}
