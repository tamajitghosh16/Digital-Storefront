import nextConfig from "eslint-config-next";
import sharedConfig from "@repo/config/eslint";

const config = [...sharedConfig, ...nextConfig];

export default config;
