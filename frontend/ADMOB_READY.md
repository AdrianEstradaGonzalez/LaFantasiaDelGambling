# 🎯 AdMob - Resumen de Configuración

## ✅ Estado Actual: TODO LISTO PARA USAR

La aplicación tiene **toda la infraestructura de AdMob configurada y lista**. Solo falta:
1. Instalar dependencias: `npm install`
2. Configurar IDs de AdMob en producción
3. Activar anuncios donde quieras

---

## 📦 Archivos Creados

### Servicios
- **`services/AdMobService.ts`** - Servicio principal de AdMob
  - Inicialización
  - Gestión de Interstitials
  - Gestión de Rewarded Ads
  - IDs configurables (test/producción)

### Componentes
- **`components/AdBanner.tsx`** - Componente para banners
- **`components/WatchAdButton.tsx`** - Botón para anuncios con recompensa

### Hooks
- **`hooks/useAdMob.ts`** - Hooks personalizados
  - `useInterstitialAd()` - Para anuncios intersticiales
  - `useRewardedAd()` - Para anuncios con recompensa
  - `useAdFrequency()` - Para controlar frecuencia

### Documentación
- **`ADMOB_SETUP.md`** - Guía completa de configuración
- **`ADMOB_EXAMPLES.tsx`** - 10 ejemplos de uso

### Dependencias
- **`package.json`** - Actualizado con `react-native-google-mobile-ads@^15.4.0`

---

## 🚀 Pasos para Activar

### 1. Instalar dependencias
```bash
cd frontend
npm install
cd ios && pod install && cd ..
```

### 2. Configurar App ID en Android
Edita `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

### 3. Configurar App ID en iOS
Edita `ios/frontend/Info.plist`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

### 4. Configurar IDs de Unidades de Anuncio
Edita `services/AdMobService.ts` líneas 13-28:
```typescript
BANNER_HOME: Platform.select({
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/BANNER_IOS_ID',
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/BANNER_ANDROID_ID',
}),
```

### 5. Inicializar en App.tsx
```typescript
import { AdMobService } from './services/AdMobService';

useEffect(() => {
  AdMobService.initialize();
  AdMobService.preloadInterstitial();
  AdMobService.preloadRewarded();
}, []);
```

---

## 💡 Ejemplos de Uso Rápido

### Banner en Home
```tsx
import { AdBanner } from './components/AdBanner';

<AdBanner visible={true} />
```

### Interstitial al cambiar pantalla
```tsx
import { AdMobService } from './services/AdMobService';

await AdMobService.showInterstitial();
navigation.navigate('OtraPantalla');
```

### Rewarded para presupuesto extra
```tsx
import { useRewardedAd } from './hooks/useAdMob';
import { WatchAdButton } from './components/WatchAdButton';

const { show, isLoading } = useRewardedAd();

const handleWatch = async () => {
  const result = await show();
  if (result.watched) {
    // Dar recompensa
  }
};

<WatchAdButton onPress={handleWatch} loading={isLoading} />
```

---

## 🎨 Dónde Poner Anuncios (Recomendaciones)

### ✅ Banners (Discretos)
- **Home** - Al final de la pantalla
- **Clasificación** - Entre la tabla y los detalles
- **Mercado** - Al final de la lista de jugadores

### ✅ Interstitials (Transiciones)
- **Al cambiar de liga** (cada 2-3 cambios)
- **Después de crear/unirse a liga**
- **Al finalizar configuración de plantilla**

### ✅ Rewarded (Con valor)
- **Presupuesto extra de apuestas** (+50M)
- **Ver estadísticas detalladas de jugador**
- **Análisis premium de jornada**
- **Multiplicador de puntos temporal**

### ❌ Evitar
- Durante selección de plantilla (experiencia crítica)
- En medio de realizar apuestas
- Más de 1 interstitial por minuto

---

## 🧪 Testing

Los anuncios en desarrollo usan automáticamente **Test IDs** de Google:
- No necesitas configurar nada para probar
- Los anuncios funcionan igual que los reales
- **NO uses Test IDs en producción**

---

## 📱 Comandos Útiles

```bash
# Instalar dependencias
npm install

# iOS: Instalar pods
cd ios && pod install && cd ..

# Limpiar y reconstruir Android
cd android && ./gradlew clean && cd ..

# Ejecutar
npm run android
npm run ios
```

---

## 🔍 Verificación

Después de instalar, verifica en los logs:
```
✅ AdMob inicializado correctamente
✅ Anuncio intersticial precargado
✅ Anuncio con recompensa precargado
```

---

## 📚 Archivos para Consultar

1. **Configuración completa**: `ADMOB_SETUP.md`
2. **Ejemplos de código**: `ADMOB_EXAMPLES.tsx`
3. **Servicio principal**: `services/AdMobService.ts`
4. **Componentes**: `components/AdBanner.tsx`, `components/WatchAdButton.tsx`
5. **Hooks**: `hooks/useAdMob.ts`

---

## ⚠️ Recordatorios

- **Test IDs en desarrollo** ✅ (automático con `__DEV__`)
- **IDs de producción antes de publicar** ⚠️
- **No hacer clic en tus propios anuncios** ⚠️
- **Respetar frecuencia de anuncios** ⚠️
- **Implementar consentimiento GDPR para Europa** ⚠️

---

**¡Todo está listo! Solo dime dónde quieres poner los anuncios y los activo.**
