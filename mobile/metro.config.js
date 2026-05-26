const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support .cjs file extensions (required for @supabase packages)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
