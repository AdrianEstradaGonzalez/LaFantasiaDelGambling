import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CrearLigaStyles as styles } from '../../styles/CrearLigaStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import TopNavBar from '../navBar/TopNavBar';
import { CustomAlertManager } from '../../components/CustomAlert';
import { SafeLayout } from '../../components/SafeLayout';
import { useRoute } from '@react-navigation/native';

type CrearLigaProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type CrearLigaRouteProp = RouteProp<{ params: { codigo?: string } }, 'params'>;

type CrearLigaRouteWithMode = RouteProp<{ params: { codigo?: string; mode?: 'create' | 'join' } }, 'params'>;

export const CrearLiga = ({ navigation }: CrearLigaProps) => {
  const route = useRoute<CrearLigaRouteWithMode>();
  const [nombreLiga, setNombreLiga] = useState('');
  const [codigoLiga, setCodigoLiga] = useState('');
  const [loadingCrear, setLoadingCrear] = useState(false);
  const [loadingUnirse, setLoadingUnirse] = useState(false);

  // Manejar código de deep link
  useEffect(() => {
    if (route.params?.codigo) {
      setCodigoLiga(route.params.codigo);
      // Opcional: auto-scroll a la sección de unirse
      CustomAlertManager.alert(
        '¡Invitación recibida!',
        `Código de liga detectado: ${route.params.codigo}. Pulsa "Unirse a liga" para continuar.`,
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: '#10b981' }
      );
    }
  }, [route.params?.codigo]);

  const handleCrearLiga = async () => {
    if (!nombreLiga.trim()) {
      CustomAlertManager.alert(
        'Error',
        'Por favor, introduce un nombre para la liga.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      setLoadingCrear(true);
      const nuevaLiga = await LigaService.crearLiga({ name: nombreLiga });
      
      // Limpiar el campo y navegar directamente a InvitarAmigos
      setNombreLiga('');
      navigation.navigate('InvitarAmigos', { 
        ligaNombre: nuevaLiga.name, 
        codigo: nuevaLiga.code,
        ligaId: nuevaLiga.id
      });
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo crear la liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setLoadingCrear(false);
    }
  };

  // 🏷 Unirse a una liga existente
  const handleUnirseLiga = async () => {
    if (!codigoLiga.trim()) {
      CustomAlertManager.alert(
        'Error',
        'Introduce un código válido para unirte.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      setLoadingUnirse(true);
      const ligaResponse = await LigaService.unirsePorCodigo(codigoLiga.toUpperCase());
      
      // Limpiar el campo y navegar directamente a Clasificacion de la liga
      setCodigoLiga('');
      navigation.navigate('Clasificacion', { 
        ligaId: ligaResponse.league.id, 
        ligaName: ligaResponse.league.name
      });
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo unir a la liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setLoadingUnirse(false);
    }
  };

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient
        colors={['#181818ff', '#181818ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <TopNavBar backTo="Home" />
        <ScrollView contentContainerStyle={styles.container}>
       
        {/* Crear liga privada */}
        {route.params?.mode !== 'join' && (
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
              onChangeText={(text) => {
                // Limitar a máximo 20 caracteres para el nombre de la liga
                const truncated = text.slice(0, 20);
                setNombreLiga(truncated);
              }}
            />
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{nombreLiga.length}/20</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingCrear && styles.primaryButtonDisabled]}
            onPress={handleCrearLiga}
            disabled={loadingCrear}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, loadingCrear && styles.primaryButtonTextDisabled]}>
              {loadingCrear ? 'Creando...' : 'Crear Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Consejo</Text>
            <Text style={styles.tipsText}>
              Una vez creada, podrás compartir el código de la liga con tus amigos para que se unan.
            </Text>
          </View>
          </View>
        )}

        {/* Unirse a liga */}
        {route.params?.mode !== 'create' && (
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
              value={codigoLiga.toUpperCase()}
              onChangeText={text => setCodigoLiga(text.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingUnirse && styles.primaryButtonDisabled]}
            onPress={handleUnirseLiga}
            disabled={loadingUnirse}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, loadingUnirse && styles.primaryButtonTextDisabled]}>
              {loadingUnirse ? 'Uniéndose...' : 'Unirse a Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>ℹ️ Información</Text>
            <Text style={styles.tipsText}>
              Pide a tu amigo el código de la liga para poder participar en la competición.
            </Text>
          </View>
          </View>
        )}
        </ScrollView>
      </LinearGradient>
    </SafeLayout>
  );
};
