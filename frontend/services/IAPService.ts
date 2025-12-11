import { Alert, Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import axios from 'axios';
import * as RNIap from 'react-native-iap';
import type { Purchase, Product } from 'react-native-iap';

// IDs de productos IAP (solo iOS)
// IMPORTANTE: El Product ID debe coincidir con el Bundle ID (com.dreamleague2025)
const PRODUCT_IDS_IOS = ['com.dreamleague2025.premium']; 

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
}

class IAPServiceClass {
  private isInitialized = false;
  private products: IAPProduct[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Inicializar el servicio de IAP (solo iOS)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Solo para iOS
    if (Platform.OS !== 'ios') {
      console.log('ℹ️ Android no usa IAP, usa PaymentService con Stripe');
      this.isInitialized = true;
      return;
    }
    
    try {
      console.log('🛒 Inicializando IAP Service para iOS...');
      
      // Conectar con App Store
      await RNIap.initConnection();
      console.log('✅ Conectado a App Store');
      
      // Cargar productos
      await this.loadProducts();
      
      // Configurar listeners
      this.setupPurchaseListeners();
      
      this.isInitialized = true;
      console.log('✅ IAP Service inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando IAP:', error);
      // Fallback a producto hardcodeado
      this.products = [{
        productId: PRODUCT_IDS_IOS[0],
        title: 'Liga Premium',
        description: 'Pago único - Liga premium para siempre',
        price: '9.99',
        currency: 'EUR',
        localizedPrice: '9,99 €',
      }];
      this.isInitialized = true;
    }
  }

  /**
   * Cargar productos disponibles del App Store (solo iOS)
   */
  async loadProducts(): Promise<IAPProduct[]> {
    try {
      console.log('📦 Cargando productos de App Store...', PRODUCT_IDS_IOS);
      
      // react-native-iap v14.x
      // Usamos 'as any' porque la definición de tipos parece tener problemas en esta versión
      const result = await RNIap.fetchProducts({ 
        skus: PRODUCT_IDS_IOS, 
        type: 'in-app' 
      } as any);
      
      // En v14, result suele ser el array de productos directamente
      const products = Array.isArray(result) ? result : (result as any).products;
      
      if (products && products.length > 0) {
        this.products = products.map((product: any) => ({
          productId: product.productId || product.id,
          title: product.title || 'Liga Premium',
          description: product.description || 'Pago único - Liga premium para siempre',
          price: String(product.price || '9.99'),
          currency: product.currency || 'EUR',
          localizedPrice: product.localizedPrice || product.price || '9,99 €',
        }));
      }
      
      console.log('✅ Productos cargados:', this.products);
      return this.products;
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      return this.products;
    }
  }

