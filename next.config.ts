import type { NextConfig } from "next";
import path from "path";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 系統版本：建置時從 package.json 帶入，畫面上的版本號都讀這裡。
  // 之後每次更新只要改 package.json 的 version，畫面就會跟著變。
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    // Vercel 自動提供；預覽版會在版本號後面標示「預覽 + commit」，方便分辨
    NEXT_PUBLIC_APP_ENV: process.env.VERCEL_ENV ?? "development",
    NEXT_PUBLIC_APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
};

export default nextConfig;
