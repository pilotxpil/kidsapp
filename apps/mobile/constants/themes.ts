import { ViewStyle } from 'react-native';
import type { TaskCategory, UiThemeId } from '@kidsapp/shared';
import { PREMIUM_THEME_IDS } from '@kidsapp/shared';

type SfxName = 'tap' | 'complete' | 'gem' | 'coin' | 'error';

/**
 * KidsQuest design language: a toy box of stickers.
 * Everything tappable is a sticker — plum ink outline + hard offset shadow that "presses" on tap —
 * sitting on light world-tinted paper under a painted world header.
 *
 * Theme ids are stored on users in Mongo, so they never change. Only their look does:
 *   roblox → Ocean · ember → Volcano · minecraft → Jungle · brawl → Space · sparkle → Candy
 */

export const INK = '#241547';
export const INK_SOFT = '#6E6597';
export const INK_FAINT = '#A59FC4';
export const LINE = '#E4DEF5';
export const WHITE = '#FFFFFF';
export const GOLD = '#FFC233';
export const GOLD_DARK = '#D99A00';
export const MINT = '#1DBF7F';
export const MINT_DARK = '#11915D';
export const CORAL = '#FF4D5E';
export const CORAL_DARK = '#CC2C3D';
export const FLAME = '#FF7A1A';

export type Scenery = 'waves' | 'lava' | 'leaves' | 'stars' | 'sprinkles';

export interface WorldTokens {
  /** Screen background under the header. */
  paper: string;
  /** Slightly deeper paper for wells / inputs. */
  paperDeep: string;
  /** Painted header gradient (top → bottom). */
  sky: readonly [string, string];
  accent: string;
  /** 3D edge under accent buttons. */
  accentDark: string;
  accentSoft: string;
  onAccent: string;
  scenery: Scenery;
}

export interface ThemeColors {
  bg: string;
  bgDeep: string;
  bgCard: string;
  bgCardLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  danger: string;
  success: string;
  text: string;
  textMuted: string;
  textDark: string;
  gradientStart: string;
  gradientEnd: string;
  gold: string;
  emerald: string;
  diamond: string;
  streak: string;
  border: string;
  borderLight: string;
  borderDark: string;
  buttonShadow: string;
  confetti: string[];
  glow: string;
  cardShine: string;
}

export interface AppTheme {
  id: UiThemeId;
  name: string;
  subtitle: string;
  icon: string;
  sfx: SfxName;
  premium: boolean;
  world: WorldTokens;
  colors: ThemeColors;
  gradientBg: readonly [string, string, string];
  heroGradient: readonly [string, string];
  decorEmojis: string[];
  heroEmoji: string;
  heroTagline: string;
  borderRadius: { sm: number; md: number; lg: number; xl: number; full: number };
  cardBorder: (width?: number) => ViewStyle;
  tabIcons: { home: string; tasks: string; learn: string; shop: string; profile: string };
  taskCategoryIcons: Record<TaskCategory, string>;
  pointsEmoji: string;
  celebrationKicker: string;
  allCategoryIcon: string;
  pattern: 'blocks' | 'stars' | 'studs' | 'hearts' | 'embers';
  /** emoji = Unicode chrome; vector = SVG icons + illustrated art */
  chrome: 'emoji' | 'vector';
}

/** Hard offset "sticker" shadow — no blur, reads as a physical toy edge. */
export function stickerShadow(depth = 4, color = INK): ViewStyle {
  return {
    boxShadow: `0px ${depth}px 0px ${color}`,
    elevation: 0,
  } as ViewStyle;
}

export function stickerBorder(width = 2.5, depth = 4): ViewStyle {
  return {
    borderWidth: width,
    borderColor: INK,
    ...stickerShadow(depth),
  };
}

const RADIUS = { sm: 12, md: 16, lg: 22, xl: 28, full: 999 };

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  home: '🏠',
  school: '📚',
  social: '🤝',
  hobby: '🎨',
  sport: '⚽',
};

function colorsFor(w: WorldTokens): ThemeColors {
  return {
    bg: w.paper,
    bgDeep: w.paperDeep,
    bgCard: WHITE,
    bgCardLight: w.accentSoft,
    primary: w.accent,
    primaryLight: w.accentSoft,
    primaryDark: w.accentDark,
    secondary: INK_SOFT,
    accent: w.accent,
    danger: CORAL,
    success: MINT,
    text: INK,
    textMuted: INK_SOFT,
    textDark: INK,
    gradientStart: w.sky[0],
    gradientEnd: w.sky[1],
    gold: GOLD,
    emerald: MINT,
    diamond: '#38C6FF',
    streak: FLAME,
    border: LINE,
    borderLight: WHITE,
    borderDark: INK,
    buttonShadow: w.accentDark,
    confetti: [w.accent, GOLD, MINT, '#38C6FF', CORAL, '#B57BFF'],
    glow: w.accent,
    cardShine: w.accentSoft,
  };
}

