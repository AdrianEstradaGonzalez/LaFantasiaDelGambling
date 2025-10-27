import { useState, useEffect } from 'react';
import { AdMobService } from '../services/AdMobService';

/**
 * Hook para gestionar anuncios Interstitial
 */
export const useInterstitialAd = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Precargar al montar
    loadAd();
  }, []);

  const loadAd = async () => {
    setIsLoading(true);
    await AdMobService.preloadInterstitial();
    setIsReady(AdMobService.isInterstitialReady());
    setIsLoading(false);
  };

  const show = async (): Promise<boolean> => {
    if (!isReady) {
      await loadAd();
    }

    const shown = await AdMobService.showInterstitial();
    
    if (shown) {
      setIsReady(false);
      // Precargar el siguiente
      loadAd();
    }

    return shown;
  };

  return {
    isReady,
    isLoading,
    show,
    reload: loadAd,
  };
};

/**
 * Hook para gestionar anuncios Rewarded
 */
export const useRewardedAd = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Precargar al montar
    loadAd();
  }, []);

  const loadAd = async () => {
    setIsLoading(true);
    await AdMobService.preloadRewarded();
    setIsReady(AdMobService.isRewardedReady());
    setIsLoading(false);
  };

  const show = async (): Promise<{ watched: boolean; reward?: { type: string; amount: number } }> => {
    if (!isReady) {
      await loadAd();
    }

    const result = await AdMobService.showRewarded();
    
    if (result.watched) {
      setIsReady(false);
      // Precargar el siguiente
      loadAd();
    }

    return result;
  };

  return {
    isReady,
    isLoading,
    show,
    reload: loadAd,
  };
};

/**
 * Hook para controlar frecuencia de anuncios
 * Útil para no mostrar anuncios muy seguido
 */
export const useAdFrequency = (minIntervalSeconds: number = 60) => {
  const [lastShown, setLastShown] = useState<number>(0);
  const [canShow, setCanShow] = useState(true);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastAd = (now - lastShown) / 1000;
      setCanShow(timeSinceLastAd >= minIntervalSeconds);
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [lastShown, minIntervalSeconds]);

  const markAsShown = () => {
    setLastShown(Date.now());
    setCanShow(false);
  };

  const timeUntilNext = (): number => {
    if (lastShown === 0) return 0;
    const now = Date.now();
    const elapsed = (now - lastShown) / 1000;
    const remaining = Math.max(0, minIntervalSeconds - elapsed);
    return Math.ceil(remaining);
  };

  return {
    canShow,
    markAsShown,
    timeUntilNext,
  };
};
