import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { HomeIcon, TrophyIcon, ShieldIcon, UsersIcon, TargetIcon } from '../../components/VectorIcons';

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

  // Configuración de botones con iconos SVG elegantes
  const buttons = [
    {
      icon: HomeIcon,
      label: 'Inicio',
      onPress: handleHome,
      isActive: currentRoute === 'Home'
    },
    {
      icon: TrophyIcon,
      label: 'Liga',
      onPress: handleClasificacion,
      isActive: currentRoute === 'Clasificacion'
    },
    {
      icon: ShieldIcon,
      label: 'Equipo',
      onPress: handleEquipo,
      isActive: currentRoute === 'Equipo' || currentRoute === 'MiPlantilla'
    },
    {
      icon: UsersIcon,
      label: 'Mercado',
      onPress: handleJugadores,
      isActive: currentRoute === 'PlayersList'
    },
    {
      icon: TargetIcon,
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
          <TouchableOpacity
            key={index}
            onPress={button.onPress}
            style={[
              styles.navButton,
              button.isActive && styles.navButtonActive
            ]}
            activeOpacity={0.7}
          >
            <View style={{ marginBottom: 4 }}>
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default LigaNavBar;
