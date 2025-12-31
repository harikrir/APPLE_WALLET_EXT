var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
module.exports = function (context) {
   var projectRoot = context.opts.projectRoot;
   var profileSourceDir = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios', 'profiles');
   var profileDestDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');
   console.log('🚀 MoveProvisioningProfiles: Syncing profiles to ' + profileDestDir);
   if (!fs.existsSync(profileDestDir)) {
       shell.mkdir('-p', profileDestDir);
   }
   // Mapping filenames to their actual internal UUIDs
   // These MUST match the UUIDs in your UpdateBuildExportOptions.js
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
               // If we have a mapped UUID, rename it to UUID.mobileprovision
               // Otherwise, keep the original name
               var targetFileName = profileMapping[file] ? (profileMapping[file] + '.mobileprovision') : file;
               var destFile = path.join(profileDestDir, targetFileName);
               try {
                   shell.cp('-f', sourceFile, destFile);
                   console.log('✅ MoveProvisioningProfiles: Installed ' + file + ' as ' + targetFileName);
               } catch (err) {
                   console.error('❌ MoveProvisioningProfiles: Failed to copy ' + file + ' - ' + err);
               }
           }
       });
   } else {
       console.error('❌ MoveProvisioningProfiles: Source directory not found at ' + profileSourceDir);
   }
};
