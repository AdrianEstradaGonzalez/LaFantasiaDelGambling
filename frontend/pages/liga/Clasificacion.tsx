import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { ClasificacionStyles as styles } from '../../styles/ClasificacionStyles';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import BottomNavBar from '../navBar/BottomNavBar';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasificacion = async () => {
      try {
        setLoading(true);

        // 🔹 Llama a la API
        const response = await LigaService.listarMiembros(ligaId);

        // 🔹 Adaptamos el JSON real a nuestro modelo
        const dataOrdenada = response
          .sort((a: any, b: any) => b.points - a.points)
          .map((u: any, index: number) => ({
            id: u.user?.id || u.userId || `jugador-${index}`, // fallback por seguridad
            nombre: u.user?.name || 'Jugador desconocido',
            puntos: u.points ?? 0,
            posicion: index + 1,
          }));

        setJugadores(dataOrdenada);
        // Si tu backend devuelve el nombre de liga en otro endpoint, podrías agregarlo aquí
        setLigaNombre(ligaNombre);
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
      colors={['#101011ff', '#101011ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
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
          {jugadores.map((jugador) => (
            <View key={jugador.id} style={styles.userBox}>
              <View style={styles.userRow}>
                <Text style={styles.positionText}>{jugador.posicion}</Text>
                <Text style={styles.nameText}>{jugador.nombre}</Text>
                <Text style={styles.pointsText}>{jugador.puntos} pts</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#ccc', fontSize: 16 }}>
            No hay jugadores en esta liga.
          </Text>
        </View>
      )}

      {/* Barra inferior */}
      <BottomNavBar />
    </LinearGradient>
  );
};

export default Clasificacion;
