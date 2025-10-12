import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

export interface Squad {
  id: string;
  userId: string;
  leagueId: string;
  name: string;
  formation: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  players: SquadPlayer[];
}

export interface SquadPlayer {
  id: string;
  squadId: string;
  playerId: number;
  playerName: string;
  position: string;
  role: string;
}

export interface SaveSquadRequest {
  formation: string;
  players: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
  }[];
}

export class SquadService {
  
  // Obtener plantilla del usuario para una liga específica
  static async getUserSquad(ligaId: string): Promise<Squad | null> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null; // No existe plantilla para esta liga
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al obtener la plantilla');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getUserSquad:', error);
      throw error;
    }
  }

  // Guardar o actualizar plantilla (método unificado)
  static async saveSquad(ligaId: string, squadData: SaveSquadRequest): Promise<Squad> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(squadData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al guardar la plantilla');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en saveSquad:', error);
      throw error;
    }
  }

  // Eliminar plantilla
  static async deleteSquad(ligaId: string): Promise<{ success: boolean }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la plantilla');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en deleteSquad:', error);
      throw error;
    }
  }
}