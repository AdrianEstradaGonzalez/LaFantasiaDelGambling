import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService, { Player, TeamMinimal } from '../../services/FutbolService';
import { PlayerService } from '../../services/PlayerService';
import { SquadService } from '../../services/SquadService';
import LoadingScreen from '../../components/LoadingScreen';
import LigaNavBar from '../navBar/LigaNavBar';
import { SafeLayout } from '../../components/SafeLayout';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// Posiciones en español para los filtros
const positionsEs = ['Todos','Portero','Defensa','Centrocampista','Delantero'] as const;
type PositionFilterEs = typeof positionsEs[number];

// Normalización de posiciones del API -> categorías canónicas
type CanonicalPos = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
const normalizePosition = (pos?: string): CanonicalPos | undefined => {
  if (!pos) return undefined;
  const p = pos.trim().toLowerCase();
  
  // Portero (G, Goalkeeper)
  if (p === 'g' || p === 'goalkeeper' || p.includes('goal') || p.includes('keeper')) {
    return 'Goalkeeper';
  }
  
  // Defensa (D, DC, DL, DR, DLC, DRC, WB, WBL, WBR, Defender, Centre-Back, etc.)
  if (p === 'd' || p === 'dc' || p === 'dl' || p === 'dr' || p === 'dlc' || p === 'drc' || 
      p === 'wb' || p === 'wbl' || p === 'wbr' || p === 'defender' ||
      p.includes('defen') || p.includes('back') || p.includes('centre-back') || 
      p.includes('center back') || p.includes('fullback') || p.includes('wing-back') || 
      p.includes('wingback')) {
    return 'Defender';
  }
  
  // Delantero (F, CF, ST, LW, RW, SS, Forward, Striker, Winger)
  // IMPORTANTE: Procesar extremos (LW, RW) ANTES que los centrocampistas
  if (p === 'f' || p === 'cf' || p === 'st' || p === 'lw' || p === 'rw' || p === 'ss' ||
      p === 'forward' || p === 'striker' || p.includes('winger') || p.includes('wing') ||
      p.includes('striker') || p.includes('forward') || p.includes('attack') || 
      p.includes('offen') || p.includes('extremo') || p.includes('delantero')) {
    return 'Attacker';
  }
  
  // Centrocampista (M, MC, ML, MR, DM, AM, AML, AMR, AMC, Midfielder)
  // Esta comprobación va AL FINAL para que LW/RW no se confundan con ML/MR
  if (p === 'm' || p === 'mc' || p === 'ml' || p === 'mr' || p === 'dm' || 
      p === 'am' || p === 'aml' || p === 'amr' || p === 'amc' || p === 'midfielder' ||
      p.includes('midf') || p.includes('mid') || p.includes('medio') || 
      p.includes('centrocamp') || p.includes('pivot') || p.includes('playmaker')) {
    return 'Midfielder';
  }
  
  return undefined;
};

// Mapeo de filtro ES -> canónico
const canonicalFromEs = (es: PositionFilterEs): CanonicalPos | undefined => {
  switch (es) {
    case 'Portero': return 'Goalkeeper';
    case 'Defensa': return 'Defender';
    case 'Centrocampista': return 'Midfielder';
    case 'Delantero': return 'Attacker';
    default: return undefined; // 'Todos'
  }
};

