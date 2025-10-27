import { Platform } from 'react-native';
import mobileAds, {
  MaxAdContentRating,
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// IDs de AdMob (REEMPLAZAR con tus IDs reales de producción)
export const ADMOB_CONFIG = {
  // Banner Ads
  BANNER_HOME: Platform.select({
    ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  }),
  
  // Interstitial Ads (pantalla completa)
  INTERSTITIAL_GENERAL: Platform.select({
    ios: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    android: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  }),
  
  // Rewarded Ads (con recompensa)
  REWARDED_GENERAL: Platform.select({
    ios: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    android: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  }),
};

// Clase para gestionar AdMob
export class AdMobService {
  private static initialized = false;
  private static interstitialAd: InterstitialAd | null = null;
  private static rewardedAd: RewardedAd | null = null;

  /**
   * Inicializar AdMob (llamar una vez al inicio de la app)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await mobileAds().initialize();
      
      // Configuración de clasificación de contenido
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      this.initialized = true;
      console.log('✅ AdMob inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar AdMob:', error);
    }
  }

  /**
   * Precargar anuncio intersticial
   */
  static async preloadInterstitial(): Promise<void> {
    if (!ADMOB_CONFIG.INTERSTITIAL_GENERAL) return;

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        ADMOB_CONFIG.INTERSTITIAL_GENERAL as string
      );

      await new Promise<void>((resolve, reject) => {
        const unsubscribeLoaded = this.interstitialAd!.addAdEventListener(
          AdEventType.LOADED,
          () => {
            unsubscribeLoaded();
            resolve();
          }
        );

        const unsubscribeError = this.interstitialAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            unsubscribeError();
            reject(error);
          }
        );

        this.interstitialAd!.load();
      });

      console.log('✅ Anuncio intersticial precargado');
    } catch (error) {
      console.error('❌ Error al precargar intersticial:', error);
    }
  }

  /**
   * Mostrar anuncio intersticial
   */
  static async showInterstitial(): Promise<boolean> {
    if (!this.interstitialAd) {
      await this.preloadInterstitial();
    }

    try {
      if (this.interstitialAd) {
        await this.interstitialAd.show();
        
        // Precargar el siguiente
        this.interstitialAd = null;
        this.preloadInterstitial();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error al mostrar intersticial:', error);
      return false;
    }
  }

  /**
   * Precargar anuncio con recompensa
   */
  static async preloadRewarded(): Promise<void> {
    if (!ADMOB_CONFIG.REWARDED_GENERAL) return;

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(
        ADMOB_CONFIG.REWARDED_GENERAL as string
      );

      await new Promise<void>((resolve, reject) => {
        const unsubscribeLoaded = this.rewardedAd!.addAdEventListener(
          AdEventType.LOADED,
          () => {
            unsubscribeLoaded();
            resolve();
          }
        );

        const unsubscribeError = this.rewardedAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            unsubscribeError();
            reject(error);
          }
        );

        this.rewardedAd!.load();
      });

      console.log('✅ Anuncio con recompensa precargado');
    } catch (error) {
      console.error('❌ Error al precargar rewarded:', error);
    }
  }

  /**
   * Mostrar anuncio con recompensa
   * @returns Promise con si el usuario completó el anuncio y ganó la recompensa
   */
  static async showRewarded(): Promise<{ watched: boolean; reward?: { type: string; amount: number } }> {
    if (!this.rewardedAd) {
      await this.preloadRewarded();
    }

    try {
      if (!this.rewardedAd) {
        return { watched: false };
      }

      return new Promise((resolve) => {
        let rewarded = false;
        let rewardData: { type: string; amount: number } | undefined;
        // Listener para cuando gana la recompensa
        const unsubscribeEarned = this.rewardedAd!.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward: any) => {
            rewarded = true;
            rewardData = reward;
          }
        );

        // Listener para cuando se cierra
        const unsubscribeClosed = this.rewardedAd!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            unsubscribeEarned();
            unsubscribeClosed();
            
            // Precargar el siguiente
            this.rewardedAd = null;
            this.preloadRewarded();
            
            resolve({ watched: rewarded, reward: rewardData });
          }
        );

        this.rewardedAd!.show();
      });
    } catch (error) {
      console.error('❌ Error al mostrar rewarded:', error);
      return { watched: false };
    }
  }

  /**
   * Verificar si hay un intersticial listo
   */
  static isInterstitialReady(): boolean {
    return this.interstitialAd !== null;
  }

  /**
   * Verificar si hay un rewarded listo
   */
  static isRewardedReady(): boolean {
    return this.rewardedAd !== null;
  }
}

// Exportar componentes útiles
export { BannerAd, BannerAdSize, TestIds };
