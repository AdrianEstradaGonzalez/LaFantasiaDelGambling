import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, FlatList, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayerService, PlayerWithPrice } from '../../services/PlayerService';
import FootballService, { TeamMinimal } from '../../services/FutbolService';
import LoadingScreen from '../../components/LoadingScreen';
import { CustomAlertManager } from '../../components/CustomAlert';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeftIcon } from '../../components/VectorIcons';

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

export const GestionJugadores = ({ navigation, route }: { 
  navigation: NativeStackNavigationProp<any>; 
  route: RouteProp<any, any>; 
}) => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerWithPrice[]>([]);
  const [teams, setTeams] = useState<TeamMinimal[]>([]);
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editedPrices, setEditedPrices] = useState<{ [key: number]: number }>({});
  const [editedPositions, setEditedPositions] = useState<{ [key: number]: CanonicalPos }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [focusedPriceId, setFocusedPriceId] = useState<number | null>(null);

  // Cargar jugadores y equipos desde el backend
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const playersData = await PlayerService.getAllPlayers();
      const teamsData = await FootballService.getLaLigaTeamsCached();
      
      setPlayers(playersData);
      setTeams(teamsData);
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
  }, []);

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
    
    return list;
  }, [players, posFilter, teamFilter, query]);

  // Guardar precios y posiciones editados
  const handleSavePrices = async () => {
    const hasPriceChanges = Object.keys(editedPrices).length > 0;
    const hasPositionChanges = Object.keys(editedPositions).length > 0;

    if (!hasPriceChanges && !hasPositionChanges) {
      CustomAlertManager.alert(
        'Sin cambios',
        'No hay modificaciones para guardar',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'information', iconColor: '#0892D0' }
      );
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

  // Verificar si hay cambios pendientes
  const hasChanges = Object.keys(editedPrices).length > 0 || Object.keys(editedPositions).length > 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#181818', borderBottomWidth: 0.5, borderBottomColor: '#334155', paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <ChevronLeftIcon size={28} color="#0892D0" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
              GESTIÓN DE JUGADORES
            </Text>
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

        {/* Filtro de posición */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {positionsEs.map((pos) => {
            const isActive = pos === posFilter;
            return (
              <TouchableOpacity
                key={pos}
                onPress={() => setPosFilter(pos)}
                style={{
                  backgroundColor: isActive ? '#0892D0' : '#1a2332',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: isActive ? '#0892D0' : '#334155'
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{pos}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filtro de equipo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setTeamFilter('all')}
            style={{
              backgroundColor: teamFilter === 'all' ? '#0892D0' : '#1a2332',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 8,
              borderWidth: 1,
              borderColor: teamFilter === 'all' ? '#0892D0' : '#334155'
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Todos</Text>
          </TouchableOpacity>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              onPress={() => setTeamFilter(team.id)}
              style={{
                backgroundColor: teamFilter === team.id ? '#0892D0' : '#1a2332',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                borderWidth: 1,
                borderColor: teamFilter === team.id ? '#0892D0' : '#334155'
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{team.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          const currentPrice = isPriceEdited ? editedPrices[p.id] : p.price;
          const currentPosition = isPositionEdited ? editedPositions[p.id] : (canonical || 'Midfielder');

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

                {/* Precio editable */}
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
              {isSaving ? 'GUARDANDO...' : `GUARDAR CAMBIOS (${Object.keys(editedPrices).length + Object.keys(editedPositions).length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
};
