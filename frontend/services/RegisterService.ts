// services/RegisterService.ts
import EncryptedStorage from 'react-native-encrypted-storage';

const BASE_URL = 'http://localhost:3000';

export type RegisterData = {
  username: string;
  email: string;
  password: string;
  repeatPassword: string;
};

export class RegisterService {
  static async register(data: RegisterData) {
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || 'Error de servidor');
      }

      const { accessToken, refreshToken } = json;

      // Guardamos tokens en almacenamiento seguro
      await EncryptedStorage.setItem('accessToken', accessToken);
      await EncryptedStorage.setItem('refreshToken', refreshToken);

      return { accessToken, refreshToken };
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudo registrar');
    }
  }
}
