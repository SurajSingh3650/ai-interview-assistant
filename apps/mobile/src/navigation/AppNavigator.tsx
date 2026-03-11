import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../features/auth/LoginScreen";
import { InterviewScreen } from "../features/interview/InterviewScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { theme } from "../shared/theme";
import { logout } from "../features/auth/auth.api";

type AppTabs = {
  Interview: undefined;
  Analytics: undefined;
};

const Tab = createBottomTabNavigator<AppTabs>();

export function AppNavigator() {
  const auth = useAuth();

  async function handleLogout() {
    if (auth.token) {
      try {
        await logout(auth.token);
      } catch {
        // Local sign-out should still continue if network logout fails.
      }
    }
    await auth.signOut();
  }

  if (!auth.ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.bg,
          card: theme.panel,
          border: theme.border,
          text: theme.text,
          primary: theme.accent
        }
      }}
    >
      {!auth.token ? (
        <LoginScreen />
      ) : (
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.panel },
            headerTintColor: theme.text,
            tabBarStyle: { backgroundColor: theme.panel, borderTopColor: theme.border }
          }}
        >
          <Tab.Screen
            name="Interview"
            component={InterviewScreen}
            options={{
              headerRight: () => (
                <Pressable onPress={handleLogout} style={{ marginRight: 12 }}>
                  <Text style={{ color: theme.accent, fontWeight: "600" }}>Logout</Text>
                </Pressable>
              )
            }}
          />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg
  }
});
