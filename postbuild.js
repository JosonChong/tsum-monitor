const https = require('https');
const fs = require('fs');
const path = require('path');

const file = fs.createWriteStream("config.json_default");
const request = https.get("https://raw.githubusercontent.com/JosonChong/tsum-monitor/master/config.json", function(response) {
   response.pipe(file);
   // After download completes, copy to dist folder
   file.on('finish', () => {
      fs.copyFileSync('config.json_default', 'dist/config.json');
      fs.rmSync('config.json_default');
   });
});

function copyDirectory(src, dest) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // Read all files/directories in source
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

copyDirectory('public', 'dist/public');