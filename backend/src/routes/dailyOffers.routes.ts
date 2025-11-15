import { FastifyPluginAsync } from 'fastify';
import { DailyOffersService } from '../services/dailyOffers.service.js';

// JWT Auth
async function jwtAuth(req: any, reply: any) {
  await req.jwtVerify();
}

export const dailyOffersRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Obtener ofertas del día
   * GET /api/daily-offers?division=primera
   */
  app.get(
    '/daily-offers',
    { preHandler: jwtAuth },
    async (req, reply) => {
      try {
        const { division } = req.query as { division?: 'primera' | 'segunda' | 'premier' };
        
        const offers = await DailyOffersService.getTodayOffers(division);
        
        return reply.status(200).send({
          success: true,
          data: offers,
          count: offers.length
        });
      } catch (error: any) {
        console.error('Error obteniendo ofertas diarias:', error);
        return reply.status(500).send({
          success: false,
          message: error?.message || 'Error al obtener ofertas'
        });
      }
    }
  );

  /**
   * Verificar si un jugador está en oferta
   * GET /api/daily-offers/player/:playerId
   */
  app.get(
    '/daily-offers/player/:playerId',
    { preHandler: jwtAuth },
    async (req, reply) => {
      try {
        const { playerId } = req.params as { playerId: string };
        
        const offerInfo = await DailyOffersService.isPlayerOnOffer(Number(playerId));
        
        return reply.status(200).send({
          success: true,
          data: offerInfo
        });
      } catch (error: any) {
        console.error('Error verificando oferta de jugador:', error);
        return reply.status(500).send({
          success: false,
          message: error?.message || 'Error al verificar oferta'
        });
      }
    }
  );
};
