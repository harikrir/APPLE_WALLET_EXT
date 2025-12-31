const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjFolder) return;
   const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');
   const pbxProject = xcode.project(pbxprojPath);
   pbxProject.parseSync();
   const targetName = 'WNonUIExt';
   const bundleID = 'com.aub.mobilebanking.uat.bh.WNonUI';
   // 1. CREATE TARGET
   const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
   // 2. ADD FILES
   const files = [
       'WNonUI-Info.plist',
       'WNonUIExt.entitlements',
       'WNonUIExtHandler.swift',
       'Models/SharedModels.swift',
       'Models/AUBLog.swift'
   ];
   files.forEach(file => {
       const filePath = path.join(targetName, file);
       pbxProject.addSourceFile(filePath, { target: target.uuid });
   });
   // 3. EMBED LOGIC (Fixing the .appex reference)
   const mainTargetKey = pbxProject.findTargetKey(path.basename(xcodeProjFolder, '.xcodeproj'));
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   // Create the Copy Files Phase for PlugIns
   const copyPhase = pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   // Find the .appex file created by addTarget
   const pbxGroup = pbxProject.hash.project.objects['PBXGroup'];
   let appexFile;
   // Search for the file reference of the .appex
   for (const key in pbxProject.hash.project.objects['PBXFileReference']) {
       const fileRef = pbxProject.hash.project.objects['PBXFileReference'][key];
       if (fileRef.path === `"${targetName}.appex"` || fileRef.path === `${targetName}.appex`) {
           // Use the correct internal format for adding to build phase
           appexFile = {
               fileRef: key,
               basename: `${targetName}.appex`,
               settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
           };
           break;
       }
   }
   if (appexFile) {
       pbxProject.addToPbxCopyFilesBuildPhase(appexFile, copyPhase.uuid);
   }
   // 4. BUILD SETTINGS
   const configurations = pbxProject.pbxXCBuildConfigurationSection();
   for (const key in configurations) {
       const config = configurations[key];
       if (config.buildSettings && (config.buildSettings.PRODUCT_NAME === `"${targetName}"` || config.buildSettings.PRODUCT_NAME === targetName)) {
           config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
           config.buildSettings.DEVELOPMENT_TEAM = 'T57RH2WT3W';
           config.buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${bundleID}"`;
           config.buildSettings.INFOPLIST_FILE = `"${targetName}/WNonUI-Info.plist"`;
           config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/WNonUIExt.entitlements"`;
           config.buildSettings.SWIFT_VERSION = '5.0';
           config.buildSettings.SKIP_INSTALL = 'YES';
       }
   }
   fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
   console.log(`✅ CreateNONUIExtension: Target Embedded.`);
};
