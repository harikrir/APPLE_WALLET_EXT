const fs = require('fs');
const path = require('path');
const os = require('os');
module.exports = function(context) {
   const profilesDir = path.join(context.opts.plugin.dir, 'src/ios/profiles');
   const targetDir = path.join(os.homedir(), 'Library/MobileDevice/Provisioning Profiles');
   if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
   fs.readdirSync(profilesDir).forEach(file => {
       if (file.endsWith('.mobileprovision')) {
           fs.copyFileSync(path.join(profilesDir, file), path.join(targetDir, file));
           console.log('Installed Profile: ' + file);
       }
   });
};
