import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { ApiConfig } from './apiConfig';

type VersionResponse = {
  latest?: string;
  minSupported?: string;
  minAndroidVersion?: string;
  minIOSVersion?: string;
  storeUrlAndroid?: string;
  storeUrliOS?: string;
};

// Compare semantic versions like '1.2.3'
function compareVersions(v1: string, v2: string): number {
  const a = v1.split('.').map(n => Number(n || 0));
  const b = v2.split('.').map(n => Number(n || 0));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export async function checkAppVersion(): Promise<{ required: boolean; latest?: string; storeUrl?: string }> {
  try {
    const res = await fetch(`${ApiConfig.BASE_URL}/app/version`);
    if (!res.ok) return { required: false };
    const data = (await res.json()) as VersionResponse;

    const currentVersion = DeviceInfo.getVersion();

    // Prefer platform-specific min version if provided
    const platformMin = Platform.OS === 'android' ? data.minAndroidVersion : data.minIOSVersion;
    const minRequired = platformMin || data.minSupported || '0.0.0';

    const isOutdated = compareVersions(currentVersion, minRequired) < 0;

    const storeUrl = Platform.OS === 'android' ? data.storeUrlAndroid : data.storeUrliOS;

    return { required: isOutdated, latest: data.latest, storeUrl };
  } catch (err) {
    console.warn('checkAppVersion failed', err);
    return { required: false };
  }
}

export default checkAppVersion;
