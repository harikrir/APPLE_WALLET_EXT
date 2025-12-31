const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   // 1. DYNAMICALLY FIND THE XCODE PROJECT (Fixes "pbxproj not found" error)
   const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjFolder) {
       console.error("❌ CreateUIExtension: No .xcodeproj found in " + platformPath);
       return;
   }
   const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
   const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');
   const pbxProject = xcode.project(pbxprojPath);
   pbxProject.parseSync();
   const targetName = 'WUIExt';
   const bundleID = 'com.aub.mobilebanking.uat.bh.WUI';
   // 2. CREATE THE UI EXTENSION TARGET
   // Type 'app_extension' is required for the Wallet UI
   const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
   // 3. ADD FILES & LINK TO TARGET
   // These paths must exist in platforms/ios/WUIExt (moved there by your Move hook)
   const files = [
       'WUIExt/WUI-Info.plist',
       'WUIExt/WUIExt.entitlements',
       'WUIExt/WUIExtHandler.swift',
       'WUIExt/WUIExtView.swift',
       'WNonUIExt/Models/SharedModels.swift',
       'WNonUIExt/Models/AUBLog.swift',
       'kfh_card_art.png'
   ];
   files.forEach(file => {
       if (file.endsWith('.swift')) {
           pbxProject.addSourceFile(file, { target: target.uuid });
       } else {
           pbxProject.addResourceFile(file, { target: target.uuid });
       }
   });
   // 4. EMBED EXTENSION IN MAIN APP (Forces creation of PlugIns folder)
   const mainTargetKey = pbxProject.findTargetKey(projectName);
   // Create Dependency: Main app won't finish building until Extension is ready
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   // Create "Embed App Extensions" Copy Phase
   // The 'app_extension' subfolder parameter specifically creates the 'PlugIns' folder
   const copyFilesPhase = pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   pbxProject.addToPBXCopyFilesBuildPhase(target.uuid, copyFilesPhase.uuid);
   // 5. CONFIGURE BUILD SETTINGS
   const configurations = pbxProject.pbxXCBuildConfigurationSection();
   for (const key in configurations) {
       if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
           const settings = configurations[key].buildSettings;
           // Apply only to the UI Extension target
           if (settings.PRODUCT_NAME === `"${targetName}"` || settings.PRODUCT_NAME === targetName) {
               settings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
               settings.CODE_SIGN_STYLE = 'Manual';
               settings.DEVELOPMENT_TEAM = 'T57RH2WT3W'; // From your Apple_Pay_Test-34 profile
               settings.PROVISIONING_PROFILE_SPECIFIER = `"${bundleID}"`;
               settings.INFOPLIST_FILE = `"WUIExt/WUI-Info.plist"`;
               settings.CODE_SIGN_ENTITLEMENTS = `"WUIExt/WUIExt.entitlements"`;
               settings.SWIFT_VERSION = '5.0';
               settings.SKIP_INSTALL = 'YES';
               settings.IPHONEOS_DEPLOYMENT_TARGET = '14.0';
               // Essential for finding Swift libraries in a Cordova context
               settings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
           }
       }
   }
   // 6. SAVE PROJECT
   fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
   console.log(`✅ CreateUIExtension: Target created and embedded successfully.`);
};
