const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const platformPath = path.join(projectRoot, 'platforms', 'ios');
    const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
    
    const proj = xcode.project(projectPath);
    proj.parseSync();

    const teamID = "T57RH2WT3W";
    const appGroup = "group.com.aub.mobilebanking.uat.bh";

    const extensions = [
        { name: 'WNonUI', id: 'com.aub.mobilebanking.uat.bh.WNonUI', dir: 'WNonUIExt', type: 'com.apple.PassKit.issuer-provisioning' },
        { name: 'WUI', id: 'com.aub.mobilebanking.uat.bh.WUI', dir: 'WUIExt', type: 'com.apple.PassKit.issuer-provisioning.authorization' }
    ];

    extensions.forEach(ext => {
        const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        proj.addBuildProperty('CODE_SIGN_STYLE', 'Manual', null, ext.name);
    });

    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✔ Created Wallet Extension targets: WNonUI and WUI');
};
