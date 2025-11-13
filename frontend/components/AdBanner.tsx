import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_CONFIG } from '../services/AdMobService';

interface AdBannerProps {
  /**
   * ID del banner (por defecto usa BANNER_HOME)
   */
  adUnitId?: string;
  
  /**
   * Tamaño del banner
   * - BANNER: 320x50
   * - LARGE_BANNER: 320x100
   * - MEDIUM_RECTANGLE: 300x250
   * - FULL_BANNER: 468x60
   * - LEADERBOARD: 728x90
   */
  size?: keyof typeof BannerAdSize;
  
  /**
   * Mostrar el banner (útil para ocultar/mostrar condicionalmente)
   */
  visible?: boolean;
}

/**
 * Componente Banner de AdMob
 * Uso: <AdBanner />
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  adUnitId = ADMOB_CONFIG.BANNER_HOME,
  size = 'BANNER',
  visible = true,
}) => {
  const [adError, setAdError] = useState(false);

  if (!visible || !adUnitId || adError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId as string}
        size={BannerAdSize[size]}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error) => {
          console.log('⚠️ Error cargando banner:', error);
          setAdError(true);
        }}
        onAdLoaded={() => {
          console.log('✅ Banner cargado correctamente');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818ff',
    paddingVertical: 8,
  },
});
