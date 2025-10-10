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
import TopNavBar from '../navBar/TopNavBar';

type CrearLigaProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const CrearLiga = ({ navigation }: CrearLigaProps) => {
  const [nombreLiga, setNombreLiga] = useState('');
  const [codigoLiga, setCodigoLiga] = useState('');
  const [loading, setLoading] = useState(false);

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
      await LigaService.agregarMiembro(codigoLiga, { userId: 'me' });
      Alert.alert(
        '✅ Te has unido',
        `¡Bienvenido a la liga! Ya formas parte de la competición.`,
        [
          {
            text: 'Ver mis ligas',
            onPress: () => {
              setCodigoLiga('');
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
      colors={['#181818ff', '#181818ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
       <TopNavBar />
      <ScrollView contentContainerStyle={styles.container}>
       
        {/* Crear liga privada */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Crear Liga Privada</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Crea tu propia liga y compite con amigos
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre de la liga</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: TormentaImperfecta"
              placeholderTextColor="#94a3b8"
              value={nombreLiga}
              onChangeText={setNombreLiga}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleCrearLiga}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, loading && styles.primaryButtonTextDisabled]}>
              {loading ? 'Creando...' : 'Crear Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Consejo</Text>
            <Text style={styles.tipsText}>
              Una vez creada, podrás compartir el código de la liga con tus amigos para que se unan.
            </Text>
          </View>
        </View>

        {/* Unirse a liga */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unirse a Liga</Text>
          </View>
          <Text style={styles.sectionDescription}>
            ¿Tienes un código de liga? Únete aquí
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Código de liga</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el código"
              placeholderTextColor="#94a3b8"
              value={codigoLiga}
              onChangeText={setCodigoLiga}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleUnirseLiga}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, loading && styles.primaryButtonTextDisabled]}>
              {loading ? 'Uniéndose...' : 'Unirse a Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>ℹ️ Información</Text>
            <Text style={styles.tipsText}>
              Pide a tu amigo el código de la liga para poder participar en la competición.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};
