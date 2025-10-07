
// Detecta la URL base dependiendo del entorno
// En Android Emulator, 'localhost' no funciona → usar 10.0.2.2
const BASE_LOCAL = 'http://10.0.2.2:3000'

// Cambia esto según el entorno de ejecución
// En producción podrías usar variables de entorno o un archivo .env
export const ApiConfig = {
  BASE_URL: BASE_LOCAL,
};
