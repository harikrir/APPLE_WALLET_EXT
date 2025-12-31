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
   const targetName = 'WUIExt';
   const bundleID = 'com.aub.mobilebanking.uat.bh.WUI';
   const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
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
   // EMBED LOGIC
   const mainTargetKey = pbxProject.findTargetKey(path.basename(xcodeProjFolder, '.xcodeproj'));
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   const copyPhase = pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   for (const key in pbxProject.hash.project.objects['PBXFileReference']) {
       const fileRef = pbxProject.hash.project.objects['PBXFileReference'][key];
       if (fileRef.path === `"${targetName}.appex"` || fileRef.path === `${targetName}.appex`) {
           const appexFile = {
               fileRef: key,
               basename: `${targetName}.appex`,
               settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
           };
           pbxProject.addToPbxCopyFilesBuildPhase(appexFile, copyPhase.uuid);
           break;
       }
   }
   // BUILD SETTINGS
   const configurations = pbxProject.pbxXCBuildConfigurationSection();
   for (const key in configurations) {
       const config = configurations[key];
       if (config.buildSettings && (config.buildSettings.PRODUCT_NAME === `"${targetName}"` || config.buildSettings.PRODUCT_NAME === targetName)) {
           config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
           config.buildSettings.DEVELOPMENT_TEAM = 'T57RH2WT3W';
           config.buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${bundleID}"`;
           config.buildSettings.INFOPLIST_FILE = `"WUIExt/WUI-Info.plist"`;
           config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"WUIExt/WUIExt.entitlements"`;
           config.buildSettings.SWIFT_VERSION = '5.0';
           config.buildSettings.SKIP_INSTALL = 'YES';
           config.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
       }
   }
   fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
   console.log(`✅ CreateUIExtension: Target Embedded.`);
};
