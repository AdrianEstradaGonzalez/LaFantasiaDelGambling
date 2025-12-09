# 📱 Guía Completa: Configurar In-App Purchases (IAP) para iOS

## ✅ Lo que ya está hecho:

1. ✅ `react-native-iap` instalado
2. ✅ `IAPService.ts` creado y configurado
3. ✅ Backend tiene endpoints `/verify-iap` y `/restore-iap`
4. ✅ Precio configurado a 9.99€

---

## 🔧 Pasos que DEBES hacer:

### **1. Cambiar el Product ID en el código**

Abre `frontend/services/IAPService.ts` y cambia esta línea:

```typescript
const PRODUCT_IDS_IOS = ['com.lafantasiadelgambleo.premium'];
```

Por tu Bundle ID real + identificador del producto:

```typescript
const PRODUCT_IDS_IOS = ['com.TUBUNDLEID.premium'];
```

**Ejemplo**: Si tu Bundle ID es `com.adrianestrada.fantasiagambling`, debería ser:
```typescript
const PRODUCT_IDS_IOS = ['com.adrianestrada.fantasiagambling.premium'];
```

---

### **2. Configurar producto en App Store Connect**

#### 2.1 Crear el producto IAP

1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Selecciona tu app
3. Ve a **Features** → **In-App Purchases**
4. Click en **+** para crear un nuevo producto
5. Selecciona tipo: **Non-Consumable** (pago único, no se consume)
6. Rellena los datos:

   - **Product ID**: `com.TUBUNDLEID.premium` (mismo que pusiste en el código)
   - **Reference Name**: Liga Premium
   - **Price**: €9.99
   - **Display Name** (en español): Liga Premium
   - **Description** (en español): Convierte tu liga en premium con un pago único. Acceso ilimitado para siempre.

7. Añade una **screenshot del producto** (puedes usar cualquier imagen de 640x920px)
8. Click en **Save**

#### 2.2 Crear usuarios de prueba (Sandbox)

1. En App Store Connect, ve a **Users and Access**
2. Click en **Sandbox Testers**
3. Click en **+** para agregar un tester
4. Crea un usuario de prueba con un email que no uses en ninguna Apple ID real
5. **Guarda el email y contraseña**, los necesitarás para probar

---

### **3. Configurar Xcode para IAP**

#### 3.1 Habilitar In-App Purchase capability

1. Abre tu proyecto en Xcode: `ios/TuApp.xcworkspace`
2. Selecciona el target de tu app
3. Ve a la pestaña **Signing & Capabilities**
4. Click en **+ Capability**
5. Busca y añade **In-App Purchase**

#### 3.2 Configurar StoreKit Configuration (para testing local)

1. En Xcode, ve a **File** → **New** → **File**
2. Busca **StoreKit Configuration File**
3. Nómbralo `Products.storekit`
4. Abre el archivo y click en **+**
5. Añade tu producto:
   - **Type**: Non-Consumable
   - **Product ID**: `com.TUBUNDLEID.premium`
   - **Price**: €9.99
   - **Display Name**: Liga Premium

6. En Xcode, ve a **Product** → **Scheme** → **Edit Scheme**
7. En **Run** → **Options**
8. En **StoreKit Configuration**, selecciona `Products.storekit`

---

### **4. Configurar Backend - Variables de Entorno**

#### 4.1 Obtener Apple Shared Secret

1. En App Store Connect, ve a tu app
2. Ve a **Features** → **In-App Purchases**
3. En la barra lateral, click en **App-Specific Shared Secret**
4. Click en **Generate** si no tienes uno
5. **Copia el secret** (algo como `a1b2c3d4e5f6...`)

#### 4.2 Añadir al backend

Abre `backend/.env` y añade:

```env
APPLE_SHARED_SECRET=tu_shared_secret_aqui
```

Si usas Render u otro hosting, añade esta variable de entorno en su panel de configuración.

---

### **5. Actualizar el Backend para verificar recibos**

El endpoint ya existe en `backend/src/controllers/iap.controller.ts`. Verifica que tenga este código:

