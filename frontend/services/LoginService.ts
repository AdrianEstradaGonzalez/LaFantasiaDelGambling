// src/services/LoginService.ts
import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// 👇 Polyfill necesario para decodificar JWT en React Native
import { Buffer } from 'buffer';
(global as any).Buffer = (global as any).Buffer || Buffer;

export type LoginData = { email: string; password: string };

function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

export class LoginService {
  static async login(
    data: LoginData
  ): Promise<{ accessToken: string; refreshToken?: string; userId?: string; payload?: any }> {
    const res = await fetchWithTimeout(`${ApiConfig.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 15000);

    let json: any = {};
    try { json = await res.json(); } catch {}

    if (!res.ok) {
      // Manejo específico de errores según el código de estado
      if (res.status === 401) {
        throw new Error(json?.message || json?.error || 'Correo o contraseña incorrectos');
      }
      if (res.status === 404) {
        throw new Error('Usuario no registrado. Por favor, regístrate primero.');
      }
      if (res.status === 400) {
        throw new Error(json?.message || json?.error || 'Datos inválidos');
      }
      if (res.status === 500) {
        throw new Error('Error en el servidor. Inténtalo más tarde.');
      }
      throw new Error(json?.message || json?.error || 'Error al iniciar sesión');
    }

    const { accessToken, refreshToken, user } = json ?? {};
    if (!accessToken) throw new Error('Respuesta inválida: falta accessToken');

    // userId desde backend o, si no, desde el JWT (id/sub)
    const payload = decodeJwt(accessToken);
    const userId = user?.id ?? json?.userId ?? payload?.id ?? payload?.sub;
    const isAdmin = user?.isAdmin ?? payload?.isAdmin ?? false;

    // Guardar de forma robusta
    await EncryptedStorage.setItem('accessToken', String(accessToken));
    if (refreshToken) await EncryptedStorage.setItem('refreshToken', String(refreshToken));
    if (userId) await EncryptedStorage.setItem('userId', String(userId));
    await EncryptedStorage.setItem('isAdmin', String(isAdmin));
    
    // Guardar sesión completa con información del usuario
    if (user) {
      await EncryptedStorage.setItem('session', JSON.stringify({ user }));
    }

    return { accessToken, refreshToken, userId, payload };
  }

  // Helpers que te simplifican la vida en el resto de servicios
  static async getAccessToken(): Promise<string | null> {
    return EncryptedStorage.getItem('accessToken');
  }
  static async getUserId(): Promise<string | null> {
    // si no está guardado, intenta derivarlo del token y lo persiste
    let uid = await EncryptedStorage.getItem('userId');
    if (!uid) {
      const token = await EncryptedStorage.getItem('accessToken');
      if (token) {
        const p: any = decodeJwt(token);
        uid = p?.id ?? p?.sub ?? null;
        if (uid) await EncryptedStorage.setItem('userId', String(uid));
      }
    }
    return uid;
  }
  static async isAdmin(): Promise<boolean> {
    const isAdmin = await EncryptedStorage.getItem('isAdmin');
    return isAdmin === 'true';
  }
  static async logout(): Promise<void> {
    await EncryptedStorage.removeItem('accessToken');
    await EncryptedStorage.removeItem('refreshToken');
    await EncryptedStorage.removeItem('userId');
    await EncryptedStorage.removeItem('session');
    await EncryptedStorage.removeItem('isAdmin');
  }
}
