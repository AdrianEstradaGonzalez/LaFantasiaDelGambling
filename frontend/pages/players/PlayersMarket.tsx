import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image, Alert, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayerService, PlayerWithPrice } from '../../services/PlayerService';
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
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<PlayerWithPrice[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});
  const [posFilter, setPosFilter] = useState<PositionFilterEs>('Todos');
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;

  // Cargar jugadores desde el backend
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PlayerService.getAllPlayers();
      setPlayers(data);
      setEditedPrices({}); // Resetear ediciones al cargar
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

  // Filtrado de jugadores
  const filtered = useMemo(() => {
    let list = players;
    
    // Filtro por posición
    const canonical = canonicalFromEs(posFilter);
    if (canonical) {
      list = list.filter(p => {
        const n = normalizePosition(p.position);
        return n === canonical;
      });
    }
    
    // Filtro por búsqueda de nombre
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    
    // Filtro por rango de precio
    if (minPrice) {
      const min = parseInt(minPrice);
      if (!isNaN(min)) {
        list = list.filter(p => {
          const currentPrice = editedPrices[p.id] ?? p.price;
          return currentPrice >= min;
        });
      }
    }
    if (maxPrice) {
      const max = parseInt(maxPrice);
      if (!isNaN(max)) {
        list = list.filter(p => {
          const currentPrice = editedPrices[p.id] ?? p.price;
          return currentPrice <= max;
        });
      }
    }
    
    return list;
  }, [players, posFilter, query, minPrice, maxPrice, editedPrices]);

  // Manejar cambio de precio
  const handlePriceChange = (playerId: number, newPrice: string) => {
    const price = parseInt(newPrice);
    if (newPrice === '' || (price >= 1 && price <= 250)) {
      setEditedPrices(prev => ({
        ...prev,
        [playerId]: newPrice === '' ? 0 : price
      }));
    }
  };

  // Guardar cambios en BD
  const saveChanges = async () => {
    const updates = Object.entries(editedPrices)
      .filter(([_, price]) => price > 0)
      .map(([id, price]) => ({ id: parseInt(id), price }));

    if (updates.length === 0) {
      Alert.alert('Sin cambios', 'No hay precios modificados para guardar');
      return;
    }

    Alert.alert(
      'Confirmar cambios',
      `¿Guardar ${updates.length} precio(s) modificado(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            try {
              setSaving(true);
              await PlayerService.updateMultiplePrices(updates);
              Alert.alert('Éxito', 'Precios actualizados correctamente');
              await loadPlayers(); // Recargar datos
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'No se pudieron guardar los cambios');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // Renderizar item de jugador
  const renderPlayer = ({ item: p }: { item: PlayerWithPrice }) => {
    const cat = normalizePosition(p.position);
    const displayCat: CanonicalPos = cat ?? 'Midfielder';
    const badgeColor = posColors[displayCat];
    const badgeAbbr = posAbbr[displayCat];
    const photo = p.photo ?? getAvatarUri(p);
    const currentPrice = editedPrices[p.id] ?? p.price;
    const hasChanges = editedPrices[p.id] !== undefined && editedPrices[p.id] !== p.price;

    return (
      <View style={{ 
        backgroundColor: '#1a2332', 
        borderWidth: 1, 
        borderColor: hasChanges ? '#10b981' : '#334155', 
        borderRadius: 12, 
        padding: 12, 
        marginBottom: 10
      }}>
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
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Precio (M)</Text>
            <TextInput
              value={currentPrice === 0 ? '' : currentPrice.toString()}
              onChangeText={(text) => handlePriceChange(p.id, text)}
              keyboardType="numeric"
              placeholder={p.price.toString()}
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: '#0b1220',
                borderWidth: 1,
                borderColor: hasChanges ? '#10b981' : '#475569',
                color: hasChanges ? '#10b981' : '#fff',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                width: 80,
                textAlign: 'center',
                fontWeight: '700',
                fontSize: 16
              }}
              maxLength={3}
            />
          </View>
        </View>
      </View>
    );
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

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
                <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>
                  Mercado de Jugadores
                </Text>
                
                {/* Filtros */}
                <View>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Posición"
                        value={posFilter}
                        onValueChange={setPosFilter}
                        items={positionsEs.map(p => ({ label: p, value: p }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Precio mín (M)</Text>
                      <TextInput
                        value={minPrice}
                        onChangeText={setMinPrice}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor="#94a3b8"
                        style={{
                          backgroundColor: '#1a2332',
                          borderWidth: 1,
                          borderColor: '#334155',
                          color: '#fff',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderRadius: 10,
                          height: 46
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Precio máx (M)</Text>
                      <TextInput
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                        placeholder="250"
                        placeholderTextColor="#94a3b8"
                        style={{
                          backgroundColor: '#1a2332',
                          borderWidth: 1,
                          borderColor: '#334155',
                          color: '#fff',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderRadius: 10,
                          height: 46
                        }}
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

                {/* Botón de guardar */}
                {hasChanges && (
                  <TouchableOpacity
                    onPress={saveChanges}
                    disabled={saving}
                    style={{
                      backgroundColor: '#10b981',
                      paddingVertical: 14,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginRight: 8 }}>
                          Guardar Cambios
                        </Text>
                        <Text style={{ color: '#fff', fontSize: 16 }}>💾</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            }
            ListEmptyComponent={
              <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
                No hay jugadores con los filtros actuales
              </Text>
            }
            showsVerticalScrollIndicator={true}
          />

          {/* Barra de navegación */}
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
        </>
      )}
    </LinearGradient>
  );
};

export default PlayersMarket;
