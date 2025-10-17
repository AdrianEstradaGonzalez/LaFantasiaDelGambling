import React from 'react';
import { useColorScheme } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppNavigator } from './router/AppNavigator';
import { CustomAlertProvider } from './components/CustomAlert';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <CustomAlertProvider>
        <AppNavigator />
      </CustomAlertProvider>
    </SafeAreaProvider>
  );
};

export default App;