  /**
   * Configurar listeners de compras (solo iOS)
   */
  private setupPurchaseListeners(): void {
    // Listener de actualizaciones de compra
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener((purchase: Purchase) => {
      console.log('📱 Compra actualizada:', purchase);
    });

    // Listener de errores
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error: any) => {
      console.warn('⚠️ Error en compra:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Hubo un problema con la compra. Intenta de nuevo.');
      }
    });
  }

  /**
   * Obtener productos disponibles
   */
  getProducts(): IAPProduct[] {
    return this.products;
  }

  /**
   * Obtener el producto premium
   */
  getPremiumProduct(): IAPProduct | null {
    return this.products[0] || null;
  }

  /**
   * Comprar premium (solo funciona en iOS)
   * En Android, usa PaymentService directamente
   */
  async purchasePremium(ligaId: string): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.warn('⚠️ IAPService.purchasePremium solo funciona en iOS. Usa PaymentService para Android.');
      return false;
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const productId = PRODUCT_IDS_IOS[0];
      console.log('🛒 Iniciando compra IAP:', productId);

      // Configurar listener ANTES de solicitar la compra
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏱️ Timeout de compra');
          if (tempListener) tempListener.remove();
          resolve(false);
        }, 60000); // 1 minuto

        const tempListener = RNIap.purchaseUpdatedListener(async (purchase: Purchase) => {
          clearTimeout(timeout);
          tempListener.remove();

          try {
            console.log('✅ Compra recibida:', purchase);

            // Verificar el recibo en el backend
            const verified = await this.verifyPurchaseWithBackend(purchase, ligaId);

            if (verified) {
              // Finalizar la transacción
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              
              Alert.alert(
                '¡Liga Premium Activada! 🎉',
                'Tu liga ahora es premium. Disfruta de todas las funcionalidades.',
              );
              resolve(true);
            } else {
              Alert.alert('Error', 'No se pudo verificar la compra. Contacta con soporte.');
              resolve(false);
            }
          } catch (error) {
            console.error('❌ Error procesando compra:', error);
            Alert.alert('Error', 'Hubo un problema al procesar la compra.');
            resolve(false);
          }
        });

        // Solicitar la compra DESPUÉS de configurar el listener
        // Estructura correcta según MutationRequestPurchaseArgs
        const requestParams = { 
          request: {
            apple: {
              sku: productId,
              andDangerouslyFinishTransactionAutomatically: false,
            }
          },
          type: 'in-app' as const,
        };
        
        console.log('🛒 Request params:', JSON.stringify(requestParams));

        RNIap.requestPurchase(requestParams).catch((error) => {
          console.error('❌ Error solicitando compra:', error);
          clearTimeout(timeout);
          if (tempListener) tempListener.remove();
          
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Error', 'No se pudo iniciar la compra.');
          }
          resolve(false);
        });
      });
    } catch (error: any) {
      console.error('❌ Error en compra IAP:', error);
      
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'No se pudo completar la compra.');
      }
      return false;
    }
  }

  /**
   * Verificar el recibo de compra en el backend
   */
  private async verifyPurchaseWithBackend(purchase: Purchase, ligaId: string): Promise<boolean> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.post(
        'https://lafantasiadelgambleo-backend.onrender.com/api/payments/verify-iap',
        {
          ligaId,
          receipt: (purchase as any).transactionReceipt || purchase.transactionId,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          platform: 'ios',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.success === true;
    } catch (error) {
      console.error('❌ Error verificando compra:', error);
      return false;
    }
  }

  /**
   * Restaurar compras anteriores (solo iOS)
   */
  async restorePurchases(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.warn('⚠️ restorePurchases solo funciona en iOS');
      return false;
    }

    try {
      console.log('🔄 Restaurando compras...');
      
      const purchases = await RNIap.getAvailablePurchases();
      console.log('📦 Compras disponibles:', purchases);

      if (purchases.length > 0) {
        // Verificar cada compra en el backend
        const token = await EncryptedStorage.getItem('accessToken');
        
        for (const purchase of purchases) {
          await axios.post(
            'https://lafantasiadelgambleo-backend.onrender.com/api/payments/restore-iap',
            {
              receipt: (purchase as any).transactionReceipt || purchase.transactionId,
              productId: purchase.productId,
              transactionId: purchase.transactionId,
              platform: 'ios',
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }

        Alert.alert(
          'Compras restauradas',
          'Tus compras anteriores han sido restauradas correctamente.',
        );
        return true;
      } else {
        Alert.alert(
          'Sin compras',
          'No se encontraron compras anteriores para restaurar.',
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Error restaurando compras:', error);
      Alert.alert(
        'Error',
        'No se pudieron restaurar las compras. Por favor, intenta de nuevo.',
      );
      return false;
    }
  }

  /**
   * Limpiar recursos al cerrar la app
   */
  async cleanup(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
      }
      
      await RNIap.endConnection();
      this.isInitialized = false;
      console.log('✅ IAP Service desconectado');
    } catch (error) {
      console.error('❌ Error cerrando conexión IAP:', error);
    }
  }
}

export const IAPService = new IAPServiceClass();
