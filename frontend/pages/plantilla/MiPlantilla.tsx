import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import FootballService, { Player } from '../../services/FutbolService';
import { SquadService } from '../../services/SquadService';
import { PlayerService } from '../../services/PlayerService';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';

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
    // Múltiples nombres: primera letra de cada palabra (máx 2)
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
  items 
}: { 
  label: string; 
  value: any; 
  onValueChange: (value: any) => void; 
  items: { label: string; value: any }[] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = items.find(item => item.value === value)?.label || label;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</Text>
      <View>
        <TouchableOpacity
          onPress={() => setIsOpen(!isOpen)}
          style={{
            backgroundColor: '#1a2332',
            borderWidth: 1,
            borderColor: '#334155',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', flex: 1 }}>{selectedLabel}</Text>
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
  
  const [selectedFormation, setSelectedFormation] = useState<Formation>(formations[0]);
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingFormation, setIsChangingFormation] = useState(false);
  const [budget, setBudget] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<string | null>(null);
  
  // Estados para detectar cambios
  const [originalFormation, setOriginalFormation] = useState<Formation>(formations[0]);
  const [originalPlayers, setOriginalPlayers] = useState<Record<string, any>>({});
  
  // Listener para cuando se selecciona un jugador desde PlayersMarket
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Verificar si hay datos de vuelta de PlayersMarket
      const params = route.params as any;
      if (params?.selectedPlayer && params?.targetPosition) {
        setSelectedPlayers(prev => ({ 
          ...prev, 
          [params.targetPosition]: params.selectedPlayer 
        }));
        // Limpiar los parámetros
        navigation.setParams({ selectedPlayer: undefined, targetPosition: undefined });
      }
    });
    
    return unsubscribe;
  }, [navigation, route.params]);
  
  // Función para comparar si hay cambios
  const hasChanges = () => {
    // Comparar formación
    if (selectedFormation.id !== originalFormation.id) {
      console.log('Hay cambio en formación:', selectedFormation.id, '!=', originalFormation.id);
      return true;
    }
    
    // Obtener todas las posiciones únicas de ambos objetos
    const allPositions = new Set([
      ...Object.keys(selectedPlayers),
      ...Object.keys(originalPlayers)
    ]);
    
    // Comparar jugador por jugador en cada posición
    for (const pos of allPositions) {
      const currentPlayer = selectedPlayers[pos];
      const originalPlayer = originalPlayers[pos];
      
      // Si uno tiene jugador y el otro no, hay cambio
      if ((currentPlayer && !originalPlayer) || (!currentPlayer && originalPlayer)) {
        console.log('Hay cambio en posición', pos, ':', currentPlayer?.name || 'vacío', 'vs', originalPlayer?.name || 'vacío');
        return true;
      }
      
      // Si ambos tienen jugador pero son diferentes, hay cambio
      if (currentPlayer && originalPlayer && currentPlayer.id !== originalPlayer.id) {
        console.log('Hay cambio en posición', pos, ':', currentPlayer.name, 'vs', originalPlayer.name);
        return true;
      }
    }
    
    console.log('No hay cambios detectados');
    return false;
  };

  // Función para adaptar jugadores a nueva formación
  const adaptPlayersToFormation = (newFormation: Formation, currentPlayers: Record<string, any>) => {
    const adaptedPlayers: Record<string, any> = {};
    
    // Contar posiciones disponibles por rol en la nueva formación
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
      // Determinar el rol basado en la posición actual usando la formación actual
      const position = selectedFormation.positions.find(p => p.id === positionId);
      if (position && player) {
        playersByRole[position.role].push({ positionId, player });
      }
    });
    
    // Asignar jugadores a las nuevas posiciones disponibles
    Object.keys(availablePositionsByRole).forEach(role => {
      const availablePositions = availablePositionsByRole[role];
      const playersForRole = playersByRole[role];
      
      // Asignar jugadores hasta el límite de posiciones disponibles
      for (let i = 0; i < Math.min(availablePositions.length, playersForRole.length); i++) {
        adaptedPlayers[availablePositions[i]] = playersForRole[i].player;
      }
      
      // Si hay jugadores excedentes, los perderemos (este es el comportamiento deseado)
      if (playersForRole.length > availablePositions.length) {
        console.log(`Se eliminarán ${playersForRole.length - availablePositions.length} jugadores del rol ${role} al cambiar formación`);
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
        const [existingSquad, budgetData] = await Promise.all([
          SquadService.getUserSquad(ligaId),
          SquadService.getUserBudget(ligaId)
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

          // Cargar jugadores existentes con datos completos
          const allPlayers = await PlayerService.getAllPlayers(); // Cambio: ahora desde la BD
          const playersMap: Record<string, any> = {};
          
          existingSquad.players.forEach(squadPlayer => {
            // Buscar el jugador completo en la lista
            const fullPlayer = allPlayers.find(p => p.id === squadPlayer.playerId);
            if (fullPlayer) {
              // Agregar el pricePaid del squadPlayer al jugador completo
              playersMap[squadPlayer.position] = {
                ...fullPlayer,
                pricePaid: squadPlayer.pricePaid // IMPORTANTE: Preservar el precio pagado
              };
            } else {
              // Fallback si no se encuentra el jugador
              playersMap[squadPlayer.position] = {
                id: squadPlayer.playerId,
                name: squadPlayer.playerName,
                pricePaid: squadPlayer.pricePaid
              };
            }
          });
          setSelectedPlayers(playersMap);
          setOriginalPlayers(playersMap); // Guardar jugadores originales
          console.log('Jugadores originales cargados:', Object.keys(playersMap).length, 'jugadores');
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

  // Recargar presupuesto cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      const reloadBudget = async () => {
        if (ligaId) {
          try {
            const budgetData = await SquadService.getUserBudget(ligaId);
            setBudget(budgetData);
            console.log('Presupuesto recargado:', budgetData);
          } catch (error) {
            console.error('Error recargando presupuesto:', error);
          }
        }
      };
      
      reloadBudget();
    }, [ligaId])
  );

  const selectPlayer = (positionId: string) => {
    // Navegar al mercado con filtro por posición
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
      Alert.alert('Error', 'No se puede eliminar el jugador sin una liga');
      return;
    }

    try {
      // Llamar al servicio para eliminar el jugador y actualizar presupuesto
      const result = await SquadService.removePlayerFromSquad(ligaId, positionId);
      
      // Actualizar el presupuesto local
      setBudget(result.budget);
      
      // Eliminar el jugador del estado local
      setSelectedPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[positionId];
        return newPlayers;
      });
      
    } catch (error: any) {
      console.error('Error al vender jugador:', error);
      Alert.alert('Error', error.message || 'No se pudo vender el jugador');
    }
  };

  const saveSquad = async () => {
    if (!ligaId) {
      Alert.alert('Error', 'No se puede guardar la plantilla sin seleccionar una liga');
      return;
    }

    const playersList = Object.entries(selectedPlayers);
    // Permitir guardar plantilla vacía - se eliminó la validación

    setIsSaving(true);
    try {
      const squadData = {
        formation: selectedFormation.id,
        players: playersList.map(([position, player]) => ({
          position,
          playerId: player.id,
          playerName: player.name,
          role: selectedFormation.positions.find(p => p.id === position)?.role || 'DEF',
          // Enviar pricePaid si está disponible (para jugadores recién agregados o existentes)
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
      
      // Actualizar estados originales después de guardar exitosamente
      setOriginalFormation(selectedFormation);
      setOriginalPlayers({ ...selectedPlayers });
      
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      Alert.alert('Error', 'No se pudo guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} scrollEnabled={!isChangingFormation}>
          {/* Header con título y botón guardar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800' }}>Mi Plantilla</Text>
              {ligaName && <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>{ligaName}</Text>}
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
                console.log('Render botón guardar - ligaId:', ligaId, 'hasChanges:', hasChanges(), 'isChangingFormation:', isChangingFormation, 'shouldShow:', shouldShowButton);
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
          onValueChange={async (formationId) => {
            const formation = formations.find(f => f.id === formationId);
            if (formation && ligaId) {
              // Activar estado de carga
              setIsChangingFormation(true);
              
              // Adaptar jugadores a la nueva formación
              const adaptedPlayers = adaptPlayersToFormation(formation, selectedPlayers);
              setSelectedFormation(formation);
              setSelectedPlayers(adaptedPlayers);
              
              // Guardar formación inmediatamente en BD
              try {
                const playersList = Object.entries(adaptedPlayers).filter(([_, player]) => player !== null);
                
                const squadData = {
                  formation: formation.id,
                  players: playersList.map(([position, player]) => ({
                    position,
                    playerId: player.id,
                    playerName: player.name,
                    role: formation.positions.find(p => p.id === position)?.role || 'DEF',
                    pricePaid: player.pricePaid // Enviar pricePaid para preservar el precio
                  }))
                };

                const result = await SquadService.saveSquad(ligaId, squadData);
                
                // Actualizar presupuesto si se devolvió dinero por jugadores eliminados
                if (result.budget !== undefined) {
                  setBudget(result.budget);
                  if (result.refundedAmount && result.refundedAmount > 0) {
                    console.log(`Se devolvieron ${result.refundedAmount}M al cambiar formación`);
                  }
                }
                
                // Actualizar estados originales
                setOriginalFormation(formation);
                setOriginalPlayers({ ...adaptedPlayers });
                
              } catch (error) {
                console.error('Error al guardar formación:', error);
                Alert.alert('Error', 'No se pudo guardar la formación');
              } finally {
                // Desactivar estado de carga
                setIsChangingFormation(false);
              }
            }
          }}
          items={formations.map(f => ({ label: f.name, value: f.id }))}
        />

        {/* Campo de Fútbol */}
        <View style={{
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
          elevation: 8
        }}>
          {/* Líneas del campo */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#fff',
            opacity: 0.9
          }} />
          
          {/* Círculo central */}
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
          
          {/* Área del portero (arriba) */}
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
          
          {/* Área pequeña del portero (arriba) */}
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
          
          {/* Área del portero (abajo) */}
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
          
          {/* Área pequeña del portero (abajo) */}
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

          {/* Posiciones de jugadores */}
          {selectedFormation.positions.map(position => {
            const player = selectedPlayers[position.id];
            const photoUri = player?.photo || (player ? getAvatarUri(player) : undefined);
            
            return (
              <TouchableOpacity
                key={position.id}
                onPress={() => selectPlayer(position.id)}
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
                        borderColor: '#fff',
                        backgroundColor: '#0b1220',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.5,
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
                
                // Si son del mismo rol, ordenar por ID de posición
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
              
              return (
                <View key={positionId} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#334155'
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
                  <Image
                    source={{ uri: photoUri }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                    resizeMode="cover"
                  />
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#cbd5e1', fontWeight: '600' }}>{player.name}</Text>
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
                    style={{
                      backgroundColor: '#ef4444',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
          </ScrollView>
      
          {/* Barra de navegación */}
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
          
          {/* Overlay sutil cuando se está cambiando formación */}
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
        </LinearGradient>
      )}
    </>
  );
};

export default MiPlantilla;