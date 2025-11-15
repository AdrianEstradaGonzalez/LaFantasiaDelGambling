#!/usr/bin/env tsx
/**
 * Script para probar el endpoint de ofertas localmente
 */

import axios from 'axios';

const API_BASE = 'https://lafantasiadelgambling.onrender.com';
// const API_BASE = 'http://localhost:3000';

async function testEndpoint() {
  try {
    console.log('🧪 Probando endpoint de ofertas...');
    console.log(`📍 URL: ${API_BASE}/daily-offers`);
    
    // Necesitas un token válido para probar
    // Este test solo verifica si el endpoint responde
    
    const response = await axios.get(`${API_BASE}/daily-offers`, {
      headers: {
        // Authorization: 'Bearer TU_TOKEN_AQUI'
      },
      validateStatus: () => true // No lanzar error en códigos de estado
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Response:`, response.data);
    
    if (response.status === 401) {
      console.log('⚠️  Necesita autenticación (normal sin token)');
    } else if (response.status === 500) {
      console.log('❌ Error 500 - El servidor tiene problemas');
      console.log('Posibles causas:');
      console.log('  1. Cliente de Prisma no regenerado en Render');
      console.log('  2. Migración no aplicada en base de datos de producción');
      console.log('  3. Código no actualizado en Render');
    } else if (response.status === 200) {
      console.log('✅ Endpoint funcionando correctamente');
      console.log(`📈 Ofertas encontradas: ${response.data.count || 0}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testEndpoint();
