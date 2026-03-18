import 'dotenv/config';

export default {
  "expo": {
    "name": "LocalConnect",
    "slug": "LocalConnect",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "localconnect",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1A1826"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": {
        "backgroundColor": "#1A1826",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
      "package": "com.vasilistsom.localconnect", 
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-secure-store",
      "@react-native-community/datetimepicker"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "83b70ea7-03e7-4b6a-aef8-27c33f008bb8"
      }
    }
  }
}
