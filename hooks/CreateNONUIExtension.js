const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const platformPath = path.join(projectRoot, 'platforms', 'ios');

    // 1. DYNAMICALLY FIND THE XCODE PROJECT
    if (!fs.existsSync(platformPath)) {
        console.error("❌ CreateNONUIExtension: iOS platform folder not found. Ensure this hook is 'after_plugin_install'.");
        return;
    }

    const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    if (!xcodeProjFolder) {
        console.error("❌ CreateNONUIExtension: No .xcodeproj found in " + platformPath);
        return;
    }

    const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
    const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');

    console.log(`✅ CreateNONUIExtension: Found project "${projectName}" at ${pbxprojPath}`);

    // 2. INITIALIZE XCODE PROJECT PARSER
    const pbxProject = xcode.project(pbxprojPath);
    pbxProject.parseSync();

    // TARGET SETTINGS
    const targetName = 'WNonUIExt';
    const bundleID = 'com.aub.mobilebanking.uat.bh.WNonUI';
    const appGroupID = 'group.com.aub.mobilebanking.uat.bh';

    // 3. CREATE THE EXTENSION TARGET
    // 'app_extension' is the type required for Apple Wallet provisioning logic
    const target = pbxProject.addTarget(targetName, 'app_extension', targetName);

    // 4. ADD FILES TO THE TARGET
    // These paths are relative to the platforms/ios/WNonUIExt folder
    const extensionSourcePath = path.join(platformPath, targetName);
    const files = [
        'WNonUI-Info.plist',
        'WNonUIExt.entitlements',
        'WNonUIExtHandler.swift',
        'Models/SharedModels.swift', // Shared logic
        'Models/AUBLog.swift'       // Shared logging
    ];

    files.forEach(file => {
        const filePath = path.join(targetName, file);
        pbxProject.addResourceFile(filePath, { target: target.uuid });
        pbxProject.addSourceFile(filePath, { target: target.uuid });
    });

    // 5. CONFIGURE BUILD SETTINGS
    const configurations = pbxProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
        if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
            const settings = configurations[key].buildSettings;
            
            // Only apply to our Extension target
            if (settings.PRODUCT_NAME === `"${targetName}"` || settings.PRODUCT_NAME === targetName) {
                settings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
                settings.IPHONEOS_DEPLOYMENT_TARGET = '13.0';
                settings.TARGETED_DEVICE_FAMILY = '"1,2"';
                settings.CODE_SIGN_STYLE = 'Manual';
                settings.DEVELOPMENT_TEAM = 'T57RH2WT3W'; // From your Apple_Pay_Test-34 profile
                settings.PROVISIONING_PROFILE_SPECIFIER = '"com.aub.mobilebanking.uat.bh.WNonUI"';
                settings.INFOPLIST_FILE = `"${targetName}/WNonUI-Info.plist"`;
                settings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/WNonUIExt.entitlements"`;
                settings.SWIFT_VERSION = '5.0';
                settings.SKIP_INSTALL = 'YES'; // Required for extensions inside an IPA
            }
        }
    }

    // 6. SAVE CHANGES
    fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
    console.log(`✅ CreateNONUIExtension: Successfully added ${targetName} target to Xcode project.`);
};