```typescript
import axios from 'axios';

export const verifyIAP = async (req: FastifyRequest, reply: FastifyReply) => {
  const { ligaId, receipt, productId, transactionId, platform } = req.body as any;
  const userId = req.user?.sub;

  if (!userId) {
    return reply.status(401).send({ error: 'No autenticado' });
  }

  if (platform === 'ios') {
    // Verificar con Apple
    const appleResponse = await axios.post(
      'https://buy.itunes.apple.com/verifyReceipt',
      {
        'receipt-data': receipt,
        'password': process.env.APPLE_SHARED_SECRET,
      }
    );

    if (appleResponse.data.status === 0) {
      // Recibo válido, actualizar liga a premium
      await prisma.league.update({
        where: { id: ligaId },
        data: { isPremium: true },
      });

      return reply.send({ success: true });
    }
  }

  return reply.status(400).send({ error: 'Recibo inválido' });
};
```

---

### **6. Probar en Sandbox (iOS Simulator o Dispositivo Real)**

#### 6.1 En el Simulator

1. Compila la app: `npx react-native run-ios`
2. Ve a la sección de hacer liga premium
3. Cuando aparezca el diálogo de pago:
   - Usa el usuario de sandbox que creaste en App Store Connect
   - La compra no cobrará dinero real

#### 6.2 En Dispositivo Real

1. En tu iPhone, ve a **Ajustes** → **App Store** → **Sandbox Account**
2. Cierra sesión de cualquier cuenta existente
3. Inicia sesión con el usuario de sandbox
4. Compila e instala la app en tu iPhone
5. Prueba la compra

---

### **7. Casos de prueba importantes**

1. ✅ Compra exitosa → Liga se vuelve premium
2. ✅ Usuario cancela la compra → No se cobra, liga sigue normal
3. ✅ Compra pendiente → Se procesa correctamente
4. ✅ Restaurar compras → Funciona correctamente

---

### **8. Preparar para producción**

#### 8.1 Cambiar endpoint de verificación en producción

En `backend/src/controllers/iap.controller.ts`, cambia:

```typescript
const appleUrl = process.env.NODE_ENV === 'production'
  ? 'https://buy.itunes.apple.com/verifyReceipt'
  : 'https://sandbox.itunes.apple.com/verifyReceipt';
```

#### 8.2 Subir a TestFlight

1. Archive la app en Xcode
2. Súbela a App Store Connect
3. Añádela a TestFlight
4. Invita a beta testers
5. **Importante**: Los testers pueden probar IAP sin pagar

#### 8.3 Submit para revisión

1. Rellena toda la información de la app
2. Añade screenshots y descripción
3. En la sección de In-App Purchases, asegúrate de que tu producto esté aprobado
4. Envía para revisión

---

### **9. Checklist final antes de enviar a App Store**

- [ ] Product ID coincide en código y App Store Connect
- [ ] Producto IAP está en estado "Ready to Submit"
- [ ] Bundle ID coincide con el configurado
- [ ] APPLE_SHARED_SECRET está configurado en producción
- [ ] Has probado la compra en Sandbox exitosamente
- [ ] Has probado restaurar compras
- [ ] Has probado cancelar una compra
- [ ] La app funciona en TestFlight
- [ ] Has añadido screenshot del IAP en App Store Connect
- [ ] Has añadido descripción clara del producto

---

### **10. Errores comunes y soluciones**

#### Error: "Cannot connect to iTunes Store"
- **Solución**: Estás en Simulator sin configuración StoreKit, o no tienes internet

#### Error: "Product not found"
- **Solución**: El Product ID no coincide entre código y App Store Connect

#### Error: "Invalid receipt"
- **Solución**: El APPLE_SHARED_SECRET está mal configurado

#### Error: "Sandbox account required"
- **Solución**: Necesitas iniciar sesión con un usuario de sandbox en el dispositivo

---

## 📝 Resumen de archivos modificados

```
frontend/
  ├── services/
  │   └── IAPService.ts ✅ (YA HECHO)
  └── ios/
      └── TuApp.xcworkspace (DEBES CONFIGURAR)

backend/
  ├── .env (AÑADIR APPLE_SHARED_SECRET)
  ├── src/
  │   ├── controllers/
  │   │   └── iap.controller.ts ✅ (YA EXISTE)
  │   └── routes/
  │       └── payment.routes.ts ✅ (YA EXISTE)
```

---

## 🎯 Próximos pasos AHORA:

1. **Cambiar Product ID** en `IAPService.ts` línea 8
2. **Crear producto** en App Store Connect
3. **Crear usuario sandbox** para probar
4. **Habilitar IAP** en Xcode
5. **Añadir APPLE_SHARED_SECRET** al backend
6. **Probar en Simulator/Dispositivo**

¡Listo! Con esto tendrás IAP funcionando en iOS. 🎉
