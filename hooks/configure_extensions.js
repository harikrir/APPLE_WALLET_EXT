const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
    const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
    
    if (!xcodeProjPath) {
        console.error('❌ Error: Could not find Xcode project.');
        return;
    }

    const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
    const proj = xcode.project(projectPath);
    proj.parseSync();

    // 1. Configuration Constants
    const teamID = "T57RH2WT3W"; 
    
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
                '../WNonUIExt/Models/AUBLog.swift', // Re-using shared logger
                '../WNonUIExt/Models/SharedModels.swift' // Re-using shared models
            ]
        }
    ];

    extensions.forEach(ext => {
        console.log(`🛠 Configuring Extension Target: ${ext.name}`);

        // 2. Create the Extension Target
        const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
        
        // 3. Add Source Files to Target's Compile Phase
        ext.files.forEach(fileName => {
            const filePath = path.join(ext.dir, fileName);
            // target.uuid ensures the file is compiled as part of the extension binary
            proj.addSourceFile(filePath, { target: target.uuid }, target.uuid);
        });

        // 4. Set Build Properties
        proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
        proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
        
        // Setting Plist and Entitlements paths relative to the extension folder
        proj.addBuildProperty('INFOPLIST_FILE', `"${ext.name}/Info.plist"`, null, ext.name);
        proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `"${ext.name}/${ext.name}.entitlements"`, null, ext.name);
        
        proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
        proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
        
        // 5. Link Required Frameworks
        proj.addFramework('PassKit.framework', { target: target.uuid });
        
        // 6. Ensure Swift standard libraries are correctly mapped for the extension
        proj.addBuildProperty('LD_RUNPATH_SEARCH_PATHS', '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"', null, ext.name);
    });

    // Write back the updated project file
    fs.writeFileSync(projectPath, proj.writeSync());
    console.log('✅ Success: Xcode project updated with Apple Wallet Extension targets.');
};
