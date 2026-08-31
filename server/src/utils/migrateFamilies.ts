import { Family } from '../models/Family';
import { generateUniqueInviteCode } from './inviteCode';

export async function migrateFamilies() {
  const families = await Family.find({
    $or: [
      { parentIds: { $exists: false } },
      { parentIds: { $size: 0 } },
      { inviteCode: { $exists: false } },
      { inviteCode: null },
    ],
  });

  for (const family of families) {
    let changed = false;

    if (!family.parentIds?.length && family.parentId) {
      family.parentIds = [family.parentId];
      changed = true;
    }

    if (!family.inviteCode) {
      family.inviteCode = await generateUniqueInviteCode();
      changed = true;
    }

    if (changed) {
      await family.save();
      console.log(`Migrated family "${family.name}" (invite: ${family.inviteCode})`);
    }
  }
}
