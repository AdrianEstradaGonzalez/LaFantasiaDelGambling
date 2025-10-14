import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image, Alert, FlatList, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayerService, PlayerWithPrice } from '../../services/PlayerService';
import { SquadService } from '../../services/SquadService';
import FootballService, { TeamMinimal } from '../../services/FutbolService';
import LoadingScreen from '../../components/LoadingScreen';
import LigaNavBar from '../navBar/LigaNavBar';
import LigaTopNavBar from '../navBar/LigaTopNavBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LoginService } from '../../services/LoginService';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Buffer } from 'buffer';
import { useFocusEffect } from '@react-navigation/native';

// Icono de flecha para volver
const backIcon = require('../../assets/iconos/backIcon.png');

// Función para decodificar JWT
function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

// Función para normalizar texto (eliminar acentos y convertir a minúsculas)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Eliminar marcas diacríticas (acentos)
}

// Posiciones en español para los filtros
const positionsEs = ['Todos','Portero','Defensa','Centrocampista','Delantero'] as const;
type PositionFilterEs = typeof positionsEs[number];

// Normalización de posiciones
type CanonicalPos = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

// Mapeo de filtro ES -> canónico
const canonicalFromEs = (es: PositionFilterEs): CanonicalPos | undefined => {
  switch (es) {
    case 'Portero': return 'Goalkeeper';
    case 'Defensa': return 'Defender';
    case 'Centrocampista': return 'Midfielder';
    case 'Delantero': return 'Attacker';
    default: return undefined;
  }
};

// Colores por posición
const posColors: Record<CanonicalPos, string> = {
  Goalkeeper: '#f59e0b',
  Defender: '#3b82f6',
  Midfielder: '#10b981',
  Attacker: '#ef4444',
};

const posAbbr: Record<CanonicalPos, string> = {
  Goalkeeper: 'POR',
  Defender: 'DEF',
  Midfielder: 'CEN',
  Attacker: 'DEL',
};

const normalizePosition = (pos?: string): CanonicalPos | undefined => {
  if (!pos) return undefined;
  const p = pos.trim().toLowerCase();
  
  // Porteros
  if (p === 'goalkeeper' || p.includes('goal') || p.includes('keeper')) return 'Goalkeeper';
  
  // Defensas
  if (p === 'defender' || p.includes('defen') || p.includes('back')) return 'Defender';
  
  // Centrocampistas (incluye mediocentros defensivos)
  // Se evalúa ANTES que delanteros para capturar "Defensive Midfield", "Central Midfield", etc.
  if (p === 'midfielder' || p.includes('midfield') || p.includes('midf') || p === 'mid') return 'Midfielder';
  
  // Delanteros (incluye extremos/wingers)
  if (p === 'attacker' || p.includes('attack') || p.includes('forward') || p.includes('striker') || p.includes('wing')) return 'Attacker';
  
  return undefined;
};

