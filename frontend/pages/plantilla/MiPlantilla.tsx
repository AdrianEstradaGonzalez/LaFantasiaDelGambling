import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import FootballService, { Player } from '../../services/FutbolService';
import { SquadService } from '../../services/SquadService';
import LigaNavBar from '../navBar/LigaNavBar';

type Formation = {
  id: string;
  name: string;
  positions: {
    id: string;
    role: 'GK' | 'DEF' | 'MID' | 'ATT';
    x: number; // percentage from left
    y: number; // percentage from top
  }[];
};

const formations: Formation[] = [
  {
    id: '4-4-2',
    name: '4-4-2',
    positions: [
      { id: 'gk', role: 'GK', x: 50, y: 90 },
      { id: 'def1', role: 'DEF', x: 15, y: 72 },
      { id: 'def2', role: 'DEF', x: 35, y: 75 },
      { id: 'def3', role: 'DEF', x: 65, y: 75 },
      { id: 'def4', role: 'DEF', x: 85, y: 72 },
      { id: 'mid1', role: 'MID', x: 20, y: 50 },
      { id: 'mid2', role: 'MID', x: 40, y: 53 },
      { id: 'mid3', role: 'MID', x: 60, y: 53 },
      { id: 'mid4', role: 'MID', x: 80, y: 50 },
      { id: 'att1', role: 'ATT', x: 35, y: 25 },
      { id: 'att2', role: 'ATT', x: 65, y: 25 },
    ]
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    positions: [
      { id: 'gk', role: 'GK', x: 50, y: 90 },
      { id: 'def1', role: 'DEF', x: 15, y: 72 },
      { id: 'def2', role: 'DEF', x: 35, y: 75 },
      { id: 'def3', role: 'DEF', x: 65, y: 75 },
      { id: 'def4', role: 'DEF', x: 85, y: 72 },
      { id: 'mid1', role: 'MID', x: 25, y: 52 },
      { id: 'mid2', role: 'MID', x: 50, y: 48 },
      { id: 'mid3', role: 'MID', x: 75, y: 52 },
      { id: 'att1', role: 'ATT', x: 20, y: 25 },
      { id: 'att2', role: 'ATT', x: 50, y: 20 },
      { id: 'att3', role: 'ATT', x: 80, y: 25 },
    ]
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    positions: [
      { id: 'gk', role: 'GK', x: 50, y: 90 },
      { id: 'def1', role: 'DEF', x: 25, y: 72 },
      { id: 'def2', role: 'DEF', x: 50, y: 75 },
      { id: 'def3', role: 'DEF', x: 75, y: 72 },
      { id: 'mid1', role: 'MID', x: 12, y: 50 },
      { id: 'mid2', role: 'MID', x: 32, y: 53 },
      { id: 'mid3', role: 'MID', x: 50, y: 48 },
      { id: 'mid4', role: 'MID', x: 68, y: 53 },
      { id: 'mid5', role: 'MID', x: 88, y: 50 },
      { id: 'att1', role: 'ATT', x: 35, y: 25 },
      { id: 'att2', role: 'ATT', x: 65, y: 25 },
    ]
  },
  {
    id: '4-5-1',
    name: '4-5-1',
    positions: [
      { id: 'gk', role: 'GK', x: 50, y: 90 },
      { id: 'def1', role: 'DEF', x: 15, y: 72 },
      { id: 'def2', role: 'DEF', x: 35, y: 75 },
      { id: 'def3', role: 'DEF', x: 65, y: 75 },
      { id: 'def4', role: 'DEF', x: 85, y: 72 },
      { id: 'mid1', role: 'MID', x: 15, y: 50 },
      { id: 'mid2', role: 'MID', x: 32, y: 53 },
      { id: 'mid3', role: 'MID', x: 50, y: 48 },
      { id: 'mid4', role: 'MID', x: 68, y: 53 },
      { id: 'mid5', role: 'MID', x: 85, y: 50 },
      { id: 'att1', role: 'ATT', x: 50, y: 25 },
    ]
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    positions: [
      { id: 'gk', role: 'GK', x: 50, y: 90 },
      { id: 'def1', role: 'DEF', x: 10, y: 68 },
      { id: 'def2', role: 'DEF', x: 30, y: 75 },
      { id: 'def3', role: 'DEF', x: 50, y: 78 },
      { id: 'def4', role: 'DEF', x: 70, y: 75 },
      { id: 'def5', role: 'DEF', x: 90, y: 68 },
      { id: 'mid1', role: 'MID', x: 25, y: 50 },
      { id: 'mid2', role: 'MID', x: 50, y: 48 },
      { id: 'mid3', role: 'MID', x: 75, y: 50 },
      { id: 'att1', role: 'ATT', x: 35, y: 25 },
      { id: 'att2', role: 'ATT', x: 65, y: 25 },
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
    case 'GK': return '#f59e0b'; // amber
    case 'DEF': return '#3b82f6'; // blue
    case 'MID': return '#10b981'; // green
    case 'ATT': return '#ef4444'; // red
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
  
  // Estados para detectar cambios
  const [originalFormation, setOriginalFormation] = useState<Formation>(formations[0]);
  const [originalPlayers, setOriginalPlayers] = useState<Record<string, any>>({});
  
  // Función para comparar si hay cambios
  const hasChanges = () => {
    // Comparar formación
    if (selectedFormation.id !== originalFormation.id) return true;
    
    // Comparar jugadores (solo IDs para eficiencia)
    const currentPlayerIds = Object.keys(selectedPlayers).sort().map(pos => `${pos}:${selectedPlayers[pos]?.id || 'empty'}`).join(',');
    const originalPlayerIds = Object.keys(originalPlayers).sort().map(pos => `${pos}:${originalPlayers[pos]?.id || 'empty'}`).join(',');
    
    return currentPlayerIds !== originalPlayerIds;
  };

  // Función para adaptar jugadores a nueva formación
  const adaptPlayersToFormation = (newFormation: Formation, currentPlayers: Record<string, any>) => {
    const adaptedPlayers: Record<string, any> = {};
    
    // Contar posiciones disponibles por rol en la nueva formación
    const availablePositionsByRole: Record<string, string[]> = {
      'GK': [],
      'DEF': [],
      'MID': [],
      'ATT': []
    };
    
    newFormation.positions.forEach(pos => {
      availablePositionsByRole[pos.role].push(pos.id);
    });
    
    // Agrupar jugadores actuales por rol
    const playersByRole: Record<string, Array<{positionId: string, player: any}>> = {
      'GK': [],
      'DEF': [],
      'MID': [],
      'ATT': []
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
        const existingSquad = await SquadService.getUserSquad(ligaId);
        
        if (existingSquad) {
          // Cargar formación existente
          const formation = formations.find(f => f.id === existingSquad.formation);
          if (formation) {
            setSelectedFormation(formation);
            setOriginalFormation(formation); // Guardar formación original
          }

          // Cargar jugadores existentes con datos completos
          const allPlayers = await FootballService.getAllPlayersCached();
          const playersMap: Record<string, any> = {};
          
          existingSquad.players.forEach(squadPlayer => {
            // Buscar el jugador completo en la lista
            const fullPlayer = allPlayers.find(p => p.id === squadPlayer.playerId);
            if (fullPlayer) {
              playersMap[squadPlayer.position] = fullPlayer;
            } else {
              // Fallback si no se encuentra el jugador
              playersMap[squadPlayer.position] = {
                id: squadPlayer.playerId,
                name: squadPlayer.playerName,
              };
            }
          });
          setSelectedPlayers(playersMap);
          setOriginalPlayers(playersMap); // Guardar jugadores originales
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

  const selectPlayer = (positionId: string) => {
    // Navegar a la lista de jugadores con filtro por posición
    const position = selectedFormation.positions.find(p => p.id === positionId);
    if (position) {
      navigation.navigate('PlayersList', { 
        selectMode: true, 
        filterByRole: position.role,
        onPlayerSelected: (player: any) => {
          setSelectedPlayers(prev => ({ ...prev, [positionId]: player }));
        }
      });
    }
  };

  const removePlayer = (positionId: string) => {
    setSelectedPlayers(prev => {
      const newPlayers = { ...prev };
      delete newPlayers[positionId];
      return newPlayers;
    });
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
          role: selectedFormation.positions.find(p => p.id === position)?.role || 'DEF'
        }))
      };

      await SquadService.saveSquad(ligaId, squadData);
      // Plantilla guardada silenciosamente, sin popup
      
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
    <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#cbd5e1', fontSize: 16 }}>Cargando plantilla...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
          {/* Header con título y botón guardar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800' }}>Mi Plantilla</Text>
              {ligaName && <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>{ligaName}</Text>}
            </View>
            
            {ligaId && hasChanges() && (
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
            )}
          </View>
        
        {/* Selector de Formación */}
        <Dropdown
          label="Formación"
          value={selectedFormation.id}
          onValueChange={(formationId) => {
            const formation = formations.find(f => f.id === formationId);
            if (formation) {
              // Adaptar jugadores a la nueva formación
              const adaptedPlayers = adaptPlayersToFormation(formation, selectedPlayers);
              setSelectedFormation(formation);
              setSelectedPlayers(adaptedPlayers);
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
                  width: 70,
                  height: 95,
                  marginLeft: -35,
                  marginTop: -47,
                  alignItems: 'center'
                }}
              >
                {player ? (
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        borderWidth: 2,
                        borderColor: '#fff',
                        backgroundColor: '#0b1220',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                        overflow: 'hidden'
                      }}
                    >
                      <Image
                        source={{ uri: photoUri }}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28
                        }}
                        resizeMode="cover"
                      />
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
                      width: 60,
                      height: 60,
                      borderRadius: 30,
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
                    <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: 'bold' }}>
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
            Object.entries(selectedPlayers).map(([positionId, player]) => {
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
                    <Text style={{ color: '#cbd5e1', fontWeight: '600' }}>{player.name}</Text>
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
      )}
      
      {/* Barra de navegación */}
      <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
    </LinearGradient>
  );
};

export default MiPlantilla;