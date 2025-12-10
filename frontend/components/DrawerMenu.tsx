import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import EncryptedStorage from 'react-native-encrypted-storage';
import { LoginService } from '../services/LoginService';
import { ApiConfig } from '../utils/apiConfig';
import { 
  HomeIcon, 
  LogoutIcon, 
  ShieldCheckIcon,
  FileTextIcon,
  DeleteIcon,
  ShieldIcon,
  UsersIcon
} from './VectorIcons';
import { CustomAlertManager } from './CustomAlert';

interface DrawerMenuProps {
  navigation: any;
  ligaId?: string; // ID de la liga actual (opcional)
  ligaName?: string; // Nombre de la liga
  division?: 'primera' | 'segunda' | 'premier'; // División de la liga
  isPremium?: boolean; // Si la liga es premium
}

export const DrawerMenu = ({ navigation, ligaId, ligaName, division, isPremium }: DrawerMenuProps) => {
  const [userName, setUserName] = useState<string>('Usuario');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Verificar si es admin
      const adminStatus = await LoginService.isAdmin();
      setIsAdmin(adminStatus);

      // Obtener datos del usuario desde la sesión
      const session = await EncryptedStorage.getItem('session');
      if (session) {
        const { user } = JSON.parse(session);
        if (user?.name) {
          setUserName(user.name);
        }
        if (user?.email) {
          setUserEmail(user.email);
        }
        console.log('✅ DrawerMenu - Usuario cargado desde sesión:', user?.name, user?.email);
        
        // Si hay sesión pero no tiene nombre, intentar actualizar desde backend
        if (!user?.name && user?.email) {
          console.log('⚠️ Sesión sin nombre, actualizando desde backend...');
          await fetchUserFromBackend();
        }
      } else {
        // No hay sesión: intentar obtener desde backend
        console.log('⚠️ DrawerMenu - No se encontró sesión, obteniendo desde backend');
        await fetchUserFromBackend();
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  };

  const fetchUserFromBackend = async () => {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        console.log('❌ No hay token, no se puede obtener usuario');
        return;
      }

      // Llamar al endpoint /auth/me para obtener datos del usuario
      const response = await fetch(`${ApiConfig.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // Actualizar estado
          if (data.user.name) {
            setUserName(data.user.name);
          }
          if (data.user.email) {
            setUserEmail(data.user.email);
          }
          
          // Guardar sesión actualizada
          await EncryptedStorage.setItem('session', JSON.stringify({ user: data.user }));
          console.log('✅ Usuario obtenido del backend y sesión actualizada:', data.user.name);
        }
      } else {
        console.log('❌ Error al obtener usuario del backend:', response.status);
        // Fallback al decodificar JWT
        useFallbackFromToken(token);
      }
    } catch (error) {
      console.error('Error al obtener usuario del backend:', error);
      // Fallback al decodificar JWT
      const token = await EncryptedStorage.getItem('accessToken');
      if (token) {
        useFallbackFromToken(token);
      }
    }
  };

  const useFallbackFromToken = (token: string) => {
    try {
      // Decodificar JWT para obtener email
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.email) {
        setUserEmail(payload.email);
        // Usar la primera parte del email como nombre
        const emailName = payload.email.split('@')[0];
        setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        console.log('⚠️ Usando fallback desde token:', emailName);
      }
    } catch (error) {
      console.error('Error al decodificar token:', error);
    }
  };

  const handleLeaveLeague = () => {
    if (!ligaId) return;

    // Cerrar drawer primero para evitar conflicto de modales en iOS
    if (navigation.closeDrawer) {
      navigation.closeDrawer();
    }

    // Pequeño delay para que el drawer termine de cerrar
    setTimeout(() => {
      CustomAlertManager.alert(
        'Abandonar Liga',
        '¿Estás seguro que deseas abandonar esta liga? Se eliminará tu plantilla y no podrás recuperarla. Si eres el líder, se transferirá el liderazgo a otro miembro.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Abandonar',
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await EncryptedStorage.getItem('accessToken');
                if (!token) {
                  throw new Error('No autenticado');
                }

                const response = await fetch(`${ApiConfig.BASE_URL}/leagues/${ligaId}/leave`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.message || 'Error al abandonar la liga');
                }

                const result = await response.json();

                CustomAlertManager.alert(
                  'Liga Abandonada',
                  result.message || 'Has abandonado la liga exitosamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Home' }],
                        });
                      },
                    },
                  ],
                  { icon: 'checkmark-circle', iconColor: '#10b981' }
                );
              } catch (error: any) {
                console.error('Error al abandonar liga:', error);
                CustomAlertManager.alert(
                  'Error',
                  error.message || 'No se pudo abandonar la liga',
                  [{ text: 'OK', onPress: () => {} }],
                  { icon: 'alert-circle', iconColor: '#ef4444' }
                );
              }
            },
          },
        ],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    }, 300);
  };

  const handleLogout = () => {
    // IMPORTANTE: Cerrar el drawer primero para evitar conflicto de modales en iOS
    if (navigation.closeDrawer) {
      navigation.closeDrawer();
    }

    const showNativeAlert = () => {
      // Fallback nativo si CustomAlertManager no funciona
      try {
        const buttons = [
          { text: 'Cancelar', style: 'cancel' as const, onPress: () => {} },
          {
            text: 'Salir',
            style: 'destructive' as const,
            onPress: () => {
              console.log('🔴 Logout from drawer menu (native fallback)');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              setTimeout(() => {
                Promise.all([LoginService.logout(), EncryptedStorage.clear()])
                  .then(() => console.log('✅ Storage cleared from drawer (native)'))
                  .catch(err => console.error('Error clearing storage:', err));
              }, 100);
            },
          },
        ];
        // Use React Native Alert
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Alert } = require('react-native');
        Alert.alert('Cerrar Sesión', '¿Estás seguro que deseas salir?', buttons as any, { cancelable: true });
      } catch (err) {
        console.error('Error mostrando alerta nativa de logout:', err);
      }
    };

    // Pequeño delay para que el drawer termine de cerrar antes de mostrar el alert
    setTimeout(() => {
      try {
        if (CustomAlertManager && (CustomAlertManager as any).alert) {
          CustomAlertManager.alert(
            'Cerrar Sesión',
            '¿Estás seguro que deseas salir?',
            [
              { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
              {
                text: 'Salir',
                onPress: () => {
                  try {
                    console.log('🔴 Logout from drawer menu');
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    setTimeout(() => {
                      Promise.all([LoginService.logout(), EncryptedStorage.clear()])
                        .then(() => console.log('✅ Storage cleared from drawer'))
                        .catch(err => console.error('Error clearing storage:', err));
                    }, 100);
                  } catch (e) {
                    console.error('Error during logout action:', e);
                  }
                },
                style: 'destructive',
              },
            ],
            { icon: 'alert-circle', iconColor: '#ef4444' }
          );
        } else {
          showNativeAlert();
        }
      } catch (err) {
        console.error('CustomAlertManager failed:', err);
        showNativeAlert();
      }
    }, 300); // 300ms delay para que el drawer cierre completamente
  };

  const MenuItem = ({ 
    icon, 
    label, 
    onPress, 
    iconColor = '#ffffff',
    badge 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    onPress: () => void; 
    iconColor?: string;
    badge?: string;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <Text style={styles.menuItemText}>{label}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#0f172a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header con info del usuario */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>

        {/* Divisor */}
        <View style={styles.divider} />

        {/* Scrollable menu: envuelve todas las opciones y el logout dentro de un ScrollView */}
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
            <View style={styles.menuContainer}>
              <MenuItem
                icon={<HomeIcon size={24} color="#60a5fa" />}
                label="Inicio"
                onPress={() => {
                  navigation.closeDrawer();
                  // Delay más largo para iOS + navegación más robusta
                  setTimeout(() => {
                    try {
                      const state = navigation.getState?.();
                      const currentRoute = state?.routes?.[state?.index]?.name;
                      
                      if (currentRoute === 'Home') {
                        // Ya estamos en Home, no hacer nada
                        console.log('✅ Ya estamos en Home, sin navegación');
                        return;
                      }
                      
                      // Usar popToTop si hay un stack, o reset si es necesario
                      if (navigation.popToTop) {
                        console.log('🏠 Navegando a Home con popToTop');
                        navigation.popToTop();
                      } else {
                        console.log('🏠 Navegando a Home con reset');
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Home' }],
                        });
                      }
                    } catch (error) {
                      console.error('Error navegando a Home:', error);
                      // Fallback seguro
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                      });
                    }
                  }, 400); // Delay más largo para iOS
                }}
                iconColor="#60a5fa"
              />

              <MenuItem
                icon={<UsersIcon size={24} color="#10b981" />}
                label="Mi Perfil"
                onPress={() => {
                  navigation.closeDrawer();
                  navigation.navigate('Perfil');
                }}
                iconColor="#10b981"
              />

              {isAdmin && (
                <MenuItem
                  icon={<ShieldCheckIcon size={24} color="#ef4444" />}
                  label="Panel Admin"
                  onPress={() => {
                    navigation.closeDrawer();
                    navigation.navigate('AdminPanel');
                  }}
                  iconColor="#ef4444"
                  badge="ADMIN"
                />
              )}

              <MenuItem
                icon={<FileTextIcon size={24} color="#a78bfa" />}
                label="Reglas del Juego"
                onPress={() => {
                  navigation.closeDrawer();
                  navigation.navigate('Reglas');
                }}
                iconColor="#a78bfa"
              />

              <MenuItem
                icon={<ShieldIcon size={24} color="#64748b" />}
                label="Política de Privacidad"
                onPress={() => {
                  navigation.closeDrawer();
                  navigation.navigate('PoliticaPrivacidad');
                }}
                iconColor="#64748b"
              />

              {/* Divisor */}
              <View style={styles.divider} />

              <MenuItem
                icon={<ShieldIcon size={24} color="#10b981" />}
                label="Crear Liga"
                onPress={() => {
                  navigation.closeDrawer();
                  // Abrir CrearLiga en modo 'create' para mostrar solo la sección de crear
                  navigation.navigate('CrearLiga', { mode: 'create' });
                }}
                iconColor="#10b981"
              />

              <MenuItem
                icon={<UsersIcon size={24} color="#3b82f6" />}
                label="Unirse a Liga"
                onPress={() => {
                  navigation.closeDrawer();
                  // Abrir CrearLiga en modo 'join' para mostrar solo la sección de unirse
                  navigation.navigate('CrearLiga', { mode: 'join' });
                }}
                iconColor="#3b82f6"
              />

              {/* Divisor */}
              <View style={styles.divider} />

              {/* Mejorar Liga (solo si estamos en una liga no premium) */}
              {ligaId && !isPremium && (
                <MenuItem
                  icon={<ShieldIcon size={24} color="#fbbf24" />}
                  label="Mejorar Liga"
                  onPress={() => {
                    navigation.closeDrawer?.();
                    navigation.navigate('Apuestas', {
                      ligaId,
                      ligaName,
                      division,
                      isPremium: false,
                      triggerUpgrade: true
                    });
                  }}
                  iconColor="#fbbf24"
                />
              )}

              {/* Abandonar Liga (solo si estamos en una liga) */}
              {ligaId && (
                <MenuItem
                  icon={<DeleteIcon size={24} color="#f59e0b" />}
                  label="Abandonar Liga"
                  onPress={handleLeaveLeague}
                  iconColor="#f59e0b"
                />
              )}

              {/* Logout button al final */}
              <MenuItem
                icon={<LogoutIcon size={24} color="#f87171" />}
                label="Cerrar Sesión"
                onPress={handleLogout}
                iconColor="#f87171"
              />
            </View>
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>DreamLeague</Text>
          <Text style={styles.footerVersion}>v1.5</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  menuContainer: {
    paddingTop: 16,
  },
  menuItem: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    minHeight: 56,
    justifyContent: 'center',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    marginRight: 16,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 10,
    color: '#475569',
  },
});
