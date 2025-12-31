var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
module.exports = function (context) {
   var projectRoot = context.opts.projectRoot;
   // 1. Path to your profiles inside the plugin (where they are named as UUIDs)
   var profileSourceDir = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios', 'profiles');
   // 2. The standard directory on MABS/macOS where Xcode looks for profiles
   var profileDestDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');
   console.log('🚨 MoveProvisioningProfiles: Starting sync to ' + profileDestDir);
   // 3. Create the destination directory if it doesn't exist
   if (!fs.existsSync(profileDestDir)) {
       shell.mkdir('-p', profileDestDir);
       console.log('🚨 MoveProvisioningProfiles: Created destination directory');
   }
   // 4. Check if the source directory exists and copy files
   if (fs.existsSync(profileSourceDir)) {
       try {
           // Using -Rf to ensure all UUID-named profiles are copied over
           shell.cp('-Rf', path.join(profileSourceDir, '*'), profileDestDir);
           // Log the files for verification in the MABS log
           var filesMoved = fs.readdirSync(profileSourceDir);
           filesMoved.forEach(function(file) {
               console.log('✅ MoveProvisioningProfiles: Installed ' + file);
           });
       } catch (err) {
           console.error('❌ MoveProvisioningProfiles: Failed to copy profiles - ' + err);
       }
   } else {
       console.error('❌ MoveProvisioningProfiles: Source directory not found at ' + profileSourceDir);
   }
};
