var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
module.exports = function (context) {
   var projectRoot = context.opts.projectRoot;
   // Path inside your zip: src/ios/profiles/
   var profileSourceDir = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios', 'profiles');
   // The specific folder where MABS looks for profiles
   var profileDestDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');
   console.log('🚀 MoveProvisioningProfiles: Starting sync...');
   if (!fs.existsSync(profileDestDir)) {
       shell.mkdir('-p', profileDestDir);
   }
   // MAP YOUR FILENAMES TO THE UUIDs YOU PROVIDED
   // Ensure these filenames match what is actually inside your src/ios/profiles/ folder
   var profileMapping = {
       "com.aub.mobilebanking.uat.bh.mobileprovision": "1935f949-c72a-49f3-bc93-53d7df814805",
       "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision": "2458aa6f-941b-43c4-b787-b1d304a7b73c",
       "com.aub.mobilebanking.uat.bh.WUI.mobileprovision": "ef234420-f58f-41e4-871a-86527fe5acfd"
   };
   if (fs.existsSync(profileSourceDir)) {
       var files = fs.readdirSync(profileSourceDir);
       files.forEach(function (file) {
           if (file.endsWith('.mobileprovision')) {
               var sourceFile = path.join(profileSourceDir, file);
               // CRITICAL: Rename to [UUID].mobileprovision
               var uuid = profileMapping[file];
               if (uuid) {
                   var destFile = path.join(profileDestDir, uuid + '.mobileprovision');
                   shell.cp('-f', sourceFile, destFile);
                   console.log('✅ Installed Profile: ' + file + ' as ' + uuid + '.mobileprovision');
               } else {
                   // Fallback for files not in mapping
                   shell.cp('-f', sourceFile, path.join(profileDestDir, file));
                   console.log('⚠️ Installed Profile with original name: ' + file);
               }
           }
       });
   } else {
       console.error('❌ MoveProvisioningProfiles: Source directory not found: ' + profileSourceDir);
   }
};
