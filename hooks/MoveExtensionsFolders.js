const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const pluginId = context.opts.plugin.id;
    const iosPlatformPath = path.join(projectRoot, 'platforms', 'ios');

    // Define the source and destination for both extensions
    const extensions = [
        {
            name: "WNonUIExt",
            src: path.join(projectRoot, 'plugins', pluginId, 'src', 'ios', 'WNonUIExt'),
            dest: path.join(iosPlatformPath, 'WNonUIExt')
        },
        {
            name: "WUIExt",
            src: path.join(projectRoot, 'plugins', pluginId, 'src', 'ios', 'WUIExt'),
            dest: path.join(iosPlatformPath, 'WUIExt')
        }
    ];

    console.log('🚀 MoveExtensionsFolders: Starting to move source files...');

    extensions.forEach(ext => {
        // 1. Check if source exists in the plugin
        if (fs.existsSync(ext.src)) {
            // 2. Remove old destination folder if it exists (for clean build)
            if (fs.existsSync(ext.dest)) {
                shell.rm('-rf', ext.dest);
            }

            // 3. Copy the extension folder to the platforms/ios directory
            try {
                shell.cp('-R', ext.src, iosPlatformPath);
                console.log(`✅ MoveExtensionsFolders: Successfully moved ${ext.name} to platforms/ios/`);
            } catch (err) {
                console.error(`❌ MoveExtensionsFolders: Failed to copy ${ext.name} - ${err}`);
            }
        } else {
            console.error(`❌ MoveExtensionsFolders: Source not found for ${ext.name} at ${ext.src}`);
        }
    });

    console.log('🚀 MoveExtensionsFolders: Finished moving files.');
};
