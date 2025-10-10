import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 🧩 Importa tus pantallas
import { Home } from '../pages/home/Home';
import { CrearLiga } from '../pages/liga/CrearLiga';
import Login from '../pages/login/Login';
import Register from '../pages/register/Register';
import Clasificacion from '../pages/liga/Clasificacion';

export type RootStackParamList = {
  Home: { refreshLigas?: boolean } | undefined;
  CrearLiga: undefined;
  Login: undefined;
  Register: undefined;
  Clasificacion: { ligaId: string, ligaName: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // oculta el header por defecto
        }}
      >
        {/* <Stack.Screen name="Login" component={Login} /> */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="CrearLiga"
          component={CrearLiga}
          options={{
            animation: 'slide_from_right', // 👈 animación lateral
          }}
        />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="Clasificacion" component={Clasificacion} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
