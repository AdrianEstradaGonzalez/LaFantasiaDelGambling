import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { HomeIcon, LogoutIcon } from '../../components/VectorIcons';

const BottomNavBar: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  
  // Determinar qué página está activa
  const currentRoute = route.name;

  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  const handleLogoutPress = () => {
    navigation.navigate('Login');
  };

  // Configuración de botones
  const buttons = [
    {
      icon: HomeIcon,
      label: 'Inicio',
      onPress: handleHomePress,
      isActive: currentRoute === 'Home'
    },
    {
      icon: LogoutIcon,
      label: 'Salir',
      onPress: handleLogoutPress,
      isActive: false
    }
  ];

  return (
    <View style={styles.navBar}>
      {/* Espaciador izquierdo para centrar */}
      <View style={{ flex: 1 }} />
      
      {buttons.map((button, index) => {
        const IconComponent = button.icon;
        return (
          <TouchableOpacity
            key={index}
            onPress={button.onPress}
            style={[
              styles.navButton,
              button.isActive && styles.navButtonActive,
              { marginHorizontal: 30 } // Más espacio entre botones
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
      
      {/* Espaciador derecho para centrar */}
      <View style={{ flex: 1 }} />
    </View>
  );
};

export default BottomNavBar;
