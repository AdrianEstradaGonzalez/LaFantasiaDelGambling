import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Animated, PanResponder, ActivityIndicator, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import FootballService, { Player } from '../../services/FutbolService';
import { SquadService } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import { PlayerService } from '../../services/PlayerService';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { TacticsIcon, ChartBarIcon, DeleteIcon, CaptainIcon, MenuIcon, AlertIcon } from '../../components/VectorIcons';
import { CustomAlertManager } from '../../components/CustomAlert';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ✨ NUEVO: Importar servicio de estadísticas del backend
import { PlayerStatsService } from '../../services/PlayerStatsService';

type Formation = {
  id: string;
  name: string;
  positions: {
    id: string;
    role: 'POR' | 'DEF' | 'CEN' | 'DEL';
    x: number; // percentage from left
    y: number; // percentage from top
  }[];
};

const formations: Formation[] = [
  {
    id: '5-4-1',
    name: '5-4-1',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 8, y: 70 },
      { id: 'def2', role: 'DEF', x: 29, y: 70 },
      { id: 'def3', role: 'DEF', x: 50, y: 70 },
      { id: 'def4', role: 'DEF', x: 71, y: 70 },
      { id: 'def5', role: 'DEF', x: 92, y: 70 },
      { id: 'cen1', role: 'CEN', x: 12, y: 48 },
      { id: 'cen2', role: 'CEN', x: 37, y: 48 },
      { id: 'cen3', role: 'CEN', x: 63, y: 48 },
      { id: 'cen4', role: 'CEN', x: 88, y: 48 },
      { id: 'del1', role: 'DEL', x: 50, y: 22 },
    ]
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 8, y: 70 },
      { id: 'def2', role: 'DEF', x: 29, y: 70 },
      { id: 'def3', role: 'DEF', x: 50, y: 70 },
      { id: 'def4', role: 'DEF', x: 71, y: 70 },
      { id: 'def5', role: 'DEF', x: 92, y: 70 },
      { id: 'cen1', role: 'CEN', x: 25, y: 48 },
      { id: 'cen2', role: 'CEN', x: 50, y: 48 },
      { id: 'cen3', role: 'CEN', x: 75, y: 48 },
      { id: 'del1', role: 'DEL', x: 35, y: 22 },
      { id: 'del2', role: 'DEL', x: 65, y: 22 },
    ]
  },
  {
    id: '4-5-1',
    name: '4-5-1',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 12, y: 70 },
      { id: 'def2', role: 'DEF', x: 37, y: 70 },
      { id: 'def3', role: 'DEF', x: 63, y: 70 },
      { id: 'def4', role: 'DEF', x: 88, y: 70 },
      { id: 'cen1', role: 'CEN', x: 10, y: 48 },
      { id: 'cen2', role: 'CEN', x: 30, y: 48 },
      { id: 'cen3', role: 'CEN', x: 50, y: 48 },
      { id: 'cen4', role: 'CEN', x: 70, y: 48 },
      { id: 'cen5', role: 'CEN', x: 90, y: 48 },
      { id: 'del1', role: 'DEL', x: 50, y: 22 },
    ]
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 12, y: 70 },
      { id: 'def2', role: 'DEF', x: 37, y: 70 },
      { id: 'def3', role: 'DEF', x: 63, y: 70 },
      { id: 'def4', role: 'DEF', x: 88, y: 70 },
      { id: 'cen1', role: 'CEN', x: 12, y: 48 },
      { id: 'cen2', role: 'CEN', x: 37, y: 48 },
      { id: 'cen3', role: 'CEN', x: 63, y: 48 },
      { id: 'cen4', role: 'CEN', x: 88, y: 48 },
      { id: 'del1', role: 'DEL', x: 35, y: 22 },
      { id: 'del2', role: 'DEL', x: 65, y: 22 },
    ]
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 12, y: 70 },
      { id: 'def2', role: 'DEF', x: 37, y: 70 },
      { id: 'def3', role: 'DEF', x: 63, y: 70 },
      { id: 'def4', role: 'DEF', x: 88, y: 70 },
      { id: 'cen1', role: 'CEN', x: 25, y: 48 },
      { id: 'cen2', role: 'CEN', x: 50, y: 48 },
      { id: 'cen3', role: 'CEN', x: 75, y: 48 },
      { id: 'del1', role: 'DEL', x: 15, y: 22 },
      { id: 'del2', role: 'DEL', x: 50, y: 22 },
      { id: 'del3', role: 'DEL', x: 85, y: 22 },
    ]
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 20, y: 70 },
      { id: 'def2', role: 'DEF', x: 50, y: 70 },
      { id: 'def3', role: 'DEF', x: 80, y: 70 },
      { id: 'cen1', role: 'CEN', x: 10, y: 48 },
      { id: 'cen2', role: 'CEN', x: 30, y: 48 },
      { id: 'cen3', role: 'CEN', x: 50, y: 48 },
      { id: 'cen4', role: 'CEN', x: 70, y: 48 },
      { id: 'cen5', role: 'CEN', x: 90, y: 48 },
      { id: 'del1', role: 'DEL', x: 35, y: 22 },
      { id: 'del2', role: 'DEL', x: 65, y: 22 },
    ]
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    positions: [
      { id: 'por', role: 'POR', x: 50, y: 92 },
      { id: 'def1', role: 'DEF', x: 20, y: 70 },
      { id: 'def2', role: 'DEF', x: 50, y: 70 },
      { id: 'def3', role: 'DEF', x: 80, y: 70 },
      { id: 'cen1', role: 'CEN', x: 12, y: 48 },
      { id: 'cen2', role: 'CEN', x: 37, y: 48 },
      { id: 'cen3', role: 'CEN', x: 63, y: 48 },
      { id: 'cen4', role: 'CEN', x: 88, y: 48 },
      { id: 'del1', role: 'DEL', x: 15, y: 22 },
      { id: 'del2', role: 'DEL', x: 50, y: 22 },
      { id: 'del3', role: 'DEL', x: 85, y: 22 },
    ]
  }
];

