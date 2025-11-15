import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DailyOffersService {
  /**
   * Obtener las ofertas del día
   */
  static async getTodayOffers(division?: 'primera' | 'segunda' | 'premier') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { date: today };
    if (division) {
      where.division = division;
    }

    const offers = await prisma.dailyOffer.findMany({
      where,
      orderBy: { playerName: 'asc' }
    });

    return offers;
  }

  /**
   * Verificar si un jugador está en oferta hoy
   */
  static async isPlayerOnOffer(playerId: number): Promise<{ isOnOffer: boolean; offerPrice?: number; discount?: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const offer = await prisma.dailyOffer.findUnique({
      where: {
        date_playerId: {
          date: today,
          playerId: playerId
        }
      }
    });

    if (offer) {
      return {
        isOnOffer: true,
        offerPrice: offer.offerPrice,
        discount: offer.discount
      };
    }

    return { isOnOffer: false };
  }

  /**
   * Obtener el precio efectivo de un jugador (con oferta si aplica)
   */
  static async getEffectivePrice(playerId: number, division: 'primera' | 'segunda' | 'premier'): Promise<number> {
    const offerInfo = await this.isPlayerOnOffer(playerId);
    
    if (offerInfo.isOnOffer && offerInfo.offerPrice) {
      return offerInfo.offerPrice;
    }

    // Obtener precio normal del jugador según división
    let player;
    if (division === 'primera') {
      player = await prisma.player.findUnique({ where: { id: playerId } });
    } else if (division === 'segunda') {
      player = await prisma.playerSegunda.findUnique({ where: { id: playerId } });
    } else {
      player = await prisma.playerPremier.findUnique({ where: { id: playerId } });
    }

    return player?.price || 0;
  }

  /**
   * Limpiar ofertas antiguas (más de 7 días)
   */
  static async cleanOldOffers() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.dailyOffer.deleteMany({
      where: {
        date: { lt: sevenDaysAgo }
      }
    });

    console.log(`🗑️  Eliminadas ${result.count} ofertas antiguas`);
    return result.count;
  }
}
