import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer>
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
          name="index"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
