const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
    const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
    
    const proj = xcode.project(projectPath);
    proj.parseSync();

    const teamID = "T57RH2WT3W";
    const extensions = [
        { name: 'WNonUIExt', id: 'com.aub.mobilebanking.uat.bh.WNonUI', dir: 'WNonUIExt' },
        { name: 'WUIExt', id: 'com.aub.mobilebanking.uat.bh.WUI', dir: 'WUIExt' }
    ];

    extensions.forEach(ext => {
        // Create the Extension Target
        const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
        
        // Build Settings
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        proj.addBuildProperty('INFOPLIST_FILE', path.join(ext.dir, 'Info.plist'), null, ext.name);
        proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', path.join(ext.dir, ext.name + '.entitlements'), null, ext.name);
        proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        
        // Ensure standard libraries are available
        proj.addBuildProperty('LD_RUNPATH_SEARCH_PATHS', '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"', null, ext.name);
    });

    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✔ Successfully created Wallet Extension targets.');
};
