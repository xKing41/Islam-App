// Ergänzt app.json: Beim Bauen auf GitHub bekommt jede Version automatisch
// eine fortlaufende Nummer (0.1.<Lauf-Nr.>), damit Updates sich sauber drüber installieren lassen.
module.exports = ({ config }) => {
  const run = Number(process.env.GITHUB_RUN_NUMBER);
  if (!run) return config;
  return {
    ...config,
    version: `0.1.${run}`,
    android: { ...config.android, versionCode: run },
  };
};
