import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Animated } from 'react-native';
import { ClasificacionStyles as styles } from '../../styles/ClasificacionStyles';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import { JornadaService } from '../../services/JornadaService';
import LigaNavBar from '../navBar/LigaNavBar';
import LigaTopNavBar from '../navBar/LigaTopNavBar';
import EncryptedStorage from 'react-native-encrypted-storage';
import LoadingScreen from '../../components/LoadingScreen';
import FootballService from '../../services/FutbolService';
import { DrawerMenu } from '../../components/DrawerMenu';
import { CustomAlertManager } from '../../components/CustomAlert';



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
  const [selectedJornada, setSelectedJornada] = useState<number | 'Total'>('Total');
  const [availableJornadas, setAvailableJornadas] = useState<number[]>([]);
  const [showJornadaPicker, setShowJornadaPicker] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed'>('open');
  const [refreshKey, setRefreshKey] = useState(0);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const isFirstLoad = useRef(true);

  // Resetear y forzar recarga cuando la pantalla recibe focus (al navegar desde Home u otra pantalla)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Clasificacion] Pantalla recibió focus, forzando recarga');
      isFirstLoad.current = true;
      setRefreshKey(prev => prev + 1); // Forzar re-render del useEffect
      return () => {
        // Cleanup si es necesario
      };
    }, [])
  );

  // Animar drawer
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen, slideAnim]);

  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        setLoading(true);

        // Obtener userId del storage
        const userId = await EncryptedStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
        }

        // Obtener jornadas disponibles
        const matchdays = await FootballService.getAvailableMatchdays();
        setAvailableJornadas(matchdays);
        
        // ✨ NUEVO: Determinar jornada por defecto según el estado de la liga (solo en primera carga)
        let jornadaToUse: number | 'Total' = selectedJornada;
        
        if (isFirstLoad.current) {
          try {
            const status = await JornadaService.getJornadaStatus(ligaId);
            const leagueJornada = status.currentJornada;
            const leagueStatus = status.status as 'open' | 'closed';
            
            console.log('[Clasificacion] Jornada de la liga:', leagueJornada, 'Estado:', leagueStatus);
            
            // Si la jornada está cerrada (partidos en curso), mostrar la jornada actual en tiempo real
            // Si está abierta (se pueden hacer cambios), mostrar Total por defecto
            if (leagueStatus === 'closed' && leagueJornada && matchdays.includes(leagueJornada)) {
              jornadaToUse = leagueJornada;
              setSelectedJornada(leagueJornada);
            } else if (leagueStatus === 'open') {
              jornadaToUse = 'Total';
              setSelectedJornada('Total');
            }
          } catch (error) {
            console.log('No se pudo obtener la jornada de la liga, usando Total');
            jornadaToUse = 'Total';
            setSelectedJornada('Total');
          }
          isFirstLoad.current = false;
        }

        // ✨ NUEVO: Llamar al servicio con filtro de jornada determinada
        console.log('[Clasificacion] Cargando clasificación para jornada:', jornadaToUse);
        const response = await LigaService.listarMiembros(ligaId, jornadaToUse);
        console.log('🔍 Clasificacion - Response completa:', JSON.stringify(response, null, 2));

        const dataOrdenada = response
          .sort((a: any, b: any) => b.points - a.points)
          .map((u: any, index: number) => ({
            id: u.user?.id || u.userId || `jugador-${index}`,
            nombre: u.user?.name || 'Jugador desconocido',
            puntos: u.points ?? 0,
            posicion: index + 1,
            presupuesto: u.initialBudget ?? 500,
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
  }, [ligaId, selectedJornada, jornadaStatus, refreshKey]); // ✨ refreshKey fuerza recarga al recibir focus

  // Cargar estado de la jornada y refrescar cuando cambie
  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        if (ligaId) {
          const status = await JornadaService.getJornadaStatus(ligaId);
          const newStatus = status.status as 'open' | 'closed';
          
          if (mounted && newStatus !== jornadaStatus) {
            console.log(`[Clasificacion] Estado cambió de ${jornadaStatus} a ${newStatus}, refrescando datos`);
            setJornadaStatus(newStatus);
            
            // Si cambió a 'open', forzar recarga para mostrar initialBudget actualizado
            if (newStatus === 'open') {
              setRefreshKey(prev => prev + 1);
            }
          } else if (mounted) {
            setJornadaStatus(newStatus);
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener estado de jornada:', e);
      }
    };
    
    checkStatus();
    
    // Verificar cambios de estado cada 10 segundos
    interval = setInterval(checkStatus, 10000);
    
    return () => { 
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [ligaId, jornadaStatus]);

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
            onMenuPress={() => setIsDrawerOpen(true)}
          />
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{'LIGA BETTASY ' + ligaNombre}</Text>
          </View>

          {/* Selector de Jornada */}
          <View style={{ 
            backgroundColor: '#181818ff', 
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1, 
            borderBottomColor: '#334155' 
          }}>
            <TouchableOpacity
              onPress={() => setShowJornadaPicker(!showJornadaPicker)}
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#334155'
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {selectedJornada === 'Total' ? 'TOTAL' : `JORNADA ${selectedJornada}`}
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '900' }}>
                {showJornadaPicker ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showJornadaPicker && (
              <View style={{
                backgroundColor: '#1e293b',
                borderRadius: 12,
                marginTop: 8,
                maxHeight: 300,
                borderWidth: 2,
                borderColor: '#334155'
              }}>
                <ScrollView>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedJornada('Total');
                      setShowJornadaPicker(false);
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: selectedJornada === 'Total' ? '#0892D020' : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: '#334155'
                    }}
                  >
                    <Text style={{ 
                      color: selectedJornada === 'Total' ? '#0892D0' : '#fff', 
                      fontSize: 15, 
                      fontWeight: selectedJornada === 'Total' ? '800' : '600' 
                    }}>
                      TOTAL
                    </Text>
                  </TouchableOpacity>

                  {[...availableJornadas].sort((a, b) => b - a).map((jornada) => (
                    <TouchableOpacity
                      key={jornada}
                      onPress={() => {
                        setSelectedJornada(jornada);
                        setShowJornadaPicker(false);
                      }}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        backgroundColor: selectedJornada === jornada ? '#0892D020' : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: '#334155'
                      }}
                    >
                      <Text style={{ 
                        color: selectedJornada === jornada ? '#0892D0' : '#fff', 
                        fontSize: 15, 
                        fontWeight: selectedJornada === jornada ? '800' : '600' 
                      }}>
                        JORNADA {jornada}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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
            
            const handleOpenUserLineup = () => {
              // Si es el usuario actual, ir a "Mi Plantilla"
              if (isCurrentUser) {
                navigation.navigate('Equipo', {
                  ligaId,
                  ligaName,
                } as any);
                return;
              }
              
              // Solo permitir ver plantillas de otros usuarios cuando la jornada está cerrada
              if (jornadaStatus === 'open') {
                CustomAlertManager.alert(
                  'Jornada abierta',
                  'No puedes ver las plantillas de otros jugadores mientras la jornada está abierta.',
                  [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
                  { icon: 'lock-closed', iconColor: '#f59e0b' }
                );
                return;
              }
              
              // Navegar a ver la plantilla de este usuario
              navigation.navigate('VerPlantillaUsuario', {
                ligaId,
                ligaName,
                userId: jugador.id,
                userName: jugador.nombre,
                jornada: selectedJornada === 'Total' ? undefined : selectedJornada,
              } as any);
            };

            return (
              <TouchableOpacity 
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
                activeOpacity={0.85}
                onPress={handleOpenUserLineup}
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
              </TouchableOpacity>
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

          {/* Drawer Modal */}
          <Modal
            visible={isDrawerOpen}
            animationType="none"
            transparent={true}
            onRequestClose={() => setIsDrawerOpen(false)}
          >
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Animated.View 
                style={{ 
                  width: '75%', 
                  maxWidth: 300,
                  transform: [{ translateX: slideAnim }]
                }}
              >
                <DrawerMenu 
                  navigation={{
                    ...navigation,
                    closeDrawer: () => setIsDrawerOpen(false),
                    reset: (state: any) => {
                      navigation.reset(state);
                      setIsDrawerOpen(false);
                    },
                  }} 
                />
              </Animated.View>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                activeOpacity={1}
                onPress={() => setIsDrawerOpen(false)}
              />
            </View>
          </Modal>
        </LinearGradient>
      )}
    </>
  );
};

export default Clasificacion;
