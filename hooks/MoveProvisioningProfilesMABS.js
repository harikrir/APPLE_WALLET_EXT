
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');

module.exports = function (context) {
    var projectRoot = context.opts.projectRoot;
    
    // Path to your profiles inside the plugin
    var profileSourceDir = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios', 'profiles');
    
    // Target directory on the MABS macOS build server
    var profileDestDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');

    console.log('🚨 MoveProvisioningProfiles: Starting sync from ' + profileSourceDir);

    // 1. Create the destination directory if it doesn't exist
    if (!fs.existsSync(profileDestDir)) {
        shell.mkdir('-p', profileDestDir);
        console.log('🚨 MoveProvisioningProfiles: Created destination directory');
    }

    // 2. Check if the source directory exists
    if (fs.existsSync(profileSourceDir)) {
        var files = fs.readdirSync(profileSourceDir);
        
        files.forEach(function (file) {
            if (file.endsWith('.mobileprovision')) {
                var sourceFile = path.join(profileSourceDir, file);
                var destFile = path.join(profileDestDir, file);
                
                try {
                    shell.cp('-f', sourceFile, destFile);
                    console.log('✅ MoveProvisioningProfiles: Successfully copied ' + file);
                } catch (err) {
                    console.error('❌ MoveProvisioningProfiles: Failed to copy ' + file + ' - ' + err);
                }
            }
        });
    } else {
        console.error('❌ MoveProvisioningProfiles: Source directory not found at ' + profileSourceDir);
    }
};
