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
import { AdminService, League } from '../../services/AdminService';
import { 
  ChevronLeftIcon,
  TrophyStarIcon,
  TrashIcon,
  UsersGroupIcon
} from '../../components/VectorIcons';
import { Typography } from '../../styles/DesignSystem';
import { SafeLayout } from '../../components/SafeLayout';

const GestionLigas: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLeagues = async () => {
    try {
      const data = await AdminService.getAllLeagues();
      setLeagues(data);
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudieron cargar las ligas',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLeagues();
  };

  const handleDeleteLeague = (league: League) => {
    CustomAlertManager.alert(
      '⚠️ Eliminar Liga',
      `¿Estás seguro de que quieres eliminar la liga "${league.name}"?\n\n` +
      `Esta acción:\n` +
      `❌ Eliminará la liga permanentemente\n` +
      `❌ Eliminará todas las plantillas de sus miembros\n` +
      `❌ Eliminará todas las apuestas\n` +
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
              await AdminService.deleteLeague(league.id);
              
              // Actualizar la lista
              setLeagues(prev => prev.filter(l => l.id !== league.id));
              
              CustomAlertManager.alert(
                '✅ Liga Eliminada',
                `${league.name} ha sido eliminada correctamente`,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              CustomAlertManager.alert(
                '❌ Error',
                error.message || 'No se pudo eliminar la liga',
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <SafeLayout backgroundColor="#0f172a">
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
            LIGAS
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
              Cargando ligas...
            </Text>
          </View>
        ) : leagues.length === 0 ? (
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
            <TrophyStarIcon size={64} color="#475569" />
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No hay ligas creadas
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
                Total de ligas creadas
              </Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                {leagues.length}
              </Text>
            </View>

            {/* Leagues List */}
            {leagues.map((league) => (
              <View
                key={league.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#0892D0',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <TrophyStarIcon size={24} color="#fff" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 'bold',
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {league.name}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View
                        style={{
                          backgroundColor: '#334155',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#0892D0',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          {league.code}
                        </Text>
                      </View>

                      <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <UsersGroupIcon size={14} color="#94a3b8" />
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>
                          {league._count?.members || 0} miembros
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: '#64748b', fontSize: 12 }}>
                      Creada: {formatDate(league.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  onPress={() => handleDeleteLeague(league)}
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
                    Eliminar Liga
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      </LinearGradient>
    </SafeLayout>
  );
};

export default GestionLigas;
