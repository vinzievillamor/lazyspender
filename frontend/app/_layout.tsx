import { DrawerContentScrollView } from "@react-navigation/drawer";
import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Drawer as PaperDrawer, PaperProvider, Text, useTheme } from "react-native-paper";
import { queryClient } from "../config/queryClient";
import customTheme, { spacing } from "../config/theme";
import { AuthProvider, useAuthContext } from "../contexts/AuthContext";
import { UserProvider } from "../contexts/UserContext";

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <DrawerContentScrollView
      {...props}
      style={[styles.drawerContent, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.drawerHeader}>
        <Text variant="headlineMedium" style={[styles.appTitle, { color: theme.colors.primary }]}>
          LazySpender
        </Text>
      </View>

      <PaperDrawer.Section style={styles.drawerSection}>
        <PaperDrawer.Item
          label="Dashboard"
          active={pathname === "/dashboard"}
          onPress={() => router.push("/dashboard")}
          icon="view-dashboard"
          style={[
            styles.drawerItem,
            pathname === "/dashboard" && {
              backgroundColor: theme.colors.primaryContainer,
            }
          ]}
          theme={{
            colors: {
              onSurface: pathname === "/dashboard" ? theme.colors.primary : theme.colors.onSurfaceVariant,
              onSurfaceVariant: pathname === "/dashboard" ? theme.colors.primary : theme.colors.onSurfaceVariant,
            }
          }}
        />
        <PaperDrawer.Item
          label="Records"
          active={pathname === "/records"}
          onPress={() => router.push("/records")}
          icon="history"
          style={[
            styles.drawerItem,
            pathname === "/records" && {
              backgroundColor: theme.colors.primaryContainer,
            }
          ]}
          theme={{
            colors: {
              onSurface: pathname === "/records" ? theme.colors.primary : theme.colors.onSurfaceVariant,
              onSurfaceVariant: pathname === "/records" ? theme.colors.primary : theme.colors.onSurfaceVariant,
            }
          }}
        />
        <PaperDrawer.Item
          label="Planned Payments"
          active={pathname === "/planned-payments"}
          onPress={() => router.push("/planned-payments")}
          icon="calendar-clock"
          style={[
            styles.drawerItem,
            pathname === "/planned-payments" && {
              backgroundColor: theme.colors.primaryContainer,
            }
          ]}
          theme={{
            colors: {
              onSurface: pathname === "/planned-payments" ? theme.colors.primary : theme.colors.onSurfaceVariant,
              onSurfaceVariant: pathname === "/planned-payments" ? theme.colors.primary : theme.colors.onSurfaceVariant,
            }
          }}
        />
      </PaperDrawer.Section>
    </DrawerContentScrollView>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const drawer = (
    <GestureHandlerRootView>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: customTheme.colors.background,
          },
          drawerActiveTintColor: customTheme.colors.primary,
          drawerInactiveTintColor: customTheme.colors.onSurfaceVariant,
          headerStyle: {
            backgroundColor: customTheme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            letterSpacing: 0.15
          },
          headerTintColor: customTheme.colors.onSurface,
        }}
      >
        <Drawer.Protected guard={isAuthenticated}>
          <Drawer.Screen
            name="dashboard"
            options={{
              drawerLabel: "Dashboard",
              title: "Dashboard",
            }}
          />
          <Drawer.Screen
            name="records"
            options={{
              drawerLabel: "Records",
              title: "Records",
            }}
          />
          <Drawer.Screen
            name="planned-payments"
            options={{
              drawerLabel: "Planned Payments",
              title: "Planned Payments",
            }}
          />
          <Drawer.Screen
            name="index"
            options={{
              drawerItemStyle: { display: "none" },
            }}
          />
        </Drawer.Protected>
        <Drawer.Protected guard={!isAuthenticated}>
          <Drawer.Screen
            name="login"
            options={{
              drawerItemStyle: { display: "none" },
              headerShown: false,
              swipeEnabled: false,
            }}
          />
        </Drawer.Protected>
      </Drawer>
    </GestureHandlerRootView>
  );

  return isAuthenticated ? <UserProvider>{drawer}</UserProvider> : drawer;
}

export default function RootLayout() {
  return (
    <PaperProvider theme={customTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  appTitle: {
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  drawerSection: {
    marginTop: spacing.sm,
  },
  drawerItem: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: 12,
  },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
