const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
    const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    
    if (!xcodeProjPath) {
        console.error('❌ Could not find Xcode project.');
        return;
    }

    const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
    const proj = xcode.project(projectPath);
    proj.parseSync();

    const teamID = "T57RH2WT3W";
    const appGroupID = "group.com.aub.mobilebanking.uat.bh";

    // Define the Extensions and which files they need to compile
    const extensions = [
        { 
            name: 'WNonUIExt', 
            id: 'com.aub.mobilebanking.uat.bh.WNonUI', 
            dir: 'WNonUIExt',
            files: [
                'WNonUIExtHandler.swift',
                'Models/AUBLog.swift',
                'Models/SharedModels.swift'
            ]
        },
        { 
            name: 'WUIExt', 
            id: 'com.aub.mobilebanking.uat.bh.WUI', 
            dir: 'WUIExt',
            files: [
                'WUIExtHandler.swift',
                'WUIExtView.swift',
                '../WNonUIExt/Models/AUBLog.swift' // Sharing the log file
            ]
        }
    ];

    extensions.forEach(ext => {
        // 1. Create Target
        const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
        
        // 2. Add Source Files to Target
        ext.files.forEach(fileName => {
            const filePath = path.join(ext.dir, fileName);
            proj.addSourceFile(filePath, { target: target.uuid }, target.uuid);
        });

        // 3. Apply Build Settings
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        proj.addBuildProperty('INFOPLIST_FILE', `"${ext.name}/Info.plist"`, null, ext.name);
        proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `"${ext.name}/${ext.name}.entitlements"`, null, ext.name);
        proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        proj.addBuildProperty('LD_RUNPATH_SEARCH_PATHS', '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"', null, ext.name);
        
        // 4. Link PassKit (Required for Wallet)
        proj.addFramework('PassKit.framework', { target: target.uuid });
    });

    // Save the modified project
    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✔ Wallet Extensions targets created and files linked.');
};