const getAvatarUri = (p: Player) => {
  // Extraer iniciales del nombre del jugador
  const words = p.name.trim().split(/\s+/);
  let initials = '';
  
  if (words.length === 1) {
    // Un solo nombre: primeras 2 letras
    initials = words[0].substring(0, 2).toUpperCase();
  } else {
    // MÃºltiples nombres: primera letra de cada palabra (mÃ¡x 2)
    initials = words
      .slice(0, 2)
      .map(w => w.charAt(0).toUpperCase())
      .join('');
  }
  
  const bg = '334155';
  const color = 'ffffff';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${color}&size=128&length=2`;
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'POR': return '#f59e0b'; // amber (portero)
    case 'DEF': return '#3b82f6'; // blue (defensa)
    case 'CEN': return '#10b981'; // green (centrocampista)
    case 'DEL': return '#ef4444'; // red (delantero)
    default: return '#6b7280'; // gray
  }
};

// Componente Dropdown personalizado
const Dropdown = ({ 
  label, 
  value, 
  onValueChange, 
  items,
  disabled = false
}: { 
  label: string; 
  value: any; 
  onValueChange: (value: any) => void; 
  items: { label: string; value: any }[];
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = items.find(item => item.value === value)?.label || label;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</Text>
      <View>
        <TouchableOpacity
          onPress={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            backgroundColor: disabled ? '#0f1624' : '#1a2332',
            borderWidth: 1,
            borderColor: disabled ? '#1e293b' : '#334155',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: disabled ? 0.6 : 1
          }}
        >
          <Text style={{ color: disabled ? '#64748b' : '#fff', flex: 1 }}>{selectedLabel}</Text>
          <Text style={{ color: '#94a3b8', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <View
            style={{
              backgroundColor: '#1a2332',
              borderWidth: 1,
              borderColor: '#334155',
              borderTopWidth: 0,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              maxHeight: 200,
            }}
          >
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index < items.length - 1 ? 1 : 0,
                    borderBottomColor: '#334155',
                    backgroundColor: item.value === value ? '#374151' : 'transparent'
                  }}
                >
                  <Text style={{ color: '#fff' }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

type MiPlantillaProps = {
  navigation: NativeStackNavigationProp<any>;
};

type MiPlantillaRouteProps = RouteProp<{ params: { ligaId?: string, ligaName?: string } }, 'params'>;

export const MiPlantilla = ({ navigation }: MiPlantillaProps) => {
  const route = useRoute<MiPlantillaRouteProps>();
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const insets = useSafeAreaInsets();
  
  const [selectedFormation, setSelectedFormation] = useState<Formation>(formations[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, any>>({});
  const [captainPosition, setCaptainPosition] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingFormation, setIsChangingFormation] = useState(false);
  const [budget, setBudget] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alineacion' | 'puntuacion'>('alineacion');
  
  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerSlideAnim = useRef(new Animated.Value(-300)).current;
  
  // Estado de la jornada (open = cambios abiertos, closed = jornada en curso)
  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed'>('open');
  
  const [currentMatchday, setCurrentMatchday] = useState<number>(9); // Jornada actual
  
  // Estados para detectar cambios
  const [originalFormation, setOriginalFormation] = useState<Formation>(formations[0]);
  const [originalPlayers, setOriginalPlayers] = useState<Record<string, any>>({});
  
  // ✨ NUEVO: Estado para almacenar puntos de la jornada actual
  const [playerCurrentPoints, setPlayerCurrentPoints] = useState<Record<number, number>>({});
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const isLoadingPointsRef = useRef(false); // Evitar múltiples cargas simultáneas
  const lastLoadedJornada = useRef<number | null>(null); // Tracking de última jornada cargada
  
  // PanResponder para gestos de swipe (vacío por ahora, puede extenderse)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
    })
  ).current;
  
  // ✨ NUEVO: Función para cargar puntos de la jornada actual
  const loadCurrentJornadaPoints = async (players: Record<string, any>, isInitialLoad = false) => {
    console.log('[MiPlantilla] loadCurrentJornadaPoints llamada:', {
      ligaId,
      jornadaStatus,
      currentMatchday,
      numPlayers: Object.keys(players).length,
      isAlreadyLoading: isLoadingPointsRef.current
    });
    
    // Evitar múltiples cargas simultáneas
    if (isLoadingPointsRef.current) {
      console.log('[MiPlantilla] ⏭️ Ya hay una carga en progreso, saltando...');
      return;
    }
    
    if (!ligaId || jornadaStatus !== 'closed' || !currentMatchday) {
      console.warn('[MiPlantilla] ⚠️ No se cumplen condiciones para cargar puntos');
      return;
    }
    
    if (isInitialLoad) {
      isLoadingPointsRef.current = true;
      setIsLoadingPoints(true);
    }
    
    try {
      const playerIds = Object.values(players)
        .filter(p => p && p.id)
        .map(p => p.id);
      
      if (playerIds.length === 0) {
        console.warn('[MiPlantilla] ⚠️ No hay jugadores para cargar');
        if (isInitialLoad) setIsLoadingPoints(false);
        return;
      }
      
      console.log(`[MiPlantilla] ${isInitialLoad ? '📥 Carga inicial' : '🔄 Actualizando'} puntos jornada ${currentMatchday} para ${playerIds.length} jugadores`);
      console.log('[MiPlantilla] Player IDs:', playerIds);
      
      const pointsMap: Record<number, number> = {};
      const failedPlayers: number[] = [];
      
      // Cargar puntos para cada jugador con reintentos
      await Promise.all(
        playerIds.map(async (playerId) => {
          let retries = 3;
          let lastError: any = null;
          
          while (retries > 0) {
            try {
              console.log(`[MiPlantilla] Cargando stats para jugador ${playerId}, jornada ${currentMatchday}`);
              // ✅ Pedir refresh solo si la jornada está cerrada (partidos en curso)
              const shouldRefresh = jornadaStatus === 'closed';
              const stats = await PlayerStatsService.getPlayerJornadaStats(playerId, currentMatchday, { refresh: shouldRefresh });
              
              // Solo agregar al map si existe stats (el jugador ya jugó o está jugando)
              if (stats && stats.totalPoints !== null && stats.totalPoints !== undefined) {
                pointsMap[playerId] = stats.totalPoints;
                console.log(`[MiPlantilla] ✅ Jugador ${playerId}: ${stats.totalPoints} puntos`);
                break; // Éxito, salir del loop de reintentos
              } else {
                console.log(`[MiPlantilla] ⚠️ Jugador ${playerId} sin stats`);
                break;
              }
            } catch (error) {
              lastError = error;
              retries--;
              console.warn(`[MiPlantilla] ❌ Error cargando puntos de jugador ${playerId}:`, error);
              
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                failedPlayers.push(playerId);
              }
            }
          }
        })
      );
      
      if (failedPlayers.length > 0) {
        console.error(`[MiPlantilla] ⚠️ ${failedPlayers.length} jugadores no pudieron cargarse:`, failedPlayers);
      }
      
      setPlayerCurrentPoints(pointsMap);
      console.log('[MiPlantilla] 🎯 Puntos finales cargados:', pointsMap);
      console.log(`[MiPlantilla] 📊 Resumen: ${Object.keys(pointsMap).length}/${playerIds.length} jugadores con datos`);
    } catch (error) {
      console.error('[MiPlantilla] Error al cargar puntos de jornada actual:', error);
    } finally {
      if (isInitialLoad) {
        isLoadingPointsRef.current = false;
        setIsLoadingPoints(false);
      }
    }
  };
  
  // ✨ MODIFICADO: Obtener jornada y estado de la liga (no de la API)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (ligaId) {
          const status = await JornadaService.getJornadaStatus(ligaId);
          if (mounted) {
            // ✨ NUEVO: Usar la jornada de la liga, no de la API
            setCurrentMatchday(status.currentJornada);
            console.log('[MiPlantilla] Jornada de la liga:', status.currentJornada);
            
            const s = (status.status as 'open' | 'closed');
            setJornadaStatus(s);
            console.log('[MiPlantilla] Estado de la jornada:', s);
            
            // Resetear última jornada cargada cuando cambia el estado o la jornada
            if (lastLoadedJornada.current !== status.currentJornada) {
              lastLoadedJornada.current = null;
            }
            
            if (s === 'closed') {
              setActiveTab('puntuacion');
            }
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener estado de jornada:', e);
      }
    })();
    return () => { mounted = false; };
  }, [ligaId]);
  
  // Cargar puntos cuando se cambia a la pestaña de puntuación
  useEffect(() => {
    console.log('[MiPlantilla] useEffect puntuación disparado:', {
      activeTab,
      jornadaStatus,
      currentMatchday,
      hasPlayers: Object.keys(selectedPlayers).length,
      lastLoaded: lastLoadedJornada.current
    });
    
    // Solo ejecutar cuando estamos en tab 'puntuacion'
    if (activeTab !== 'puntuacion') {
      console.log('[MiPlantilla] No estamos en tab puntuación, saltando');
      return;
    }
    
    const hasPlayers = Object.keys(selectedPlayers).length > 0;
    
    if (!hasPlayers) {
      console.log('[MiPlantilla] No hay jugadores cargados todavía');
      return;
    }
    
    if (jornadaStatus !== 'closed') {
      console.log('[MiPlantilla] Jornada no está cerrada');
      return;
    }
    
    if (!currentMatchday) {
      console.log('[MiPlantilla] No hay jornada actual');
      return;
    }
    
    // Solo cargar si no hemos cargado esta jornada todavía
    if (lastLoadedJornada.current === currentMatchday) {
      console.log('[MiPlantilla] Ya cargamos esta jornada:', currentMatchday);
      return;
    }
    
    console.log(`[MiPlantilla] ✅ Iniciando carga de puntos para jornada ${currentMatchday}`);
    lastLoadedJornada.current = currentMatchday;
    loadCurrentJornadaPoints(selectedPlayers, true);
  }, [activeTab, jornadaStatus, currentMatchday, selectedPlayers]);
  
  // Animación del drawer
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(drawerSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerSlideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen, drawerSlideAnim]);
  
  // Listener para cuando se selecciona un jugador desde PlayersMarket
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Verificar si hay datos de vuelta de PlayersMarket
      const params = route.params as any;
      if (params?.selectedPlayer && params?.targetPosition) {
        setSelectedPlayers(prev => ({ 
          ...prev, 
          [params.targetPosition]: {
            ...params.selectedPlayer,
            isCaptain: false // Inicializar como no capitán
          }
        }));
        // Limpiar los parÃ¡metros
        navigation.setParams({ selectedPlayer: undefined, targetPosition: undefined });
      }
    });
    
    return unsubscribe;
  }, [navigation, route.params]);
  
  // FunciÃ³n para comparar si hay cambios
  const hasChanges = () => {
    // Comparar formaciÃ³n
    if (selectedFormation.id !== originalFormation.id) {
      console.log('Hay cambio en formaciÃ³n:', selectedFormation.id, '!=', originalFormation.id);
      return true;
    }
    
    // Obtener todas las posiciones Ãºnicas de ambos objetos
    const allPositions = new Set([
      ...Object.keys(selectedPlayers),
      ...Object.keys(originalPlayers)
    ]);
    
    // Comparar jugador por jugador en cada posiciÃ³n
    for (const pos of allPositions) {
      const currentPlayer = selectedPlayers[pos];
      const originalPlayer = originalPlayers[pos];
      
      // Si uno tiene jugador y el otro no, hay cambio
      if ((currentPlayer && !originalPlayer) || (!currentPlayer && originalPlayer)) {
        console.log('Hay cambio en posiciÃ³n', pos, ':', currentPlayer?.name || 'vacÃ­o', 'vs', originalPlayer?.name || 'vacÃ­o');
        return true;
      }
      
      // Si ambos tienen jugador pero son diferentes, hay cambio
      if (currentPlayer && originalPlayer && currentPlayer.id !== originalPlayer.id) {
        console.log('Hay cambio en posiciÃ³n', pos, ':', currentPlayer.name, 'vs', originalPlayer.name);
        return true;
      }
    }
    
    console.log('No hay cambios detectados');
    return false;
  };

  // ✨ ELIMINADO: calculatePlayerPoints()
  // Los puntos ahora vienen calculados del backend a través de PlayerStatsService
  // Ya no se calculan en el frontend

  // Función para abrir modal de estadísticas
  const openStatsModal = (player: any, role: string) => {
    // Navegar a la pantalla de detalles del jugador
    navigation.navigate('PlayerDetail', {
      player: { ...player, role },
      ligaId,
      ligaName,
      currentFormation: selectedFormation.id // Pasar la formación actual
    });
  };

  // FunciÃ³n para adaptar jugadores a nueva formaciÃ³n
  const adaptPlayersToFormation = (newFormation: Formation, currentPlayers: Record<string, any>) => {
    const adaptedPlayers: Record<string, any> = {};
    
    // Contar posiciones disponibles por rol en la nueva formaciÃ³n
    const availablePositionsByRole: Record<string, string[]> = {
      'POR': [],
      'DEF': [],
      'CEN': [],
      'DEL': []
    };
    
    newFormation.positions.forEach(pos => {
      availablePositionsByRole[pos.role].push(pos.id);
    });
    
    // Agrupar jugadores actuales por rol
    const playersByRole: Record<string, Array<{positionId: string, player: any}>> = {
      'POR': [],
      'DEF': [],
      'CEN': [],
      'DEL': []
    };
    
    Object.entries(currentPlayers).forEach(([positionId, player]) => {
      // Determinar el rol basado en la posiciÃ³n actual usando la formaciÃ³n actual
      const position = selectedFormation.positions.find(p => p.id === positionId);
      if (position && player) {
        playersByRole[position.role].push({ positionId, player });
      }
    });
    
    // Asignar jugadores a las nuevas posiciones disponibles
    Object.keys(availablePositionsByRole).forEach(role => {
      const availablePositions = availablePositionsByRole[role];
      const playersForRole = playersByRole[role];
      
      // Asignar jugadores hasta el lÃ­mite de posiciones disponibles
      for (let i = 0; i < Math.min(availablePositions.length, playersForRole.length); i++) {
        adaptedPlayers[availablePositions[i]] = playersForRole[i].player;
      }
      
      // Si hay jugadores excedentes, los perderemos (este es el comportamiento deseado)
      if (playersForRole.length > availablePositions.length) {
        console.log(`Se eliminarÃ¡n ${playersForRole.length - availablePositions.length} jugadores del rol ${role} al cambiar formaciÃ³n`);
      }
    });
    
    return adaptedPlayers;
  };

  // Cargar plantilla existente al montar el componente
  useEffect(() => {
    const loadExistingSquad = async () => {
      if (!ligaId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const [existingSquad, budgetData, status] = await Promise.all([
          SquadService.getUserSquad(ligaId),
          SquadService.getUserBudget(ligaId),
          JornadaService.getJornadaStatus(ligaId)
        ]);
        
        setBudget(budgetData);
        
        if (existingSquad) {
          // Cargar formación existente
          const formation = formations.find(f => f.id === existingSquad.formation);
          if (formation) {
            setSelectedFormation(formation);
            setOriginalFormation(formation); // Guardar formación original
            console.log('Formación original cargada:', formation.id);
          }

          // Usar datos enriquecidos que vienen del backend (solo jugadores de la plantilla)
          const playersMap: Record<string, any> = {};
          let captainPos: string | null = null;
          
          existingSquad.players.forEach((squadPlayer: any) => {
            if (squadPlayer.playerData) {
              // Usar playerData que viene del backend
              console.log('[MiPlantilla] Player data:', squadPlayer.playerData);
              playersMap[squadPlayer.position] = {
                ...squadPlayer.playerData,
                pricePaid: squadPlayer.pricePaid,
                isCaptain: squadPlayer.isCaptain
              };
            } else {
              // Fallback: usar datos básicos si no hay playerData
              console.warn('[MiPlantilla] No playerData para:', squadPlayer.playerName);
              playersMap[squadPlayer.position] = {
                id: squadPlayer.playerId,
                name: squadPlayer.playerName,
                pricePaid: squadPlayer.pricePaid,
                isCaptain: squadPlayer.isCaptain
              };
            }
            
            if (squadPlayer.isCaptain) {
              captainPos = squadPlayer.position;
            }
          });
          
          console.log('[MiPlantilla] Players map final:', playersMap);
          setSelectedPlayers(playersMap);
          setOriginalPlayers(playersMap);
          setCaptainPosition(captainPos);
        }
      } catch (error) {
        console.error('Error al cargar plantilla existente:', error);
        // No mostrar error si simplemente no existe plantilla
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingSquad();
  }, [ligaId]);

  // Recargar plantilla y presupuesto cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      const reloadSquadAndBudget = async () => {
        if (!ligaId) return;
        
        try {
          const [existingSquad, budgetData] = await Promise.all([
            SquadService.getUserSquad(ligaId),
            SquadService.getUserBudget(ligaId)
          ]);
          
          setBudget(budgetData);
          console.log('Presupuesto recargado:', budgetData);
          
          if (existingSquad) {
            // Cargar formación existente
            const formation = formations.find(f => f.id === existingSquad.formation);
            if (formation) {
              setSelectedFormation(formation);
              setOriginalFormation(formation);
            }

            // Usar datos enriquecidos que vienen del backend (solo jugadores de la plantilla)
            const playersMap: Record<string, any> = {};
            let captainPos: string | null = null;
            
            existingSquad.players.forEach((squadPlayer: any) => {
              if (squadPlayer.playerData) {
                // Usar playerData que viene del backend
                console.log('[MiPlantilla RELOAD] Player data:', squadPlayer.playerData);
                playersMap[squadPlayer.position] = {
                  ...squadPlayer.playerData,
                  pricePaid: squadPlayer.pricePaid,
                  isCaptain: squadPlayer.isCaptain
                };
              } else {
                // Fallback: usar datos básicos si no hay playerData
                console.warn('[MiPlantilla RELOAD] No playerData para:', squadPlayer.playerName);
                playersMap[squadPlayer.position] = {
                  id: squadPlayer.playerId,
                  name: squadPlayer.playerName,
                  pricePaid: squadPlayer.pricePaid,
                  isCaptain: squadPlayer.isCaptain
                };
              }
              
              if (squadPlayer.isCaptain) {
                captainPos = squadPlayer.position;
              }
            });
            
            console.log('[MiPlantilla RELOAD] Players map final:', playersMap);
            setSelectedPlayers(playersMap);
            setOriginalPlayers(playersMap);
            setCaptainPosition(captainPos);
            console.log('Plantilla recargada:', Object.keys(playersMap).length, 'jugadores');
            
            // ✨ Los puntos se cargarán automáticamente por el useEffect cuando currentMatchday esté listo
          }
        } catch (error) {
          console.error('Error recargando plantilla:', error);
        }
      };
      
      reloadSquadAndBudget();
    }, [ligaId])
  );

  const selectPlayer = (positionId: string) => {
    // Navegar al mercado con filtro por posiciÃ³n
    const position = selectedFormation.positions.find(p => p.id === positionId);
    if (position) {
      setTargetPosition(positionId);
      navigation.navigate('PlayersMarket', { 
        ligaId,
        ligaName,
        selectMode: true, 
        filterByRole: position.role,
        targetPosition: positionId,
        currentFormation: selectedFormation.id,
        returnTo: 'MiPlantilla'
      });
    }
  };

  const removePlayer = async (positionId: string) => {
    if (!ligaId) {
      CustomAlertManager.alert(
        'Error',
        'No se puede eliminar el jugador sin una liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      // Llamar al servicio para eliminar el jugador y actualizar presupuesto
      const result = await SquadService.removePlayerFromSquad(ligaId, positionId);
      
      // Actualizar el presupuesto local
      setBudget(result.budget);
      
      // Si el jugador eliminado era el capitán, quitar el capitán
      if (captainPosition === positionId) {
        setCaptainPosition(null);
      }
      
      // Eliminar el jugador del estado local
      setSelectedPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[positionId];
        return newPlayers;
      });
      
    } catch (error: any) {
      console.error('Error al vender jugador:', error);
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo vender el jugador',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    }
  };

  const toggleCaptain = async (positionId: string) => {
    if (!ligaId) return;
    
    // Si el jugador ya es capitán, quitarlo
    if (captainPosition === positionId) {
      setCaptainPosition(null);
      // Actualizar el estado local para quitar isCaptain
      setSelectedPlayers(prev => ({
        ...prev,
        [positionId]: { ...prev[positionId], isCaptain: false }
      }));
      return;
    }
    
    // Establecer nuevo capitán
    setCaptainPosition(positionId);
    
    // Actualizar el estado local
    setSelectedPlayers(prev => {
      const updated = { ...prev };
      // Quitar isCaptain del capitán anterior
      Object.keys(updated).forEach(pos => {
        if (updated[pos]) {
          updated[pos] = { ...updated[pos], isCaptain: pos === positionId };
        }
      });
      return updated;
    });
    
    // Guardar inmediatamente en el backend
    try {
      await SquadService.setCaptain(ligaId, positionId);
      console.log('Capitán establecido en posición:', positionId);
    } catch (error) {
      console.error('Error al establecer capitán:', error);
      CustomAlertManager.alert(
        'Error',
        'No se pudo establecer el capitán',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      // Revertir el cambio local si falla
      setCaptainPosition(captainPosition);
      setSelectedPlayers(prev => {
        const reverted = { ...prev };
        Object.keys(reverted).forEach(pos => {
          if (reverted[pos]) {
            reverted[pos] = { ...reverted[pos], isCaptain: pos === captainPosition };
          }
        });
        return reverted;
      });
    }
  };

  const saveSquad = async () => {
    if (!ligaId) {
      CustomAlertManager.alert(
        'Error',
        'No se puede guardar la plantilla sin seleccionar una liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    const playersList = Object.entries(selectedPlayers);
    // Permitir guardar plantilla vacÃ­a - se eliminÃ³ la validaciÃ³n

    setIsSaving(true);
    try {
      const squadData = {
        formation: selectedFormation.id,
        captainPosition: captainPosition || undefined, // Incluir posición del capitán
        players: playersList.map(([position, player]) => ({
          position,
          playerId: player.id,
          playerName: player.name,
          role: selectedFormation.positions.find(p => p.id === position)?.role || 'DEF',
          // Enviar pricePaid si estÃ¡ disponible (para jugadores reciÃ©n agregados o existentes)
          pricePaid: player.pricePaid
        }))
      };

      const result = await SquadService.saveSquad(ligaId, squadData);
      
      // Actualizar presupuesto si la respuesta lo incluye
      if (result.budget !== undefined) {
        setBudget(result.budget);
        console.log('Presupuesto actualizado tras guardar:', result.budget);
        if (result.refundedAmount && result.refundedAmount > 0) {
          console.log(`Se devolvieron ${result.refundedAmount}M al presupuesto por jugadores eliminados`);
        }
      }
      
      // Actualizar estados originales despuÃ©s de guardar exitosamente
      setOriginalFormation(selectedFormation);
      setOriginalPlayers({ ...selectedPlayers });
      
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      CustomAlertManager.alert(
        'Error',
        'No se pudo guardar la plantilla',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeLayout backgroundColor="#181818ff">
      {isLoading || isLoadingPoints ? (
        <LoadingScreen />
      ) : (
        <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
          {/* Top Header Bar - Estilo idéntico a LigaTopNavBar */}
          {ligaName && (
            <View style={{
              backgroundColor: '#181818',
              borderBottomWidth: 0.5,
              borderBottomColor: '#333',
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {/* Botón de menú a la izquierda */}
              <TouchableOpacity 
                onPress={() => setIsDrawerOpen(true)}
                style={{ 
                  padding: 8,
                  marginLeft: -8
                }}
              >
                <MenuIcon size={24} color="#fff" />
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  LIGA{' '}
                  <Text style={{ color: '#0892D0' }}>
                    {ligaName.toUpperCase()}
                  </Text>
                </Text>
              </View>

              {/* Espacio para equilibrar el diseño */}
              <View style={{ width: 40 }} />
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} scrollEnabled={!isChangingFormation}>
          {/* Header con tÃ­tulo y botÃ³n guardar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800' }}>Mi Plantilla</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Budget Display */}
              <View style={{
                backgroundColor: '#1a2332',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: '#10b981',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#10b981',
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 3
                  }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>$</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600' }}>PRESUPUESTO</Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{budget}M</Text>
                  </View>
                </View>
              </View>

              {(() => {
                const shouldShowButton = ligaId && hasChanges() && !isChangingFormation;
                console.log('Render botÃ³n guardar - ligaId:', ligaId, 'hasChanges:', hasChanges(), 'isChangingFormation:', isChangingFormation, 'shouldShow:', shouldShowButton);
                return shouldShowButton ? (
                <TouchableOpacity
                  onPress={saveSquad}
                  disabled={isSaving}
                  style={{
                    backgroundColor: isSaving ? '#374151' : '#0892D0',
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 0,
                    borderWidth: 1,
                    borderColor: '#334155',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                    elevation: 0,
                    opacity: isSaving ? 0.6 : 1,
                    marginTop: 4
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
                ) : null;
              })()}
            </View>
          </View>
        
        {/* Selector de Formación */}
        <Dropdown
          label="Formación"
          value={selectedFormation.id}
          disabled={jornadaStatus === 'closed'}
          onValueChange={async (formationId) => {
            const formation = formations.find(f => f.id === formationId);
            if (formation && ligaId) {
              // Activar estado de carga
              setIsChangingFormation(true);
              
              // Adaptar jugadores a la nueva formaciÃ³n
              const adaptedPlayers = adaptPlayersToFormation(formation, selectedPlayers);
              setSelectedFormation(formation);
              setSelectedPlayers(adaptedPlayers);
              
              // Guardar formaciÃ³n inmediatamente en BD
              try {
                const playersList = Object.entries(adaptedPlayers).filter(([_, player]) => player !== null);
                
                // Verificar si el capitán sigue en la nueva formación
                let newCaptainPos = captainPosition;
                if (captainPosition && !adaptedPlayers[captainPosition]) {
                  newCaptainPos = null;
                  setCaptainPosition(null);
                }
                
                const squadData = {
                  formation: formation.id,
                  captainPosition: newCaptainPos || undefined,
                  players: playersList.map(([position, player]) => ({
                    position,
                    playerId: player.id,
                    playerName: player.name,
                    role: formation.positions.find(p => p.id === position)?.role || 'DEF',
                    pricePaid: player.pricePaid // Enviar pricePaid para preservar el precio
                  }))
                };

                const result = await SquadService.saveSquad(ligaId, squadData);
                
                // Actualizar presupuesto si se devolviÃ³ dinero por jugadores eliminados
                if (result.budget !== undefined) {
                  setBudget(result.budget);
                  if (result.refundedAmount && result.refundedAmount > 0) {
                    console.log(`Se devolvieron ${result.refundedAmount}M al cambiar formaciÃ³n`);
                  }
                }
                
                // Actualizar estados originales
                setOriginalFormation(formation);
                setOriginalPlayers({ ...adaptedPlayers });
                
              } catch (error) {
                console.error('Error al guardar formación:', error);
                CustomAlertManager.alert(
                  'Error',
                  'No se pudo guardar la formación',
                  [{ text: 'OK', onPress: () => {}, style: 'default' }],
                  { icon: 'alert-circle', iconColor: '#ef4444' }
                );
              } finally {
                // Desactivar estado de carga
                setIsChangingFormation(false);
              }
            }
          }}
          items={formations.map(f => ({ label: f.name, value: f.id }))}
        />

        {/* Total de puntos en tiempo real - Solo cuando la jornada está cerrada */}
        {jornadaStatus === 'closed' && (
          <View style={{
            backgroundColor: '#1e293b',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#334155'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 2 }}>
                Jornada {currentMatchday}
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 11, opacity: 0.7 }}>
                Puntos totales del equipo
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 4
            }}>
              <Text style={{ color: '#10b981', fontSize: 28, fontWeight: '800', letterSpacing: -1 }}>
                {(() => {
                  // Calcular suma de puntos individuales
                  const sumPoints = Object.keys(selectedPlayers).reduce((total, positionId) => {
                    const player = selectedPlayers[positionId];
                    if (!player) return total;
                    const points = playerCurrentPoints[player.id] ?? 0;
                    const isCaptain = captainPosition === positionId;
                    return total + (isCaptain ? points * 2 : points);
                  }, 0);
                  
                  // ⚠️ Si hay menos de 11 jugadores, el total es 0
                  const totalPoints = Object.keys(selectedPlayers).length < 11 ? 0 : sumPoints;
                  return totalPoints;
                })()}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '600' }}>
                pts
              </Text>
            </View>
          </View>
        )}

        {/* Consejo para nombrar capitán - Solo cuando cambios están abiertos y NO hay capitán */}
        {jornadaStatus === 'open' && !captainPosition && (
          <View style={{
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderLeftWidth: 4,
            borderLeftColor: '#ffd700',
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 12,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: 'rgba(255, 215, 0, 0.3)'
          }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#ffd700',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <CaptainIcon size={20} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                Selecciona tu Capitán
              </Text>
              <Text style={{ color: '#e5e7eb', fontSize: 11, fontWeight: '500' }}>
                Mantén presionado un jugador para nombrarlo capitán. Puntuará el doble.
              </Text>
            </View>
          </View>
        )}

        {/* Warning de plantilla incompleta - cuando jornada está cerrada */}
        {jornadaStatus === 'closed' && Object.keys(selectedPlayers).length < 11 && (
          <View
            style={{
              backgroundColor: '#451a03',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#f59e0b',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <AlertIcon size={24} color="#fbbf24" />
              <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '700', marginLeft: 12 }}>
                Plantilla Incompleta
              </Text>
            </View>
            <Text style={{ color: '#fcd34d', fontSize: 14, lineHeight: 20 }}>
              Se requiere plantilla completa para puntuar. {'\n'}
            </Text>
          </View>
        )}

        {/* Campo de FÃºtbol con swipe */}
        <View
          {...panResponder.panHandlers}
          style={{
          backgroundColor: '#0f0f0f',
          borderRadius: 16,
          height: 500,
          position: 'relative',
          marginBottom: 20,
          borderWidth: 3,
          borderColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          overflow: 'hidden'
        }}>
          {/* LÃ­neas del campo */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#fff',
            opacity: 0.9
          }} />
          
          {/* CÃ­rculo central */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: '#fff',
            opacity: 0.9,
            marginLeft: -40,
            marginTop: -40
          }} />
          
          {/* Punto central */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#fff',
            marginLeft: -3,
            marginTop: -3
          }} />
          
          {/* Ãrea del portero (arriba) */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: '25%',
            width: '50%',
            height: 70,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: '#fff',
            opacity: 0.9
          }} />
          
          {/* Ãrea pequeÃ±a del portero (arriba) */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: '35%',
            width: '30%',
            height: 35,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: '#fff',
            opacity: 0.9
          }} />
          
          {/* Ãrea del portero (abajo) */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: '25%',
            width: '50%',
            height: 70,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: '#fff',
            opacity: 0.9
          }} />
          
          {/* Ãrea pequeÃ±a del portero (abajo) */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: '35%',
            width: '30%',
            height: 35,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: '#fff',
            opacity: 0.9
          }} />

          {/* Posiciones de jugadores - MODO ALINEACIÃ“N */}
          {jornadaStatus === 'open' && selectedFormation.positions.map(position => {
            const player = selectedPlayers[position.id];
            const photoUri = player?.photo || (player ? getAvatarUri(player) : undefined);
            const isCaptain = captainPosition === position.id;
            
            return (
              <TouchableOpacity
                key={position.id}
                onPress={() => selectPlayer(position.id)}
                onLongPress={() => player && toggleCaptain(position.id)}
                delayLongPress={500}
                style={{
                  position: 'absolute',
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: 80,
                  height: 105,
                  marginLeft: -40,
                  marginTop: -52,
                  alignItems: 'center'
                }}
              >
                {player ? (
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        borderWidth: isCaptain ? 3 : 2,
                        borderColor: isCaptain ? '#ffd700' : '#fff',
                        backgroundColor: '#0b1220',
                        shadowColor: isCaptain ? '#ffd700' : '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isCaptain ? 0.8 : 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                        overflow: 'visible',
                        position: 'relative'
                      }}
                    >
                      <View style={{ overflow: 'hidden', borderRadius: 33, width: isCaptain ? 64 : 66, height: isCaptain ? 64 : 66 }}>
                        <Image
                          source={{ uri: photoUri }}
                          style={{
                            width: isCaptain ? 64 : 66,
                            height: isCaptain ? 64 : 66,
                            borderRadius: 33
                          }}
                          resizeMode="cover"
                        />
                      </View>
                      
                      {/* Brazalete de capitán en esquina superior izquierda */}
                      {isCaptain && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -4,
                            left: -4,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#ffd700',
                            borderWidth: 2,
                            borderColor: '#fff',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#ffd700',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.8,
                            shadowRadius: 4,
                            elevation: 6
                          }}
                        >
                          <CaptainIcon size={18} color="#000" />
                        </View>
                      )}
                      
                      {/* Escudo del equipo en esquina superior derecha */}
                      {player.teamCrest && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#fff',
                            borderWidth: 1.5,
                            borderColor: '#fff',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 3,
                            elevation: 4
                          }}
                        >
                          <Image
                            source={{ uri: player.teamCrest }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10
                            }}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginTop: 4,
                        textShadowColor: '#000',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                        maxWidth: 70
                      }}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: '#374151',
                      borderWidth: 2,
                      borderColor: '#fff',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 6
                    }}
                  >
                    <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'bold' }}>
                      {position.role}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          
          {/* Posiciones de jugadores - MODO PUNTUACIÃ“N */}
          {jornadaStatus === 'closed' && selectedFormation.positions.map(position => {
            const player = selectedPlayers[position.id];
            const photoUri = player?.photo || (player ? getAvatarUri(player) : undefined);
            
            return (
              <TouchableOpacity
                key={position.id}
                onPress={() => player && openStatsModal(player, position.role)}
                style={{
                  position: 'absolute',
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: 80,
                  height: 105,
                  marginLeft: -40,
                  marginTop: -52,
                  alignItems: 'center'
                }}
              >
                {player ? (
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        borderWidth: 2,
                        borderColor: player.isCaptain ? '#ffd700' : '#0892D0',
                        backgroundColor: '#0b1220',
                        shadowColor: player.isCaptain ? '#ffd700' : '#0892D0',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.6,
                        shadowRadius: 6,
                        elevation: 6,
                        overflow: 'visible',
                        position: 'relative'
                      }}
                    >
                      <View style={{ overflow: 'hidden', borderRadius: 33, width: 66, height: 66 }}>
                        <Image
                          source={{ uri: photoUri }}
                          style={{
                            width: 66,
                            height: 66,
                            borderRadius: 33
                          }}
                          resizeMode="cover"
                        />
                      </View>
                      
                      {/* Badge de capitán - top left */}
                      {player.isCaptain && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -8,
                            left: -8,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#ffd700',
                            borderWidth: 2,
                            borderColor: '#fff',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.4,
                            shadowRadius: 4,
                            elevation: 6
                          }}
                        >
                          <CaptainIcon size={16} color="#000" />
                        </View>
                      )}
                      
                      {/* Badge de puntuación - top right */}
                      <View
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#0892D0',
                          borderWidth: 2,
                          borderColor: '#fff',
                          justifyContent: 'center',
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 4,
                          elevation: 5
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                          {jornadaStatus === 'closed' && playerCurrentPoints[player.id] !== undefined
                            ? (player.isCaptain ? playerCurrentPoints[player.id] * 2 : playerCurrentPoints[player.id])
                            : '-'
                          }
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginTop: 4,
                        textShadowColor: '#000',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                        maxWidth: 70
                      }}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: '#374151',
                      borderWidth: 2,
                      borderColor: '#64748b',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 6
                    }}
                  >
                    <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'bold' }}>
                      {position.role}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                      -
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de jugadores seleccionados */}
        <View style={{ backgroundColor: '#1a2332', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Plantilla Actual</Text>
          
          {Object.keys(selectedPlayers).length === 0 ? (
            <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>
              Toca las posiciones en el campo para seleccionar jugadores
            </Text>
          ) : (
            Object.entries(selectedPlayers)
              .sort(([positionIdA], [positionIdB]) => {
                // Ordenar por rol: POR -> DEF -> CEN -> DEL
                const posA = selectedFormation.positions.find(p => p.id === positionIdA);
                const posB = selectedFormation.positions.find(p => p.id === positionIdB);
                
                const roleOrder: Record<string, number> = {
                  'POR': 1,
                  'DEF': 2,
                  'CEN': 3,
                  'DEL': 4
                };
                
                const orderA = roleOrder[posA?.role || ''] || 999;
                const orderB = roleOrder[posB?.role || ''] || 999;
                
                if (orderA !== orderB) {
                  return orderA - orderB;
                }
                
                // Si son del mismo rol, ordenar por ID de posiciÃ³n
                return positionIdA.localeCompare(positionIdB);
              })
              .map(([positionId, player]) => {
              const position = selectedFormation.positions.find(p => p.id === positionId);
              
              // Generar URL de avatar con iniciales si no hay foto del jugador
              const getAvatarUriWithInitials = (playerName: string) => {
                const words = playerName.trim().split(/\s+/);
                let initials = '';
                
                if (words.length === 1) {
                  initials = words[0].substring(0, 2).toUpperCase();
                } else {
                  initials = words
                    .slice(0, 2)
                    .map(w => w.charAt(0).toUpperCase())
                    .join('');
                }
                
                const bg = '334155';
                const color = 'ffffff';
                return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${color}&size=128&length=2`;
              };
              
              const photoUri = player.photo || getAvatarUriWithInitials(player.name);
              const isCaptain = captainPosition === positionId;
              
              return (
                <View key={positionId} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#334155',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: position ? getRoleColor(position.role) : '#6b7280',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                      {position?.role}
                    </Text>
                  </View>
                  
                  {/* Foto del jugador */}
                  <View style={{ position: 'relative', marginRight: 8 }}>
                    <Image
                      source={{ uri: photoUri }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: isCaptain ? 2 : 1,
                        borderColor: isCaptain ? '#ffd700' : '#334155'
                      }}
                      resizeMode="cover"
                    />
                    {/* Brazalete de capitán mini */}
                    {isCaptain && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: '#ffd700',
                          borderWidth: 1,
                          borderColor: '#fff',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <CaptainIcon size={10} color="#000" />
                      </View>
                    )}
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: isCaptain ? '#ffd700' : '#cbd5e1', fontWeight: isCaptain ? '700' : '600' }}>
                        {player.name}
                      </Text>
                      {player.price && (
                        <View style={{
                          backgroundColor: '#10b981',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{player.price}M</Text>
                        </View>
                      )}
                    </View>
                    {player.teamName && (
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{player.teamName}</Text>
                    )}
                  </View>
                  
                  {/* Logo del equipo si existe */}
                  {player.teamCrest && (
                    <Image
                      source={{ uri: player.teamCrest }}
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 8
                      }}
                      resizeMode="contain"
                    />
                  )}
                  
                  <TouchableOpacity
                    onPress={() => removePlayer(positionId)}
                    disabled={jornadaStatus === 'closed'}
                    style={{
                      backgroundColor: jornadaStatus === 'closed' ? '#64748b' : '#ef4444',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: jornadaStatus === 'closed' ? 0.6 : 1
                    }}
                  >
                    <DeleteIcon size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
          </ScrollView>
      
          {/* Barra de navegaciÃ³n */}
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
          
          {/* Overlay sutil cuando se estÃ¡ cambiando formaciÃ³n */}
          {isChangingFormation && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999
            }}>
              <View style={{
                backgroundColor: 'rgba(24, 24, 24, 0.9)',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#334155'
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>Cambiando formación...</Text>
              </View>
            </View>
          )}
          
          {/* Drawer Modal */}
          <Modal
            visible={isDrawerOpen}
            animationType="none"
            transparent={true}
            onRequestClose={() => setIsDrawerOpen(false)}
          >
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* Drawer content con animación */}
              <Animated.View 
                style={{ 
                  width: '75%', 
                  maxWidth: 300,
                  transform: [{ translateX: drawerSlideAnim }]
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
              {/* Overlay to close drawer */}
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

export default MiPlantilla;

