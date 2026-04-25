import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import type { ForgeConfig } from "@electron-forge/shared-types";

const mainConfig = require("./webpack.main.config");
const preloadConfig = require("./webpack.preload.config");
const rendererConfig = require("./webpack.renderer.config");

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
    new WebpackPlugin({
      mainConfig,
      preload: { config: preloadConfig },
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            name: "main_window",
            html: "./src/index.html",
            js: "./src/renderer/renderer.tsx",
          },
        ],
      },
    }),
  ],
};

export default config;
