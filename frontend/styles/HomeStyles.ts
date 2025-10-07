import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 50 : 70,
    backgroundColor: '#18395a',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#346335',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Ligas
  ligasScroll: {
    maxHeight: 100,
    marginBottom: 20,
  },
  ligaCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginRight: 10,
    minWidth: width * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  ligaName: {
    fontWeight: '700',
    color: '#18395a',
    textAlign: 'center',
  },

  // Sección de partidos
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 20,
    marginBottom: 10,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#346335',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    fontSize: 16,
    color: '#18395a',
    fontWeight: '600',
  },

  // Botón de cerrar sesión
  logoutButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#18395a',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
