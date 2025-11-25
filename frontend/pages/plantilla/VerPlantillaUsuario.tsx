import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, Modal, FlatList, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SquadService, Squad } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import FootballService from '../../services/FutbolService';
import { PlayerService } from '../../services/PlayerService';
import { PlayerStatsService } from '../../services/PlayerStatsService';
import { LigaService } from '../../services/LigaService';
import LoadingScreen from '../../components/LoadingScreen';
import { ChevronLeftIcon, AlertIcon, ContentCopyIcon } from '../../components/VectorIcons';
import { SafeLayout } from '../../components/SafeLayout';
import { AdBanner } from '../../components/AdBanner';
import { CustomAlertManager } from '../../components/CustomAlert';
import EncryptedStorage from 'react-native-encrypted-storage';

type VerPlantillaRoute = RouteProp<{ params: { ligaId: string; ligaName: string; division?: string; userId: string; userName: string; jornada?: number } }, 'params'>;

const roleColor = (role: string) => {
  switch (role) {
    case 'POR': return '#f59e0b';
    case 'DEF': return '#3b82f6';
    case 'CEN': return '#10b981';
    case 'DEL': return '#ef4444';
    default: return '#6b7280';
  }
};


// Mapear roles cortos (POR, DEF, CEN, DEL) a posiciones canónicas (Goalkeeper, Defender, etc.)
const roleToCanonicalPosition = (role: string): string => {
  switch (role) {
    case 'POR': return 'Goalkeeper';
    case 'DEF': return 'Defender';
    case 'CEN': return 'Midfielder';
    case 'DEL': return 'Attacker';
    default: return role; // Si ya viene en formato largo, retornar tal cualk
  }
};

const formationPositions: Record<string, { id: string; role: 'POR'|'DEF'|'CEN'|'DEL'; x: number; y: number }[]> = {
  '5-4-1': [
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
  ],
  '5-3-2': [
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
  ],
  '4-5-1': [
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
  ],
  '4-4-2': [
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
  ],
  '4-3-3': [
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
  ],
  '3-5-2': [
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
  ],
  '3-4-3': [
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
  ],
};

