import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Roboto-Regular": require("../assets/fonts/roboto/static/Roboto-Regular.ttf"),
    "Roboto-Italic": require("../assets/fonts/roboto/static/Roboto-Italic.ttf"),
    "Roboto-Light": require("../assets/fonts/roboto/static/Roboto-Light.ttf"),
    "Roboto-LightItalic": require("../assets/fonts/roboto/static/Roboto-LightItalic.ttf"),
    "Roboto-Medium": require("../assets/fonts/roboto/static/Roboto-Medium.ttf"),
    "Roboto-MediumItalic": require("../assets/fonts/roboto/static/Roboto-MediumItalic.ttf"),
    "Roboto-Bold": require("../assets/fonts/roboto/static/Roboto-Bold.ttf"),
    "Roboto-BoldItalic": require("../assets/fonts/roboto/static/Roboto-BoldItalic.ttf"),
    "Roboto-SemiBold": require("../assets/fonts/roboto/static/Roboto-SemiBold.ttf"),
    "Roboto-SemiBoldItalic": require("../assets/fonts/roboto/static/Roboto-SemiBoldItalic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
  );
}
