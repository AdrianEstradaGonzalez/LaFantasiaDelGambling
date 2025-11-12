import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { LeaderboardIcon, JerseyIcon, TrendingIcon, DiceIcon } from '../../components/VectorIcons';
import { AdMobService } from '../../services/AdMobService';

type LigaNavBarProps = {
  ligaId?: string;
  ligaName?: string;
  division?: string;
  isPremium?: boolean;
};

/**
 * Muestra un anuncio intersticial con 15% de probabilidad
 */
const showInterstitialWithProbability = async () => {
  try {
    const randomNumber = Math.random();
    if (randomNumber < 0.15) { // 15% de probabilidad
      console.log('🎲 Mostrando intersticial (probabilidad 15%)');
      await AdMobService.showInterstitial();
    } else {
      console.log('🎲 Sin intersticial esta vez (probabilidad 85%)');
    }
  } catch (error) {
    console.error('❌ Error al intentar mostrar intersticial:', error);
    // No bloquear la navegación si falla el anuncio
  }
};

const LigaNavBar: React.FC<LigaNavBarProps> = ({ ligaId, ligaName, division = 'primera', isPremium = false }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  
  // Precargar intersticial al montar el componente
  useEffect(() => {
    AdMobService.preloadInterstitial().catch(err => {
      console.error('Error al precargar intersticial:', err);
    });
  }, []);
  
  // Determinar qué página está activa
  const currentRoute = route.name;

  const handleClasificacion = async () => {
    await showInterstitialWithProbability();
    navigation.navigate('Clasificacion', { ligaId, ligaName, division, isPremium });
  };
  
  const handleEquipo = async () => {
    await showInterstitialWithProbability();
    navigation.navigate('Equipo', { ligaId, ligaName, division, isPremium });
  };
  
  const handleJugadores = async () => {
    await showInterstitialWithProbability();
    navigation.navigate('PlayersMarket', { ligaId, ligaName, division, isPremium });
  };
  
  const handleApuestas = async () => {
    await showInterstitialWithProbability();
    navigation.navigate('Apuestas', { ligaId, ligaName, division, isPremium });
  };

  // Configuración de botones con iconos SVG más representativos
  const buttons = [
    {
      icon: LeaderboardIcon,
      label: 'Liga',
      onPress: handleClasificacion,
      isActive: currentRoute === 'Clasificacion'
    },
    {
      icon: JerseyIcon,
      label: 'Equipo',
      onPress: handleEquipo,
      isActive: currentRoute === 'Equipo' || currentRoute === 'MiPlantilla'
    },
    {
      icon: TrendingIcon,
      label: 'Mercado',
      onPress: handleJugadores,
      isActive: currentRoute === 'PlayersMarket' || currentRoute === 'PlayersList'
    },
    {
      icon: DiceIcon,
      label: 'Apuestas',
      onPress: handleApuestas,
      isActive: currentRoute === 'Apuestas' || currentRoute === 'HistorialApuestas'
    }
  ];

  return (
    <View style={styles.navBar}>
      {buttons.map((button, index) => {
        const IconComponent = button.icon;
        return (
          <View
            key={index}
            style={[
              styles.navButton,
              { 
                backgroundColor: button.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderRadius: 16,
              }
            ]}
          >
            <Pressable
              onPress={button.onPress}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
                backgroundColor: 'transparent',
                opacity: pressed && !button.isActive ? 0.7 : 1,
              })}
            >
              <View style={{ 
                marginBottom: 4, 
                backgroundColor: 'transparent',
                overflow: 'visible',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IconComponent 
                  size={button.isActive ? 28 : 24}
                  color="rgba(255, 255, 255, 0.7)"
                  isActive={button.isActive}
                />
              </View>
              <Text style={[
                styles.navText,
                button.isActive && styles.navTextActive
              ]}>
                {button.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

export default LigaNavBar;
