import React from 'react';
import { useColorScheme, LogBox } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppNavigator } from './router/AppNavigator';
import { CustomAlertProvider } from './components/CustomAlert';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService } from './services/NotificationService';
import { IAPService } from './services/IAPService';


const App = () => {

  // Suppress the specific SafeAreaView deprecation warning from React Native
  // We intentionally ignore only this exact message to avoid hiding other warnings.
  React.useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead. See https://github.com/th3rdwave/react-native-safe-area-context",
    ]);
    
    // Inicializar servicio de notificaciones
    NotificationService.initialize().catch(err => {
      console.error('Error inicializando notificaciones:', err);
    });

    // Inicializar IAP (In-App Purchases) para iOS
    IAPService.initialize().catch(err => {
      console.error('Error inicializando IAP:', err);
    });

    // Verificar si hay nueva jornada al abrir la app
    NotificationService.checkForNewJornada().catch(err => {
      console.error('Error verificando nueva jornada:', err);
    });

    // Verificar cada 5 minutos si hay nueva jornada (mientras la app está abierta)
    const interval = setInterval(() => {
      NotificationService.checkForNewJornada().catch(err => {
        console.error('Error en verificación periódica:', err);
      });
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaProvider>
      <CustomAlertProvider>
        <AppNavigator />
      </CustomAlertProvider>
    </SafeAreaProvider>
  );
};

export default App;
