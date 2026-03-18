import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors} from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {HomeIcon, SearchIcon, LibraryIcon, VinylIcon, SettingsIcon} from '../components/icons';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        // Убираем анимацию для мгновенного переключения
        animation: 'none',
        lazy: false, // Убираем ленивую загрузку для мгновенного переключения
        // Отключаем gesture для ускорения
        gestureEnabled: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.borderColor,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 4,
          paddingTop: 16,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: -4,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginTop: -4,
        },
        tabBarHideOnKeyboard: true,
        headerStyle: {
          backgroundColor: colors.bgSecondary,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        // Оптимизация для производительности
        headerShown: false, // Скрываем стандартный header
        freezeOnBlur: true, // Замораживаем неактивные экраны
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          headerTitle: 'Home',
          tabBarIcon: ({color}) => <HomeIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          headerTitle: 'Search',
          tabBarIcon: ({color}) => <SearchIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{
          tabBarLabel: 'Playing',
          headerTitle: 'Now Playing',
          tabBarIcon: ({color}) => <VinylIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          headerTitle: 'Library',
          tabBarIcon: ({color}) => <LibraryIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({color}) => <SettingsIcon size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
