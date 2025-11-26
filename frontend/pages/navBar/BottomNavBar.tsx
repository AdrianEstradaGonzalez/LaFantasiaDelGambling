import React from 'react';
import { View, TouchableOpacity, Text, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { HomeIcon, LogoutIcon } from '../../components/VectorIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EncryptedStorage from 'react-native-encrypted-storage';

const BottomNavBar: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  // Determinar qué página está activa
  const currentRoute = route.name;

  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  const handleLogoutPress = async () => {
    try {
      // Limpiar todo el storage
      await EncryptedStorage.clear();
      // Reset navigation stack to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Fallback: solo navegar si falla el clear
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
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
    <View style={[
      styles.navBar,
      {
        paddingBottom: Math.max(insets.bottom, 10),
      }
    ]}>
      {/* Espaciador izquierdo para centrar */}
      <View style={{ flex: 1 }} />
      
      {buttons.map((button, index) => {
        const IconComponent = button.icon;
        return (
          <View
            key={index}
            style={[
              styles.navButton,
              // button.isActive && styles.navButtonActive, // Temporalmente comentado
              { 
                marginHorizontal: 30,
                backgroundColor: button.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderRadius: 16,
                // Sin shadow, sin elevation, sin border
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
      
      {/* Espaciador derecho para centrar */}
      <View style={{ flex: 1 }} />
    </View>
  );
};

export default BottomNavBar;
