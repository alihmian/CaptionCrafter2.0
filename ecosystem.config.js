module.exports = {
  apps: [
    {
      name: "Post2",
      cwd: "/root/CaptionCrafter2.0",
      script: "build/Post2.0.js",          // your Node entry
      env: {
        NODE_ENV: "production",
        // Make child_process 'python' resolve to the venv interpreter
        PYTHON: "/root/CaptionCrafter2.0/venv/bin/python",
        PATH: "/root/CaptionCrafter2.0/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
      }
    },
    {
      name: "BN",
      cwd: "/root/CaptionCrafter2.0",
      script: "build/BreakingNews.js",          // your Node entry
      env: {
        NODE_ENV: "production",
        // Make child_process 'python' resolve to the venv interpreter
        PYTHON: "/root/CaptionCrafter2.0/venv/bin/python",
        PATH: "/root/CaptionCrafter2.0/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
      }
    },
    {
      name: "Live",
      cwd: "/root/CaptionCrafter2.0",
      script: "build/Live.js",          // your Node entry
      env: {
        NODE_ENV: "production",
        // Make child_process 'python' resolve to the venv interpreter
        PYTHON: "/root/CaptionCrafter2.0/venv/bin/python",
        PATH: "/root/CaptionCrafter2.0/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
      }
    }
  ]
}
