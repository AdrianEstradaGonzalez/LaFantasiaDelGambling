import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomAlertManager } from '../../components/CustomAlert';
import { AdminService, User } from '../../services/AdminService';
import { 
  ChevronLeftIcon,
  PersonIcon,
  TrashIcon,
  ShieldCheckIcon
} from '../../components/VectorIcons';
import { Typography } from '../../styles/DesignSystem';

const GestionUsuarios: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await AdminService.getAllUsers();
      setUsers(data);
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudieron cargar los usuarios',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUsers();
  };

  const handleDeleteUser = (user: User) => {
    CustomAlertManager.alert(
      '⚠️ Eliminar Usuario',
      `¿Estás seguro de que quieres eliminar a "${user.name}"?\n\n` +
      `Esta acción:\n` +
      `❌ Eliminará al usuario permanentemente\n` +
      `❌ Eliminará sus plantillas\n` +
      `❌ Eliminará su participación en ligas\n` +
      `❌ NO se puede deshacer`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteUser(user.id);
              
              // Actualizar la lista
              setUsers(prev => prev.filter(u => u.id !== user.id));
              
              CustomAlertManager.alert(
                '✅ Usuario Eliminado',
                `${user.name} ha sido eliminado correctamente`,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              CustomAlertManager.alert(
                '❌ Error',
                error.message || 'No se pudo eliminar el usuario',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            }
          },
        },
      ],
      { icon: 'alert', iconColor: '#ef4444' }
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#181818',
          borderBottomWidth: 0.5,
          borderBottomColor: '#333',
          paddingVertical: 10,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 50,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <ChevronLeftIcon size={28} color="#0892D0" />
        </TouchableOpacity>

        <Text
          style={{
            color: '#fff',
            fontSize: Typography.sizes['2xl'],
            fontWeight: '700',
            textAlign: 'center',
            flex: 1,
          }}
          numberOfLines={1}
        >
          GESTIÓN{' '}
          <Text style={{ color: '#0892D0' }}>
            USUARIOS
          </Text>
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, marginTop: 100 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0892D0"
            colors={['#0892D0']}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0892D0" />
            <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 14 }}>
              Cargando usuarios...
            </Text>
          </View>
        ) : users.length === 0 ? (
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#334155',
            }}
          >
            <PersonIcon size={64} color="#475569" />
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No hay usuarios registrados
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Header */}
            <View
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 4 }}>
                Total de usuarios registrados
              </Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                {users.length}
              </Text>
            </View>

            {/* Users List */}
            {users.map((user) => (
              <View
                key={user.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: user.isAdmin ? '#0892D0' : '#334155',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: user.isAdmin ? '#0892D0' : '#334155',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    {user.isAdmin ? (
                      <ShieldCheckIcon size={24} color="#fff" />
                    ) : (
                      <PersonIcon size={24} color="#fff" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 18,
                          fontWeight: 'bold',
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      {user.isAdmin && (
                        <View
                          style={{
                            backgroundColor: '#0892D0',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 'bold',
                            }}
                          >
                            ADMIN
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={{
                        color: '#94a3b8',
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {user.email}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {!user.isAdmin && (
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user)}
                    style={{
                      backgroundColor: '#7f1d1d',
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#991b1b',
                    }}
                  >
                    <TrashIcon size={18} color="#ef4444" />
                    <Text
                      style={{
                        color: '#ef4444',
                        fontSize: 14,
                        fontWeight: '600',
                        marginLeft: 8,
                      }}
                    >
                      Eliminar Usuario
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default GestionUsuarios;
