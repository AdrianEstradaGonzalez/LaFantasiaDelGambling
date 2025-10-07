// services/LoginService.ts
import EncryptedStorage from 'react-native-encrypted-storage';

const BASE_URL = 'http://localhost:3000';

export type LoginData = {
  email: string;
  password: string;
};

export class LoginService {
  static async login(data: LoginData) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) throw new Error('Credenciales inválidas');
        throw new Error(json?.error || 'Error de servidor');
      }

      const { accessToken, refreshToken } = json;

      // Guardamos tokens en almacenamiento seguro
      await EncryptedStorage.setItem('accessToken', accessToken);
      await EncryptedStorage.setItem('refreshToken', refreshToken);

      return { accessToken, refreshToken };
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudo iniciar sesión');
    }
  }
}
