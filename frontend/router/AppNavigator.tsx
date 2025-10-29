import React, { useEffect, useState } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Linking } from 'react-native';

// 🧩 Importa tus pantallas
import { Home } from '../pages/home/Home';
import { CrearLiga } from '../pages/liga/CrearLiga';
import Login from '../pages/login/Login';
import Register from '../pages/register/Register';
import Clasificacion from '../pages/liga/Clasificacion';
import PlayersList from '../pages/players/PlayersList';
import PlayersMarket from '../pages/players/PlayersMarket';
import PlayerDetail from '../pages/players/PlayerDetail';
import MiPlantilla from '../pages/plantilla/MiPlantilla';
import VerPlantillaUsuario from '../pages/plantilla/VerPlantillaUsuario';
import FootballService from '../services/FutbolService';
import { InvitarAmigos } from '../pages/liga/InvitarAmigos';
import Apuestas from '../pages/apuestas/Apuestas';
import HistorialApuestas from '../pages/apuestas/HistorialApuestas';
import AdminPanel from '../pages/admin/AdminPanel';
import { GestionJugadores } from '../pages/admin/GestionJugadores';
import GestionUsuarios from '../pages/admin/GestionUsuarios';
import GestionLigas from '../pages/admin/GestionLigas';
import { Reglas } from '../pages/reglas/Reglas';
import PoliticaPrivacidad from '../pages/politica/PoliticaPrivacidad';

export type RootStackParamList = {
  Home: { refreshLigas?: boolean } | undefined;
  CrearLiga: undefined;
  Login: undefined;
  Register: undefined;
  Clasificacion: { ligaId: string, ligaName: string};
  PlayersList: { selectMode?: boolean; filterByRole?: string; onPlayerSelected?: (player: any) => void; ligaId?: string; ligaName?: string } | undefined;
  PlayersMarket: { ligaId?: string; ligaName?: string } | undefined;
  PlayerDetail: { player: any; ligaId?: string; ligaName?: string };
  MiPlantilla: undefined;
  Equipo: { ligaId: string, ligaName: string};
  VerPlantillaUsuario: { ligaId: string; ligaName: string; userId: string; userName: string; jornada?: number };
  InvitarAmigos: { ligaNombre: string, codigo: string, ligaId: string };
  Apuestas: { ligaId?: string; ligaName?: string; isPremium?: boolean } | undefined;
  HistorialApuestas: { ligaId?: string; ligaName?: string } | undefined;
  AdminPanel: undefined;
  GestionJugadores: undefined;
  GestionUsuarios: undefined;
  GestionLigas: undefined;
  Reglas: undefined;
  PoliticaPrivacidad: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  useEffect(() => {
    // Prefetch equipos y jugadores al iniciar la app para minimizar peticiones posteriores
    FootballService.prefetchAllData().catch(() => {});
  }, []);

  useEffect(() => {
    // Decide initial route based on saved session/token
    (async () => {
      try {
        const token = await EncryptedStorage.getItem('accessToken');
        const session = await EncryptedStorage.getItem('session');
        if (token || session) {
          setInitialRoute('Home');
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        setInitialRoute('Login');
      }
    })();
  }, []);

  if (initialRoute === null) {
    // still determining initial route
    return null;
  }

  // Configuración de deep linking
  const linking = {
    prefixes: ['lafantasiadelgambling://', 'https://lafantasiadelgambling.com'],
    config: {
      screens: {
        CrearLiga: {
          path: 'unirse-liga/:codigo',
          parse: {
            codigo: (codigo: string) => codigo,
          },
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
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
        <Stack.Screen name="Login" component={Login} options={{
          animation: 'slide_from_left', // 👈 animación lateral
        }} />
        <Stack.Screen name="Register" component={Register} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="Clasificacion" component={Clasificacion} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="PlayersList" component={PlayersList} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="PlayersMarket" component={PlayersMarket} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="PlayerDetail" component={PlayerDetail} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="MiPlantilla" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Equipo" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="VerPlantillaUsuario" component={VerPlantillaUsuario} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="InvitarAmigos" component={InvitarAmigos} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Apuestas" component={Apuestas as any} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="HistorialApuestas" component={HistorialApuestas as any} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="AdminPanel" component={AdminPanel} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionJugadores" component={GestionJugadores} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionUsuarios" component={GestionUsuarios} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionLigas" component={GestionLigas} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Reglas" component={Reglas} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="PoliticaPrivacidad" component={PoliticaPrivacidad} options={{
          animation: 'slide_from_right',
        }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
