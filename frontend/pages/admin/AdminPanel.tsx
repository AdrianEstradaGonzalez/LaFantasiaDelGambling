import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { JornadaService } from '../../services/JornadaService';
import { useNavigation } from '@react-navigation/native';
import { CustomAlertManager } from '../../components/CustomAlert';

const AdminPanel: React.FC = () => {
  const navigation = useNavigation();
  const [jornada, setJornada] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleResetAllLeagues = async () => {
    const jornadaNum = parseInt(jornada);

    if (!jornada || isNaN(jornadaNum) || jornadaNum < 1) {
      CustomAlertManager.alert(
        'Error',
        'Por favor ingresa un número de jornada válido (mayor a 0)',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    CustomAlertManager.alert(
      '⚠️ Confirmar Cambio de Jornada',
      `¿Estás seguro de que quieres cambiar a la jornada ${jornadaNum}?\n\n` +
      `Esto hará lo siguiente:\n` +
      `✅ Evaluará todas las apuestas pendientes\n` +
      `✅ Calculará ganancias/pérdidas\n` +
      `✅ Reseteará presupuestos:\n` +
      `   • Fichajes: 500M + balance de apuestas\n` +
      `   • Apuestas: 250M\n\n` +
      `Esta acción afectará a TODAS las ligas.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              setLastResult(null);

              const result = await JornadaService.resetAllLeagues(jornadaNum);

              setLastResult(result);

              CustomAlertManager.alert(
                '✅ Jornada Cambiada',
                `Jornada ${jornadaNum} procesada exitosamente\n\n` +
                `📊 Ligas procesadas: ${result.data.leaguesProcessed}\n` +
                `🎯 Apuestas evaluadas: ${result.data.totalEvaluations}\n\n` +
                `Los presupuestos de todos los usuarios han sido actualizados.`,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              CustomAlertManager.alert(
                '❌ Error',
                error.message || 'No se pudo completar el cambio de jornada',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
      { icon: 'alert', iconColor: '#f59e0b' }
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
          backgroundColor: '#1e293b',
          paddingTop: 50,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#334155',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: '#0ea5e9', fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text
          style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          🔧 Panel de Administración
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14 }}>
          Gestiona el sistema y ejecuta cambios de jornada
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Cambio de Jornada */}
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 32, marginRight: 12 }}>🏆</Text>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Cambiar Jornada
            </Text>
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            Ejecuta el cambio de jornada para todas las ligas. Esto evaluará
            todas las apuestas, calculará balances y reseteará los presupuestos.
          </Text>

          {/* Input de Jornada */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#94a3b8', marginBottom: 8, fontSize: 14 }}>
              Número de Jornada
            </Text>
            <TextInput
              value={jornada}
              onChangeText={setJornada}
              keyboardType="number-pad"
              placeholder="Ej: 11"
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#fff',
                fontSize: 16,
              }}
            />
          </View>

          {/* Información del proceso */}
          <View
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: '#0ea5e9',
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 12,
              }}
            >
              📋 Proceso que se ejecutará:
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>✓</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>
                  Evaluar todas las apuestas pendientes
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>✓</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>
                  Calcular ganancias/pérdidas por usuario
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>✓</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>
                  Resetear presupuesto de fichajes a 500M + balance
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>✓</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>
                  Resetear presupuesto de apuestas a 250M
                </Text>
              </View>
            </View>
          </View>

          {/* Botón de Ejecutar */}
          <TouchableOpacity
            onPress={handleResetAllLeagues}
            disabled={isProcessing || !jornada}
            style={{
              backgroundColor:
                isProcessing || !jornada ? '#334155' : '#0ea5e9',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#0ea5e9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isProcessing || !jornada ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isProcessing || !jornada ? 0 : 4,
            }}
          >
            {isProcessing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginLeft: 12,
                  }}
                >
                  Procesando...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                🚀 Ejecutar Cambio de Jornada
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Último Resultado */}
        {lastResult && (
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#10b981',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>✅</Text>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 'bold',
                  flex: 1,
                }}
              >
                Último Resultado
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#334155',
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                  📋 Ligas procesadas
                </Text>
                <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold' }}>
                  {lastResult.data.leaguesProcessed}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                  🎯 Apuestas evaluadas
                </Text>
                <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold' }}>
                  {lastResult.data.totalEvaluations}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#0f172a',
                borderRadius: 8,
                padding: 12,
                marginTop: 16,
              }}
            >
              <Text style={{ color: '#10b981', fontSize: 13 }}>
                {lastResult.message}
              </Text>
            </View>
          </View>
        )}

        {/* Advertencia */}
        <View
          style={{
            backgroundColor: '#451a03',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            borderLeftWidth: 4,
            borderLeftColor: '#f59e0b',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#fbbf24',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                Advertencia Importante
              </Text>
              <Text style={{ color: '#fcd34d', fontSize: 13, lineHeight: 18 }}>
                Esta acción afectará a todas las ligas y todos los usuarios del
                sistema. Asegúrate de ejecutarla solo cuando la jornada haya
                finalizado completamente.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default AdminPanel;