const VerPlantillaUsuario: React.FC<{ navigation: NativeStackNavigationProp<any> }> = ({ navigation }) => {
  const route = useRoute<VerPlantillaRoute>();
  const { ligaId, ligaName, division = 'primera', userId, userName, jornada: selectedJornada } = route.params;
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [squadValue, setSquadValue] = useState<number>(0); // Valor total de la plantilla
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, { photo?: string; teamCrest?: string; position?: string }>>({});
  const [playerPoints, setPlayerPoints] = useState<Record<number, { points: number | null; minutes: number | null }>>({});
  const [currentJornada, setCurrentJornada] = useState<number | null>(null);
  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'in_progress' | 'closed'>('open');
  const [isHistorical, setIsHistorical] = useState(false); // Indica si estamos viendo una plantilla histórica
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [userLeagues, setUserLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [copying, setCopying] = useState(false);
  const [userBudget, setUserBudget] = useState<number | null>(null);
  
  // Calcular ancho del campo a pantalla completa
  const windowWidth = Dimensions.get('window').width;
  const fieldWidth = windowWidth;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Jornada actual
        let jornadaActual: number | null = null;
        let statusActual: 'open' | 'in_progress' | 'closed' = 'open';
        try {
          const status = await JornadaService.getJornadaStatus(ligaId);
          jornadaActual = status.currentJornada;
          statusActual = status.status as 'open' | 'in_progress' | 'closed';
          setCurrentJornada(jornadaActual);
          setJornadaStatus(statusActual);
        } catch {}
        
        // Determinar si estamos viendo una jornada histórica
        const viewingHistorical = selectedJornada && jornadaActual && selectedJornada < jornadaActual;
        setIsHistorical(viewingHistorical || false);
        
        let s: Squad | null = null;
        
        if (viewingHistorical) {
          // Cargar plantilla histórica
          console.log(`[VerPlantillaUsuario] Cargando plantilla histórica: Jornada ${selectedJornada}`);
          const history = await SquadService.getSquadHistory(ligaId, userId, selectedJornada);
          
          if (history) {
            // Convertir el formato de history a Squad para compatibilidad
            s = {
              id: 'historical',
              userId,
              leagueId: ligaId,
              name: `Plantilla J${selectedJornada}`,
              formation: history.formation,
              isActive: false,
              createdAt: history.createdAt,
              updatedAt: history.createdAt,
              players: history.players.map(p => ({
                id: `hist-${p.playerId}-${p.position}`,
                squadId: 'historical',
                playerId: p.playerId,
                playerName: p.playerName,
                position: p.position,
                role: p.role,
                pricePaid: p.pricePaid,
                isCaptain: p.isCaptain,
                createdAt: history.createdAt
              }))
            };
            setSquadValue(history.totalValue);
          }
        } else {
          // Cargar plantilla actual
          s = await SquadService.getSquadByUser(ligaId, userId);
          
          // Calcular valor de la plantilla actual
          if (s && s.players) {
            const totalValue = s.players.reduce((sum, p) => sum + (p.pricePaid || 0), 0);
            setSquadValue(totalValue);
          }
        }
        
        setSquad(s);
        
        // Cargar presupuesto del usuario si no es histórico
        if (!viewingHistorical) {
          try {
            const budget = await SquadService.getUserBudget(ligaId);
            setUserBudget(budget);
          } catch (err) {
            console.warn('[VerPlantillaUsuario] Error cargando presupuesto:', err);
          }
        }
        
        // Cargar fotos y puntos si hay plantilla
        if (s && s.players && s.players.length) {
          const ids = s.players.map(p => p.playerId);
          // Fotos
          try {
            const details = await Promise.all(ids.map(async (id) => {
              try {
                const det = await PlayerService.getPlayerById(id);
                // Include canonical position from PlayerService so PlayerDetail can normalize it
                return { id, photo: det.photo, teamCrest: det.teamCrest, position: det.position };
              } catch {
                return { id, photo: undefined, teamCrest: undefined, position: undefined };
              }
            }));
            const photosMap: Record<number, { photo?: string; teamCrest?: string }> = {};
            for (const d of details) photosMap[d.id] = { photo: d.photo, teamCrest: d.teamCrest };
            setPlayerPhotos(photosMap);
          } catch {}

          // Puntos de la jornada seleccionada o actual
          const jornadaToLoad = viewingHistorical ? selectedJornada : jornadaActual;
          if (jornadaToLoad != null) {
            try {
              const pointsWithDefaults: Record<number, { points: number | null; minutes: number | null }> = {};

              // ✅ Durante partidos en vivo, refrescar datos desde la BD
              // El worker centralizado actualiza PlayerStats cada 2 minutos durante matches
              // Forzar refresh si la jornada está en progreso para obtener puntos actualizados
              const shouldRefresh = statusActual === 'in_progress' && !viewingHistorical;
              
              // 🔍 Obtener la división de cada jugador para ajustar la jornada correctamente
              // Los jugadores de Segunda División van 2 jornadas adelante de Primera División
              const playerDivisions: Record<number, string> = {};
              try {
                const divisionPromises = ids.map(async (pid) => {
                  try {
                    const player = await PlayerService.getPlayerById(pid);
                    return { pid, division: player.division || 'primera' };
                  } catch {
                    return { pid, division: 'primera' };
                  }
                });
                const divisionResults = await Promise.all(divisionPromises);
                for (const result of divisionResults) {
                  playerDivisions[result.pid] = result.division;
                }
              } catch (err) {
                console.warn('[VerPlantillaUsuario] Error obteniendo divisiones de jugadores:', err);
              }
              
              const chunkSize = 8;
              const batches: number[][] = [];
              for (let i = 0; i < ids.length; i += chunkSize) batches.push(ids.slice(i, i + chunkSize));

              for (const batch of batches) {
                const promises = batch.map(pid => {
                  // ✨ CLAVE: Ajustar la jornada según la división del JUGADOR
                  // Si el jugador es de segunda y la liga es de primera, el jugador va 2 jornadas adelante
                  const playerDiv = playerDivisions[pid] || 'primera';
                  let jornadaAjustada = jornadaToLoad!;
                  
                  // Si la liga es de primera pero el jugador es de segunda, sumar 2
                  if (division === 'primera' && playerDiv === 'segunda') {
                    jornadaAjustada = jornadaToLoad! + 2;
                  }
                  // Si la liga es de segunda pero el jugador es de primera, restar 2
                  else if (division === 'segunda' && playerDiv === 'primera') {
                    jornadaAjustada = Math.max(1, jornadaToLoad! - 2);
                  }
                  
                  return PlayerStatsService.getPlayerJornadaStats(pid, jornadaAjustada, { refresh: shouldRefresh })
                    .then(s => ({ pid, s }))
                    .catch(() => ({ pid, s: null }));
                });
                
                const results = await Promise.all(promises);
                for (const r of results) {
                  if (r.s) {
                    pointsWithDefaults[r.pid] = { 
                      points: r.s.totalPoints ?? null, 
                      minutes: r.s.minutes ?? null 
                    };
                  } else {
                    pointsWithDefaults[r.pid] = { points: null, minutes: null };
                  }
                }
              }

              setPlayerPoints(pointsWithDefaults);
            } catch (err) {
              // si algo falla, dejar puntos vacíos
              console.warn('[VerPlantillaUsuario] Error cargando puntos:', err);
            }
          }
        }
      } catch (e) {
        setSquad(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ligaId, userId, currentJornada]);

  // Función para abrir el modal de copiar plantilla
  const handleOpenCopyModal = async () => {
    try {
      // Obtener ID del usuario autenticado
      const currentUserId = await EncryptedStorage.getItem('userId');
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }
      
      // Cargar todas las ligas del usuario
      const leagues = await LigaService.obtenerLigasPorUsuario(currentUserId);
      
      // Filtrar para mostrar ligas de la misma división
      // ✅ AHORA: Incluir liga actual SI está en estado 'open' (jornada abierta)
      // ✅ ANTES: Excluía siempre la liga actual
      const availableLeagues = leagues.filter((l: any) => {
        // Debe ser misma división
        if (l.division !== division) return false;
        
        // Si es otra liga, incluir siempre
        if (l.id !== ligaId) return true;
        
        // Si es la liga actual, solo incluir si está en estado 'open'
        return jornadaStatus === 'open';
      });
      
      if (availableLeagues.length === 0) {
        const divisionName = division === 'primera' ? 'Primera División' : division === 'segunda' ? 'Segunda División' : 'Premier League';
        const message = jornadaStatus === 'open' 
          ? `No tienes otras ligas de ${divisionName} donde copiar esta plantilla`
          : `No tienes otras ligas de ${divisionName} donde copiar esta plantilla. La liga actual no está disponible porque la jornada ya ha comenzado`;
        
        CustomAlertManager.alert(
          'Sin ligas disponibles',
          message,
          [{ text: 'OK', onPress: () => {}, style: 'default' }],
          { icon: 'information', iconColor: '#0892D0' }
        );
        return;
      }
      
      setUserLeagues(availableLeagues);
      setShowCopyModal(true);
    } catch (error) {
      console.error('Error al cargar ligas:', error);
      CustomAlertManager.alert(
        'Error',
        'No se pudieron cargar tus ligas',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    }
  };

  // Función para copiar plantilla a otra liga
  const handleCopyToLeague = async (targetLigaId: string, targetLigaName: string) => {
    if (!squad || !squad.players || squad.players.length === 0) {
      CustomAlertManager.alert(
        'Plantilla vacía',
        'No hay jugadores para copiar',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    setCopying(true);
    setShowCopyModal(false);

    try {
      const sourcePlayers = squad.players.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        position: p.position,
        role: p.role,
        pricePaid: p.pricePaid,
        isCaptain: p.isCaptain
      }));

      const captainPosition = squad.players.find(p => p.isCaptain)?.position;

      const result = await SquadService.copySquad(
        targetLigaId,
        sourcePlayers,
        squad.formation,
        captainPosition
      );

      // Encontrar los datos completos de la liga destino
      const targetLeague = userLeagues.find((l: any) => l.id === targetLigaId);

      // Función para navegar a la liga destino
      const navigateToTargetLeague = () => {
        if (targetLeague) {
          navigation.replace('MiPlantilla', {
            ligaId: targetLigaId,
            ligaName: targetLigaName,
            division: targetLeague.division || division,
            isPremium: targetLeague.isPremium || false
          });
        }
      };

      if (result.isNegativeBudget) {
        CustomAlertManager.alert(
          '⚠️ Presupuesto Negativo',
          `Plantilla copiada a ${targetLigaName}.\n\nPresupuesto actual: ${result.budget}M.\n\nDebes ajustar tu plantilla antes del inicio de la jornada o no puntuarás.`,
          [{ 
            text: 'Ver Plantilla', 
            onPress: navigateToTargetLeague, 
            style: 'default' 
          }],
          { icon: 'alert', iconColor: '#f59e0b' }
        );
      } else {
        // Navegar directamente a la liga destino
        navigateToTargetLeague();
      }
    } catch (error: any) {
      console.error('Error al copiar plantilla:', error);
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo copiar la plantilla',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setCopying(false);
    }
  };

  if (loading || copying) return <LoadingScreen />;

  // Detectar si debe mostrar warning centrado
  const isIncomplete = squad && squad.players && squad.players.length < 11;
  const isNegativeBudget = !isHistorical && userBudget !== null && userBudget < 0 && (jornadaStatus === 'in_progress' || jornadaStatus === 'closed');
  const showCenteredWarning = isIncomplete || isNegativeBudget;

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient colors={["#181818ff", "#181818ff"]} style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          backgroundColor: '#181818', borderBottomWidth: 0.5, borderBottomColor: '#333',
          paddingVertical: 10, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} activeOpacity={0.8}>
          <ChevronLeftIcon size={28} color="#0892D0" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 }} numberOfLines={1}>
          {userName?.toUpperCase()} <Text style={{ color: '#0892D0' }}>- {ligaName?.toUpperCase()}</Text>
        </Text>
        {/* Botón copiar plantilla */}
        {squad && squad.players && squad.players.length > 0 && (
          <TouchableOpacity onPress={handleOpenCopyModal} style={{ padding: 4 }} activeOpacity={0.8}>
            <ContentCopyIcon size={24} color="#10b981" />
          </TouchableOpacity>
        )}
        {(!squad || !squad.players || squad.players.length === 0) && <View style={{ width: 28 }} />}
      </View>

      {/* Warnings centrados (plantilla incompleta o presupuesto negativo) */}
      {showCenteredWarning ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              backgroundColor: '#451a03',
              borderRadius: 20,
              padding: 32,
              borderWidth: 3,
              borderColor: '#f59e0b',
              maxWidth: 500,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <AlertIcon size={80} color="#fbbf24" />
            </View>
            
            {isIncomplete && (
              <>
                <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 }}>
                  Plantilla Incompleta
                </Text>
                <Text style={{ color: '#fcd34d', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
                  Se requiere una plantilla completa (11 jugadores) para poder puntuar en esta jornada.
                </Text>
              </>
            )}
            
            {isNegativeBudget && (
              <>
                <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 }}>
                  Presupuesto Negativo
                </Text>
                <Text style={{ color: '#fcd34d', fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 12 }}>
                  Esta plantilla tenía presupuesto negativo cuando comenzó la jornada.
                </Text>
                <Text style={{ color: '#fcd34d', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
                  Presupuesto: <Text style={{ fontWeight: '800' }}>{userBudget}M</Text>
                </Text>
                <Text style={{ color: '#fcd34d', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12, opacity: 0.8 }}>
                  No se obtendrán puntos en esta jornada.
                </Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* Mostrar valor de la plantilla */}
          {squad && squad.players && squad.players.length > 0 && (
            <View
              style={{
                marginTop: Platform.OS === 'ios' ? 90 : 76,
                marginHorizontal: 16,
                marginBottom: 12,
                backgroundColor: '#1a2332',
                borderRadius: 12,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#10b981',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                  {isHistorical ? `Valor J${selectedJornada}` : 'Valor Plantilla'}
                </Text>
                <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '700' }}>
                  {squadValue}M
                </Text>
              </View>
            </View>
          )}

          {/* Banner publicitario */}
          <View style={{ marginHorizontal: 16, marginTop: squad && squad.players && squad.players.length > 0 ? 8 : 60, marginBottom: 16 }}>
            <AdBanner />
          </View>

          <View style={{ flex: 1, paddingTop: 0, paddingHorizontal: 0, paddingBottom: 20 }}>
        {/* Campo de fútbol a pantalla completa */}
        <View style={{ flex: 1 }}>
          <View style={{
            flex: 1,
            width: '100%',
            backgroundColor: '#0f0f0f',
            borderRadius: 16,
            borderWidth: 3,
            borderColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            overflow: 'visible',
            position: 'relative'
          }}>
              {/* Badge de puntuación total - arriba derecha */}
              {(() => {
                // Calcular puntos individuales
                const sumPoints = squad?.players.reduce((sum, player) => {
                  const pid = player.playerId;
                  const ptsObj = pid != null ? playerPoints[pid] : undefined;
                  const points = ptsObj?.points ?? 0;
                  return sum + (player.isCaptain ? points * 2 : points);
                }, 0) ?? 0;

                // ⚠️ Si hay menos de 11 jugadores, el total es 0
                const totalPoints = (squad && squad.players && squad.players.length < 11) ? 0 : sumPoints;

                return (
                  <View
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      backgroundColor: '#10b981',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: 3,
                      borderColor: '#fff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.5,
                      shadowRadius: 6,
                      elevation: 10,
                      zIndex: 1000
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                      TOTAL
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                      {totalPoints}
                    </Text>
                  </View>
                );
              })()}
              
              {/* Línea central */}
              <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#fff', opacity: 0.9 }} />
              {/* Círculo central */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#fff', opacity: 0.9, marginLeft: -40, marginTop: -40 }} />
              {/* Punto central */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginLeft: -3, marginTop: -3 }} />
              {/* Áreas del portero (arriba/abajo) */}
              <View style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: 70, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', top: 0, left: '35%', width: '30%', height: 35, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', bottom: 0, left: '25%', width: '50%', height: 70, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', bottom: 0, left: '35%', width: '30%', height: 35, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />

              {squad && formationPositions[squad.formation]?.map(position => {
                const player = squad.players.find(p => p.position === position.id);
                const pid = player?.playerId;
                const photo = pid ? playerPhotos[pid]?.photo : undefined;
                const crest = pid ? playerPhotos[pid]?.teamCrest : undefined;
                
                // Calcular tamaño adaptativo con margen lateral del 8% a cada lado
                const usableWidth = fieldWidth * 0.84; // 84% del ancho (dejando 8% a cada lado)
                const playerSize = Math.min(70, usableWidth * 0.19); // Ligeramente más grande
                const containerWidth = playerSize + 20;
                const containerHeight = playerSize + 40;
                
                return (
                  <View key={position.id} style={{ 
                    position: 'absolute', 
                    left: `${position.x}%`, 
                    top: `${position.y}%`, 
                    width: containerWidth, 
                    height: containerHeight, 
                    marginLeft: -(containerWidth / 2), 
                    marginTop: -(containerHeight / 2), 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 50, 
                    elevation: 10 
                  }}>
                    {player ? (
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ 
                          width: playerSize, 
                          height: playerSize, 
                          borderRadius: playerSize / 2, 
                          borderWidth: 2, 
                          borderColor: player.isCaptain ? '#ffd700' : '#0892D0', 
                          backgroundColor: '#0b1220', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          shadowColor: '#000', 
                          shadowOffset: { width: 0, height: 8 }, 
                          shadowOpacity: 0.35, 
                          shadowRadius: 12, 
                          elevation: 8, 
                          position: 'relative', 
                          overflow: 'visible' 
                        }}>
                          <View style={{ overflow: 'hidden', borderRadius: (playerSize - 4) / 2, width: playerSize - 4, height: playerSize - 4 }}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                // Navegar a detalles del jugador. Construimos un objeto "player" mínimo
                                // con los campos que PlayerDetail espera (id, name, photo, position, price).
                                const pid = player.playerId;
                                // Prefer canonical position from the PlayerService lookup; fall back to squad role if needed
                                const canonicalPos = pid ? playerPhotos[pid]?.position : undefined;
                                // Si no hay posición canónica, convertir el role (POR/DEF/CEN/DEL) a formato canónico
                                const finalPosition = canonicalPos || roleToCanonicalPosition(player.role || position.role);
                                
                                const playerForNav = {
                                  id: pid,
                                  name: player.playerName,
                                  photo: photo,
                                  position: finalPosition,
                                  price: (player.pricePaid as any) || undefined,
                                };

                                navigation.navigate('PlayerDetail', {
                                  player: playerForNav,
                                  ligaId,
                                  ligaName,
                                  isAlreadyInSquad: true,
                                  currentFormation: squad?.formation,
                                });
                              }}
                            >
                              <Image
                                key={`player-photo-ver-${pid}-${position.id}-${player.playerName}`}
                                source={{ 
                                  uri: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=334155&color=fff&size=128&length=2`,
                                  cache: 'reload'
                                }} 
                                style={{ width: playerSize - 4, height: playerSize - 4, borderRadius: (playerSize - 4) / 2 }} 
                                resizeMode="cover" 
                              />
                            </TouchableOpacity>
                          </View>
                          {/* Escudo del equipo */}
                          {/* Indicador x2 (capitán) o Escudo (no capitán) - arriba izquierda */}
                          {player.isCaptain ? (
                            <View style={{ position: 'absolute', top: -8, left: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffd700', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 }}>
                              <Text style={{ color: '#1f2937', fontWeight: '900', fontSize: 10 }}>x2</Text>
                            </View>
                          ) : (
                            crest && (
                              <View style={{ position: 'absolute', top: -4, left: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 }}>
                                <Image
                                  key={`team-crest-ver-${pid}-${position.id}-${player.teamId}`}
                                  source={{ 
                                    uri: crest,
                                    cache: 'reload'
                                  }}
                                  style={{ width: 20, height: 20, borderRadius: 10 }}
                                  resizeMode="contain"
                                />
                              </View>
                            )
                          )}

                          {/* Badge de puntos - arriba derecha */}
                          <View style={{ 
                            position: 'absolute', 
                            top: -10, 
                            right: -8,
                            minWidth: 36,
                            height: 34, 
                            borderRadius: 18, 
                            backgroundColor: '#0892D0', 
                            borderWidth: 2, 
                            borderColor: '#fff', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            paddingHorizontal: 6,
                            shadowColor: '#000', 
                            shadowOffset: { width: 0, height: 2 }, 
                            shadowOpacity: 0.4, 
                            shadowRadius: 4, 
                            elevation: 6,
                            zIndex: 60
                          }}>
                              {(() => {
                                const pointsObj = pid != null ? playerPoints[pid] : undefined;
                                // Mostrar '-' cuando:
                                // - No hay datos de puntos (points es null) OR
                                // - El jugador no ha jugado minutos en la jornada actual (minutes === 0 o null)
                                // Excepción: si la jornada está en progreso, mostrar puntos aunque minutes === 0
                                const hasPointsValue = pointsObj && pointsObj.points !== null && pointsObj.points !== undefined;
                                const minutes = pointsObj?.minutes ?? null;
                                const playedAnyMinutes = typeof minutes === 'number' && minutes > 0;
                                const shouldShowPoints = hasPointsValue && (playedAnyMinutes || jornadaStatus === 'in_progress');

                                if (!shouldShowPoints) {
                                  return (
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>-</Text>
                                  );
                                }

                                const ptsNum = pointsObj!.points!;
                                const displayNum = player.isCaptain ? ptsNum * 2 : ptsNum;

                                return (
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{displayNum}</Text>
                                );
                              })()}
                          </View>
                          {/* (crest arriba-izq ya mostrado o x2 si capitán) */}
                        </View>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: Math.max(11, playerSize * 0.16), 
                          fontWeight: '800', 
                          marginTop: 8, 
                          maxWidth: containerWidth,
                          textAlign: 'center'
                        }} numberOfLines={1} ellipsizeMode="tail">
                          {player.playerName}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', opacity: 0.5 }}>
                        <View style={{ 
                          width: playerSize, 
                          height: playerSize, 
                          borderRadius: playerSize / 2, 
                          borderWidth: 2, 
                          borderColor: '#334155', 
                          backgroundColor: '#0b1220', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Text style={{ color: '#64748b', fontWeight: 'bold', fontSize: Math.max(12, playerSize * 0.2) }}>{position.role}</Text>
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Vacío</Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        </View>
          </View>
        </>
      )}

      {/* Modal para seleccionar liga destino */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#181818', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Seleccionar Liga</Text>
              <TouchableOpacity onPress={() => setShowCopyModal(false)} activeOpacity={0.8}>
                <Text style={{ color: '#0892D0', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
              La plantilla se copiará y se descontará su valor ({squadValue}M) del presupuesto de la liga seleccionada.
            </Text>

            <FlatList
              data={userLeagues}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCopyToLeague(item.id, item.name)}
                  style={{
                    backgroundColor: '#1a2332',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#334155'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 20 }}>
                  No hay ligas disponibles
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      </LinearGradient>
    </SafeLayout>
  );
};

export default VerPlantillaUsuario;