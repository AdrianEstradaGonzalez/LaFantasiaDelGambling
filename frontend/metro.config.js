const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

// Carpeta raíz del proyecto (parent de frontend)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = {
  projectRoot,
  watchFolders: [workspaceRoot], // Observar toda la carpeta workspace (incluye /shared)
  
  resolver: {
    // Asegurar que encuentra módulos de node_modules del frontend
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
    ],
    // Extensiones que Metro debe buscar
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
