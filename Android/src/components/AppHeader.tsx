import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

const AppHeader: React.FC = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>SuckFy</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accentPrimary,
    letterSpacing: -0.5,
  },
});

export default AppHeader;
