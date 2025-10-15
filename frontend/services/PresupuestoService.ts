import EncryptedStorage from 'react-native-encrypted-storage';

export type ApuestaUsuario = {
  id: string;
  userId: string;
  matchId: number;
  jornada: number;
  type: string;
  label: string;
  odd: number;
  cantidadApostada: number;
  fecha: string;
};

export type ResultadoApuesta = {
  apuestaId: string;
  cumplida: boolean;
  ganancia: number; // positivo si gana, negativo si pierde
  cantidadApostada: number;
  odd: number;
};

export class PresupuestoService {
  private static readonly PRESUPUESTO_KEY = 'user_presupuesto';
  private static readonly APUESTAS_KEY = 'user_apuestas';
  private static readonly HISTORIAL_KEY = 'historial_apuestas';

  // Obtener presupuesto actual del usuario
  static async getPresupuesto(userId: string): Promise<number> {
    try {
      const raw = await EncryptedStorage.getItem(`${this.PRESUPUESTO_KEY}_${userId}`);
      return raw ? parseFloat(raw) : 100000; // Presupuesto inicial por defecto
    } catch {
      return 100000;
    }
  }

  // Actualizar presupuesto
  static async setPresupuesto(userId: string, cantidad: number): Promise<void> {
    try {
      await EncryptedStorage.setItem(`${this.PRESUPUESTO_KEY}_${userId}`, cantidad.toString());
    } catch (error) {
      console.error('Error guardando presupuesto:', error);
    }
  }

  // Guardar apuesta de usuario
  static async guardarApuesta(apuesta: ApuestaUsuario): Promise<void> {
    try {
      const existing = await this.getApuestasUsuario(apuesta.userId);
      existing.push(apuesta);
      await EncryptedStorage.setItem(
        `${this.APUESTAS_KEY}_${apuesta.userId}`,
        JSON.stringify(existing)
      );
    } catch (error) {
      console.error('Error guardando apuesta:', error);
    }
  }

  // Obtener apuestas activas del usuario
  static async getApuestasUsuario(userId: string): Promise<ApuestaUsuario[]> {
    try {
      const raw = await EncryptedStorage.getItem(`${this.APUESTAS_KEY}_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Obtener apuestas de una jornada específica
  static async getApuestasJornada(userId: string, jornada: number): Promise<ApuestaUsuario[]> {
    const todas = await this.getApuestasUsuario(userId);
    return todas.filter(a => a.jornada === jornada);
  }

  // Resolver apuestas de una jornada
  static async resolverApuestasJornada(
    userId: string,
    jornada: number,
    resultados: Map<string, boolean>
  ): Promise<{ totalGanado: number; totalPerdido: number; resultadosDetalle: ResultadoApuesta[] }> {
    try {
      const apuestasJornada = await this.getApuestasJornada(userId, jornada);
      const presupuestoActual = await this.getPresupuesto(userId);
      
      let totalGanado = 0;
      let totalPerdido = 0;
      const resultadosDetalle: ResultadoApuesta[] = [];

      for (const apuesta of apuestasJornada) {
        const key = `${apuesta.matchId}_${apuesta.type}_${apuesta.label}`;
        const cumplida = resultados.get(key) || false;
        
        let ganancia = 0;
        if (cumplida) {
          // Gana: cantidad apostada × cuota
          ganancia = apuesta.cantidadApostada * apuesta.odd;
          totalGanado += ganancia;
        } else {
          // Pierde: -cantidad apostada
          ganancia = -apuesta.cantidadApostada;
          totalPerdido += apuesta.cantidadApostada;
        }

        resultadosDetalle.push({
          apuestaId: apuesta.id,
          cumplida,
          ganancia,
          cantidadApostada: apuesta.cantidadApostada,
          odd: apuesta.odd,
        });
      }

      // Actualizar presupuesto
      const nuevoPresupuesto = presupuestoActual + totalGanado - totalPerdido;
      await this.setPresupuesto(userId, nuevoPresupuesto);

      // Guardar en historial
      await this.guardarHistorial(userId, jornada, resultadosDetalle, totalGanado, totalPerdido);

      // Limpiar apuestas resueltas
      await this.limpiarApuestasJornada(userId, jornada);

      return { totalGanado, totalPerdido, resultadosDetalle };
    } catch (error) {
      console.error('Error resolviendo apuestas:', error);
      return { totalGanado: 0, totalPerdido: 0, resultadosDetalle: [] };
    }
  }

  // Guardar en historial
  private static async guardarHistorial(
    userId: string,
    jornada: number,
    resultados: ResultadoApuesta[],
    totalGanado: number,
    totalPerdido: number
  ): Promise<void> {
    try {
      const historial = await this.getHistorial(userId);
      historial.push({
        jornada,
        fecha: new Date().toISOString(),
        resultados,
        totalGanado,
        totalPerdido,
        balance: totalGanado - totalPerdido,
      });
      await EncryptedStorage.setItem(
        `${this.HISTORIAL_KEY}_${userId}`,
        JSON.stringify(historial)
      );
    } catch (error) {
      console.error('Error guardando historial:', error);
    }
  }

  // Obtener historial de apuestas
  static async getHistorial(userId: string): Promise<any[]> {
    try {
      const raw = await EncryptedStorage.getItem(`${this.HISTORIAL_KEY}_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Limpiar apuestas de jornada resuelta
  private static async limpiarApuestasJornada(userId: string, jornada: number): Promise<void> {
    try {
      const todas = await this.getApuestasUsuario(userId);
      const restantes = todas.filter(a => a.jornada !== jornada);
      await EncryptedStorage.setItem(
        `${this.APUESTAS_KEY}_${userId}`,
        JSON.stringify(restantes)
      );
    } catch (error) {
      console.error('Error limpiando apuestas:', error);
    }
  }
}
