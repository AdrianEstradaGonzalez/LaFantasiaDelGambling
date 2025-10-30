# 🎉 Configuración de Pagos con Stripe - COMPLETA

## ✅ Configuración Completada

### Claves de Stripe Configuradas
- **Clave Secreta**: Añadida al `.env` del backend
- **Clave Pública**: Configurada (obtener desde Stripe Dashboard)
- **Modo**: TEST (para desarrollo y pruebas)

### URLs de Retorno
Como no tienes sitio web, se ha configurado un **esquema personalizado de la app**:
- **Success**: `fantasiagambling://payment/success`
- **Cancel**: `fantasiagambling://payment/cancel`

El WebView detecta automáticamente estos esquemas y:
- ✅ Si detecta `success` → Crea la liga automáticamente
- ❌ Si detecta `cancel` → Cierra el pago sin crear liga

## 🧪 Cómo Probar

### 1. Iniciar el Backend
```bash
cd backend
npm run dev
```

### 2. Iniciar el Frontend
```bash
cd frontend
npm start
# En otra terminal:
npm run android  # o npm run ios
```

### 3. Probar el Flujo de Pago

1. **Abrir la app** y navegar a "Crear Liga"
2. **Presionar "Crear Liga Premium"** → Ver características premium
3. **Configurar nombre y división** → Modal de formulario
4. **Presionar "Pagar 10€ y Crear Liga"** → Se abre WebView de Stripe

### 4. Tarjetas de Prueba de Stripe

Para **PAGO EXITOSO**, usa:
- **Número**: `4242 4242 4242 4242`
- **Fecha**: Cualquier fecha futura (ej: 12/25)
- **CVC**: Cualquier 3 dígitos (ej: 123)
- **Código Postal**: Cualquiera (ej: 12345)

Para **PAGO RECHAZADO**, usa:
- **Número**: `4000 0000 0000 0002`
- **Resto**: Igual que arriba

Para **AUTENTICACIÓN 3D SECURE** (requiere confirmación):
- **Número**: `4000 0027 6000 3184`

### 5. Verificar el Resultado

Después de pagar con `4242 4242 4242 4242`:
- ✅ El WebView debería cerrar automáticamente
- ✅ Debería aparecer el mensaje "¡Pago exitoso!"
- ✅ La liga premium se crea automáticamente
- ✅ Navegas a la pantalla de invitación con el código de liga

## 🔍 Verificar Pagos en Stripe

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Ver todos los pagos de prueba
3. Verificar metadata (userId, leagueName)

## 📱 Características de la Liga Premium

Una vez pagada, la liga premium incluye:
1. ✅ **Elige tu División** - Primera o Segunda División española
2. ✅ **Hasta 50 Jugadores** - vs 20 en ligas normales
3. ✅ **Apuestas Combinadas** - Combina hasta 3 apuestas para multiplicar ganancias

## ⚙️ Configuración de Producción

Cuando quieras pasar a producción:

### 1. Obtener Claves Live
En [Stripe Dashboard](https://dashboard.stripe.com):
- Cambiar de "Test Mode" a "Live Mode" (toggle arriba derecha)
- Ir a Developers → API Keys
- Copiar las claves `pk_live_...` y `sk_live_...`

### 2. Actualizar `.env`
```env
STRIPE_SECRET_KEY=sk_live_TU_CLAVE_SECRETA_AQUI
```

### 3. Activar tu Cuenta
Antes de poder recibir pagos reales, Stripe requiere:
- ✅ Verificar identidad (DNI/Pasaporte)
- ✅ Añadir cuenta bancaria para recibir transferencias
- ✅ Completar información fiscal

## 💰 Gestión de Pagos

### Ver Pagos
```
Dashboard → Payments
```

### Ver Clientes
```
Dashboard → Customers
```

### Exportar Datos
```
Dashboard → Reports → Export
```

### Configurar Webhooks (Opcional)
Para mayor seguridad, puedes configurar webhooks:
```
Dashboard → Developers → Webhooks → Add endpoint
URL: https://tu-backend.com/payment/webhook
```

## 🚨 Solución de Problemas

### El WebView no cierra después del pago
**Causa**: Las URLs de retorno no coinciden
**Solución**: Verificar que `success_url` en `payment.service.ts` sea exactamente `fantasiagambling://payment/success`

### Error "Invalid API Key"
**Causa**: La clave secreta no está correctamente configurada
**Solución**: Verificar `.env` del backend y reiniciar el servidor

### El pago no se registra
**Causa**: El backend no está corriendo o hay error de red
**Solución**: 
```bash
# Verificar logs del backend
cd backend
npm run dev
```

### Error de compilación en iOS
**Causa**: WebView requiere permisos adicionales
**Solución**: Añadir en `Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## 📊 Precios y Comisiones

### Stripe Comisiones (Europa)
- **Tarjetas europeas**: 1.4% + 0.25€ por transacción
- **Tarjetas no europeas**: 2.9% + 0.25€
- **Pagos 3D Secure**: Sin cargo adicional

### Tu Ganancia por Liga Premium
- **Precio de venta**: 10.00€
- **Comisión Stripe**: ~0.39€ (1.4% + 0.25€)
- **Ganancia neta**: ~9.61€

## 🔄 Cambiar el Precio

Para cambiar el precio de la liga premium, edita:

**Backend** (`backend/src/services/payment.service.ts`):
```typescript
unit_amount: 2000, // Para 20€
unit_amount: 1500, // Para 15€
unit_amount: 500,  // Para 5€
```

**Frontend** (`frontend/pages/liga/CrearLiga.tsx`):
```tsx
// Cambiar el texto del botón:
'Pagar 20€ y Crear Liga'

// Y en el header del WebView:
Pago Seguro - 20€
```

## 📞 Soporte

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Test Cards**: https://stripe.com/docs/testing

---

**Estado**: ✅ Configuración completa y lista para probar
**Precio**: 10€ por liga premium
**Modo**: TEST (usar tarjeta 4242 4242 4242 4242)
**Fecha**: 30 de octubre de 2025
