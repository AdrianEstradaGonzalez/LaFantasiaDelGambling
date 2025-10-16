import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

export interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
}

export interface League {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  createdAt: string;
  _count?: {
    members: number;
  };
}

export class AdminService {
  private static async getAccessToken(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem('accessToken');
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  static async getAllUsers(): Promise<User[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/admin/users`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al obtener usuarios');

      return json;
    } catch (error: any) {
      console.error('AdminService.getAllUsers:', error);
      throw new Error(error?.message || 'No se pudieron cargar los usuarios');
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al eliminar usuario');
    } catch (error: any) {
      console.error('AdminService.deleteUser:', error);
      throw new Error(error?.message || 'No se pudo eliminar el usuario');
    }
  }

  // ==================== GESTIÓN DE LIGAS ====================

  static async getAllLeagues(): Promise<League[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/admin/leagues`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al obtener ligas');

      return json;
    } catch (error: any) {
      console.error('AdminService.getAllLeagues:', error);
      throw new Error(error?.message || 'No se pudieron cargar las ligas');
    }
  }

  static async deleteLeague(leagueId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/admin/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al eliminar liga');
    } catch (error: any) {
      console.error('AdminService.deleteLeague:', error);
      throw new Error(error?.message || 'No se pudo eliminar la liga');
    }
  }
}
