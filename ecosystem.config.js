cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: "bjj-classes",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000 -H 0.0.0.0",
    cwd: __dirname,
    env: {
      NODE_ENV: "production"
      // Add any env vars you use, e.g.
      // DATABASE_URL: "file:./prisma/dev.db"
    },
    watch: false,
    autorestart: true,
    max_memory_restart: "300M",
    time: true
  }]
};
EOF