import AsyncStorage from '@react-native-async-storage/async-storage';

const FAMILY_CODE_KEY = 'kid_login_family_code';

export async function getSavedFamilyCode(): Promise<string | null> {
  return AsyncStorage.getItem(FAMILY_CODE_KEY);
}

export async function saveFamilyCode(code: string): Promise<void> {
  await AsyncStorage.setItem(FAMILY_CODE_KEY, code.trim());
}

export async function clearSavedFamilyCode(): Promise<void> {
  await AsyncStorage.removeItem(FAMILY_CODE_KEY);
}
