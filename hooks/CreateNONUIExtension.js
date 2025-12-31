const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjFolder) return;
   const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
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
   // 3. EMBED LOGIC (MANUAL INJECTION - NO HELPER FUNCTIONS)
   const mainTargetKey = pbxProject.findTargetKey(projectName);
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   // Create Copy Phase
   const copyPhase = pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   copyPhase.dstSubfolderSpec = 13; // 13 is the code for PlugIns folder
   // Find the file reference for the .appex
   const fileRefs = pbxProject.hash.project.objects['PBXFileReference'];
   let appexFileKey;
   for (const key in fileRefs) {
       if (fileRefs[key].path === `"${targetName}.appex"` || fileRefs[key].path === `${targetName}.appex`) {
           appexFileKey = key;
           break;
       }
   }
   if (appexFileKey) {
       // Manually build the build file object to avoid "not a function" errors
       const buildFileUuid = pbxProject.generateUuid();
       const pbxBuildFile = pbxProject.hash.project.objects['PBXBuildFile'];
       pbxBuildFile[buildFileUuid] = {
           isa: 'PBXBuildFile',
           fileRef: appexFileKey,
           settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
       };
       // Add to the copy phase's files array
       copyPhase.files.push({
           value: buildFileUuid,
           comment: `${targetName}.appex in Embed App Extensions`
       });
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
   console.log(`✅ CreateNONUIExtension: Fixed manually.`);
};