// Colores y siglas por posición (para badge de color)
const posColors: Record<CanonicalPos, string> = {
  Goalkeeper: '#f59e0b',     // ámbar
  Defender: '#3b82f6',       // azul
  Midfielder: '#10b981',     // verde
  Attacker: '#ef4444',       // rojo
};
const posAbbr: Record<CanonicalPos, string> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'CEN',
  Attacker: 'DEL',
};

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
            // Fixed height to keep consistent with sibling dropdowns
            height: 46,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text
            style={{ color: '#fff', flex: 1, fontSize: 14 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedLabel}
          </Text>
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
              position: 'absolute',
              top: 46,
              left: 0,
              right: 0,
              zIndex: 1000
            }}
          >
            <ScrollView 
              style={{ maxHeight: 200 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
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

export const PlayersList = ({ navigation, route }: { 
  navigation: NativeStackNavigationProp<any>; 
  route: RouteProp<any, any>; 
}) => {
  // loading: para mostrar LoadingScreen inicialmente
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamMinimal[]>([]);
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [query, setQuery] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<{ done: number; total: number; currentTeam?: string } | null>(null);

  // Modo selección
  const selectMode = route.params?.selectMode || false;
  const filterByRole = route.params?.filterByRole;
  const onPlayerSelected = route.params?.onPlayerSelected;
  
  // Parámetros de liga para añadir a plantilla
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const division = route.params?.division || 'primera';
  const isPremium = route.params?.isPremium || false;

  // Función para añadir jugador a plantilla
  const addPlayerToSquad = async (player: Player) => {
    if (!ligaId) {
      return;
    }

    try {
      // Obtener plantilla actual
      const currentSquad = await SquadService.getUserSquad(ligaId);
      
      // Determinar rol del jugador
      const position = normalizePosition(player.position);
      let role = 'DEF'; // fallback
      if (position === 'Goalkeeper') role = 'GK';
      else if (position === 'Defender') role = 'DEF';
      else if (position === 'Midfielder') role = 'MID';
      else if (position === 'Attacker') role = 'ATT';

      // Definir posiciones según formación 4-3-3 (por defecto)
      const positionsByRole = {
        'GK': ['gk'],
        'DEF': ['def1', 'def2', 'def3', 'def4'],
        'MID': ['mid1', 'mid2', 'mid3'],
        'ATT': ['att1', 'att2', 'att3']
      };

      let updatedPlayers: {
        position: string;
        playerId: number;
        playerName: string;
        role: string;
      }[] = [];
      let formation = '4-3-3'; // formación por defecto

      if (currentSquad) {
        // Ya existe plantilla, agregar jugador
        updatedPlayers = currentSquad.players.map(p => ({
          position: p.position,
          playerId: p.playerId,
          playerName: p.playerName,
          role: p.role
        }));
        formation = currentSquad.formation;
      }

      // Buscar primera posición libre del rol correspondiente
      const availablePositions = positionsByRole[role as keyof typeof positionsByRole] || [];
      const occupiedPositions = updatedPlayers.map(p => p.position);
      let freePosition = availablePositions.find(pos => !occupiedPositions.includes(pos));

      if (freePosition) {
        // Hay espacio libre del mismo rol, añadir el nuevo jugador
        updatedPlayers.push({
          position: freePosition,
          playerId: player.id,
          playerName: player.name,
          role: role
        });
      } else {
        // No hay espacio libre del mismo rol, reemplazar el primero de ese rol
        const sameRolePositions = availablePositions.filter(pos => 
          updatedPlayers.some(p => p.position === pos)
        );
        
        if (sameRolePositions.length > 0) {
          // Reemplazar el primer jugador del mismo rol
          const positionToReplace = sameRolePositions[0];
          const playerIndex = updatedPlayers.findIndex(p => p.position === positionToReplace);
          if (playerIndex !== -1) {
            updatedPlayers[playerIndex] = {
              position: positionToReplace,
              playerId: player.id,
              playerName: player.name,
              role: role
            };
          }
        } else {
          // Si no hay jugadores del mismo rol, buscar cualquier posición libre
          const allPositions = ['gk', 'def1', 'def2', 'def3', 'def4', 'mid1', 'mid2', 'mid3', 'att1', 'att2', 'att3'];
          const anyFreePosition = allPositions.find(pos => !occupiedPositions.includes(pos));
          
          if (anyFreePosition) {
            updatedPlayers.push({
              position: anyFreePosition,
              playerId: player.id,
              playerName: player.name,
              role: role
            });
          }
        }
      }

      // Guardar la plantilla actualizada
      await SquadService.saveSquad(ligaId, {
        formation: formation,
        players: updatedPlayers
      });

      // Navegar a la plantilla
      navigation.navigate('Equipo', { ligaId, ligaName });
      
    } catch (error) {
      console.error('Error al añadir jugador a plantilla:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('PlayersList: Cargando desde base de datos...');
        
        // Cargar equipos desde caché (para los filtros)
        const teamsCached = await FootballService.getLaLigaTeamsCached();
        if (!mounted) return;
        
        if (teamsCached.length > 0) {
          setTeams(teamsCached);
        }
        
        // Cargar jugadores desde la base de datos (instantáneo)
        const playersFromDB = await PlayerService.getAllPlayers();
        
        if (!mounted) return;
        
        if (playersFromDB.length > 0) {
          console.log('PlayersList: Jugadores cargados desde BD:', playersFromDB.length);
          setPlayers(playersFromDB);
          setLoading(false);
        } else {
          console.log('PlayersList: No hay jugadores en la BD');
          setPlayers([]);
          setLoading(false);
        }
        
      } catch (e) {
        console.warn('PlayersList: Error cargando datos', e);
        if (mounted) {
          setTeams([]);
          setPlayers([]);
          setLoading(false);
          setLoadingProgress(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

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
          if (n) return n === targetRole;
          return targetRole === 'Midfielder'; // fallback
        });
      }
    }
    
    if (teamFilter !== 'all') list = list.filter(p => p.teamId === teamFilter);
    const canonical = canonicalFromEs(posFilter);
    if (canonical) list = list.filter(p => {
      const n = normalizePosition(p.position);
      if (n) return n === canonical;
      // Si no hay posición, consideramos CEN como valor por defecto
      return canonical === 'Midfielder';
    });
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    
    // Ordenar primero por equipo (alfabéticamente) y luego por posición dentro de cada equipo
    const positionOrder: Record<CanonicalPos, number> = {
      'Goalkeeper': 1,
      'Defender': 2,
      'Midfielder': 3,
      'Attacker': 4
    };
    
    list.sort((a, b) => {
      // Primero por equipo (alfabético)
      const teamA = (a.teamName || '').trim();
      const teamB = (b.teamName || '').trim();
      const teamComparison = teamA.localeCompare(teamB, 'es', { sensitivity: 'base' });
      
      if (teamComparison !== 0) {
        return teamComparison;
      }
      
      // Si el equipo es el mismo, ordenar por posición
      const posA = normalizePosition(a.position) ?? 'Midfielder';
      const posB = normalizePosition(b.position) ?? 'Midfielder';
      const orderA = positionOrder[posA];
      const orderB = positionOrder[posB];
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Si equipo y posición son iguales, ordenar por nombre alfabéticamente
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
    
    return list;
  }, [players, teamFilter, posFilter, query, selectMode, filterByRole]);

  // Cargar fotos de jugadores (Wikipedia thumbnail) con caché simple
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  const fetchWikiThumb = useCallback(async (name: string): Promise<string | undefined> => {
    const encoded = encodeURIComponent(name);
    const tryLang = async (lang: 'en' | 'es') => {
      try {
        const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
        if (!res.ok) return undefined;
        const json: any = await res.json();
        return json?.thumbnail?.source as string | undefined;
      } catch {
        return undefined;
      }
    };
    return (await tryLang('en')) ?? (await tryLang('es'));
  }, []);

  useEffect(() => {
    let mounted = true;
    // Prefetch fotos para los primeros 25 visibles que no estén en caché
    const prefetch = async () => {
      const slice = filtered.slice(0, 25);
      const updates: Record<string, string> = {};
      for (const p of slice) {
        const key = `${p.teamId}-${p.id}`;
        if (photoMap[key]) continue;
        const url = await fetchWikiThumb(p.name);
        if (url) updates[key] = url;
      }
      if (mounted && Object.keys(updates).length) {
        setPhotoMap(prev => ({ ...prev, ...updates }));
      }
    };
    prefetch();
    return () => { mounted = false; };
  }, [filtered, fetchWikiThumb, photoMap]);

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
        {loading && (
          <LoadingScreen />
        )}
        {!loading && (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
        <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>
          {selectMode ? `Seleccionar ${filterByRole || 'Jugador'}` : 'Jugadores LaLiga'}
        </Text>
        
        {/* Progress indicator when loading progressively */}
        {loadingProgress && (
          <View style={{ backgroundColor: '#1a2332', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: '#cbd5e1', textAlign: 'center', marginBottom: 4 }}>
              Cargando jugadores: {loadingProgress.done} / {loadingProgress.total}
            </Text>
            <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 12 }}>
              {loadingProgress.currentTeam}
            </Text>
            <View style={{ backgroundColor: '#334155', height: 4, borderRadius: 2, marginTop: 8 }}>
              <View 
                style={{ 
                  backgroundColor: '#10b981', 
                  height: 4, 
                  borderRadius: 2, 
                  width: `${(loadingProgress.done / loadingProgress.total) * 100}%` 
                }} 
              />
            </View>
          </View>
        )}
        
        {/* Filtros con Dropdowns */}
        {selectMode ? (
          // En modo selección: solo equipo y búsqueda
          <View>
            <Dropdown
              label="Equipo"
              value={teamFilter}
              onValueChange={setTeamFilter}
              items={[
                { label: 'Todos los equipos', value: 'all' },
                ...teams.map(t => ({ label: t.name, value: t.id }))
              ]}
            />
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
        ) : (
          // Modo normal: todos los filtros
          <View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
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
              <View style={{ flex: 1 }}>
                <Dropdown
                  label="Posición"
                  value={posFilter}
                  onValueChange={setPosFilter}
                  items={positionsEs.map(p => ({ label: p, value: p }))}
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
        )}

        {
          <View>
            {/* Lista de jugadores */}
            {filtered.map(p => {
              const cat = normalizePosition(p.position);
              const displayCat: CanonicalPos = cat ?? 'Midfielder';
              const badgeColor = posColors[displayCat];
              const badgeAbbr = posAbbr[displayCat];
              const key = `${p.teamId}-${p.id}`;
              const photo = p.photo ?? photoMap[key] ?? getAvatarUri(p);
              const isAvatar = photo.includes('ui-avatars.com');
              
              const handlePress = () => {
                if (selectMode && onPlayerSelected) {
                  onPlayerSelected(p);
                  navigation.goBack();
                } else if (!selectMode && ligaId) {
                  addPlayerToSquad(p);
                }
              };
              
              return (
                <TouchableOpacity 
                  key={key} 
                  onPress={handlePress}
                  style={{ 
                    backgroundColor: '#1a2332', 
                    borderWidth: 1, 
                    borderColor: '#334155', 
                    borderRadius: 12, 
                    padding: 12, 
                    marginBottom: 10,
                    opacity: 1
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#334155', marginRight: 12, backgroundColor: '#0b1220' }}
                      resizeMode="cover"
                      onError={() => {
                        if (!isAvatar) {
                          setPhotoMap(prev => ({ ...prev, [key]: getAvatarUri(p) }));
                        }
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{p.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ color: '#0f1419', fontWeight: '800', fontSize: 11 }}>{badgeAbbr}</Text>
                        </View>
                        {p.teamCrest ? (
                          <Image
                            key={`${p.id}-${p.teamId}-crest`}
                            source={{ uri: p.teamCrest }}
                            style={{ width: 22, height: 22, marginLeft: 8, backgroundColor: 'transparent' }}
                            resizeMode="contain"
                            onError={(error) => {
                              console.warn(`Error cargando escudo de ${p.teamName}:`, error.nativeEvent.error);
                            }}
                          />
                        ) : null}
                      </View>
                    </View>
                    {selectMode && (
                      <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: '#10b981', fontSize: 16 }}>→</Text>
                      </View>
                    )}
                    {!selectMode && ligaId && (
                      <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: '#3b82f6', fontSize: 16 }}>+</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>No hay resultados con los filtros actuales.</Text>
            )}
          </View>
        }
      </ScrollView>
      )}
      
        {/* Barra de navegación */}
        <LigaNavBar ligaId={ligaId} ligaName={ligaName} division={division} isPremium={isPremium} />
      </LinearGradient>
    </SafeLayout>
  );
};

export default PlayersList;
