const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_CONFIGS_OLD = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const SIGNING_CONFIGS_NEW = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('RELEASE_STORE_FILE')) {
                storeFile file(RELEASE_STORE_FILE)
                storePassword RELEASE_STORE_PASSWORD
                keyAlias RELEASE_KEY_ALIAS
                keyPassword RELEASE_KEY_PASSWORD
            }
        }
    }`;

const RELEASE_SIGNING_OLD = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_SIGNING_NEW = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig project.hasProperty('RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`;

const DEBUG_SIGNING_OLD = `        debug {
            signingConfig signingConfigs.debug
        }`;

const DEBUG_SIGNING_NEW = `        debug {
            signingConfig project.hasProperty('RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug
        }`;

// Expo's generated android/app/build.gradle signs both the `debug` and
// `release` build types with the `debug` signing config, which Gradle
// auto-generates fresh on any machine/CI runner missing ~/.android/debug.keystore.
// That makes the SHA-1 registered with Google's OAuth Android client drift
// between machines and builds. This plugin patches the generated build.gradle
// (every prebuild) to add a real `release` signingConfig and route both build
// types through it when RELEASE_STORE_FILE etc. are supplied as Gradle
// properties - so local dev builds and CI/release builds share one stable
// signing identity and only one Android OAuth client is ever needed. Falls
// back to the untouched debug config when those properties aren't supplied.
module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withAndroidReleaseSigning only supports Groovy build.gradle');
    }

    let { contents } = config.modResults;

    if (contents.includes('RELEASE_STORE_FILE')) {
      return config;
    }

    if (
      !contents.includes(SIGNING_CONFIGS_OLD) ||
      !contents.includes(RELEASE_SIGNING_OLD) ||
      !contents.includes(DEBUG_SIGNING_OLD)
    ) {
      throw new Error(
        'withAndroidReleaseSigning: expected signingConfigs block not found in build.gradle - Expo template may have changed.'
      );
    }

    contents = contents
      .replace(SIGNING_CONFIGS_OLD, SIGNING_CONFIGS_NEW)
      .replace(RELEASE_SIGNING_OLD, RELEASE_SIGNING_NEW)
      .replace(DEBUG_SIGNING_OLD, DEBUG_SIGNING_NEW);

    config.modResults.contents = contents;
    return config;
  });
};
