const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   // 1. DYNAMICALLY FIND THE XCODE PROJECT
   // MABS might name the project "App" or your specific app name.
   const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjFolder) {
       console.error("❌ CreateNONUIExtension: No .xcodeproj found in " + platformPath);
       return;
   }
   const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
   const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');
   const pbxProject = xcode.project(pbxprojPath);
   pbxProject.parseSync();
   const targetName = 'WNonUIExt';
   const bundleID = 'com.aub.mobilebanking.uat.bh.WNonUI';
   // 2. CREATE THE EXTENSION TARGET
   // Using 'app_extension' type specifically for Apple Wallet provisioning logic
   const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
   // 3. ADD FILES & LINK TO TARGET
   const files = [
       'WNonUI-Info.plist',
       'WNonUIExt.entitlements',
       'WNonUIExtHandler.swift',
       'Models/SharedModels.swift',
       'Models/AUBLog.swift'
   ];
   files.forEach(file => {
       const filePath = path.join(targetName, file);
       // addSourceFile handles both adding the file and the Compile Sources phase
       pbxProject.addSourceFile(filePath, { target: target.uuid });
   });
   // 4. EMBED EXTENSION IN MAIN APP (Creates the PlugIns folder)
   // This is the step that ensures the .appex actually ends up in the IPA
   const mainTargetKey = pbxProject.findTargetKey(projectName);
   // Add Dependency: Tells Xcode the main app needs this target built first
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   // Create "Embed App Extensions" Copy Files Phase
   // The 'app_extension' subfolder argument specifically creates the 'PlugIns' directory
   const copyFilesPhase = pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   pbxProject.addToPBXCopyFilesBuildPhase(target.uuid, copyFilesPhase.uuid);
   // 5. CONFIGURE BUILD SETTINGS
   const configurations = pbxProject.pbxXCBuildConfigurationSection();
   for (const key in configurations) {
       if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
           const settings = configurations[key].buildSettings;
           if (settings.PRODUCT_NAME === `"${targetName}"` || settings.PRODUCT_NAME === targetName) {
               settings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
               settings.CODE_SIGN_STYLE = 'Manual';
               settings.DEVELOPMENT_TEAM = 'T57RH2WT3W'; // From your Apple_Pay_Test-34 profile
               settings.PROVISIONING_PROFILE_SPECIFIER = `"${bundleID}"`;
               settings.INFOPLIST_FILE = `"${targetName}/WNonUI-Info.plist"`;
               settings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/WNonUIExt.entitlements"`;
               settings.SWIFT_VERSION = '5.0';
               settings.SKIP_INSTALL = 'YES'; // Required for targets inside an IPA
               settings.IPHONEOS_DEPLOYMENT_TARGET = '13.0';
           }
       }
   }
   // 6. SAVE PROJECT
   fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
   console.log(`✅ CreateNONUIExtension: Target created and embedded in PlugIns folder.`);
};
