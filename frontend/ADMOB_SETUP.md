# 📱 Configuración de Google AdMob

Esta aplicación está preparada para integrar anuncios de Google AdMob. A continuación se detallan los pasos para activarlos.

## 📋 Prerrequisitos

1. Cuenta de Google AdMob: https://admob.google.com/
2. Crear una aplicación en AdMob Console
3. Obtener los IDs de anuncios

## 🔧 Instalación

La dependencia ya está añadida en `package.json`. Instala con:

```bash
npm install
# o
yarn install
```

Luego vincula las dependencias nativas:

```bash
cd android && ./gradlew clean && cd ..
npx pod-install ios
```

## 🆔 Configurar IDs de AdMob

### 1. Obtener App ID de AdMob

En AdMob Console:
- Ve a Apps → Tu aplicación
- Copia el "App ID" (formato: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

### 2. Configurar Android

Edita `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <!-- Añadir dentro de <application> -->
  <meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  
  <!-- Resto del contenido -->
</application>
```

### 3. Configurar iOS

Edita `ios/frontend/Info.plist`:

```xml
<dict>
  <!-- Añadir antes de </dict> -->
  <key>GADApplicationIdentifier</key>
  <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
  
  <!-- Resto del contenido -->
</dict>
```

### 4. Configurar IDs de Unidades de Anuncios

Edita `frontend/services/AdMobService.ts`:

```typescript
export const ADMOB_CONFIG = {
  BANNER_HOME: Platform.select({
    ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/BANNER_IOS_ID',
    android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/BANNER_ANDROID_ID',
  }),
  
  INTERSTITIAL_GENERAL: Platform.select({
    ios: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXXXXXXXXXXXXXX/INTERSTITIAL_IOS_ID',
    android: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXXXXXXXXXXXXXX/INTERSTITIAL_ANDROID_ID',
  }),
  
  REWARDED_GENERAL: Platform.select({
    ios: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXXXXXXXXXXXXX/REWARDED_IOS_ID',
    android: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXXXXXXXXXXXXX/REWARDED_ANDROID_ID',
  }),
};
```

**Nota**: En modo desarrollo (`__DEV__`), se usan automáticamente los Test IDs de Google.

## 🚀 Inicializar AdMob

En `App.tsx`, inicializa AdMob al arrancar:

```typescript
import { AdMobService } from './services/AdMobService';

function App() {
  useEffect(() => {
    // Inicializar AdMob
    AdMobService.initialize();
    
    // Opcional: Precargar anuncios
    AdMobService.preloadInterstitial();
    AdMobService.preloadRewarded();
  }, []);
  
  // ... resto del código
}
```

## 📊 Tipos de Anuncios

### 1. Banner (320x50)

Anuncio fijo en la parte superior o inferior de la pantalla.

```tsx
import { AdBanner } from './components/AdBanner';

<AdBanner visible={true} size="BANNER" />
```

**Opciones de tamaño**:
- `BANNER` - 320x50
- `LARGE_BANNER` - 320x100
- `MEDIUM_RECTANGLE` - 300x250
- `FULL_BANNER` - 468x60
- `LEADERBOARD` - 728x90

### 2. Interstitial (Pantalla completa)

Anuncio de pantalla completa que aparece en transiciones naturales.

```typescript
import { AdMobService } from './services/AdMobService';

// Mostrar entre pantallas
const navigateWithAd = async () => {
  await AdMobService.showInterstitial();
  navigation.navigate('OtraPantalla');
};
```

### 3. Rewarded (Con recompensa)

Anuncio que da una recompensa al usuario por verlo completo.

```typescript
import { AdMobService } from './services/AdMobService';

const handleWatchAd = async () => {
  const result = await AdMobService.showRewarded();
  
  if (result.watched) {
    // Usuario vio el anuncio completo
    console.log('Recompensa ganada:', result.reward);
    // Dar puntos extra, desbloquear contenido, etc.
  } else {
    // Usuario cerró el anuncio antes de tiempo
    console.log('No se completó el anuncio');
  }
};
```

## 💡 Ejemplos de Uso

### Ejemplo 1: Banner en Home

```tsx
// pages/home/Home.tsx
import { AdBanner } from '../../components/AdBanner';

export const Home = () => {
  return (
    <View style={{ flex: 1 }}>
      {/* Contenido */}
      <ScrollView>
        {/* ... */}
      </ScrollView>
      
      {/* Banner al final */}
      <AdBanner visible={true} />
    </View>
  );
};
```

### Ejemplo 2: Interstitial al cambiar de liga

```typescript
// pages/liga/Clasificacion.tsx
const handleSelectLeague = async (leagueId: string) => {
  // Mostrar anuncio cada 3 cambios de liga
  if (leagueChangeCount % 3 === 0) {
    await AdMobService.showInterstitial();
  }
  
  navigation.navigate('Clasificacion', { ligaId: leagueId });
};
```

### Ejemplo 3: Rewarded para presupuesto extra

```typescript
// pages/apuestas/Apuestas.tsx
const watchAdForExtraBudget = async () => {
  const result = await AdMobService.showRewarded();
  
  if (result.watched) {
    // Dar 50M extra de presupuesto
    await BettingService.addExtraBudget(ligaId, userId, 50);
    
    CustomAlertManager.alert(
      '¡Recompensa obtenida!',
      'Has ganado 50M extra de presupuesto de apuestas',
      [{ text: 'Genial', style: 'default' }],
      { icon: 'check-circle', iconColor: '#22c55e' }
    );
  }
};
```

## 🧪 Testing

### Test IDs

Durante desarrollo, la app usa automáticamente Test IDs de Google:
- No necesitas configurar nada
- Los anuncios son de prueba
- NO uses Test IDs en producción

### Verificar configuración

```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

Revisa los logs para verificar:
```
✅ AdMob inicializado correctamente
✅ Anuncio intersticial precargado
✅ Anuncio con recompensa precargado
```

## ⚠️ Consideraciones Importantes

### 1. No hacer clic en tus propios anuncios
- Google puede banear tu cuenta
- Usa Test IDs durante desarrollo

### 2. Frecuencia de anuncios
- No mostrar interstitials muy seguido
- Espera al menos 30-60 segundos entre anuncios
- Considera el UX del usuario

### 3. GDPR y Consentimiento (Europa)
Si tu app es para usuarios europeos, debes:
- Implementar un banner de consentimiento
- Usar `requestNonPersonalizedAdsOnly: true` si no dan consentimiento

### 4. Políticas de AdMob
Lee las políticas: https://support.google.com/admob/answer/6128543

## 🎯 Estrategias Recomendadas

### Banners
- ✅ Home, Clasificación (no intrusivos)
- ❌ Plantilla, Apuestas activas (pueden distraer)

### Interstitials
- ✅ Al cambiar entre ligas (cada 2-3 cambios)
- ✅ Después de completar una acción (crear liga, unirse)
- ❌ En medio de una acción crítica

### Rewarded
- ✅ Presupuesto extra de apuestas
- ✅ Ver estadísticas premium
- ✅ Desbloquear análisis de jornada
- ✅ Multiplicador de puntos (eventos especiales)

## 📚 Documentación Oficial

- React Native Google Mobile Ads: https://docs.page/invertase/react-native-google-mobile-ads
- AdMob Console: https://admob.google.com/
- Políticas de AdMob: https://support.google.com/admob/

## 🐛 Troubleshooting

### Error: "The ad request was successful, but no ad was returned"
- Normal en desarrollo si usas Test IDs
- En producción, espera 24-48h después de publicar

### Error: "App ID not found in manifest"
- Verifica AndroidManifest.xml / Info.plist
- Formato correcto del App ID

### Anuncios no cargan
- Verifica conexión a internet
- Comprueba que los IDs sean correctos
- En iOS, revisa los permisos de tracking (ATT)

## ✅ Checklist antes de publicar

- [ ] App ID configurado en AndroidManifest.xml
- [ ] App ID configurado en Info.plist
- [ ] IDs de producción en AdMobService.ts (reemplazar Test IDs)
- [ ] Test IDs solo en modo `__DEV__`
- [ ] Probado en dispositivo físico
- [ ] Frecuencia de anuncios es razonable
- [ ] Cumple políticas de AdMob

---

**Estado actual**: ✅ Todo configurado, anuncios NO activos (esperando IDs de producción)
