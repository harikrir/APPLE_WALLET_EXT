
var exec = require('child_process').exec;
var path = require('path');

module.exports = function (context) {
    var Q = context.requireCordovaModule('q');
    var deferral = new Q.defer();

    // Determine the path to the hooks folder where package.json lives
    var hooksPath = path.join(context.opts.projectRoot, 'plugins', context.opts.plugin.id, 'hooks');

    console.log('🚀 InstallNPM: Preparing to install dependencies in ' + hooksPath);

    // Execute 'npm install' inside the hooks folder
    // This uses the package.json we created earlier
    exec('npm install', { cwd: hooksPath }, function (error, stdout, stderr) {
        if (error) {
            console.error('❌ InstallNPM: Error installing dependencies: ' + error);
            deferral.reject('❌ InstallNPM: Failed to install hook dependencies.');
        } else {
            console.log('✅ InstallNPM: Dependencies (xcode, plist, shelljs) installed successfully.');
            console.log('🚀 InstallNPM output: ' + stdout);
            deferral.resolve();
        }
    });

    return deferral.promise;
};
