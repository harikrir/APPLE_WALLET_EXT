
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    
    // ⚠️ Matches your OutSystems Project Name
    const projectName = "AUBMobileBanking"; 
    const xcodeProjPath = path.join(projectRoot, 'platforms', 'ios', projectName + '.xcodeproj', 'project.pbxproj');
    
    const extensionName = "WNonUIExt";
    const bundleID = "com.aub.mobilebanking.uat.bh.WNonUI";
    const appGroupID = "group.com.aub.mobilebanking.uat";
    const teamID = "T57RH2WT3W";

    if (!fs.existsSync(xcodeProjPath)) {
        console.error("❌ CreateNONUIExtension: project.pbxproj not found");
        return;
    }

    const pbxProject = xcode.project(xcodeProjPath);
    pbxProject.parseSync();

    // 1. Create Target
    const target = pbxProject.addTarget(extensionName, 'app_extension', extensionName);

    // 2. Add Source Files from WNonUIExt folder
    const folderPath = 'WNonUIExt';
    const files = [
        'Info.plist', 
        'WNonUIExt.entitlements', 
        'WNonUIExtHandler.swift'
    ];

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        if (file.endsWith('.swift')) {
            pbxProject.addSourceFile(filePath, {target: target.uuid});
        } else {
            pbxProject.addResourceFile(filePath, {target: target.uuid});
        }
    });

    // 3. Set Build Settings
    const configurations = pbxProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
        if (typeof configurations[key].buildSettings !== 'undefined' && 
            configurations[key].buildSettings.PRODUCT_NAME === `"${extensionName}"`) {
            
            const settings = configurations[key].buildSettings;
            settings.INFOPLIST_FILE = `"${extensionName}/Info.plist"`;
            settings.CODE_SIGN_ENTITLEMENTS = `"${extensionName}/WNonUIExt.entitlements"`;
            settings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleID}"`;
            settings.DEVELOPMENT_TEAM = `"${teamID}"`;
            settings.IPHONEOS_DEPLOYMENT_TARGET = '14.0';
            settings.SKIP_INSTALL = 'YES';
            settings.CODE_SIGN_STYLE = 'Manual';
            settings.SWIFT_VERSION = '5.0';
        }
    }

    // 4. Update Placeholders
    const plistPath = path.join(projectRoot, 'platforms', 'ios', extensionName, 'Info.plist');
    const entitlementsPath = path.join(projectRoot, 'platforms', 'ios', extensionName, 'WNonUIExt.entitlements');

    if (fs.existsSync(plistPath)) {
        let pContent = fs.readFileSync(plistPath, 'utf8');
        pContent = pContent.replace(/__BUNDLE_IDENTIFIER__/g, bundleID);
        fs.writeFileSync(plistPath, pContent);
    }

    if (fs.existsSync(entitlementsPath)) {
        let eContent = fs.readFileSync(entitlementsPath, 'utf8');
        eContent = eContent.replace(/__GROUP_IDENTIFIER__/g, appGroupID);
        fs.writeFileSync(entitlementsPath, eContent);
    }

    fs.writeFileSync(xcodeProjPath, pbxProject.writeSync());
    console.log(`✅ CreateNONUIExtension: Logic target ${extensionName} added for UAT.`);
};
