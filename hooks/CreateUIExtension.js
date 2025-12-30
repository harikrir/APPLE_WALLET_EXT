const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const platformPath = path.join(projectRoot, 'platforms', 'ios');

    // 1. DYNAMICALLY FIND THE XCODE PROJECT
    if (!fs.existsSync(platformPath)) {
        console.error("❌ CreateUIExtension: iOS platform folder not found. Ensure this hook is 'after_plugin_install'.");
        return;
    }

    const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    if (!xcodeProjFolder) {
        console.error("❌ CreateUIExtension: No .xcodeproj found in " + platformPath);
        return;
    }

    const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
    const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');

    console.log(`✅ CreateUIExtension: Found project "${projectName}" at ${pbxprojPath}`);

    // 2. INITIALIZE XCODE PROJECT PARSER
    const pbxProject = xcode.project(pbxprojPath);
    pbxProject.parseSync();

    // TARGET SETTINGS
    const targetName = 'WUIExt';
    const bundleID = 'com.aub.mobilebanking.uat.bh.WUI';
    const appGroupID = 'group.com.aub.mobilebanking.uat.bh';

    // 3. CREATE THE UI EXTENSION TARGET
    // Using 'app_extension' type for UI-based Apple Wallet logic
    const target = pbxProject.addTarget(targetName, 'app_extension', targetName);

    // 4. ADD FILES TO THE TARGET
    // Paths are relative to the platforms/ios/ folder
    const files = [
        'WUIExt/WUI-Info.plist',
        'WUIExt/WUIExt.entitlements',
        'WUIExt/WUIExtHandler.swift',
        'WUIExt/WUIExtView.swift',
        'WNonUIExt/Models/SharedModels.swift', // Shared logic
        'WNonUIExt/Models/AUBLog.swift',       // Shared logging
        'kfh_card_art.png'                      // Card Asset
    ];

    files.forEach(file => {
        const filePath = file;
        if (file.endsWith('.swift')) {
            pbxProject.addSourceFile(filePath, { target: target.uuid });
        } else {
            pbxProject.addResourceFile(filePath, { target: target.uuid });
        }
    });

    // 5. CONFIGURE BUILD SETTINGS
    const configurations = pbxProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
        if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
            const settings = configurations[key].buildSettings;
            
            // Apply only to the UI Extension target
            if (settings.PRODUCT_NAME === `"${targetName}"` || settings.PRODUCT_NAME === targetName) {
                settings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
                settings.IPHONEOS_DEPLOYMENT_TARGET = '14.0';
                settings.TARGETED_DEVICE_FAMILY = '"1,2"';
                settings.CODE_SIGN_STYLE = 'Manual';
                settings.DEVELOPMENT_TEAM = 'T57RH2WT3W'; // From your Apple_Pay_Test-34 profile
                settings.PROVISIONING_PROFILE_SPECIFIER = '"com.aub.mobilebanking.uat.bh.WUI"';
                settings.INFOPLIST_FILE = `"${targetName}/WUI-Info.plist"`;
                settings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/WUIExt.entitlements"`;
                settings.SWIFT_VERSION = '5.0';
                settings.SKIP_INSTALL = 'YES';
                settings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
            }
        }
    }

    // 6. SAVE CHANGES
    fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
    console.log(`✅ CreateUIExtension: Successfully added ${targetName} target to Xcode project.`);
};
