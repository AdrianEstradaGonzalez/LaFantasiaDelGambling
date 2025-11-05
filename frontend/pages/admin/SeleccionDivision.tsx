import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeftIcon, ChevronRightIcon, TrophyIcon, JerseyIcon } from '../../components/VectorIcons';
import { SafeLayout } from '../../components/SafeLayout';

export const SeleccionDivision = ({ navigation }: { navigation: NativeStackNavigationProp<any> }) => {
  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={{ flex: 1 }}>
      <SafeLayout>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#334155',
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#1e293b',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <ChevronLeftIcon size={24} color="#0ea5e9" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>
                Gestión de Jugadores
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
                Selecciona la división a gestionar
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 20 }}>
            {/* Primera División */}
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('GestionJugadores', { division: 'primera' })}
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#0892D0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 28, 
                  backgroundColor: '#0892D0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16
                }}>
                  <TrophyIcon size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '900',
                  }}>
                    Primera División
                  </Text>
                  <Text style={{
                    color: '#0892D0',
                    fontSize: 14,
                    fontWeight: '700',
                    marginTop: 2
                  }}>
                    LA LIGA EA SPORTS
                  </Text>
                </View>
                <ChevronRightIcon size={28} color="#0892D0" />
              </View>

              <Text style={{
                color: '#cbd5e1',
                fontSize: 15,
                lineHeight: 22,
              }}>
                Gestiona precios, posiciones y equipos de todos los jugadores de La Liga de Primera División.
              </Text>
            </TouchableOpacity>

            {/* Segunda División */}
            {/* Premier (nueva) */}
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('GestionJugadores', { division: 'premier' })}
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#8b5cf6',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 28, 
                  backgroundColor: '#8b5cf6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16
                }}>
                  <TrophyIcon size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '900',
                  }}>
                    Premier
                  </Text>
                  <Text style={{
                    color: '#8b5cf6',
                    fontSize: 14,
                    fontWeight: '700',
                    marginTop: 2
                  }}>
                    PREMIER LEAGUE
                  </Text>
                </View>
                <ChevronRightIcon size={28} color="#8b5cf6" />
              </View>

              <Text style={{
                color: '#cbd5e1',
                fontSize: 15,
                lineHeight: 22,
              }}>
                Gestiona precios, posiciones y equipos de todos los jugadores de la Premier.
              </Text>
            </TouchableOpacity>

            {/* Segunda División */}
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('GestionJugadores', { division: 'segunda' })}
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 16,
                padding: 24,
                borderWidth: 2,
                borderColor: '#f59e0b',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 28, 
                  backgroundColor: '#f59e0b',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16
                }}>
                  <JerseyIcon size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '900',
                  }}>
                    Segunda División
                  </Text>
                  <Text style={{
                    color: '#f59e0b',
                    fontSize: 14,
                    fontWeight: '700',
                    marginTop: 2
                  }}>
                    LALIGA HYPERMOTION
                  </Text>
                </View>
                <ChevronRightIcon size={28} color="#f59e0b" />
              </View>

              <Text style={{
                color: '#cbd5e1',
                fontSize: 15,
                lineHeight: 22,
              }}>
                Gestiona precios, posiciones y equipos de todos los jugadores de Segunda División.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeLayout>
    </LinearGradient>
  );
};
