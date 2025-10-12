import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { ClasificacionStyles as styles } from '../../styles/ClasificacionStyles';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import LigaNavBar from '../navBar/LigaNavBar';
import LigaTopNavBar from '../navBar/LigaTopNavBar';

type UsuarioClasificacion = {
  id: string;
  nombre: string;
  puntos: number;
  posicion: number;
};

type ClasificacionRouteProps = RouteProp<{ params: { ligaId: string, ligaName: string } }, 'params'>;

export const Clasificacion = () => {
  const route = useRoute<ClasificacionRouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { ligaId } = route.params;
  const { ligaName } = route.params;

  const [jugadores, setJugadores] = useState<UsuarioClasificacion[]>([]);
  const [ligaNombre, setLigaNombre] = useState<string>(ligaName);
  const [codigoLiga, setCodigoLiga] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        setLoading(true);

        const response = await LigaService.listarMiembros(ligaId);
        console.log('🔍 Clasificacion - Response completa:', JSON.stringify(response, null, 2));

        const dataOrdenada = response
          .sort((a: any, b: any) => b.points - a.points)
          .map((u: any, index: number) => ({
            id: u.user?.id || u.userId || `jugador-${index}`,
            nombre: u.user?.name || 'Jugador desconocido',
            puntos: u.points ?? 0,
            posicion: index + 1,
          }));

        setJugadores(dataOrdenada);
        setLigaNombre(ligaNombre);
        
        // Obtener código de liga del primer miembro (todos tienen la misma liga)
        if (response.length > 0 && response[0].league?.code) {
          console.log('✅ Código de liga encontrado:', response[0].league.code);
          setCodigoLiga(response[0].league.code);
        } else {
          console.warn('❌ No se encontró código de liga en la respuesta');
          console.log('Estructura del primer elemento:', response[0]);
        }
      } catch (err) {
        console.error('Error al obtener clasificación:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasificacion();
  }, [ligaId]);

  return (
    <LinearGradient
      colors={['#181818ff', '#181818ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <LigaTopNavBar
      nombreLiga={ligaNombre}
      onInvitePress={() => navigation.navigate('InvitarAmigos', { 
        ligaNombre: ligaNombre, 
        codigo: codigoLiga,
        ligaId: ligaId
      })}
    />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'LIGA BETTASY ' + ligaNombre}</Text>
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : jugadores.length > 0 ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {jugadores.map((jugador) => {
            const posBadgeExtra = jugador.posicion === 1
              ? styles.posBadgeFirst
              : jugador.posicion === 2
              ? styles.posBadgeSecond
              : jugador.posicion === 3
              ? styles.posBadgeThird
              : undefined;
            return (
              <View key={jugador.id} style={styles.userBox}>
                <View style={styles.userRow}>
                  <View style={[styles.posBadge, posBadgeExtra]}>
                    <Text style={styles.positionText}>{jugador.posicion}</Text>
                  </View>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {jugador.nombre}
                  </Text>
                  <View style={styles.pointsChip}>
                    <Text style={styles.pointsText}>{jugador.puntos} pts</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#ccc', fontSize: 16 }}>
            No hay jugadores en esta liga.
          </Text>
        </View>
      )}

      {/* Barra inferior */}
      <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
    </LinearGradient>
  );
};

export default Clasificacion;