const getAvatarUri = (p: PlayerWithPrice) => {
  const words = p.name.trim().split(/\s+/);
  let initials = '';
  if (words.length === 1) {
    initials = words[0].substring(0, 2).toUpperCase();
  } else {
    initials = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }
  const bg = '334155';
  const color = 'ffffff';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${color}&size=128&length=2`;
};

// Dropdown component con Modal
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
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={{
          backgroundColor: '#1a2332',
          borderWidth: 1,
          borderColor: '#334155',
          borderRadius: 10,
          paddingHorizontal: 12,
          height: 46,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', flex: 1, fontSize: 14 }} numberOfLines={1} ellipsizeMode="tail">
          {selectedLabel}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 16 }}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={{
            backgroundColor: '#1a2332',
            borderRadius: 12,
            width: '80%',
            maxHeight: '70%',
            borderWidth: 1,
            borderColor: '#334155',
          }}>
            <View style={{
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#334155'
            }}>
              <Text style={{ color: '#cbd5e1', fontSize: 16, fontWeight: '700' }}>{label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: index < items.length - 1 ? 1 : 0,
                    borderBottomColor: '#334155',
                    backgroundColor: item.value === value ? '#0892D0' : 'transparent'
                  }}
                >
                  <Text style={{ 
                    color: item.value === value ? '#fff' : '#cbd5e1',
                    fontWeight: item.value === value ? '700' : '400'
                  }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const PlayersMarket = ({ navigation, route }: { 
  navigation: NativeStackNavigationProp<any>; 
  route: RouteProp<any, any>; 
}) => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerWithPrice[]>([]);
  const [teams, setTeams] = useState<TeamMinimal[]>([]);
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editedPrices, setEditedPrices] = useState<{ [key: number]: number }>({});
  const [editedPositions, setEditedPositions] = useState<{ [key: number]: CanonicalPos }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [focusedPriceId, setFocusedPriceId] = useState<number | null>(null);
  const [budget, setBudget] = useState<number>(0);
  const [squadPlayerIds, setSquadPlayerIds] = useState<Set<number>>(new Set());

  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  
  // Modo selección (cuando viene desde MiPlantilla)
  const selectMode = route.params?.selectMode || false;
  const filterByRole = route.params?.filterByRole;
  const targetPosition = route.params?.targetPosition; // Posición específica donde fichar
  const currentFormation = route.params?.currentFormation; // Formación actual (aunque no esté guardada)
  const returnTo = route.params?.returnTo; // Pantalla a la que volver

  // Verificar si el usuario es admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = await EncryptedStorage.getItem('accessToken');
        if (token) {
          const payload = decodeJwt(token);
          const email = payload?.email || '';
          setIsAdmin(email === 'adrian.estrada2001@gmail.com');
        }
      } catch (error) {
        console.error('Error verificando admin:', error);
      }
    };
    checkAdmin();
  }, []);

  // Cargar jugadores y equipos desde el backend
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const playersData = await PlayerService.getAllPlayers();
      const teamsData = await FootballService.getLaLigaTeamsCached();
      
      setPlayers(playersData);
      setTeams(teamsData);
      
      // Cargar presupuesto y plantilla si tenemos ligaId
      if (ligaId) {
        try {
          const [budgetData, squad] = await Promise.all([
            SquadService.getUserBudget(ligaId),
            SquadService.getUserSquad(ligaId)
          ]);
          setBudget(budgetData);
          
          // Guardar IDs de jugadores ya fichados
          if (squad && squad.players) {
            const playerIds = new Set(squad.players.map(p => p.playerId));
            setSquadPlayerIds(playerIds);
          }
        } catch (error) {
          console.error('Error cargando presupuesto:', error);
          setBudget(0);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [ligaId]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Recargar presupuesto y plantilla cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      const reloadBudgetAndSquad = async () => {
        if (ligaId) {
          try {
            const [budgetData, squad] = await Promise.all([
              SquadService.getUserBudget(ligaId),
              SquadService.getUserSquad(ligaId)
            ]);
            setBudget(budgetData);
            
            // Actualizar IDs de jugadores fichados
            if (squad && squad.players) {
              const playerIds = new Set(squad.players.map(p => p.playerId));
              setSquadPlayerIds(playerIds);
            } else {
              setSquadPlayerIds(new Set());
            }
          } catch (error) {
            console.error('Error recargando presupuesto:', error);
          }
        }
      };
      
      reloadBudgetAndSquad();
    }, [ligaId])
  );

  // Aplicar filtro inicial si viene desde modo selección
  useEffect(() => {
    if (selectMode && filterByRole) {
      // Mapear rol a posición en español
      const roleToPosition: Record<string, PositionFilterEs> = {
        'POR': 'Portero',
        'DEF': 'Defensa',
        'CEN': 'Centrocampista',
        'DEL': 'Delantero'
      };
      const initialFilter = roleToPosition[filterByRole];
      if (initialFilter) {
        setPosFilter(initialFilter);
      }
    }
  }, [selectMode, filterByRole]);

  // Filtrado de jugadores
  const filtered = useMemo(() => {
    let list = players;
    
    // Filtro por rol si estamos en modo selección
    if (selectMode && filterByRole) {
      const roleMapping: Record<string, CanonicalPos> = {
        'POR': 'Goalkeeper',
        'DEF': 'Defender', 
        'CEN': 'Midfielder',
        'DEL': 'Attacker'
      };
      const targetRole = roleMapping[filterByRole];
      if (targetRole) {
        list = list.filter(p => {
          const n = normalizePosition(p.position);
          return n === targetRole;
        });
      }
    }
    
    // Filtro por posición del dropdown (solo si no está en modo selección con rol fijo)
    if (!selectMode || !filterByRole) {
      const canonical = canonicalFromEs(posFilter);
      if (canonical) {
        list = list.filter(p => {
          const n = normalizePosition(p.position);
          return n === canonical;
        });
      }
    }
    
    // Filtro por búsqueda de nombre (insensible a mayúsculas y acentos)
    if (query.trim()) {
      const normalizedQuery = normalizeText(query.trim());
      list = list.filter(p => normalizeText(p.name).includes(normalizedQuery));
    }
    
    // Filtro por equipo
    if (teamFilter !== 'all') {
      list = list.filter(p => p.teamId === teamFilter);
    }
    
    return list;
  }, [players, posFilter, teamFilter, query, selectMode, filterByRole]);

  // Guardar precios editados
  const handleSavePrices = async () => {
    const hasPriceChanges = Object.keys(editedPrices).length > 0;
    const hasPositionChanges = Object.keys(editedPositions).length > 0;

    if (!hasPriceChanges && !hasPositionChanges) {
      Alert.alert('Sin cambios', 'No hay modificaciones para guardar');
      return;
    }

    try {
      setIsSaving(true);
      
      // Actualizar precios
      if (hasPriceChanges) {
        const priceUpdates = Object.entries(editedPrices).map(([id, price]) => ({
          id: parseInt(id),
          price
        }));
        await PlayerService.updateMultiplePrices(priceUpdates);
      }

      // Actualizar posiciones
      if (hasPositionChanges) {
        const positionUpdates = Object.entries(editedPositions).map(([id, position]) => 
          PlayerService.updatePlayerPosition(parseInt(id), position)
        );
        await Promise.all(positionUpdates);
      }
      
      // Recargar jugadores
      await loadPlayers();
      
      // Limpiar cambios
      setEditedPrices({});
      setEditedPositions({});
      
      const changesCount = (hasPriceChanges ? Object.keys(editedPrices).length : 0) + 
                          (hasPositionChanges ? Object.keys(editedPositions).length : 0);
      Alert.alert('Éxito', `${changesCount} cambio(s) guardado(s) correctamente`);
    } catch (error) {
      console.error('Error guardando cambios:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // Verificar si hay cambios pendientes
  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedPositions).length > 0;

  // Manejar compra de jugador (modo normal, NO admin)
  const handleBuyPlayer = async (player: PlayerWithPrice) => {
    if (!ligaId || isAdmin) return;

    try {
      setIsSaving(true);
      
      // Verificar presupuesto
      if (budget < player.price) {
        Alert.alert('Presupuesto insuficiente', `No tienes suficiente dinero para fichar a ${player.name}.\n\nNecesitas: ${player.price}M\nTienes: ${budget}M`);
        return;
      }

      const position = normalizePosition(player.position);
      if (!position) {
        Alert.alert('Error', 'Posición del jugador no válida');
        return;
      }

      // Mapear posición a rol
      const roleMap: Record<CanonicalPos, string> = {
        'Goalkeeper': 'POR',
        'Defender': 'DEF',
        'Midfielder': 'CEN',
        'Attacker': 'DEL'
      };
      const role = roleMap[position];

      // Obtener plantilla actual para saber qué posiciones están ocupadas
      const squad = await SquadService.getUserSquad(ligaId);
      
      // Definir todas las posiciones posibles por rol según formación
      const allPositionsByRole: Record<string, string[]> = {
        'POR': ['por'],
        'DEF': ['def1', 'def2', 'def3', 'def4', 'def5'], // hasta 5 defensas en 5-3-2
        'CEN': ['cen1', 'cen2', 'cen3', 'cen4', 'cen5'], // hasta 5 medios en 4-5-1
        'DEL': ['del1', 'del2', 'del3'] // hasta 3 delanteros en 4-3-3
      };

      const availablePositions = allPositionsByRole[role] || [];
      
      // Encontrar posiciones ocupadas del mismo rol
      const occupiedPositions = new Set(
        squad?.players
          .filter(p => p.role === role)
          .map(p => p.position) || []
      );

      // Encontrar primera posición libre
      let squadPosition = availablePositions.find(pos => !occupiedPositions.has(pos));

      if (!squadPosition) {
        Alert.alert('Sin espacio', `No hay espacio disponible para ${role === 'POR' ? 'porteros' : role === 'DEF' ? 'defensas' : role === 'CEN' ? 'centrocampistas' : 'delanteros'} en tu plantilla.\n\nVende un jugador primero o cambia tu formación.`);
        return;
      }

      const result = await SquadService.addPlayerToSquad(ligaId, {
        position: squadPosition,
        playerId: player.id,
        playerName: player.name,
        role,
        pricePaid: player.price,
        currentFormation // Enviar la formación actual si está disponible
      });

      // Verificar si la validación pasó
      if (!result.success) {
        Alert.alert('Límite de formación', result.message || 'No se puede añadir más jugadores de esta posición');
        return;
      }

      console.log('Jugador añadido, nuevo presupuesto:', result.budget);
      setBudget(result.budget!);
      
      // Actualizar lista de jugadores fichados
      setSquadPlayerIds(prev => new Set(prev).add(player.id));
      
      // Si estamos en modo selección desde plantilla, volver con el jugador seleccionado
      if (selectMode && returnTo) {
        navigation.navigate(returnTo, {
          ligaId,
          ligaName,
          selectedPlayer: player,
          targetPosition
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo añadir el jugador';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar venta de jugador fichado
  const handleSellPlayer = async (player: PlayerWithPrice) => {
    if (!ligaId || isAdmin) return;

    try {
      setIsSaving(true);
      
      // Encontrar en qué posición está el jugador
      const squad = await SquadService.getUserSquad(ligaId);
      if (!squad) {
        Alert.alert('Error', 'No tienes plantilla');
        return;
      }

      const playerInSquad = squad.players.find(p => p.playerId === player.id);
      if (!playerInSquad) {
        Alert.alert('Error', 'El jugador no está en tu plantilla');
        return;
      }

      const result = await SquadService.removePlayerFromSquad(ligaId, playerInSquad.position);
      
      console.log('Jugador vendido, nuevo presupuesto:', result.budget);
      setBudget(result.budget);
      
      // Actualizar lista de jugadores fichados
      setSquadPlayerIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(player.id);
        return newSet;
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo vender el jugador';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar selección de jugador desde plantilla (modo selección)
  const handleSelectFromPlantilla = async (player: PlayerWithPrice) => {
    if (!ligaId || !targetPosition) return;

    try {
      setIsSaving(true);
      
      // Obtener plantilla actual para ver si hay jugador en esta posición
      const squad = await SquadService.getUserSquad(ligaId);
      const existingPlayerInPosition = squad?.players.find(p => p.position === targetPosition);
      
      // Calcular presupuesto disponible (presupuesto actual + valor del jugador a reemplazar)
      let availableBudget = budget;
      if (existingPlayerInPosition) {
        availableBudget += existingPlayerInPosition.pricePaid;
      }
      
      // Verificar presupuesto
      if (availableBudget < player.price) {
        const message = existingPlayerInPosition 
          ? `No tienes suficiente dinero para fichar a ${player.name}.\n\nNecesitas: ${player.price}M\nTienes: ${budget}M\nValor del jugador a sustituir: ${existingPlayerInPosition.pricePaid}M\nTotal disponible: ${availableBudget}M`
          : `No tienes suficiente dinero para fichar a ${player.name}.\n\nNecesitas: ${player.price}M\nTienes: ${budget}M`;
        Alert.alert('Presupuesto insuficiente', message);
        return;
      }

      const position = normalizePosition(player.position);
      if (!position) {
        Alert.alert('Error', 'Posición del jugador no válida');
        return;
      }

      // Mapear posición a rol
      const roleMap: Record<CanonicalPos, string> = {
        'Goalkeeper': 'POR',
        'Defender': 'DEF',
        'Midfielder': 'CEN',
        'Attacker': 'DEL'
      };
      const role = roleMap[position];

      // Comprar jugador en la posición específica (puede reemplazar jugador existente)
      const result = await SquadService.addPlayerToSquad(ligaId, {
        position: targetPosition,
        playerId: player.id,
        playerName: player.name,
        role,
        pricePaid: player.price,
        currentFormation // Enviar la formación actual si está disponible
      });

      // Verificar si la validación pasó
      if (!result.success) {
        Alert.alert('Límite de formación', result.message || 'No se puede añadir más jugadores de esta posición');
        return;
      }

      console.log('Jugador fichado desde plantilla, nuevo presupuesto:', result.budget);
      setBudget(result.budget!);
      
      // Actualizar lista de jugadores fichados
      setSquadPlayerIds(prev => new Set(prev).add(player.id));
      
      // Volver a plantilla con el jugador seleccionado
      if (returnTo) {
        navigation.navigate(returnTo, {
          ligaId,
          ligaName,
          selectedPlayer: player,
          targetPosition
        });
      } else {
        navigation.goBack();
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo añadir el jugador';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar item de jugador
  const renderPlayer = ({ item: p }: { item: PlayerWithPrice }) => {
    const cat = normalizePosition(p.position);
    const displayCat: CanonicalPos = cat ?? 'Midfielder';
    
    // Verificar si el jugador ya está fichado
    const isAlreadyInSquad = squadPlayerIds.has(p.id);
    
    // Posición actual (editada o original)
    const currentPosition = editedPositions[p.id] ?? displayCat;
    const isPositionEdited = editedPositions[p.id] !== undefined;
    
    const badgeColor = posColors[currentPosition];
    const badgeAbbr = posAbbr[currentPosition];
    const photo = p.photo ?? getAvatarUri(p);

    // Precio actual (editado o original)
    const currentPrice = editedPrices[p.id] ?? p.price;
    const isPriceEdited = editedPrices[p.id] !== undefined;

    // En modo selección, envolver en TouchableOpacity
    const content = (
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={{ uri: photo }}
            style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#334155', marginRight: 12, backgroundColor: '#0b1220' }}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{p.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ 
                backgroundColor: isPositionEdited ? '#0892D0' : badgeColor, 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 8 
              }}>
                <Text style={{ color: '#0f1419', fontWeight: '800', fontSize: 11 }}>{badgeAbbr}</Text>
              </View>
              {p.teamCrest && (
                <Image
                  source={{ uri: p.teamCrest }}
                  style={{ width: 22, height: 22, marginLeft: 8, backgroundColor: 'transparent' }}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Precio (editable si es admin y no está en modo selección) */}
            {isAdmin && !selectMode ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Precio</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={focusedPriceId === p.id ? (editedPrices[p.id]?.toString() || '') : currentPrice.toString()}
                    onFocus={() => {
                      setFocusedPriceId(p.id);
                    }}
                    onBlur={() => {
                      setFocusedPriceId(null);
                      // Si el campo está vacío al perder el foco, restaurar el precio original
                      if (!editedPrices[p.id]) {
                        setEditedPrices(prev => {
                          const newPrices = { ...prev };
                          delete newPrices[p.id];
                          return newPrices;
                        });
                      }
                    }}
                    onChangeText={(text) => {
                      if (text === '') {
                        // Permitir campo vacío mientras se escribe
                        setEditedPrices(prev => {
                          const newPrices = { ...prev };
                          delete newPrices[p.id];
                          return newPrices;
                        });
                        return;
                      }
                      const numValue = parseInt(text);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 250) {
                        setEditedPrices(prev => ({ ...prev, [p.id]: numValue }));
                      }
                    }}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isPriceEdited ? '#0892D0' : '#1a2332',
                      borderWidth: 1,
                      borderColor: isPriceEdited ? '#0892D0' : '#334155',
                      color: '#fff',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: '700',
                      textAlign: 'center',
                      width: 60,
                      marginRight: 4
                    }}
                  />
                  <Text style={{ color: '#cbd5e1', fontSize: 16, fontWeight: '700' }}>M</Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Precio</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginTop: 2 }}>{currentPrice}M</Text>
              </View>
            )}
            
            {/* Botones de acción según estado */}
            {!isAdmin && !selectMode && (
              isAlreadyInSquad ? (
                // Botón de vender para jugadores fichados
                <TouchableOpacity
                  onPress={() => handleSellPlayer(p)}
                  disabled={isSaving}
                  style={{ 
                    backgroundColor: '#ef4444', 
                    paddingHorizontal: 12, 
                    paddingVertical: 8, 
                    borderRadius: 8,
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>VENDER</Text>
                </TouchableOpacity>
              ) : null
            )}
            
            {selectMode && !isAlreadyInSquad && (
              <View style={{ 
                backgroundColor: '#10b981', 
                width: 36, 
                height: 36, 
                borderRadius: 18, 
                justifyContent: 'center', 
                alignItems: 'center',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
              }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 24 }}>+</Text>
              </View>
            )}
            
            {selectMode && isAlreadyInSquad && (
              <View style={{ 
                backgroundColor: '#64748b', 
                paddingHorizontal: 10, 
                paddingVertical: 6, 
                borderRadius: 8
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>FICHADO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Dropdown de posición editable (solo admin y no en modo selección) */}
        {isAdmin && !selectMode && (
          <View style={{ marginTop: 4 }}>
            <Dropdown
              label="Posición"
              value={currentPosition}
              onValueChange={(value: CanonicalPos) => {
                setEditedPositions(prev => ({ ...prev, [p.id]: value }));
              }}
              items={[
                { label: 'Portero (GK)', value: 'Goalkeeper' },
                { label: 'Defensa (DEF)', value: 'Defender' },
                { label: 'Centrocampista (CEN)', value: 'Midfielder' },
                { label: 'Delantero (DEL)', value: 'Attacker' },
              ]}
            />
          </View>
        )}
      </View>
    );

    if (selectMode) {
      return (
        <TouchableOpacity
          onPress={() => {
            if (!isAlreadyInSquad) {
              handleSelectFromPlantilla(p);
            }
          }}
          disabled={isAlreadyInSquad || isSaving}
          style={{ 
            backgroundColor: '#1a2332', 
            borderWidth: 1, 
            borderColor: isAlreadyInSquad ? '#64748b' : '#334155', 
            borderRadius: 12, 
            padding: 12, 
            marginBottom: 10,
            opacity: (isAlreadyInSquad || isSaving) ? 0.6 : 1
          }}
        >
          {content}
        </TouchableOpacity>
      );
    }

    // Modo normal (no selección): Si NO es admin, permitir comprar
    if (!isAdmin && ligaId) {
      if (isAlreadyInSquad) {
        // Jugador ya fichado: mostrar como card no clickeable
        return (
          <View style={{ 
            backgroundColor: '#1a2332', 
            borderWidth: 1, 
            borderColor: '#ef4444', 
            borderRadius: 12, 
            padding: 12, 
            marginBottom: 10,
            opacity: 0.9
          }}>
            {content}
          </View>
        );
      } else {
        // Jugador no fichado: clickeable para comprar
        return (
          <TouchableOpacity
            onPress={() => handleBuyPlayer(p)}
            disabled={isSaving}
            style={{ 
              backgroundColor: '#1a2332', 
              borderWidth: 1, 
              borderColor: '#334155', 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 10,
              opacity: isSaving ? 0.6 : 1
            }}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        );
      }
    }

    // Admin mode: No clickeable
    return (
      <View style={{ 
        backgroundColor: '#1a2332', 
        borderWidth: 1, 
        borderColor: '#334155', 
        borderRadius: 12, 
        padding: 12, 
        marginBottom: 10
      }}>
        {content}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
      {loading && <LoadingScreen />}
      {!loading && (
        <>
          {/* Top NavBar con botón de volver */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: '#181818',
              borderBottomWidth: 0.5,
              borderBottomColor: '#333',
              paddingVertical: 10,
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
            }}
          >
            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4 }}
              activeOpacity={0.8}
            >
              <Image source={backIcon} style={{ width: 28, height: 28, tintColor: '#fff' }} resizeMode="contain" />
            </TouchableOpacity>

            {/* Título centrado */}
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: '700',
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              LIGA{' '}
              <Text style={{ color: '#0892D0' }}>
                {ligaName?.toUpperCase() || 'BETTASY'}
              </Text>
            </Text>

            {/* Botón guardar (solo admin con cambios) */}
            {isAdmin && hasChanges ? (
              <TouchableOpacity
                onPress={handleSavePrices}
                disabled={isSaving}
                style={{
                  backgroundColor: '#0892D0',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  minWidth: 80,
                  alignItems: 'center'
                }}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Guardar</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}
          </View>

          <FlatList
            data={filtered}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingTop: 70, paddingBottom: 120 }}
            ListHeaderComponent={
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800' }}>
                    {selectMode ? 'Seleccionar Jugador' : 'Mercado de Jugadores'}
                  </Text>
                  {/* Mostrar presupuesto si NO es admin y tenemos ligaId */}
                  {!isAdmin && ligaId && (
                    <View 
                      key={`budget-${budget}`}
                      style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#1e293b',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#10b981',
                        shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3
                      }}>
                      <View style={{ 
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#10b981',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 8
                      }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>$</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>PRESUPUESTO</Text>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{budget}M</Text>
                      </View>
                    </View>
                  )}
                </View>
                {selectMode && filterByRole && (
                  <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>
                    Posición: {filterByRole === 'POR' ? 'Portero' : filterByRole === 'DEF' ? 'Defensa' : filterByRole === 'CEN' ? 'Centrocampista' : 'Delantero'}
                  </Text>
                )}
                {!selectMode && <View style={{ marginBottom: 0 }} />}
                
                {/* Filtros */}
                <View>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    {!selectMode && (
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          label="Posición"
                          value={posFilter}
                          onValueChange={setPosFilter}
                          items={positionsEs.map(p => ({ label: p, value: p }))}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Equipo"
                        value={teamFilter}
                        onValueChange={setTeamFilter}
                        items={[
                          { label: 'Todos los equipos', value: 'all' },
                          ...teams
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(t => ({ label: t.name, value: t.id }))
                        ]}
                      />
                    </View>
                  </View>
                  
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Buscar jugador</Text>
                    <TextInput
                      placeholder="Escribe un nombre"
                      placeholderTextColor="#94a3b8"
                      value={query}
                      onChangeText={setQuery}
                      style={{
                        backgroundColor: '#1a2332',
                        borderWidth: 1,
                        borderColor: '#334155',
                        color: '#fff',
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 10
                      }}
                    />
                  </View>
                </View>
              </>
            }
            ListEmptyComponent={
              <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
                No hay jugadores con los filtros actuales
              </Text>
            }
            showsVerticalScrollIndicator={true}
          />

          {/* Barra de navegación - solo en modo normal */}
          {!selectMode && <LigaNavBar ligaId={ligaId} ligaName={ligaName} />}
        </>
      )}
    </LinearGradient>
  );
};

export default PlayersMarket;
