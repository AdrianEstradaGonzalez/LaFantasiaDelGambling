import React from 'react';
import { useColorScheme, LogBox } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppNavigator } from './router/AppNavigator';
import { CustomAlertProvider } from './components/CustomAlert';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdMobService } from './services/AdMobService';


const App = () => {

  // Suppress the specific SafeAreaView deprecation warning from React Native
  // We intentionally ignore only this exact message to avoid hiding other warnings.
  React.useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead. See https://github.com/th3rdwave/react-native-safe-area-context",
    ]);

    // 🎯 Inicializar AdMob al arrancar la app
    AdMobService.initialize();
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
