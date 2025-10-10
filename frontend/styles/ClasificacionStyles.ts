import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const ClasificacionStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
  fontSize: 26,
  fontWeight: '700',
  color: '#fff',
  fontFamily: 'Helvetica Neue',
  letterSpacing: 1,
  textTransform: 'uppercase',
},

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBox: {
    width: '100%',
    backgroundColor: '#18395a',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    width: 40,
    textAlign: 'center',
  },
  nameText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginLeft: 10,
  },
  pointsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'right',
    width: 80,
  },
});