function makeTheme(
  id: UiThemeId,
  meta: {
    name: string;
    subtitle: string;
    icon: string;
    tagline: string;
    sfx: SfxName;
    pattern: AppTheme['pattern'];
    decor: string[];
  },
  world: WorldTokens
): AppTheme {
  const colors = colorsFor(world);
  return {
    id,
    name: meta.name,
    subtitle: meta.subtitle,
    icon: meta.icon,
    sfx: meta.sfx,
    premium: PREMIUM_THEME_IDS.includes(id),
    world,
    colors,
    gradientBg: [world.sky[0], world.sky[1], world.paper],
    heroGradient: [world.sky[0], world.sky[1]],
    decorEmojis: meta.decor,
    heroEmoji: meta.icon,
    heroTagline: meta.tagline,
    borderRadius: RADIUS,
    cardBorder: (width = 2.5) => stickerBorder(width, 4),
    tabIcons: { home: '🏠', tasks: '✅', learn: '📚', shop: '🎁', profile: '😊' },
    taskCategoryIcons: CATEGORY_ICONS,
    pointsEmoji: '🪙',
    celebrationKicker: 'יש!',
    allCategoryIcon: '⭐',
    pattern: meta.pattern,
    chrome: 'vector',
  };
}

export const THEMES: Record<UiThemeId, AppTheme> = {
  roblox: makeTheme(
    'roblox',
    {
      name: 'אוקיינוס',
      subtitle: 'גלים, דגים ואוצרות',
      icon: '🌊',
      tagline: 'צוללים להרפתקה!',
      sfx: 'coin',
      pattern: 'stars',
      decor: ['🐠', '🫧', '🐚'],
    },
    {
      paper: '#EEF5FF',
      paperDeep: '#DCE9FF',
      sky: ['#2C8BFF', '#5FD3FF'],
      accent: '#1F7AFF',
      accentDark: '#0F4FC4',
      accentSoft: '#DCEBFF',
      onAccent: WHITE,
      scenery: 'waves',
    }
  ),
  ember: makeTheme(
    'ember',
    {
      name: 'הר געש',
      subtitle: 'לבה, אש ואבני קסם',
      icon: '🌋',
      tagline: 'בוערים להצליח!',
      sfx: 'gem',
      pattern: 'embers',
      decor: ['🔥', '💎', '⚡'],
    },
    {
      paper: '#FFF3EC',
      paperDeep: '#FFE3D4',
      sky: ['#FF5A2E', '#FFB347'],
      accent: '#FF5B2E',
      accentDark: '#C93A12',
      accentSoft: '#FFE3D6',
      onAccent: WHITE,
      scenery: 'lava',
    }
  ),
  minecraft: makeTheme(
    'minecraft',
    {
      name: "ג'ונגל",
      subtitle: 'עצים, מפלים וחיות',
      icon: '🌴',
      tagline: 'קדימה לחקור!',
      sfx: 'tap',
      pattern: 'blocks',
      decor: ['🦜', '🍃', '🐒'],
    },
    {
      paper: '#EEFAF2',
      paperDeep: '#D6F2E0',
      sky: ['#13B566', '#9BE15D'],
      accent: '#12A85E',
      accentDark: '#0B7A43',
      accentSoft: '#D7F5E4',
      onAccent: WHITE,
      scenery: 'leaves',
    }
  ),
  brawl: makeTheme(
    'brawl',
    {
      name: 'חלל',
      subtitle: 'כוכבים, טילים וגלקסיות',
      icon: '🚀',
      tagline: 'עד הכוכבים ובחזרה!',
      sfx: 'gem',
      pattern: 'stars',
      decor: ['🪐', '⭐', '🌙'],
    },
    {
      paper: '#F2EEFF',
      paperDeep: '#E3DBFF',
      sky: ['#24166B', '#7A4DFF'],
      accent: '#7A4DFF',
      accentDark: '#4F2BCC',
      accentSoft: '#E8E0FF',
      onAccent: WHITE,
      scenery: 'stars',
    }
  ),
  sparkle: makeTheme(
    'sparkle',
    {
      name: 'ממתקים',
      subtitle: 'סוכריות, עננים וקשת',
      icon: '🍭',
      tagline: 'הכי מתוק שיש!',
      sfx: 'coin',
      pattern: 'hearts',
      decor: ['🍬', '🧁', '🌈'],
    },
    {
      paper: '#FFF0F7',
      paperDeep: '#FFDCEC',
      sky: ['#FF5FA8', '#FFC46B'],
      accent: '#F2449A',
      accentDark: '#C02573',
      accentSoft: '#FFE0EF',
      onAccent: WHITE,
      scenery: 'sprinkles',
    }
  ),
};

export const DEFAULT_THEME_ID: UiThemeId = 'roblox';

/** Order shown in the world picker: free worlds first. */
export const UI_THEME_OPTIONS: UiThemeId[] = ['roblox', 'ember', 'minecraft', 'brawl', 'sparkle'];

export function getTheme(id: UiThemeId | undefined | null): AppTheme {
  return (id && THEMES[id]) || THEMES[DEFAULT_THEME_ID];
}
