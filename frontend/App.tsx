import React from 'react';
import { useColorScheme } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppNavigator } from './router/AppNavigator';
import { CustomAlertProvider } from './components/CustomAlert';

const Stack = createNativeStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <CustomAlertProvider>
      <AppNavigator />
    </CustomAlertProvider>
  );
};

export default App;
