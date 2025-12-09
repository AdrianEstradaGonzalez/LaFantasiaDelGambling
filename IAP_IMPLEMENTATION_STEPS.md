# Pasos para Implementar In-App Purchases

## ✅ Archivos Creados

1. **Backend:**
   - `backend/src/controllers/iap.controller.ts` - Controlador para verificar compras IAP
   - Rutas añadidas en `backend/src/routes/payment.routes.ts`

2. **Frontend:**
   - `frontend/services/IAPService.ts` - Servicio para manejar IAP
   - `frontend/components/PremiumUpgradeButton.tsx` - Componente de botón premium

3. **Documentación:**
   - `IAP_SETUP_GUIDE.md` - Guía completa de configuración

## 📦 Instalación de Dependencias

### 1. Instalar react-native-iap

```bash
cd frontend
npm install react-native-iap
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Añadir al archivo `android/app/build.gradle`:

```gradle
dependencies {
    ...
    implementation 'com.android.billingclient:billing:6.0.1'
}
```

## 🔧 Configuración Backend

### Variables de Entorno

Añadir a `backend/.env`:

```env
# Apple IAP
APPLE_SHARED_SECRET=tu_shared_secret_aqui
```

Para obtener el Shared Secret:
1. Ve a App Store Connect
2. My Apps → Tu App → Features → In-App Purchases
3. App-Specific Shared Secret
4. Copia el valor

## 🎨 Implementación en Frontend

### Reemplazar PaymentService por IAPService

En cualquier componente donde uses pagos (ej: `UpgradeToPremium.tsx`):

```typescript
// ANTES (Stripe):
import { PaymentService } from '../services/PaymentService';
const handleUpgrade = async () => {
  await PaymentService.createCheckout(ligaId);
};

// DESPUÉS (IAP):
import { PremiumUpgradeButton } from '../components/PremiumUpgradeButton';

// En el JSX:
<PremiumUpgradeButton 
  ligaId={ligaId} 
  onSuccess={() => navigation.goBack()}
/>
```

## 🧪 Testing

### iOS (Sandbox)

1. **Logout de tu Apple ID personal**:
   - Settings → iTunes & App Store → Sign Out

2. **Crear Sandbox Tester**:
   - App Store Connect → Users and Access → Sandbox
   - Crear usuario con email diferente

3. **Run app en debug**:
   ```bash
   npm run ios
   ```

4. **Al intentar comprar**:
   - Usa el Sandbox Tester (no tu Apple ID)
   - La compra es gratis en sandbox

### Android (License Testing)

1. **Subir APK a Internal Testing** en Google Play Console

2. **Añadir testers**:
   - Google Play Console → Setup → License testing
   - Añade tu email

3. **Descargar y probar** desde el link de testing

## 📱 App Store Connect - Crear Producto IAP

1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → Tu App → Features → In-App Purchases
3. Click **+** para crear nuevo
4. Selecciona **Auto-Renewable Subscription**

### Configuración del Producto:

- **Reference Name**: Premium Monthly
- **Product ID**: `com.lafantasiadelgambleo.premium.monthly`
- **Subscription Group**: Premium
- **Duration**: 1 month
- **Price**: €4.99 / $4.99

### Localización:

- **Display Name (ES)**: Premium Mensual
- **Description (ES)**: Accede a ligas premium con funciones exclusivas
- **Display Name (EN)**: Monthly Premium
- **Description (EN)**: Access premium leagues with exclusive features

## 🤖 Google Play Console - Crear Producto IAP

1. Ve a [Google Play Console](https://play.google.com/console)
2. Tu App → Monetization → Products → Subscriptions
3. Click **Create subscription**

### Configuración:

- **Product ID**: `com.lafantasiadelgambleo.premium.monthly`
- **Name**: Premium Mensual
- **Description**: Accede a ligas premium
- **Price**: €4.99 / $4.99
- **Billing period**: 1 month

## 🚀 Deployment

### iOS

1. Build en modo Release
2. Archive → Upload to App Store
3. Verifica que el IAP esté "Ready to Submit"
4. Envía para revisión

### Android

1. Build release:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
2. Sube a Google Play Console
3. Verifica que la suscripción esté activa
4. Envía para revisión

## ⚠️ Checklist Antes de Enviar

- [ ] Instalado `react-native-iap`
- [ ] Producto IAP creado en App Store Connect
- [ ] Producto IAP creado en Google Play Console
- [ ] Shared Secret configurado en backend
- [ ] Testeado con Sandbox (iOS) y License Testing (Android)
- [ ] **Eliminado todo código de Stripe/pago web**
- [ ] Botón "Restore Purchases" visible
- [ ] Términos y política de privacidad actualizados

## 📚 Recursos

- Guía completa: `IAP_SETUP_GUIDE.md`
- React Native IAP: https://github.com/dooboolab/react-native-iap
- Apple IAP Guidelines: https://developer.apple.com/in-app-purchase/

## 🐛 Problemas Comunes

### "No products found"
- Espera 1-2 horas después de crear el producto en App Store Connect
- Verifica que el Product ID coincida exactamente

### "Cannot connect to iTunes Store"
- Asegúrate de estar usando un Sandbox Tester
- Cierra sesión de tu Apple ID personal

### "Receipt verification failed"
- Verifica el APPLE_SHARED_SECRET en backend/.env
- Revisa que estés usando la URL correcta (sandbox vs production)
