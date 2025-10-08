import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 64,
    backgroundColor: '#18395a',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: '#1f6a44',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },

  // Ligas
  ligasScroll: {
    maxHeight: 110,
    marginBottom: 22,
    paddingLeft: 10,
  },
  ligaCard: {
    backgroundColor: '#ffffff',
    // pill/arc shape
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginRight: 12,
    minWidth: width * 0.48,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    // thick gold border
    borderWidth: 10,
    borderColor: '#cdb371',
    borderStyle: 'solid',
    // stronger elevation / golden glow
    elevation: 8,
    shadowColor: '#cdb371',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  ligaName: {
    fontWeight: '700',
    color: '#18395a',
    textAlign: 'center',
    fontSize: 20,
  },

  // Sección de partidos
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 20,
    marginBottom: 12,
  },

  tableContainer: {
    marginHorizontal: 20,
    height: height * 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f6a44',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f5',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 15,
    color: '#18395a',
    fontWeight: '600',
  },

  // Logout button (floating)
  logoutButton: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#e53935',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutIcon: {
    width: width * 0.1,
    height: width * 0.1,
  },
});
