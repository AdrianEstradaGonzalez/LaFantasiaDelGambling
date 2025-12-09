# Pasos Inmediatos para Aprobación de Apple

## 1. Reemplazar Código de Stripe

### Archivos a Modificar:

#### `frontend/pages/apuestas/Apuestas.tsx`
- **Línea 10**: Eliminar import de PaymentService
- **Línea 1098-1126**: Reemplazar lógica de Stripe con IAPService

#### `frontend/pages/liga/CrearLiga.tsx`
- **Línea 17**: Eliminar import de PaymentService
- **Línea 150**: Reemplazar createPremiumCheckout con IAPService.purchasePremium
- **Línea 831**: Eliminar verificación de Stripe

### Código de Reemplazo:

```typescript
// En lugar de:
const checkoutUrl = await PaymentService.createUpgradeCheckout(ligaId, ligaName);

// Usar:
import { IAPService } from '../../services/IAPService';
const success = await IAPService.purchasePremium(ligaId);
if (success) {
  Alert.alert('¡Premium Activado!', 'Tu liga ahora es premium');
}
```

---

## 2. Añadir Botón "Restaurar Compras"

En cualquier pantalla donde se muestre el upgrade a premium, añadir:

```typescript
<TouchableOpacity
  onPress={async () => {
    await IAPService.restorePurchases();
  }}
  style={{
    padding: 12,
    alignItems: 'center',
  }}
>
  <Text style={{ color: '#64748b', fontSize: 13, textDecorationLine: 'underline' }}>
    Restaurar compras anteriores
  </Text>
</TouchableOpacity>
```

**Apple RECHAZARÁ la app si no tiene este botón visible.**

---

## 3. Crear Producto IAP en App Store Connect

### Paso a Paso:

1. **Login**: https://appstoreconnect.apple.com
2. **My Apps** → Selecciona tu app
3. **Features** → **In-App Purchases**
4. Click **+ (Create)**
5. Selecciona **Auto-Renewable Subscription**

### Configuración del Producto:

```
Reference Name: Premium Monthly
Product ID: com.lafantasiadelgambleo.premium.monthly
Subscription Group: Premium (crear nuevo si no existe)
Duration: 1 month
```

### Precios por País:

| País | Precio |
|------|--------|
| España | €4.99 |
| USA | $4.99 |
| México | MXN 99 |
| UK | £4.99 |

### Localización:

**Español:**
- Display Name: Premium Mensual
- Description: Accede a ligas premium con apuestas combinadas, mercado de transferencias y estadísticas avanzadas.

**Inglés:**
- Display Name: Monthly Premium
- Description: Access premium leagues with combined bets, transfer market, and advanced statistics.

---

## 4. Obtener Shared Secret

1. En App Store Connect → Tu App → Features → In-App Purchases
2. Click en **App-Specific Shared Secret**
3. Si no existe, click **Generate**
4. **Copia el valor** (se ve así: `a1b2c3d4e5f6...`)

5. Añadir a `backend/.env`:
```env
APPLE_SHARED_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 5. Configurar iOS (Info.plist)

Editar `ios/tuApp/Info.plist`, añadir:

```xml
<key>SKPaymentQueueDelegate</key>
<true/>
<key>NSUserTrackingUsageDescription</key>
<string>Necesitamos tu permiso para ofrecerte una mejor experiencia personalizada</string>
```

---

## 6. Testing con Sandbox

### Crear Sandbox Tester:

1. App Store Connect → **Users and Access**
2. **Sandbox** (tab superior)
3. Click **+ (Add)**
4. Crear con **email diferente** a tu Apple ID personal
5. Ejemplo:
   - Email: test.premium@icloud.com
   - Password: Test123456!
   - Country: Spain

### Testing en iPhone/Simulator:

1. **Logout de tu Apple ID personal**:
   - Settings → iTunes & App Store → Sign Out

2. **Build y run**:
   ```bash
   cd ios
   pod install
   cd ..
   npm run ios
   ```

3. **Intentar comprar**:
   - La app pedirá login
   - Usa el Sandbox Tester creado
   - **¡La compra es GRATIS en sandbox!**

4. **Verificar en backend**:
   - Revisa logs para confirmar que el recibo se verificó

---

## 7. Eliminar Todo Código de Stripe

### Buscar y Eliminar:

```bash
# Buscar referencias
grep -r "PaymentService" frontend/
grep -r "stripe" frontend/
grep -r "checkout" frontend/
```

### Archivos a Limpiar:

- ❌ `frontend/services/PaymentService.ts` - **ELIMINAR ARCHIVO**
- ✅ `frontend/services/IAPService.ts` - **YA CREADO**

### Eliminar Dependencies:

```json
// frontend/package.json
// ELIMINAR:
"@stripe/stripe-react-native": "^0.55.1",
"stripe": "^19.2.0",
```

```bash
cd frontend
npm uninstall @stripe/stripe-react-native stripe
cd ios
pod install
```

---

## 8. Documentos Legales

Actualizar en tu web/app:

### Términos de Servicio:

Añadir sección:
```
SUSCRIPCIONES Y PAGOS

