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
import { SafeLayout, useSafePadding } from '../../components/SafeLayout';
import { AdBanner } from '../../components/AdBanner';



type UsuarioClasificacion = {
  id: string;
  nombre: string;
  puntos: number;
  posicion: number;
  presupuesto: number;
};

type ClasificacionRouteProps = RouteProp<{ params: { ligaId: string, ligaName: string, division?: string, isPremium?: boolean } }, 'params'>;

export const Clasificacion = () => {
  const route = useRoute<ClasificacionRouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { ligaId } = route.params;
  const { ligaName } = route.params;
  const division = route.params?.division || 'primera';
  const isPremium = route.params?.isPremium || false;
  const safePadding = useSafePadding();

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
  
  // Cache de clasificaciones: { Total: [...], 1: [...], 2: [...], ... }
  const [classificationsCache, setClassificationsCache] = useState<any>(null);

  // Resetear y forzar recarga cuando la pantalla recibe focus (al navegar desde Home u otra pantalla)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Clasificacion] Pantalla recibió focus, forzando recarga');
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

  // Cargar clasificaciones iniciales (solo una vez al entrar o al forzar refresh)
  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        setLoading(true);

        // Obtener userId del storage
        const userId = await EncryptedStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
        }

        // Obtener estado de la jornada PRIMERO
        const status = await JornadaService.getJornadaStatus(ligaId);
        const leagueStatus = status.status as 'open' | 'closed';
        const leagueJornada = status.currentJornada;
        setJornadaStatus(leagueStatus);

        // ✅ Los puntos en tiempo real se actualizan automáticamente por el worker centralizado
        // No es necesario hacer cálculos aquí, solo leemos LeagueMember.points

        // Obtener jornadas disponibles según la división
        const matchdays = await FootballService.getAvailableMatchdays(division as 'primera' | 'segunda');
        setAvailableJornadas(matchdays);
        
        // Cargar TODAS las clasificaciones de una vez
        console.log('[Clasificacion] Cargando TODAS las clasificaciones en caché...');
        const response = await LigaService.getAllClassifications(ligaId);
        
        console.log('📦 Clasificaciones cargadas:', Object.keys(response.classifications));
        setClassificationsCache(response.classifications);
        setCodigoLiga(response.leagueCode);
        setLigaNombre(response.leagueName);
        
        // Determinar jornada por defecto según el estado de la liga
        let initialJornada: number | 'Total' = 'Total';
        
        console.log('[Clasificacion] Jornada de la liga:', leagueJornada, 'Estado:', leagueStatus);
        
        // Si la jornada está cerrada (partidos en curso), mostrar la jornada actual
        // Si está abierta (se pueden hacer cambios), mostrar Total por defecto
        if (leagueStatus === 'closed' && leagueJornada && matchdays.includes(leagueJornada)) {
          initialJornada = leagueJornada;
          console.log('[Clasificacion] 📍 Mostrando jornada actual:', leagueJornada);
        } else {
          console.log('[Clasificacion] 📍 Mostrando Total');
        }
        
        // Establecer la jornada seleccionada
        setSelectedJornada(initialJornada);
        
        // Usar los datos recién cargados para mostrar
        const jornadaKey = initialJornada === 'Total' ? 'Total' : initialJornada.toString();
        const dataForJornada = response.classifications[jornadaKey] || [];
        
        const dataOrdenada = dataForJornada.map((u: any, index: number) => ({
          id: u.userId || `jugador-${index}`,
          nombre: u.userName || 'Jugador desconocido',
          puntos: u.points ?? 0,
          posicion: index + 1,
          presupuesto: u.initialBudget ?? 500,
        }));
        
        setJugadores(dataOrdenada);
        setLoading(false);
      } catch (err) {
        console.error('Error al obtener clasificación:', err);
        setLoading(false);
      }
    };

    fetchClasificacion();
  }, [ligaId, refreshKey]); // Solo depende de ligaId y refreshKey

  // Cambiar entre jornadas usando el cache (sin recargar todo)
  useEffect(() => {
    if (!classificationsCache) return; // Esperar a que haya cache
    
    console.log('[Clasificacion] 🔄 Cambiando a jornada:', selectedJornada);
    
    const jornadaKey = selectedJornada === 'Total' ? 'Total' : selectedJornada.toString();
    const dataForJornada = classificationsCache[jornadaKey] || [];
    
    const dataOrdenada = dataForJornada.map((u: any, index: number) => ({
      id: u.userId || `jugador-${index}`,
      nombre: u.userName || 'Jugador desconocido',
      puntos: u.points ?? 0,
      posicion: index + 1,
      presupuesto: u.initialBudget ?? 500,
    }));
    
    setJugadores(dataOrdenada);
  }, [selectedJornada, classificationsCache]); // Solo cuando cambia la jornada seleccionada manualmente

  return (
    <SafeLayout backgroundColor="#181818ff">
      {loading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient
          colors={['#181818ff', '#181818ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          {/* Top Nav Bar */}
          <LigaTopNavBar
            nombreLiga={ligaNombre}
            onInvitePress={() => navigation.navigate('InvitarAmigos', { 
              ligaNombre: ligaNombre, 
              codigo: codigoLiga,
              ligaId: ligaId
            })}
            onMenuPress={() => setIsDrawerOpen(true)}
          />
          
          {/* Espaciador para que el contenido no quede debajo de la navbar fija */}
          <View  />
          
          {/* Selector de Jornada */}
          <View style={{ 
            backgroundColor: '#181818ff', 
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1, 
            borderBottomColor: '#334155',
            zIndex: showJornadaPicker ? 999 : 5
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
                borderColor: '#334155',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 10,
                zIndex: 999
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
              contentContainerStyle={{ paddingBottom: 200 }}
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

      {/* Banner publicitario - Posición absoluta encima de la barra inferior */}
      <View style={{ 
        position: 'absolute',
        bottom: 70, // Justo encima de la barra de navegación (altura típica ~70px)
        left: 0,
        right: 0,
        zIndex: 999,
        elevation: 10, // Para Android
      }}>
        <AdBanner />
      </View>

      {/* Barra inferior */}
      <LigaNavBar ligaId={ligaId} ligaName={ligaName} division={division} isPremium={isPremium} />

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
                  ligaId={ligaId}
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
    </SafeLayout>
  );
};

export default Clasificacion;
