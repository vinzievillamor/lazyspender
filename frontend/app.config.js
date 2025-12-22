module.exports = {
  expo: {
    name: "frontend",
    slug: "frontend",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "frontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.frontend"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.vinzie.lazyspender"
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      [
        "@react-native-community/datetimepicker",
        {
          android: {
            datePicker: {
              colorAccent: {
                light: "#6B9FFF",
                dark: "#A8C7FF"
              },
              textColorPrimary: {
                light: "#1A1C1E",
                dark: "#F1F0F4"
              },
              textColorSecondary: {
                light: "#42474E",
                dark: "#9CA3AF"
              },
              windowBackground: {
                light: "#FFFFFF",
                dark: "#2F3033"
              }
            }
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL || "https://lazyspender-api-272563214847.us-east1.run.app"
    }
  }
};
