import Constants from 'expo-constants';

// Feature flags are sourced from FEATURE_* vars in .env / .env.development via
// app.config.js `extra`, the same pattern used for apiBaseUrl (see config/api.ts).
// Since they're baked in at build time, toggling one requires a rebuild/redeploy,
// not just an env change at runtime.
export const featureFlags = {
  debtTrendWidget: Constants.expoConfig?.extra?.featureDebtTrendWidget === true,
};
