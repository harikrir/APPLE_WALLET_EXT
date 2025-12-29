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
        { name: 'WNonUIExt', id: 'com.aub.mobilebanking.uat.bh.WNonUI', dir: 'WNonUIExt', plist: 'WNonUIExt/Info.plist', ent: 'WNonUIExt/WNonUIExt.entitlements' },
        { name: 'WUIExt', id: 'com.aub.mobilebanking.uat.bh.WUI', dir: 'WUIExt', plist: 'WUIExt/Info.plist', ent: 'WUIExt/WUIExt.entitlements' }
    ];

    extensions.forEach(ext => {
        proj.addTarget(ext.name, 'app_extension', ext.dir);
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        proj.addBuildProperty('INFOPLIST_FILE', ext.plist, null, ext.name);
        proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', ext.ent, null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
    });

    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✔ Extensions Hooked Successfully.');
};
