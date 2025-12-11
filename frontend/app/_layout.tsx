import { DrawerContentScrollView } from "@react-navigation/drawer";
import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3LightTheme, Drawer as PaperDrawer, PaperProvider } from "react-native-paper";
import { queryClient } from "../config/queryClient";
import { UserProvider } from "../contexts/UserContext";

const theme = { ...MD3LightTheme }

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DrawerContentScrollView {...props}>
      <PaperDrawer.Section title="LazySpender">
        <PaperDrawer.Item
          label="Dashboard"
          active={pathname === "/dashboard"}
          onPress={() => router.push("/dashboard")}
          icon="view-dashboard"
        />
        <PaperDrawer.Item
          label="Records"
          active={pathname === "/records"}
          onPress={() => router.push("/records")}
          icon="history"
        />
        <PaperDrawer.Item
          label="Planned Payments"
          active={pathname === "/planned-payments"}
          onPress={() => router.push("/planned-payments")}
          icon="calendar-clock"
        />
      </PaperDrawer.Section>
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
              drawerContent={(props) => <CustomDrawerContent {...props} />}
            >
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
            </Drawer>
          </GestureHandlerRootView>
        </UserProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
