const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Limit parallel transform workers to prevent OOM crashes on bundling
config.transformer = {
  ...config.transformer,
  workerThreads: false,
};

config.maxWorkers = 2;

module.exports = config;
