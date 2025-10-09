import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

export type Liga = {
  id: string;
  name: string;
  leaderId: string;
  createdAt: string;
};

export type CreateLeagueData = {
  name: string;
};

export type AddMemberData = {
  userId: string;
};

export class LigaService {
  // 🔑 Obtener token seguro
  private static async getAccessToken(): Promise<string | null> {
    return await EncryptedStorage.getItem('accessToken');
  }

  // ➕ Crear liga
  static async crearLiga(data: CreateLeagueData): Promise<Liga> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al crear liga');

      return json as Liga;
    } catch (error: any) {
      console.error('LigaService.crearLiga:', error);
      throw new Error(error?.message || 'No se pudo crear la liga');
    }
  }

  // ❌ Eliminar liga
  static async eliminarLiga(leagueId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Error al eliminar la liga');
      }
    } catch (error: any) {
      console.error('LigaService.eliminarLiga:', error);
      throw new Error(error?.message || 'No se pudo eliminar la liga');
    }
  }

  // 👥 Agregar miembro
  static async agregarMiembro(leagueId: string, data: AddMemberData) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al agregar miembro');

      return json;
    } catch (error: any) {
      console.error('LigaService.agregarMiembro:', error);
      throw new Error(error?.message || 'No se pudo agregar el miembro');
    }
  }

  // ❌ Quitar miembro
  static async quitarMiembro(leagueId: string, userId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Error al eliminar miembro');
      }
    } catch (error: any) {
      console.error('LigaService.quitarMiembro:', error);
      throw new Error(error?.message || 'No se pudo eliminar el miembro');
    }
  }

  // 👥 Listar miembros
  static async listarMiembros(leagueId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/members`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al listar miembros');

      return json;
    } catch (error: any) {
      console.error('LigaService.listarMiembros:', error);
      throw new Error(error?.message || 'No se pudieron cargar los miembros');
    }
  }

  // 📜 Obtener ligas del usuario autenticado
  static async obtenerLigasPorUsuario(userId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/me/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al obtener ligas');

      return json as Liga[];
    } catch (error: any) {
      console.error('LigaService.obtenerLigasPorUsuario:', error);
      throw new Error(error?.message || 'No se pudieron obtener las ligas');
    }
  }
}
