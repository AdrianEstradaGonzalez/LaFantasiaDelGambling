#!/usr/bin/env tsx
import axios from 'axios';

const API_BASE = 'https://lafantasiadelgambling.onrender.com';

async function testOffersEndpoint() {
  try {
    console.log('🧪 Probando endpoint de ofertas sin autenticación...');
    console.log(`📍 URL: ${API_BASE}/daily-offers?division=primera\n`);
    
    const response = await axios.get(`${API_BASE}/daily-offers?division=primera`, {
      validateStatus: () => true
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 401) {
      console.log('\n✅ Endpoint requiere autenticación (correcto)');
      console.log('💡 El endpoint está funcionando, solo necesita un token válido');
    } else if (response.status === 200) {
      console.log('\n✅ Endpoint funcionando sin autenticación');
      console.log(`📈 Ofertas encontradas: ${response.data.count || response.data.data?.length || 0}`);
    } else if (response.status === 404) {
      console.log('\n❌ Endpoint no encontrado - El backend en Render no está actualizado');
    } else if (response.status === 500) {
      console.log('\n❌ Error 500 - Problema en el servidor');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testOffersEndpoint();
