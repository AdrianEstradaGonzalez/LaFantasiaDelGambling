import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CrearLigaStyles as styles } from '../../styles/CrearLigaStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import BottomNavBar from '../navBar/BottomNavBar';
import { LigaService } from '../../services/LigaService';

type CrearLigaProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const CrearLiga = ({ navigation }: CrearLigaProps) => {
  const [nombreLiga, setNombreLiga] = useState('');
  const [codigoLiga, setCodigoLiga] = useState('');
  const [loading, setLoading] = useState(false);

  // ➕ Crear liga privada
  const handleCrearLiga = async () => {
    if (!nombreLiga.trim()) {
      Alert.alert('Error', 'Por favor, introduce un nombre para la liga.');
      return;
    }

    try {
      setLoading(true);
      const nuevaLiga = await LigaService.crearLiga({ name: nombreLiga });
      Alert.alert(
        '🎉 Liga creada',
        `Tu liga "${nuevaLiga.name}" ha sido creada correctamente. ¡Ya puedes empezar a invitar jugadores!`,
        [
          {
            text: 'Ver mis ligas',
            onPress: () => {
              setNombreLiga('');
              // Navegar de vuelta con parámetro para refrescar
              navigation.navigate('Home', { refreshLigas: true });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la liga');
    } finally {
      setLoading(false);
    }
  };

  // 🏷 Unirse a una liga existente
  const handleUnirseLiga = async () => {
    if (!codigoLiga.trim()) {
      Alert.alert('Error', 'Introduce un código válido para unirte.');
      return;
    }

    try {
      setLoading(true);
      // Llamamos al endpoint para agregar miembro
      await LigaService.agregarMiembro(codigoLiga, { userId: 'me' }); // "me" indica usuario actual
      Alert.alert(
        '✅ Te has unido', 
        `¡Bienvenido a la liga! Ya formas parte de la competición.`,
        [
          {
            text: 'Ver mis ligas',
            onPress: () => {
              setCodigoLiga('');
              // Navegar de vuelta con parámetro para refrescar
              navigation.navigate('Home', { refreshLigas: true });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo unir a la liga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#101011ff', '#0f2f45']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Crear liga privada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crea una liga privada</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la liga"
            placeholderTextColor="#aaa"
            value={nombreLiga}
            onChangeText={setNombreLiga}
          />
          <TouchableOpacity
            style={styles.ligaButton}
            onPress={handleCrearLiga}
            disabled={loading}
          >
            <Text style={styles.ligaButtonText}>
              {loading ? 'Creando...' : 'Crear liga privada'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unirse a liga */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Únete a una liga existente</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de liga"
            placeholderTextColor="#aaa"
            value={codigoLiga}
            onChangeText={setCodigoLiga}
          />
          <TouchableOpacity
            style={styles.ligaButton}
            onPress={handleUnirseLiga}
            disabled={loading}
          >
            <Text style={styles.ligaButtonText}>
              {loading ? 'Uniendo...' : 'Unirse a liga'}
            </Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar />
      </ScrollView>
    </LinearGradient>
  );
};
