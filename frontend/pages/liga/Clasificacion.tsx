import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { ClasificacionStyles as styles } from '../../styles/ClasificacionStyles';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import LigaNavBar from '../navBar/LigaNavBar';
import LigaTopNavBar from '../navBar/LigaTopNavBar';
import EncryptedStorage from 'react-native-encrypted-storage';
import LoadingScreen from '../../components/LoadingScreen';

type UsuarioClasificacion = {
  id: string;
  nombre: string;
  puntos: number;
  posicion: number;
  presupuesto: number;
};

type ClasificacionRouteProps = RouteProp<{ params: { ligaId: string, ligaName: string } }, 'params'>;

export const Clasificacion = () => {
  const route = useRoute<ClasificacionRouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { ligaId } = route.params;
  const { ligaName } = route.params;

  const [jugadores, setJugadores] = useState<UsuarioClasificacion[]>([]);
  const [ligaNombre, setLigaNombre] = useState<string>(ligaName);
  const [codigoLiga, setCodigoLiga] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        setLoading(true);

        // Obtener userId del storage
        const userId = await EncryptedStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
        }

        const response = await LigaService.listarMiembros(ligaId);
        console.log('🔍 Clasificacion - Response completa:', JSON.stringify(response, null, 2));

        const dataOrdenada = response
          .sort((a: any, b: any) => b.points - a.points)
          .map((u: any, index: number) => ({
            id: u.user?.id || u.userId || `jugador-${index}`,
            nombre: u.user?.name || 'Jugador desconocido',
            puntos: u.points ?? 0,
            posicion: index + 1,
            presupuesto: u.initialBudget ?? 500, // Presupuesto inicial de la jornada
          }));

        setJugadores(dataOrdenada);
        setLigaNombre(ligaNombre);
        
        // Obtener código de liga del primer miembro (todos tienen la misma liga)
        if (response.length > 0 && response[0].league?.code) {
          console.log('✅ Código de liga encontrado:', response[0].league.code);
          setCodigoLiga(response[0].league.code);
        } else {
          console.warn('❌ No se encontró código de liga en la respuesta');
          console.log('Estructura del primer elemento:', response[0]);
        }
      } catch (err) {
        console.error('Error al obtener clasificación:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasificacion();
  }, [ligaId]);

  return (
    <>
      {loading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient
          colors={['#181818ff', '#181818ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          <LigaTopNavBar
            nombreLiga={ligaNombre}
            onInvitePress={() => navigation.navigate('InvitarAmigos', { 
              ligaNombre: ligaNombre, 
              codigo: codigoLiga,
              ligaId: ligaId
            })}
          />
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{'LIGA BETTASY ' + ligaNombre}</Text>
          </View>

          {/* Contenido */}
          {jugadores.length > 0 ? (
            <ScrollView
              style={styles.container}
              contentContainerStyle={{ paddingBottom: 140 }}
            >
          {jugadores.map((jugador) => {
            const isCurrentUser = jugador.id === currentUserId;
            const posBadgeExtra = jugador.posicion === 1
              ? styles.posBadgeFirst
              : jugador.posicion === 2
              ? styles.posBadgeSecond
              : jugador.posicion === 3
              ? styles.posBadgeThird
              : undefined;
            
            return (
              <View 
                key={jugador.id} 
                style={[
                  styles.userBox,
                  isCurrentUser && {
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 6,
                    transform: [{ scale: 1.02 }]
                  }
                ]}
              >
                {/* Badge "TÚ" para el usuario actual */}
                {isCurrentUser && (
                  <View style={{
                    position: 'absolute',
                    top: -8,
                    right: 12,
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 12,
                    paddingVertical: 3,
                    borderRadius: 12,
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    elevation: 5,
                    borderWidth: 2,
                    borderColor: '#60a5fa'
                  }}>
                    <Text style={{ 
                      color: '#fff', 
                      fontSize: 10, 
                      fontWeight: '900',
                      letterSpacing: 1
                    }}>
                      TÚ
                    </Text>
                  </View>
                )}
                
                <View style={styles.userRow}>
                  <View style={[
                    styles.posBadge, 
                    posBadgeExtra,
                    isCurrentUser && {
                      backgroundColor: '#3b82f6',
                      borderWidth: 2,
                      borderColor: '#60a5fa',
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 4,
                      elevation: 4
                    }
                  ]}>
                    <Text style={styles.positionText}>{jugador.posicion}</Text>
                  </View>
                  <Text style={[
                    styles.nameText,
                    isCurrentUser && {
                      color: '#60a5fa',
                      fontWeight: '700',
                      textShadowColor: 'rgba(59, 130, 246, 0.3)',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8
                    }
                  ]} numberOfLines={1}>
                    {jugador.nombre}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Presupuesto inicial de jornada */}
                    <View style={{
                      backgroundColor: '#0f172a',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      borderWidth: 1,
                      borderColor: isCurrentUser ? '#3b82f6' : '#10b981',
                      shadowColor: isCurrentUser ? '#3b82f6' : '#10b981',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 3
                    }}>
                      {/* Icono de moneda */}
                      <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isCurrentUser ? '#3b82f6' : '#10b981',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: isCurrentUser ? '#3b82f6' : '#10b981',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 3,
                        elevation: 2
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>$</Text>
                      </View>
                      <Text style={{ 
                        color: isCurrentUser ? '#60a5fa' : '#10b981', 
                        fontSize: 13, 
                        fontWeight: '700', 
                        letterSpacing: 0.5 
                      }}>
                        {jugador.presupuesto}M
                      </Text>
                    </View>
                    {/* Puntos */}
                    <View style={[
                      styles.pointsChip,
                      isCurrentUser && {
                        borderWidth: 1,
                        borderColor: '#3b82f6',
                        shadowColor: '#3b82f6',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3
                      }
                    ]}>
                      <Text style={[
                        styles.pointsText,
                        isCurrentUser && {
                          color: '#60a5fa',
                          fontWeight: '700'
                        }
                      ]}>
                        {jugador.puntos} pts
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#ccc', fontSize: 16 }}>
            No hay jugadores en esta liga.
          </Text>
        </View>
      )}

          {/* Barra inferior */}
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
        </LinearGradient>
      )}
    </>
  );
};

export default Clasificacion;
