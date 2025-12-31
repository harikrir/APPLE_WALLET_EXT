var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
module.exports = function (context) {
   var projectRoot = context.opts.projectRoot;
   var profileSourceDir = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios', 'profiles');
   var profileDestDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');
   if (!fs.existsSync(profileDestDir)) {
       shell.mkdir('-p', profileDestDir);
   }
   if (fs.existsSync(profileSourceDir)) {
       // Just copy everything; they are already named correctly as UUIDs
       shell.cp('-Rf', path.join(profileSourceDir, '*'), profileDestDir);
       console.log('✅ MoveProvisioningProfiles: All UUID-named profiles copied to Library.');
   } else {
       console.error('❌ MoveProvisioningProfiles: Source directory not found!');
   }
};
