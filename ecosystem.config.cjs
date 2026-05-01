module.exports = {
  apps: [
    {
      name: "bcd-dashboard",
      script: "npx",
      args: "tsx server.ts",
      env: {
        NODE_ENV: "production",
      },
      cwd: "./",
    },
  ],
};
