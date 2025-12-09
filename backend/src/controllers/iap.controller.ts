import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Apple App Store API
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET; // Configurar en App Store Connect

// Google Play API
const GOOGLE_PLAY_PACKAGE_NAME = 'com.lafantasiadelgambleo';

/**
 * Verificar compra de IAP (In-App Purchase)
 */
export async function verifyIAP(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user.userId;
    const { ligaId, receipt, purchaseToken, productId, transactionId, platform } = request.body as any;

    console.log('🔍 Verificando compra IAP:', { userId, ligaId, productId, platform });

    let isValid = false;

    // Verificar según la plataforma
    if (platform === 'ios') {
      isValid = await verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      isValid = await verifyGooglePurchase(purchaseToken, productId);
    }

    if (!isValid) {
      return reply.code(400).send({
        success: false,
        message: 'Recibo de compra inválido',
      });
    }

    // Actualizar la liga a premium
    const league = await prisma.league.update({
      where: { id: ligaId },
      data: { isPremium: true },
    });

    // TODO: Guardar registro de la compra en una tabla de pagos
    console.log('💳 Compra registrada:', {
      userId,
      ligaId,
      productId,
      transactionId: transactionId || purchaseToken,
      platform,
    });

    console.log('✅ Compra verificada y liga actualizada a premium');

    return reply.send({
      success: true,
      league,
    });
  } catch (error) {
    console.error('❌ Error verificando IAP:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error verificando la compra',
    });
  }
}

/**
 * Verificar recibo de Apple
 */
async function verifyAppleReceipt(receipt: string): Promise<boolean> {
  try {
    // Intentar primero con producción
    let response = await axios.post(APPLE_VERIFY_URL_PRODUCTION, {
      'receipt-data': receipt,
      'password': APPLE_SHARED_SECRET,
      'exclude-old-transactions': true,
    });

    // Si falla en producción, intentar con sandbox
    if (response.data.status === 21007) {
      response = await axios.post(APPLE_VERIFY_URL_SANDBOX, {
        'receipt-data': receipt,
        'password': APPLE_SHARED_SECRET,
        'exclude-old-transactions': true,
      });
    }

    const { status } = response.data;

    // Status 0 = válido
    if (status === 0) {
      console.log('✅ Recibo de Apple verificado correctamente');
      return true;
    }

    console.error('❌ Recibo de Apple inválido. Status:', status);
    return false;
  } catch (error) {
    console.error('❌ Error verificando recibo de Apple:', error);
    return false;
  }
}

/**
 * Verificar compra de Google Play
 */
async function verifyGooglePurchase(purchaseToken: string, productId: string): Promise<boolean> {
  try {
    // Necesitas configurar Google Play Developer API
    // https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
    
    // Para simplificar, aquí solo valida que existan los datos
    // En producción, debes usar la API de Google Play Developer
    
    if (!purchaseToken || !productId) {
      return false;
    }

    // TODO: Implementar verificación real con Google Play API
    console.log('⚠️ Verificación de Google Play pendiente de implementar');
    
    // Por ahora, aceptar si tiene purchaseToken
    return true;
  } catch (error) {
    console.error('❌ Error verificando compra de Google:', error);
    return false;
  }
}

/**
 * Restaurar compras anteriores
 */
export async function restoreIAP(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user.userId;
    const { receipt, purchaseToken, productId, platform } = request.body as any;

    console.log('🔄 Restaurando compra IAP:', { userId, productId, platform });

    let isValid = false;

    // Verificar según la plataforma
    if (platform === 'ios') {
      isValid = await verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      isValid = await verifyGooglePurchase(purchaseToken, productId);
    }

    if (!isValid) {
      return reply.code(400).send({
        success: false,
        message: 'No se pudo verificar la compra',
      });
    }

    // Buscar todas las ligas donde el usuario es miembro
    const userMembers = await prisma.leagueMember.findMany({
      where: { userId },
      include: { league: true },
    });
    
    const userLeagues = userMembers.map(m => m.league);

    // Actualizar todas las ligas a premium
    await Promise.all(
      userLeagues.map(league =>
        prisma.league.update({
          where: { id: league.id },
          data: { isPremium: true },
        })
      )
    );

    console.log(`✅ ${userLeagues.length} ligas restauradas a premium`);

    return reply.send({
      success: true,
      restoredLeagues: userLeagues.length,
    });
  } catch (error) {
    console.error('❌ Error restaurando compra:', error);
    return reply.code(500).send({
      success: false,
      message: 'Error restaurando la compra',
    });
  }
}
