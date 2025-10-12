import React from 'react';
import { View, TouchableOpacity, Text, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { HomeIcon, LeaderboardIcon, JerseyIcon, TrendingIcon, DiceIcon } from '../../components/VectorIcons';

type LigaNavBarProps = {
  ligaId?: string;
  ligaName?: string;
};

const LigaNavBar: React.FC<LigaNavBarProps> = ({ ligaId, ligaName }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  
  // Determinar qué página está activa
  const currentRoute = route.name;

  const handleClasificacion = () => navigation.navigate('Clasificacion', { ligaId, ligaName });
  const handleEquipo = () => navigation.navigate('Equipo', { ligaId, ligaName });
  const handleJugadores = () => navigation.navigate('PlayersList', { ligaId, ligaName });
  const handleApuestas = () => navigation.navigate('Apuestas');
  const handleHome = () => navigation.navigate('Home');

  // Configuración de botones con iconos SVG más representativos
  const buttons = [
    {
      icon: HomeIcon,
      label: 'Inicio',
      onPress: handleHome,
      isActive: currentRoute === 'Home'
    },
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
      isActive: currentRoute === 'PlayersList'
    },
    {
      icon: DiceIcon,
      label: 'Apuestas',
      onPress: handleApuestas,
      isActive: currentRoute === 'Apuestas'
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
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                opacity: pressed && !button.isActive ? 0.7 : 1,
              })}
            >
              <View style={{ 
                marginBottom: 4, 
                backgroundColor: 'transparent',
                overflow: 'visible'
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
