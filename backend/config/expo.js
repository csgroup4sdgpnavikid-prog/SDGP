// config/expo.js - Expo Server SDK initialization
const { Expo } = require('expo-server-sdk');

// Initialize Expo SDK for push notifications
const expo = new Expo();

module.exports = { Expo, expo };
