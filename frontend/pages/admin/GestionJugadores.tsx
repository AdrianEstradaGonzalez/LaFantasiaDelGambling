import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, FlatList, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayerService, PlayerWithPrice } from '../../services/PlayerService';
import FootballService, { TeamMinimal } from '../../services/FutbolService';
import LoadingScreen from '../../components/LoadingScreen';
import { CustomAlertManager } from '../../components/CustomAlert';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeftIcon, TrashIcon } from '../../components/VectorIcons';
import Svg, { Path } from 'react-native-svg';
import { SafeLayout } from '../../components/SafeLayout';

// Función para normalizar texto (eliminar acentos y convertir a minúsculas)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
  
  if (p === 'goalkeeper' || p.includes('goal') || p.includes('keeper')) return 'Goalkeeper';
  if (p === 'defender' || p.includes('defen') || p.includes('back')) return 'Defender';
  if (p === 'midfielder' || p.includes('midfield') || p.includes('midf') || p === 'mid') return 'Midfielder';
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
  return `https://ui-avatars.com/api/?name=${initials}&background=${bg}&color=${color}&size=128&bold=true`;
};

// Iconos de ordenamiento por precio
const SortAscIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {/* Símbolo de dinero */}
    <Path d="M12 2C10.35 2 9 3.35 9 5c0 1.65 1.35 3 3 3s3-1.35 3-3c0-1.65-1.35-3-3-3zm0 10c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z" fill="#fff"/>
    <Path d="M12 8v4m0 4v0" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
    {/* Flecha hacia arriba */}
    <Path d="M18 9l2-2m0 0l2 2m-2-2v10" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const SortDescIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {/* Símbolo de dinero */}
    <Path d="M12 2C10.35 2 9 3.35 9 5c0 1.65 1.35 3 3 3s3-1.35 3-3c0-1.65-1.35-3-3-3zm0 10c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z" fill="#fff"/>
    <Path d="M12 8v4m0 4v0" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
    {/* Flecha hacia abajo */}
    <Path d="M18 5v10m0 0l-2 2m2-2l2 2" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const SortNeutralIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {/* Símbolo de dinero sin flecha */}
    <Path d="M12 2C10.35 2 9 3.35 9 5c0 1.65 1.35 3 3 3s3-1.35 3-3c0-1.65-1.35-3-3-3zm0 10c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z" fill="#fff"/>
    <Path d="M12 8v4m0 4v0" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
    {/* Líneas horizontales indicando sin orden */}
    <Path d="M18 8h4M18 12h4M18 16h4" stroke="#fff" strokeWidth={2} strokeLinecap="round"/>
  </Svg>
);

