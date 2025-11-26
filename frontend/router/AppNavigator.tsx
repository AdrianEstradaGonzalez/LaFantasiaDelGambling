import React, { useEffect, useState, useMemo } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Linking, AppState, AppStateStatus, Platform } from 'react-native';
import { CustomAlertProvider, CustomAlertManager } from '../components/CustomAlert';
import { DownloadIcon } from '../components/VectorIcons';
import checkAppVersion from '../utils/checkAppVersion';

// 🧩 Importa tus pantallas
import { Home } from '../pages/home/Home';
import { CrearLiga } from '../pages/liga/CrearLiga';
import Login from '../pages/login/Login';
import Register from '../pages/register/Register';
import Clasificacion from '../pages/liga/Clasificacion';
import PlayersList from '../pages/players/PlayersList';
import PlayersMarket from '../pages/players/PlayersMarket';
import PlayerDetailAdvanced from '../pages/players/PlayerDetailAdvanced';
import MiPlantilla from '../pages/plantilla/MiPlantilla';
import VerPlantillaUsuario from '../pages/plantilla/VerPlantillaUsuario';
import FootballService from '../services/FutbolService';
import { InvitarAmigos } from '../pages/liga/InvitarAmigos';
import Apuestas from '../pages/apuestas/Apuestas';
import HistorialApuestas from '../pages/apuestas/HistorialApuestas';
import AdminPanel from '../pages/admin/AdminPanel';
import { GestionJugadores } from '../pages/admin/GestionJugadores';
import { SeleccionDivision } from '../pages/admin/SeleccionDivision';
import GestionUsuarios from '../pages/admin/GestionUsuarios';
import GestionLigas from '../pages/admin/GestionLigas';
import { Reglas } from '../pages/reglas/Reglas';
import PoliticaPrivacidad from '../pages/politica/PoliticaPrivacidad';
import { Perfil } from '../pages/Perfil';

export type RootStackParamList = {
  Home: { refreshLigas?: boolean } | undefined;
  CrearLiga: undefined;
  Login: undefined;
  Register: undefined;
  Clasificacion: { ligaId: string, ligaName: string, division?: 'primera' | 'segunda' | 'premier', isPremium?: boolean };
  PlayersList: { selectMode?: boolean; filterByRole?: string; onPlayerSelected?: (player: any) => void; ligaId?: string; ligaName?: string } | undefined;
  PlayersMarket: { ligaId?: string; ligaName?: string } | undefined;
  PlayerDetail: { player: any; ligaId?: string; ligaName?: string };
  MiPlantilla: undefined;
  Equipo: { ligaId: string, ligaName: string};
  VerPlantillaUsuario: { ligaId: string; ligaName: string; userId: string; userName: string; jornada?: number };
  InvitarAmigos: { ligaNombre: string, codigo: string, ligaId: string, division?: 'primera' | 'segunda' | 'premier', isPremium?: boolean };
  Apuestas: { ligaId?: string; ligaName?: string; isPremium?: boolean } | undefined;
  HistorialApuestas: { ligaId?: string; ligaName?: string } | undefined;
  AdminPanel: undefined;
  SeleccionDivision: undefined;
  GestionJugadores: { division?: 'primera' | 'segunda' | 'premier' } | undefined;
  GestionUsuarios: undefined;
  GestionLigas: undefined;
  Reglas: undefined;
  PoliticaPrivacidad: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [forceUpdateInfo, setForceUpdateInfo] = useState<{ required: boolean; latest?: string; storeUrl?: string } | null>(null);

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

  // Check app version logic (startup + when app returns to foreground)
  const checkAppVersionHandler = async () => {
    try {
      const result = await checkAppVersion();
      if (result.required) {
        // Show CustomAlert instead of blocking screen
        const openStore = () => {
          const fallback = Platform.select({
            ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
            android: 'https://play.google.com/store/apps/details?id=com.dreamleague',
          }) as string;
          
          const url = result.storeUrl || fallback;
          Linking.openURL(url).catch(() => null);
        };

        CustomAlertManager.alert(
          '¡Actualización disponible!',
          'Por favor, actualiza desde tu tienda para continuar.',
          [
            {
              text: 'Actualizar',
              onPress: openStore,
              style: 'default',
              icon: 'download'
            }
          ],
          {
            icon: 'information',
            iconColor: '#0892D0'
          }
        );
      }
      setForceUpdateInfo({ required: result.required, latest: result.latest, storeUrl: result.storeUrl });
    } catch (err) {
      console.warn('Failed to check app version', err);
      setForceUpdateInfo({ required: false });
    }
  };

  // Run at startup
  useEffect(() => {
    checkAppVersionHandler();
  }, []);

  // Re-check when app comes back to foreground (so TestFlight/Play testers are blocked immediately)
  useEffect(() => {
    const handle = (state: AppStateStatus) => {
      if (state === 'active') checkAppVersionHandler();
    };

    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, []);

  if (initialRoute === null) {
    // still determining initial route
    return null;
  }

  // No longer block the app with a full screen - the alert will show when needed

  return (
    <CustomAlertProvider>
      <NavigationContainer>
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
        <Stack.Screen name="PlayerDetail" component={PlayerDetailAdvanced} options={{
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
        <Stack.Screen name="SeleccionDivision" component={SeleccionDivision} options={{
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
        <Stack.Screen name="Perfil" component={Perfil} options={{
          animation: 'slide_from_right',
        }} />
        </Stack.Navigator>
      </NavigationContainer>
    </CustomAlertProvider>
  );
};
