import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Animated, FlatList, InteractionManager } from 'react-native';
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
  const [currentLeagueJornada, setCurrentLeagueJornada] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  
  // Cache de clasificaciones: { Total: [...], 1: [...], 2: [...], ... }
  const [classificationsCache, setClassificationsCache] = useState<any>(null);
  
  // Estados de paginación (para ligas grandes como DreamLeague)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [isLargeLeague, setIsLargeLeague] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Resetear y forzar recarga cuando la pantalla recibe focus (al navegar desde Home u otra pantalla)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Clasificacion] Pantalla recibió focus, forzando recarga');
      // Solo recargar si han pasado más de 30 segundos desde la última carga
      const now = Date.now();
      const lastLoad = classificationsCache?._loadedAt || 0;
      const RELOAD_THRESHOLD = 30000; // 30 segundos
      
      if (now - lastLoad > RELOAD_THRESHOLD) {
        setRefreshKey(prev => prev + 1);
      }
      return () => {
        // Cleanup si es necesario
      };
    }, [classificationsCache])
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
        setCurrentLeagueJornada(leagueJornada);

        // ✅ Los puntos en tiempo real se actualizan automáticamente por el worker centralizado
        // No es necesario hacer cálculos aquí, solo leemos LeagueMember.points

        // Obtener jornadas disponibles según la división
        const matchdays = await FootballService.getAvailableMatchdays(division as 'primera' | 'segunda' | 'premier');
        setAvailableJornadas(matchdays);
        
        // Determinar si es una liga grande (DreamLeague o más de 50 miembros)
        const isDreamLeague = ligaName === 'DreamLeague';
        
        // Si es liga grande, usar paginación
        if (isDreamLeague) {
          console.log('[Clasificacion] Liga grande detectada, usando paginación');
          setIsLargeLeague(true);
          
          // Determinar jornada inicial
          let initialJornada: number | 'Total' = 'Total';
          if (leagueStatus === 'closed' && leagueJornada && matchdays.includes(leagueJornada)) {
            initialJornada = leagueJornada;
          }
          setSelectedJornada(initialJornada);
          
          // Cargar primera página con paginación
          await loadPaginatedPage(1, initialJornada);
          
          // Cargar posición del usuario
          try {
            const positionData = await LigaService.getUserPosition(ligaId, initialJornada);
            setUserPosition(positionData.position);
          } catch (err) {
            console.warn('No se pudo obtener posición del usuario:', err);
          }
          
          setCodigoLiga('DREAMLEAGUE');
          setLigaNombre(ligaName);
          setLoading(false);
          return;
        }
        
        // Cargar TODAS las clasificaciones de una vez (ligas pequeñas)
        console.log('[Clasificacion] Cargando TODAS las clasificaciones en caché...');
        const response = await LigaService.getAllClassifications(ligaId);
        
        console.log('📦 Clasificaciones cargadas:', Object.keys(response.classifications));
        // Añadir timestamp de carga al cache
        const cacheWithTimestamp = {
          ...response.classifications,
          _loadedAt: Date.now()
        };
        setClassificationsCache(cacheWithTimestamp);
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

  // Función para cargar una página específica (ligas grandes)
  const loadPaginatedPage = async (page: number, jornada: number | 'Total' = selectedJornada) => {
    try {
      setLoadingPage(true);
      const response = await LigaService.getPaginatedClassification(ligaId, jornada, page, ITEMS_PER_PAGE);
      
      const dataOrdenada = response.data.map((u: any) => ({
        id: u.userId || `jugador-${u.position}`,
        nombre: u.userName || 'Jugador desconocido',
        puntos: u.points ?? 0,
        posicion: u.position,
        presupuesto: u.initialBudget ?? 500,
      }));
      
      setJugadores(dataOrdenada);
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
      setTotalMembers(response.totalMembers);
      setLoadingPage(false);
    } catch (err) {
      console.error('Error al cargar página:', err);
      setLoadingPage(false);
    }
  };

  // Navegar a página específica
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadPaginatedPage(page, selectedJornada);
  };

  // Ir al top de la clasificación
  const goToTop = () => {
    loadPaginatedPage(1, selectedJornada);
  };

  // Ir a la página donde está el usuario
  const goToUserPosition = async () => {
    if (!userPosition) return;
    const userPage = Math.ceil(userPosition / ITEMS_PER_PAGE);
    loadPaginatedPage(userPage, selectedJornada);
  };

  // Cambiar entre jornadas usando el cache (sin recargar todo)
  useEffect(() => {
    if (!classificationsCache && !isLargeLeague) return; // Esperar a que haya cache
    
    console.log('[Clasificacion] 🔄 Cambiando a jornada:', selectedJornada);
    
    // Si es liga grande, usar paginación
    if (isLargeLeague) {
      loadPaginatedPage(1, selectedJornada);
      // Actualizar posición del usuario para nueva jornada
      LigaService.getUserPosition(ligaId, selectedJornada)
        .then(data => setUserPosition(data.position))
        .catch(err => console.warn('No se pudo actualizar posición:', err));
      return;
    }
    
    // Usar InteractionManager para mejorar la respuesta de UI (ligas pequeñas)
    const task = InteractionManager.runAfterInteractions(() => {
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
    });
    
    return () => task.cancel();
  }, [selectedJornada, classificationsCache, isLargeLeague]); // Solo cuando cambia la jornada seleccionada manualmente
  
  // Memoizar callback para abrir plantilla de usuario
  const handleOpenUserLineup = useCallback((jugador: UsuarioClasificacion, isCurrentUser: boolean) => {
    // Si es el usuario actual, ir a "Mi Plantilla"
    if (isCurrentUser) {
      navigation.navigate('Equipo', {
        ligaId,
        ligaName,
      } as any);
      return;
    }
    
    // Determinar si se puede ver la plantilla:
    // - Si es una jornada pasada (menor que la actual), siempre se puede ver
    // - Si es la jornada actual o Total, depende del estado de la jornada
    const isViewingPastJornada = typeof selectedJornada === 'number' && 
                                  currentLeagueJornada !== null && 
                                  selectedJornada < currentLeagueJornada;
    
    const canViewLineup = isViewingPastJornada || jornadaStatus === 'closed';
    
    if (!canViewLineup) {
      CustomAlertManager.alert(
        'Jornada abierta',
        'No puedes ver las plantillas de otros jugadores mientras la jornada actual está abierta.',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'lock-closed', iconColor: '#f59e0b' }
      );
      return;
    }
    
    // Navegar a ver la plantilla de este usuario
    navigation.navigate('VerPlantillaUsuario', {
      ligaId,
      ligaName,
      division,
      userId: jugador.id,
      userName: jugador.nombre,
      jornada: selectedJornada === 'Total' ? undefined : selectedJornada,
    } as any);
  }, [navigation, ligaId, ligaName, jornadaStatus, selectedJornada, currentLeagueJornada]);
  
  // Memoizar componente de jugador
  const renderJugadorItem = useCallback(({ item: jugador }: { item: UsuarioClasificacion }) => {
    const isCurrentUser = jugador.id === currentUserId;
    const posBadgeExtra = jugador.posicion === 1
      ? styles.posBadgeFirst
      : jugador.posicion === 2
      ? styles.posBadgeSecond
      : jugador.posicion === 3
      ? styles.posBadgeThird
      : undefined;

    return (
      <TouchableOpacity 
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
        onPress={() => handleOpenUserLineup(jugador, isCurrentUser)}
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
          ]} numberOfLines={1} ellipsizeMode="tail">
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
  }, [currentUserId, styles, handleOpenUserLineup]);

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

          {/* Controles de Paginaci\u00f3n (solo para ligas grandes) */}
          {isLargeLeague && (
            <View style={{
              backgroundColor: '#1e293b',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#334155',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}>
              {/* Info de posici\u00f3n del usuario */}
              {userPosition && (
                <TouchableOpacity
                  onPress={goToUserPosition}
                  style={{
                    flex: 1,
                    backgroundColor: '#0891b2',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    shadowColor: '#0891b2',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    Tu posici\u00f3n: #{userPosition}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Bot\u00f3n ir al Top */}
              <TouchableOpacity
                onPress={goToTop}
                disabled={currentPage === 1}
                style={{
                  backgroundColor: currentPage === 1 ? '#334155' : '#10b981',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  \ud83c\udfc6 TOP
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info de paginaci\u00f3n y controles (solo para ligas grandes) */}
          {isLargeLeague && (
            <View style={{
              backgroundColor: '#0f172a',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#1e293b',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {/* Info de p\u00e1gina */}
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>
                P\u00e1gina {currentPage} de {totalPages} \u2022 {totalMembers} jugadores
              </Text>
              
              {/* Navegaci\u00f3n de p\u00e1ginas */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loadingPage}
                  style={{
                    backgroundColor: currentPage === 1 ? '#1e293b' : '#334155',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{'<'}</Text>
                </TouchableOpacity>
                
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'center' }}>
                  {loadingPage ? '...' : currentPage}
                </Text>
                
                <TouchableOpacity
                  onPress={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingPage}
                  style={{
                    backgroundColor: currentPage === totalPages ? '#1e293b' : '#334155',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contenido */}
          {jugadores.length > 0 ? (
            <FlatList
              data={jugadores}
              renderItem={renderJugadorItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 8, paddingHorizontal: 16, }}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 80, // altura aproximada de cada item
                offset: 80 * index,
                index,
              })}
            />
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
                  ligaName={ligaName}
                  division={division as 'primera' | 'segunda' | 'premier'}
                  isPremium={isPremium}
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
