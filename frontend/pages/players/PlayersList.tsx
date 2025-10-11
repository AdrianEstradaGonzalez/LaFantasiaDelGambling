import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService, { Player, TeamMinimal } from '../../services/FutbolService';

// Posiciones en español para los filtros
const positionsEs = ['Todos','Portero','Defensa','Centrocampista','Delantero'] as const;
type PositionFilterEs = typeof positionsEs[number];

// Normalización de posiciones del API -> categorías canónicas
type CanonicalPos = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
const normalizePosition = (pos?: string): CanonicalPos | undefined => {
  if (!pos) return undefined;
  const p = pos.trim().toLowerCase();
  // Portero
  if (p.includes('goal') || p.includes('keeper') || p === 'gk') return 'Goalkeeper';
  // Defensa (cubre distintos tipos de backs)
  if (p.includes('defen') || p.includes('back') || p.includes('centre-back') || p.includes('center back') || p.includes('fullback') || p.includes('left back') || p.includes('right back') || p.includes('wing-back') || p.includes('wingback')) return 'Defender';
  // Delantero (incluye extremos como atacantes)
  if (p.includes('attack') || p.includes('offen') || p.includes('forward') || p.includes('striker') || p.includes('winger')) return 'Attacker';
  // Centrocampista
  if (p.includes('midf') || p.includes('mid') || p.includes('medio') || p.includes('centrocamp')) return 'Midfielder';
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
  Goalkeeper: 'POR',
  Defender: 'DEF',
  Midfielder: 'CEN',
  Attacker: 'DEL',
};

const getAvatarUri = (p: Player) => {
  // Siempre avatar basado en nombre (no usar crest del equipo)
  const bg = '334155';
  const color = 'ffffff';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=${bg}&color=${color}&size=128`;
};

export const PlayersList = () => {
  // loading: solo para la carga inicial de equipos (para que salgan los filtros cuanto antes)
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamMinimal[]>([]);
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [query, setQuery] = useState('');
  // usando cache precargada; no mostramos progreso por equipo

  useEffect(() => {
    let mounted = true;
    let localTeams: TeamMinimal[] = [];
    (async () => {
      try {
        setLoading(true);
        console.log('PlayersList: Cargando datos desde caché...');
        localTeams = await FootballService.getLaLigaTeamsCached();
        if (!mounted) return;
        console.log('PlayersList: Equipos (cache) cargados:', localTeams.length);
        setTeams(localTeams);
      } catch (e) {
        console.warn('PlayersList init (equipos cache) error', e);
      } finally {
        if (mounted) setLoading(false);
      }

      // Si no hay equipos, no intentamos cargar jugadores
      if (!mounted) return;
  const toLoad = (typeof localTeams !== 'undefined' ? localTeams : teams) ?? [];
      if (toLoad.length === 0) {
        console.warn('PlayersList: No hay equipos; omitiendo carga de jugadores.');
        return;
      }

      // Obtener todos los jugadores desde caché
      try {
        const allPlayers = await FootballService.getAllPlayersCached();
        if (!mounted) return;
        setPlayers(allPlayers);
      } catch (e) {
        console.warn('PlayersList: Error obteniendo jugadores (cache)', e);
      } finally {
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = players;
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
    return list;
  }, [players, teamFilter, posFilter, query]);

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
    <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Jugadores LaLiga</Text>
        {/* Filters */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Equipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{}}>
            <TouchableOpacity onPress={() => setTeamFilter('all')} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: teamFilter==='all' ? '#475569' : '#2a3441', borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginRight: 8 }}>
              <Text style={{ color: '#fff' }}>Todos</Text>
            </TouchableOpacity>
            {teams.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setTeamFilter(t.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: teamFilter===t.id ? '#475569' : '#2a3441', borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginRight: 8 }}>
                <Text style={{ color: '#fff' }}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Posición</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {positionsEs.map(p => (
              <TouchableOpacity key={p} onPress={() => setPosFilter(p)} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: posFilter===p ? '#475569' : '#2a3441', borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginRight: 8 }}>
                <Text style={{ color: '#fff' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Buscar jugador</Text>
          <TextInput
            placeholder="Escribe un nombre"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            style={{ backgroundColor: '#1a2332', borderWidth: 1, borderColor: '#334155', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
          />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#94a3b8" />
          </View>
        ) : (
          <View>
            {/* Lista de jugadores */}
            {filtered.map(p => {
              const cat = normalizePosition(p.position);
              const displayCat: CanonicalPos = cat ?? 'Midfielder';
              const badgeColor = posColors[displayCat];
              const badgeAbbr = posAbbr[displayCat];
              const key = `${p.teamId}-${p.id}`;
              const photo = photoMap[key] ?? getAvatarUri(p);
              const isAvatar = photo.includes('ui-avatars.com');
              return (
                <View key={key} style={{ backgroundColor: '#1a2332', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#334155', marginRight: 12 }}
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
                            source={{ uri: p.teamCrest }}
                            style={{ width: 22, height: 22, borderRadius: 3, marginLeft: 8, borderWidth: 1, borderColor: '#334155' }}
                            resizeMode="contain"
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
            {filtered.length === 0 && (
              <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>No hay resultados con los filtros actuales.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default PlayersList;
