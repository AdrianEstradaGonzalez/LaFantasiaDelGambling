import Stripe from 'stripe';

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export const PaymentService = {
  /**
   * Crear una sesión de pago de Stripe para liga premium
   * @param userId - ID del usuario
   * @param leagueName - Nombre de la liga premium
   * @param division - División de la liga (primera, segunda, premier)
   * @returns URL de pago de Stripe
   */
  createPremiumLeagueCheckout: async (userId: string, leagueName: string, division?: 'primera' | 'segunda' | 'premier'): Promise<string> => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Liga Premium - DreamLeague',
                description: `Liga Premium: ${leagueName}`,
              },
              unit_amount: 990, // 9.90 EUR (en centavos)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'https://lafantasiadelgambling-production.up.railway.app'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'https://lafantasiadelgambling-production.up.railway.app'}/payment/cancel`,
        metadata: {
          userId,
          leagueName,
          division: division || 'primera',
          type: 'premium_league',
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('❌ Error al crear sesión de pago:', error);
      throw new Error('No se pudo iniciar el proceso de pago');
    }
  },

  /**
   * Crear una sesión de pago para upgrade de liga a premium
   * @param userId - ID del usuario
   * @param leagueId - ID de la liga a actualizar
   * @param leagueName - Nombre de la liga
   * @returns URL de pago de Stripe
   */
  createUpgradeLeagueCheckout: async (userId: string, leagueId: string, leagueName: string): Promise<string> => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Upgrade a Liga Premium',
                description: `Actualizar "${leagueName}" a Premium`,
              },
              unit_amount: 990, // 9.90 EUR (en centavos)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'https://lafantasiadelgambling-production.up.railway.app'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'https://lafantasiadelgambling-production.up.railway.app'}/payment/cancel`,
        metadata: {
          userId,
          leagueId,
          leagueName,
          type: 'upgrade_league',
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('❌ Error al crear sesión de upgrade:', error);
      throw new Error('No se pudo iniciar el proceso de pago');
    }
  },

  /**
   * Verificar el estado de un pago
   * @param sessionId - ID de la sesión de Stripe
   */
  verifyPayment: async (sessionId: string) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        paid: session.payment_status === 'paid',
        userId: session.metadata?.userId,
        leagueName: session.metadata?.leagueName,
        leagueId: session.metadata?.leagueId,
        type: session.metadata?.type,
        amount: session.amount_total,
      };
    } catch (error) {
      console.error('❌ Error al verificar pago:', error);
      throw new Error('No se pudo verificar el pago');
    }
  },
};
