import { AlertTriangle, CheckCircle2, ChevronLeft, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStudents } from './studentService';

const StudentCard = ({ item }: any) => {
  const isAbsent = item.status === 'Absent';

  const statusColor      = isAbsent ? '#EF4444' : '#22C55E';
  const badgeBackground  = statusColor + '20';
  const statusLabel      = isAbsent ? 'Absent' : 'Present';

  return (
    <View style={styles.card}>

      <View style={styles.avatarContainer}>
        <User color="black" size={40} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.idLabel}>Student ID: #{item.id}</Text>
      </View>
      