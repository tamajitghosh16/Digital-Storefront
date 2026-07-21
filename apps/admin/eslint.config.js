import nextConfig from "eslint-config-next";
import sharedConfig from "@repo/config/eslint";

export default [...sharedConfig, ...nextConfig];
