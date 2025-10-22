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
  pricePaid: number;
  isCaptain: boolean;
  createdAt: string;
}

export interface SaveSquadRequest {
  formation: string;
  captainPosition?: string; // Posición del capitán
  players: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
    pricePaid?: number;
  }[];
}

export interface AddPlayerRequest {
  position: string;
  playerId: number;
  playerName: string;
  role: string;
  pricePaid: number;
  currentFormation?: string; // Formación actual que puede no estar guardada
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

  // Obtener plantilla de otro usuario (solo lectura)
  static async getSquadByUser(ligaId: string, userId: string): Promise<Squad | null> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al obtener la plantilla del usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getSquadByUser:', error);
      throw error;
    }
  }

  // Guardar o actualizar plantilla (método unificado)
  static async saveSquad(ligaId: string, squadData: SaveSquadRequest): Promise<{ squad: Squad; budget?: number; refundedAmount?: number }> {
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

  // Obtener presupuesto del usuario
  static async getUserBudget(ligaId: string): Promise<number> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/budget`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al obtener el presupuesto');
      }

      const data = await response.json();
      return data.budget;
    } catch (error) {
      console.error('Error en getUserBudget:', error);
      throw error;
    }
  }

  // Añadir jugador a la plantilla
  static async addPlayerToSquad(ligaId: string, playerData: AddPlayerRequest): Promise<{ success: boolean; player?: SquadPlayer; budget?: number; message?: string }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/players`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al añadir el jugador');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en addPlayerToSquad:', error);
      throw error;
    }
  }

  // Eliminar jugador de la plantilla
  static async removePlayerFromSquad(ligaId: string, position: string): Promise<{ success: boolean; refundedAmount: number; budget: number }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/players/${position}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar el jugador');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en removePlayerFromSquad:', error);
      throw error;
    }
  }

  // Establecer capitán de la plantilla
  static async setCaptain(ligaId: string, position: string): Promise<{ success: boolean; squad: Squad }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/squads/${ligaId}/captain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al establecer el capitán');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en setCaptain:', error);
      throw error;
    }
  }
}