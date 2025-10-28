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

// IDs de AdMob configurados
export const ADMOB_CONFIG = {
  // Banner Ads (320x50) - Home, Clasificación, Apuestas
  BANNER_HOME: Platform.select({
    ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-9629575422824270/8928778036',
    android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-9629575422824270/8928778036',
  }),
  
  // Rewarded Ads (desbloquear apuestas bloqueadas)
  // Recompensa: 1 apuesta desbloqueada de las 2 últimas bloqueadas
  REWARDED_GENERAL: Platform.select({
    ios: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9629575422824270/6302614690',
    android: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9629575422824270/6302614690',
  }),
  
  // Nativo Avanzado (disponible si quieres usarlo en lugar de banner)
  NATIVE_ADVANCED: Platform.select({
    ios: 'ca-app-pub-9629575422824270/4941431564',
    android: 'ca-app-pub-9629575422824270/4941431564',
  }),
};

// Clase para gestionar AdMob
export class AdMobService {
  private static initialized = false;
  private static rewardedAd: RewardedAd | null = null;

  /**
   * Inicializar AdMob (llamar una vez al inicio de la app)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!mobileAds || typeof mobileAds !== 'function') {
        console.warn('⚠️ mobileAds no está disponible');
        return;
      }

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
   * Precargar anuncio con recompensa (para desbloquear apuestas)
   */
  static async preloadRewarded(): Promise<void> {
    if (!ADMOB_CONFIG.REWARDED_GENERAL) return;

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(
        ADMOB_CONFIG.REWARDED_GENERAL as string
      );

      await new Promise<void>((resolve, reject) => {
        const unsubscribeLoaded = this.rewardedAd!.addAdEventListener(
          RewardedAdEventType.LOADED,
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
   * Verificar si hay un anuncio recompensado listo
   */
  static isRewardedReady(): boolean {
    return this.rewardedAd !== null;
  }
}

// Inicializar AdMob automáticamente cuando se importa el módulo
AdMobService.initialize().catch(err => {
  console.error('Error auto-inicializando AdMob:', err);
});

// Exportar componentes útiles
export { BannerAd, BannerAdSize, TestIds };
