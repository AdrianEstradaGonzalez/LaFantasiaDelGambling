import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../services/payment.service.js';

interface CreateCheckoutBody {
  leagueName: string;
  division: 'primera' | 'segunda';
}

interface VerifyPaymentQuery {
  session_id: string;
}

export const PaymentController = {
  /**
   * POST /payment/create-checkout
   * Crear sesión de pago de Stripe para liga premium
   */
  createCheckout: async (
    request: FastifyRequest<{ Body: CreateCheckoutBody }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = request.user?.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Usuario no autenticado' });
      }

      const { leagueName } = request.body;

      if (!leagueName || leagueName.trim().length < 3) {
        return reply.status(400).send({ 
          error: 'El nombre de la liga debe tener al menos 3 caracteres' 
        });
      }

      const checkoutUrl = await PaymentService.createPremiumLeagueCheckout(userId, leagueName);

      return reply.status(200).send({ 
        checkoutUrl,
        message: 'Sesión de pago creada exitosamente' 
      });
    } catch (error: any) {
      console.error('❌ Error en createCheckout:', error);
      return reply.status(500).send({ 
        error: error.message || 'Error al crear sesión de pago' 
      });
    }
  },

  /**
   * GET /payment/verify
   * Verificar el estado de un pago
   */
  verifyPayment: async (
    request: FastifyRequest<{ Querystring: VerifyPaymentQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.query;

      if (!session_id) {
        return reply.status(400).send({ error: 'session_id es requerido' });
      }

      const paymentInfo = await PaymentService.verifyPayment(session_id);

      return reply.status(200).send(paymentInfo);
    } catch (error: any) {
      console.error('❌ Error en verifyPayment:', error);
      return reply.status(500).send({ 
        error: error.message || 'Error al verificar pago' 
      });
    }
  },
};
