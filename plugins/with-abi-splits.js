// Config-Plugin: baut getrennte APKs pro Prozessor-Architektur.
//   app-arm64-v8a-release.apk  -> für Handys (wird veröffentlicht)
//   app-x86_64-release.apk     -> nur für den Start-Test im Emulator
// So bleibt der Download fürs Handy klein.
const { withAppBuildGradle } = require('expo/config-plugins');

const SPLITS = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "x86_64"
            universalApk false
        }
    }
`;

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (!gradle.includes('splits {')) {
      cfg.modResults.contents = gradle.replace(/^android\s*\{/m, (m) => `${m}${SPLITS}`);
    }
    return cfg;
  });
};
