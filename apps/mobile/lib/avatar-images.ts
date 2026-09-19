import type { ImageSourcePropType } from 'react-native';

export const SHOP_AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
  'classic-noob': require('../assets/avatars/avatar-classic-noob.png'),
  'guest-blank': require('../assets/avatars/avatar-guest-blank.png'),
  'poop-rocket': require('../assets/avatars/avatar-poop-rocket.png'),
  'fried-brain': require('../assets/avatars/avatar-fried-brain.png'),
  'ban-hammer': require('../assets/avatars/avatar-ban-hammer.png'),
  'cam-flush': require('../assets/avatars/avatar-cam-flush.png'),
  'obby-ninja': require('../assets/avatars/avatar-obby-ninja.png'),
  'visor-666': require('../assets/avatars/avatar-visor-666.png'),
  'ice-stare': require('../assets/avatars/avatar-ice-stare.png'),
  'robux-tank': require('../assets/avatars/avatar-robux-tank.png'),
  'glitch-hoodie': require('../assets/avatars/avatar-glitch-hoodie.png'),
  'bowl-head': require('../assets/avatars/avatar-bowl-head.png'),
  'drip-poop': require('../assets/avatars/avatar-drip-poop.png'),
  'stink-king': require('../assets/avatars/avatar-stink-king.png'),
  'skibidi-sigma': require('../assets/avatars/avatar-skibidi-sigma.png'),
  'pizza-face': require('../assets/avatars/avatar-pizza-face.png'),
};

export function shopAvatarImage(id?: string | null): ImageSourcePropType | undefined {
  if (!id) return undefined;
  return SHOP_AVATAR_IMAGES[id];
}
