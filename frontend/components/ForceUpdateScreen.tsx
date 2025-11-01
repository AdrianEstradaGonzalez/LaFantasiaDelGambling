import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ForceUpdateScreen: React.FC<{ latestVersion: string; storeUrl?: string }> = ({ latestVersion, storeUrl }) => {
  const openStore = () => {
    // Use the storeUrl provided by backend if available, otherwise fall back to placeholders
    const fallback = Platform.select({
      ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
      android: 'https://play.google.com/store/apps/details?id=com.dreamleague',
    }) as string;

    const url = storeUrl || fallback;
    Linking.openURL(url).catch(() => null);
  };

  return (
    <LinearGradient colors={["#0f172a", "#090b10"]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ backgroundColor: '#0b1220', padding: 24, borderRadius: 12, alignItems: 'center', width: '100%' }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Actualización obligatoria</Text>
        <Text style={{ color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>Hay una nueva versión de la aplicación disponible. Para continuar debes actualizar a la versión {latestVersion}.</Text>

        <TouchableOpacity onPress={openStore} style={{ backgroundColor: '#0892D0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Actualizar ahora</Text>
        </TouchableOpacity>

        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          No podrás usar la aplicación hasta que actualices.
        </Text>
      </View>
    </LinearGradient>
  );
};

export default ForceUpdateScreen;
