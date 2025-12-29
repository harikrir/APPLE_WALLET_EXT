const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const platformPath = path.join(projectRoot, 'platforms', 'ios');
    
    // Find the xcodeproj directory
    const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    if (!xcodeProjPath) return;
    
    const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
    const proj = xcode.project(projectPath);
    proj.parseSync();

    const teamID = "T57RH2WT3W";
    const appGroup = "group.com.aub.mobilebanking.uat.bh";

    const extensions = [
        { 
            name: 'WNonUIExt', 
            bundleId: 'com.aub.mobilebanking.uat.bh.WNonUI', 
            dir: 'WNonUIExt', 
            plist: 'WNonUIExt/Info.plist',
            entitlements: 'WNonUIExt/WNonUIExt.entitlements'
        },
        { 
            name: 'WUIExt', 
            bundleId: 'com.aub.mobilebanking.uat.bh.WUI', 
            dir: 'WUIExt', 
            plist: 'WUIExt/Info.plist',
            entitlements: 'WUIExt/WUIExt.entitlements'
        }
    ];

    extensions.forEach(ext => {
        // 1. Add the Target to the project
        // 'app_extension' is the correct type for node-xcode
        const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
        const targetUuid = target.uuid;

        // 2. Add Build Settings for this specific extension target
        // We use the 'ext.name' to ensure properties are scoped to the extension, not the main app
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, 'Release', ext.name);
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, 'Debug', ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        proj.addBuildProperty('CODE_SIGN_STYLE', 'Manual', null, ext.name);
        
        // 3. Link the Plist and Entitlements
        // node-xcode needs relative paths for these specific settings
        proj.addBuildProperty('INFOPLIST_FILE', `"${ext.plist}"`, null, ext.name);
        proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `"${ext.entitlements}"`, null, ext.name);

        // 4. Force Swift Version (Crucial for OutSystems MABS builds)
        proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
        
        // 5. Link the Provisioning Profile (Hardcoded to your specific file names)
        const profileName = ext.bundleId; // Usually the name inside the profile
        proj.addBuildProperty('PROVISIONING_PROFILE_SPECIFIER', `"${profileName}"`, null, ext.name);
    });

    // 6. Final save
    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✔ Successfully configured WNonUIExt and WUIExt targets with TeamID and BundleIDs.');
};
