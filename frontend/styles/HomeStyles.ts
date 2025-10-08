import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const palette = {
  white: '#FFFFFF',
  ink: '#18395a',
  accent: '#1f6a44',
  gold: '#cdb371',
  line: '#eef2f5',
  danger: '#e53935',
  muted: '#6b7b8c',
  rowAlt: '#f8fafb',
};

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  android: { elevation: 4 },
  default: {},
});

export const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 64,
  },

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
    color: palette.white,
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: palette.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...shadow,
  },
  createButtonText: {
    color: palette.white,
    fontWeight: '700',
    fontSize: 18,
  },

  ligasScroll: {
    maxHeight: 110,
    marginBottom: 22,
    paddingLeft: 10,
  },
  ligaCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 12,
    minWidth: width * 0.48,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: palette.gold,
    ...shadow,
  },
  ligaName: {
    fontWeight: '700',
    color: palette.ink,
    textAlign: 'center',
    fontSize: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.white,
    marginLeft: 20,
    marginBottom: 12,
  },

  tableContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.white,
    ...shadow,
  },

  // Ajuste superior del header para eliminar la línea blanca
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: palette.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -1, // elimina la línea blanca visible
  },
  tableHeaderText: {
    color: palette.white,
    fontWeight: '800',
    fontSize: 16,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    alignItems: 'center',
    backgroundColor: palette.white,
  },
  tableRowAlt: {
    backgroundColor: palette.rowAlt,
  },
  crest: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginHorizontal: 6,
    backgroundColor: '#e9eef3',
  },
  tableCell: {
    fontSize: 15,
    color: palette.ink,
    fontWeight: '600',
  },
  scoreCell: {
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
    }),
    textAlign: 'center',
  },
  emptyState: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: palette.muted,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },

  logoutButton: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: palette.danger,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  logoutIcon: {
    width: Math.max(28, width * 0.1),
    height: Math.max(28, width * 0.1),
    tintColor: palette.white,
  },
});
 