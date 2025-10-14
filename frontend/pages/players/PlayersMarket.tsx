import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image, Alert, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayerService, PlayerWithPrice } from '../../services/PlayerService';
import FootballService, { TeamMinimal } from '../../services/FutbolService';
import LoadingScreen from '../../components/LoadingScreen';
import LigaNavBar from '../navBar/LigaNavBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

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
  if (p === 'attacker' || p.includes('attack') || p.includes('forward') || p.includes('striker') || p.includes('wing')) return 'Attacker';
  if (p === 'midfielder' || p.includes('midf') || p.includes('mid')) return 'Midfielder';
  
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

// Dropdown component
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
    <View style={{ marginBottom: 12}}>
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
            height: 46,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', flex: 1, fontSize: 14 }} numberOfLines={1} ellipsizeMode="tail">
            {selectedLabel}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={{
            backgroundColor: '#1a2332',
            borderWidth: 1,
            borderColor: '#334155',
            borderTopWidth: 0,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            maxHeight: 200,
            position: 'absolute',
            top: 46,
            left: 0,
            right: 0,
            zIndex: 1000
          }}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
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

  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  
  // Modo selección (cuando viene desde MiPlantilla)
  const selectMode = route.params?.selectMode || false;
  const filterByRole = route.params?.filterByRole;
  const onPlayerSelected = route.params?.onPlayerSelected;

  // Cargar jugadores y equipos desde el backend
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const [playersData, teamsData] = await Promise.all([
        PlayerService.getAllPlayers(),
        FootballService.getLaLigaTeamsCached()
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Aplicar filtro inicial si viene desde modo selección
  useEffect(() => {
    if (selectMode && filterByRole) {
      // Mapear rol a posición en español
      const roleToPosition: Record<string, PositionFilterEs> = {
        'GK': 'Portero',
        'DEF': 'Defensa',
        'MID': 'Centrocampista',
        'ATT': 'Delantero'
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
        'GK': 'Goalkeeper',
        'DEF': 'Defender', 
        'MID': 'Midfielder',
        'ATT': 'Attacker'
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
    
    // Filtro por búsqueda de nombre
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    
    // Filtro por equipo
    if (teamFilter !== 'all') {
      list = list.filter(p => p.teamId === teamFilter);
    }
    
    return list;
  }, [players, posFilter, teamFilter, query, selectMode, filterByRole]);

  // Renderizar item de jugador
  const renderPlayer = ({ item: p }: { item: PlayerWithPrice }) => {
    const cat = normalizePosition(p.position);
    const displayCat: CanonicalPos = cat ?? 'Midfielder';
    const badgeColor = posColors[displayCat];
    const badgeAbbr = posAbbr[displayCat];
    const photo = p.photo ?? getAvatarUri(p);

    // En modo selección, envolver en TouchableOpacity
    const content = (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={{ uri: photo }}
          style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#334155', marginRight: 12, backgroundColor: '#0b1220' }}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{p.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{ backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
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
        {!selectMode && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Precio</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginTop: 2 }}>{p.price}M</Text>
          </View>
        )}
        {selectMode && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '700' }}>Seleccionar →</Text>
          </View>
        )}
      </View>
    );

    if (selectMode) {
      return (
        <TouchableOpacity
          onPress={() => {
            if (onPlayerSelected) {
              onPlayerSelected(p);
              navigation.goBack();
            }
          }}
          style={{ 
            backgroundColor: '#1a2332', 
            borderWidth: 1, 
            borderColor: '#334155', 
            borderRadius: 12, 
            padding: 12, 
            marginBottom: 10
          }}
        >
          {content}
        </TouchableOpacity>
      );
    }

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
          <FlatList
            data={filtered}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            ListHeaderComponent={
              <>
                <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
                  {selectMode ? 'Seleccionar Jugador' : 'Mercado de Jugadores'}
                </Text>
                {selectMode && filterByRole && (
                  <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>
                    Posición: {filterByRole === 'GK' ? 'Portero' : filterByRole === 'DEF' ? 'Defensa' : filterByRole === 'MID' ? 'Centrocampista' : 'Delantero'}
                  </Text>
                )}
                {!selectMode && <View style={{ marginBottom: 12 }} />}
                
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
                          ...teams.map(t => ({ label: t.name, value: t.id }))
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