Los pagos se procesan a través de Apple App Store (iOS) o Google Play (Android).
Las suscripciones se renuevan automáticamente cada mes.
Puedes cancelar en cualquier momento desde tu cuenta de Apple/Google.
No hay reembolsos por períodos parciales.
```

### Política de Privacidad:

```
PAGOS

Los datos de pago se procesan por Apple/Google, no almacenamos información de tarjetas.
```

---

## 9. Preparar para App Review

### Screenshots Requeridos:

1. **Pantalla principal** (funciones gratuitas)
2. **Pantalla de upgrade** mostrando:
   - Precio €4.99/mes visible
   - Botón "Restaurar Compras"
   - Lista de funciones premium
3. **Funciones premium** en acción

### App Review Information:

En App Store Connect → Tu App → App Information → App Review Information:

```
Demo Account:
Email: demo@lafantasiadelgambleo.com
Password: Demo123!

Notes:
- IAP Product ID: com.lafantasiadelgambleo.premium.monthly
- Configured as Auto-Renewable Subscription at €4.99/month
- Premium features: Combined bets, transfer market, advanced stats
- "Restore Purchases" button available on upgrade screen
```

---

## 10. Build para Production

### Actualizar Version:

```bash
cd ios
# Incrementar build number
agvtool next-version -all
```

### Archive:

1. Xcode → Product → Scheme → Edit Scheme
2. Run → Build Configuration → **Release**
3. Product → Archive
4. Upload to App Store Connect

### Metadata en App Store Connect:

- **App Name**: La Fantasía del Gambleo
- **Subtitle**: Liga Fantasy de Fútbol Premium
- **Keywords**: fantasy, futbol, liga, apuestas, predicciones, dream picks
- **Description**: Mencionar funciones gratuitas Y premium

---

## ⚠️ ERRORES COMUNES que causan Rechazo:

### ❌ Guideline 3.1.1 - In-App Purchase

**Causa**: Encontraron código de Stripe o links externos
**Solución**: Eliminar TODO código de pagos externos

### ❌ Guideline 2.1 - App Completeness

**Causa**: No pudieron probar el IAP
**Solución**: Verificar que el producto esté "Ready to Submit" en App Store Connect

### ❌ Guideline 3.1.2 - Subscriptions

**Causa**: Falta botón "Restore Purchases"
**Solución**: Añadir botón visible en pantalla de upgrade

### ❌ Guideline 5.1.1 - Privacy

**Causa**: Falta NSUserTrackingUsageDescription
**Solución**: Añadir a Info.plist

---

## 📋 Checklist Final

Antes de enviar a review:

- [ ] Producto IAP creado en App Store Connect
- [ ] APPLE_SHARED_SECRET configurado en backend
- [ ] PaymentService eliminado completamente
- [ ] Stripe dependencies desinstaladas
- [ ] IAPService implementado en Apuestas.tsx y CrearLiga.tsx
- [ ] Botón "Restaurar Compras" visible
- [ ] Testeado con Sandbox Tester
- [ ] Info.plist actualizado
- [ ] Términos y Política actualizados
- [ ] Screenshots preparados
- [ ] Cuenta demo para App Review
- [ ] Build en modo Release
- [ ] Version/Build number incrementado

---

## 🆘 Si Apple Rechaza:

1. **Lee el motivo exacto** en Resolution Center
2. **Responde en <24h** para mantener prioridad
3. **Sube nuevos screenshots** si lo piden
4. **No discutas** - ajusta lo que pidan
5. **Pide clarificación** si no entiendes el motivo

---

## 📞 Contacto con Apple (si es necesario):

- Resolution Center en App Store Connect
- Teléfono: 1-800-676-2775 (Apple Developer Support)
- Email: No disponible (solo Resolution Center)

---

## Tiempo Estimado:

- ⏱️ Configuración IAP: 2-3 horas
- ⏱️ Eliminar Stripe: 1 hora
- ⏱️ Testing: 1-2 horas
- ⏱️ Review de Apple: 1-3 días

**Total: ~1 semana** desde que envíes a review hasta aprobación.

---

¿Necesitas ayuda con algún paso específico?