// Dropdown para filtros generales
const FilterDropdown = ({ 
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
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={{
          backgroundColor: '#1a2332',
          borderWidth: 1,
          borderColor: '#334155',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
          {selectedLabel}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 18 }}>▼</Text>
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

// Componente Dropdown para seleccionar posición
const Dropdown = ({ label, value, onValueChange, items }: {
  label: string;
  value: CanonicalPos;
  onValueChange: (value: CanonicalPos) => void;
  items: { label: string; value: CanonicalPos }[];
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          backgroundColor: '#1a2332',
          borderWidth: 1,
          borderColor: '#334155',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14 }}>
          {items.find(item => item.value === value)?.label || 'Seleccionar'}
        </Text>
        <Text style={{ color: '#94a3b8' }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={{ backgroundColor: '#1a2332', borderRadius: 12, width: '80%', maxWidth: 400, borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{label}</Text>
            </View>
            {items.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => {
                  onValueChange(item.value);
                  setShowPicker(false);
                }}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#334155',
                  backgroundColor: value === item.value ? '#0892D0' : 'transparent'
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Componente Dropdown para seleccionar equipo
const TeamDropdown = ({ label, value, onValueChange, teams }: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  teams: TeamMinimal[];
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const selectedTeam = teams.find(t => t.id === value);

  return (
    <View>
      <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          backgroundColor: '#1a2332',
          borderWidth: 1,
          borderColor: '#334155',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {selectedTeam?.crest && (
            <Image
              key={`selected-team-crest-${selectedTeam.id}`}
              source={{ uri: selectedTeam.crest }}
              style={{ width: 20, height: 20, marginRight: 8 }}
            />
          )}
          <Text style={{ color: '#fff', fontSize: 14, flex: 1 }} numberOfLines={1}>
            {selectedTeam?.name || 'Seleccionar'}
          </Text>
        </View>
        <Text style={{ color: '#94a3b8' }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={{ backgroundColor: '#1a2332', borderRadius: 12, width: '80%', maxWidth: 400, maxHeight: '70%', borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => {
                    onValueChange(team.id);
                    setShowPicker(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#334155',
                    backgroundColor: value === team.id ? '#0892D0' : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  {team.crest && (
                    <Image
                      key={`team-picker-crest-${team.id}`}
                      source={{ uri: team.crest }}
                      style={{ width: 24, height: 24, marginRight: 12 }}
                    />
                  )}
                  <Text style={{ color: '#fff', fontSize: 14, flex: 1 }}>{team.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const GestionJugadores = ({ navigation, route }: { 
  navigation: NativeStackNavigationProp<any>; 
  route: RouteProp<any, any>; 
}) => {
  const division = (route.params as any)?.division || 'primera';
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerWithPrice[]>([]);
  const [teams, setTeams] = useState<TeamMinimal[]>([]);
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editedPrices, setEditedPrices] = useState<{ [key: number]: number }>({});
  const [editedPositions, setEditedPositions] = useState<{ [key: number]: CanonicalPos }>({});
  const [editedTeams, setEditedTeams] = useState<{ [key: number]: number }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [focusedPriceId, setFocusedPriceId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [sortType, setSortType] = useState<'price' | 'points'>('price');

  // Cargar jugadores y equipos desde el backend
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const playersData = await PlayerService.getAllPlayers({ division });
      // Derivar equipos de los propios jugadores (igual que PlayersMarket) para asegurar
      // que el dropdown muestre solo equipos presentes en la lista, tanto en Primera como en Segunda.
      const uniqueTeams = Array.from(
        new Set(playersData.map(p => JSON.stringify({ id: p.teamId, name: p.teamName, crest: p.teamCrest })))
      ).map(str => JSON.parse(str) as TeamMinimal);

      setPlayers(playersData);
      setTeams(uniqueTeams);
    } catch (error) {
      CustomAlertManager.alert(
        'Error',
        'No se pudieron cargar los jugadores',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [division]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Filtrado de jugadores
  const filteredPlayers = useMemo(() => {
    let list = [...players];
    
    // Filtro por posición del dropdown
    const canonical = canonicalFromEs(posFilter);
    if (canonical) {
      list = list.filter(p => {
        const n = normalizePosition(p.position);
        return n === canonical;
      });
    }
    
    // Filtro por búsqueda de nombre
    if (query.trim()) {
      const normalizedQuery = normalizeText(query.trim());
      list = list.filter(p => normalizeText(p.name).includes(normalizedQuery));
    }
    
    // Filtro por equipo
    if (teamFilter !== 'all') {
      list = list.filter(p => p.teamId === teamFilter);
    }
    
    // Ordenamiento por precio o puntos
    if (sortOrder) {
      list.sort((a, b) => {
        if (sortType === 'price') {
          const priceA = editedPrices[a.id] ?? a.price;
          const priceB = editedPrices[b.id] ?? b.price;
          return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        } else {
          const aPoints = a.totalPoints ?? 0;
          const bPoints = b.totalPoints ?? 0;
          return sortOrder === 'asc' ? aPoints - bPoints : bPoints - aPoints;
        }
      });
    }
    
    return list;
  }, [players, posFilter, teamFilter, query, sortOrder, editedPrices]);

  // Guardar precios y posiciones editados
  const handleSavePrices = async () => {
    const hasPriceChanges = Object.keys(editedPrices).length > 0;
    const hasPositionChanges = Object.keys(editedPositions).length > 0;
    const hasTeamChanges = Object.keys(editedTeams).length > 0;

    if (!hasPriceChanges && !hasPositionChanges && !hasTeamChanges) {
      CustomAlertManager.alert(
        'Sin cambios',
        'No hay modificaciones para guardar',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'information', iconColor: '#0892D0' }
      );
      return;
    }

    // Validar que todos los precios sean válidos (mayores a 0)
    if (hasPriceChanges) {
      const invalidPrices = Object.entries(editedPrices).filter(([_, price]) => price <= 0 || price > 250);
      if (invalidPrices.length > 0) {
        CustomAlertManager.alert(
          'Precios inválidos',
          'Todos los precios deben estar entre 1 y 250 millones',
          [{ text: 'OK', onPress: () => {}, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#ef4444' }
        );
        return;
      }
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

      // Actualizar equipos
      if (hasTeamChanges) {
        const teamUpdates = Object.entries(editedTeams).map(([id, teamId]) => 
          PlayerService.updatePlayerTeam(parseInt(id), teamId)
        );
        await Promise.all(teamUpdates);
      }
      
      // Recargar jugadores
      await loadPlayers();
      
      // Limpiar cambios
      setEditedPrices({});
      setEditedPositions({});
      setEditedTeams({});
      
      const changesCount = (hasPriceChanges ? Object.keys(editedPrices).length : 0) + 
                          (hasPositionChanges ? Object.keys(editedPositions).length : 0) +
                          (hasTeamChanges ? Object.keys(editedTeams).length : 0);
      CustomAlertManager.alert(
        'Éxito',
        `${changesCount} cambio(s) guardado(s) correctamente`,
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'check-circle', iconColor: '#10b981' }
      );
    } catch (error) {
      console.error('Error guardando cambios:', error);
      CustomAlertManager.alert(
        'Error',
        'No se pudieron guardar los cambios',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar jugador (con confirmación)
  const handleDeletePlayer = async (playerId: number) => {
    CustomAlertManager.alert(
      'Confirmar eliminación',
      '¿Eliminar este jugador de la base de datos? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        { text: 'Eliminar', onPress: async () => {
            try {
              await PlayerService.deletePlayer(playerId);
              CustomAlertManager.alert('Éxito', 'Jugador eliminado correctamente', [{ text: 'OK', onPress: () => {} }], { icon: 'check-circle', iconColor: '#10b981' });
              await loadPlayers();
            } catch (e: any) {
              console.error('Error eliminando jugador:', e);
              CustomAlertManager.alert('Error', e?.message || 'No se pudo eliminar el jugador', [{ text: 'OK', onPress: () => {} }], { icon: 'alert-circle', iconColor: '#ef4444' });
            }
          }, style: 'destructive' }
      ],
      { icon: 'alert-circle', iconColor: '#ef4444' }
    );
  };

  // Verificar si hay cambios pendientes
  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedPositions).length > 0 || Object.keys(editedTeams).length > 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#181818', borderBottomWidth: 0.5, borderBottomColor: '#334155', paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <ChevronLeftIcon size={28} color="#0892D0" />
            </TouchableOpacity>
            <View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
                GESTIÓN DE JUGADORES
              </Text>
              <Text style={{ color: division === 'segunda' ? '#f59e0b' : division === 'premier' ? '#3730a3' : '#0892D0', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                {division === 'segunda' ? 'LALIGA HYPERMOTION' : division === 'premier' ? 'PREMIER LEAGUE' : 'LA LIGA EA SPORTS'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filtros */}
      <View style={{ backgroundColor: '#181818', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#334155' }}>
        {/* Barra de búsqueda */}
        <TextInput
          placeholder="Buscar jugador..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          style={{
            backgroundColor: '#1a2332',
            color: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: '#334155',
            marginBottom: 12
          }}
        />

        {/* Filtros en fila: Posición y Equipo */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {/* Filtro de posición - Dropdown */}
          <FilterDropdown
            label="POSICIÓN"
            value={posFilter}
            onValueChange={setPosFilter}
            items={positionsEs.map(p => ({ label: p, value: p }))}
          />

          {/* Filtro de equipo - Dropdown */}
          <FilterDropdown
            label="EQUIPO"
            value={teamFilter}
            onValueChange={setTeamFilter}
            items={[
              { label: 'Todos', value: 'all' },
              ...teams
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(t => ({ label: t.name, value: t.id }))
            ]}
          />
        </View>

        {/* Botones de ordenamiento por precio y puntos */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => {
              setSortType('price');
              setSortOrder(prev => {
                if (prev === null || sortType !== 'price') return 'desc';
                if (prev === 'desc') return 'asc';
                return null;
              });
            }}
            style={{
              flex: 1,
              backgroundColor: '#1a2332',
              borderWidth: 1,
              borderColor: sortType === 'price' && sortOrder ? '#10b981' : '#334155',
              paddingVertical: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Text style={{ color: sortType === 'price' && sortOrder ? '#10b981' : '#fff', fontSize: 13, fontWeight: '600' }}>
              Precio
            </Text>
            {sortType === 'price' && sortOrder === null && <SortNeutralIcon />}
            {sortType === 'price' && sortOrder === 'asc' && <SortAscIcon />}
            {sortType === 'price' && sortOrder === 'desc' && <SortDescIcon />}
            {sortType !== 'price' && <SortNeutralIcon />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSortType('points');
              setSortOrder(prev => {
                if (prev === null || sortType !== 'points') return 'desc';
                if (prev === 'desc') return 'asc';
                return null;
              });
            }}
            style={{
              flex: 1,
              backgroundColor: '#1a2332',
              borderWidth: 1,
              borderColor: sortType === 'points' && sortOrder ? '#10b981' : '#334155',
              paddingVertical: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Text style={{ color: sortType === 'points' && sortOrder ? '#10b981' : '#fff', fontSize: 13, fontWeight: '600' }}>
              Puntos
            </Text>
            {sortType === 'points' && sortOrder === null && <SortNeutralIcon />}
            {sortType === 'points' && sortOrder === 'asc' && <SortAscIcon />}
            {sortType === 'points' && sortOrder === 'desc' && <SortDescIcon />}
            {sortType !== 'points' && <SortNeutralIcon />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de jugadores */}
      <FlatList
        data={filteredPlayers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        renderItem={({ item: p }) => {
          const canonical = normalizePosition(p.position);
          const posColor = canonical ? posColors[canonical] : '#64748b';
          const posLabel = canonical ? posAbbr[canonical] : '?';
          const isPriceEdited = editedPrices[p.id] !== undefined;
          const isPositionEdited = editedPositions[p.id] !== undefined;
          const isTeamEdited = editedTeams[p.id] !== undefined;
          const currentPrice = isPriceEdited ? editedPrices[p.id] : p.price;
          const currentPosition = isPositionEdited ? editedPositions[p.id] : (canonical || 'Midfielder');
          const currentTeamId = isTeamEdited ? editedTeams[p.id] : p.teamId;

          return (
            <View
              style={{
                backgroundColor: '#1a2332',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12
              }}
            >
              {/* Header con foto y datos básicos */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {/* Foto */}
                <Image source={{ uri: getAvatarUri(p) }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />

                {/* Nombre y posición */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: posColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{posLabel}</Text>
                    </View>
                    {p.teamName && (
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{p.teamName}</Text>
                    )}
                  </View>
                </View>

                {/* Puntos totales y precio editable */}
                <View style={{ alignItems: 'flex-end' }}>
                  {/* Puntos totales */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>Puntos totales</Text>
                    <View style={{
                      backgroundColor: '#10b981',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      minWidth: 60,
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                        {p.totalPoints ?? 0}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Precio editable */}
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Precio</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      value={currentPrice.toString()}
                      onFocus={() => {
                        setFocusedPriceId(p.id);
                        // Inicializar con el precio actual si no hay cambios
                        if (editedPrices[p.id] === undefined) {
                          setEditedPrices(prev => ({ ...prev, [p.id]: p.price }));
                        }
                      }}
                      onBlur={() => {
                        setFocusedPriceId(null);
                        // Si el precio editado es igual al original, eliminarlo de los cambios
                        if (editedPrices[p.id] === p.price) {
                          setEditedPrices(prev => {
                            const newPrices = { ...prev };
                            delete newPrices[p.id];
                            return newPrices;
                          });
                        }
                      }}
                      onChangeText={(text) => {
                        // Permitir campo vacío temporalmente mientras se escribe
                        if (text === '') {
                          setEditedPrices(prev => ({ ...prev, [p.id]: 0 }));
                          return;
                        }
                        const numValue = parseInt(text);
                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 999) {
                          setEditedPrices(prev => ({ ...prev, [p.id]: numValue }));
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={3}
                      selectTextOnFocus={true}
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
                <TouchableOpacity onPress={() => handleDeletePlayer(p.id)} style={{ marginLeft: 12 }}>
                  <TrashIcon size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Dropdown de posición editable */}
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

              {/* Dropdown de equipo editable */}
              <View style={{ marginTop: 8 }}>
                <TeamDropdown
                  label="Equipo"
                  value={currentTeamId}
                  onValueChange={(value: number) => {
                    setEditedTeams(prev => ({ ...prev, [p.id]: value }));
                  }}
                  teams={teams}
                />
              </View>
            </View>
          );
        }}
      />

      {/* Botón para guardar cambios */}
      {hasChanges && (
        <View style={{ 
          position: 'absolute', 
          bottom: 20, 
          left: 16, 
          right: 16,
          backgroundColor: '#0892D0',
          borderRadius: 12,
          padding: 16,
          shadowColor: '#0892D0',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 8
        }}>
          <TouchableOpacity onPress={handleSavePrices} disabled={isSaving}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
              {isSaving ? 'GUARDANDO...' : `GUARDAR CAMBIOS (${Object.keys(editedPrices).length + Object.keys(editedPositions).length + Object.keys(editedTeams).length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </LinearGradient>
    </SafeLayout>
  );
};
