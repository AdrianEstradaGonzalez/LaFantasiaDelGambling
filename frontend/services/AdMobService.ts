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
  
  // Interstitial Ads (pantalla completa al cambiar de navegación)
  INTERSTITIAL_NAVIGATION: Platform.select({
    ios: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-9629575422824270/1234567890',
    android: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-9629575422824270/1234567890',
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
  private static interstitialAd: InterstitialAd | null = null;
  private static isLoadingInterstitial = false;
  private static rewardedAd: RewardedAd | null = null;
  private static isLoadingRewarded = false;
  private static loadAttempts = 0;
  private static maxLoadAttempts = 3;

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
   * Precargar anuncio intersticial (pantalla completa)
   */
  static async preloadInterstitial(): Promise<void> {
    if (!ADMOB_CONFIG.INTERSTITIAL_NAVIGATION) {
      console.warn('⚠️ No hay ID de anuncio intersticial configurado');
      return;
    }

    if (this.isLoadingInterstitial) {
      console.log('⏳ Ya hay una carga de intersticial en progreso...');
      return;
    }

    this.isLoadingInterstitial = true;

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        ADMOB_CONFIG.INTERSTITIAL_NAVIGATION as string
      );

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout al cargar intersticial'));
        }, 30000);

        const unsubscribeLoaded = this.interstitialAd!.addAdEventListener(
          AdEventType.LOADED,
          () => {
            clearTimeout(timeout);
            unsubscribeLoaded();
            resolve();
          }
        );

        const unsubscribeError = this.interstitialAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            clearTimeout(timeout);
            unsubscribeError();
            reject(error);
          }
        );

        this.interstitialAd!.load();
      });

      console.log('✅ Anuncio intersticial precargado');
    } catch (error) {
      console.error('❌ Error al precargar intersticial:', error);
      this.interstitialAd = null;
    } finally {
      this.isLoadingInterstitial = false;
    }
  }

  /**
   * Mostrar anuncio intersticial
   * @returns Promise con boolean indicando si se mostró
   */
  static async showInterstitial(): Promise<boolean> {
    if (!this.interstitialAd) {
      console.log('⚠️ No hay intersticial precargado');
      return false;
    }

    try {
      return new Promise((resolve) => {
        const unsubscribeClosed = this.interstitialAd!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('🚪 Intersticial cerrado');
            unsubscribeClosed();
            this.interstitialAd = null;
            this.preloadInterstitial(); // Precargar el siguiente
            resolve(true);
          }
        );

        const unsubscribeError = this.interstitialAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.error('❌ Error al mostrar interstitial:', error);
            unsubscribeError();
            unsubscribeClosed();
            this.interstitialAd = null;
            resolve(false);
          }
        );

        this.interstitialAd!.show();
      });
    } catch (error) {
      console.error('❌ Error al mostrar interstitial:', error);
      this.interstitialAd = null;
      return false;
    }
  }

  /**
   * Verificar si hay un intersticial listo
   */
  static isInterstitialReady(): boolean {
    return this.interstitialAd !== null;
  }

  /**
   * Precargar anuncio con recompensa (para desbloquear apuestas)
   */
  static async preloadRewarded(): Promise<void> {
    if (!ADMOB_CONFIG.REWARDED_GENERAL) {
      console.warn('⚠️ No hay ID de anuncio recompensado configurado');
      return;
    }

    if (this.isLoadingRewarded) {
      console.log('⏳ Ya hay una carga de anuncio en progreso...');
      return;
    }

    if (this.loadAttempts >= this.maxLoadAttempts) {
      console.warn('⚠️ Máximo de intentos alcanzado. Esperando antes de reintentar...');
      // Resetear después de 2 minutos
      setTimeout(() => {
        this.loadAttempts = 0;
      }, 120000);
      return;
    }

    this.isLoadingRewarded = true;
    this.loadAttempts++;

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(
        ADMOB_CONFIG.REWARDED_GENERAL as string
      );

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout al cargar anuncio'));
        }, 30000); // 30 segundos timeout

        const unsubscribeLoaded = this.rewardedAd!.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            clearTimeout(timeout);
            unsubscribeLoaded();
            this.loadAttempts = 0; // Reset en caso de éxito
            resolve();
          }
        );

        const unsubscribeError = this.rewardedAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            clearTimeout(timeout);
            unsubscribeError();
            reject(error);
          }
        );

        this.rewardedAd!.load();
      });

      console.log('✅ Anuncio con recompensa precargado (intento ' + this.loadAttempts + ')');
    } catch (error) {
      console.error('❌ Error al precargar rewarded (intento ' + this.loadAttempts + '):', error);
      this.rewardedAd = null;
      
      // Reintentar después de un delay si no hemos alcanzado el máximo
      if (this.loadAttempts < this.maxLoadAttempts) {
        const delay = this.loadAttempts * 5000; // 5s, 10s, 15s
        console.log(`🔄 Reintentando en ${delay/1000} segundos...`);
        setTimeout(() => {
          this.preloadRewarded();
        }, delay);
      }
    } finally {
      this.isLoadingRewarded = false;
    }
  }

  /**
   * Mostrar anuncio con recompensa
   * @returns Promise con si el usuario completó el anuncio y ganó la recompensa
   */
  static async showRewarded(): Promise<{ watched: boolean; reward?: { type: string; amount: number }; error?: string }> {
    // Si no hay anuncio cargado, intentar precargarlo
    if (!this.rewardedAd) {
      console.log('⚠️ No hay anuncio precargado, intentando cargar...');
      await this.preloadRewarded();
      
      // Esperar un momento para que se cargue
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      if (!this.rewardedAd) {
        console.error('❌ No hay anuncio disponible después de intentar cargar');
        return { 
          watched: false, 
          error: 'No hay anuncios disponibles en este momento. Por favor, intenta más tarde.' 
        };
      }

      return new Promise((resolve) => {
        let rewarded = false;
        let rewardData: { type: string; amount: number } | undefined;
        
        // Listener para cuando gana la recompensa
        const unsubscribeEarned = this.rewardedAd!.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward: any) => {
            console.log('🎁 Recompensa ganada:', reward);
            rewarded = true;
            rewardData = reward;
          }
        );

        // Listener para cuando se cierra
        const unsubscribeClosed = this.rewardedAd!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('🚪 Anuncio cerrado. Recompensa ganada:', rewarded);
            unsubscribeEarned();
            unsubscribeClosed();
            
            // Precargar el siguiente
            this.rewardedAd = null;
            this.preloadRewarded();
            
            resolve({ watched: rewarded, reward: rewardData });
          }
        );

        // Listener para errores
        const unsubscribeError = this.rewardedAd!.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.error('❌ Error al mostrar anuncio:', error);
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
            
            this.rewardedAd = null;
            
            resolve({ 
              watched: false, 
              error: 'Error al mostrar el anuncio. Inténtalo de nuevo.' 
            });
          }
        );

        this.rewardedAd!.show();
      });
    } catch (error) {
      console.error('❌ Error al mostrar rewarded:', error);
      return { 
        watched: false, 
        error: 'Error inesperado al mostrar el anuncio.' 
      };
    }
  }

  /**
   * Verificar si hay un anuncio recompensado listo
   */
  static isRewardedReady(): boolean {
    const ready = this.rewardedAd !== null;
    console.log('🔍 Anuncio recompensado listo:', ready);
    return ready;
  }
}

// Inicializar AdMob automáticamente cuando se importa el módulo
AdMobService.initialize().catch(err => {
  console.error('Error auto-inicializando AdMob:', err);
});

// Exportar componentes útiles
export { BannerAd, BannerAdSize, TestIds };
