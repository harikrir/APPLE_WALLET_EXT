const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   // Dynamically find project
   const xcodeProjFolder = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjFolder) return;
   const projectName = path.basename(xcodeProjFolder, '.xcodeproj');
   const pbxprojPath = path.join(platformPath, xcodeProjFolder, 'project.pbxproj');
   const pbxProject = xcode.project(pbxprojPath);
   pbxProject.parseSync();
   const targetName = 'WNonUIExt';
   const bundleID = 'com.aub.mobilebanking.uat.bh.WNonUI';
   // 1. Add the Target
   const target = pbxProject.addTarget(targetName, 'app_extension', targetName);
   // 2. Add Source Files
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
   // 3. Setup Target Dependency (Main App depends on Extension)
   const mainTargetKey = pbxProject.findTargetKey(projectName);
   pbxProject.addTargetDependency(mainTargetKey, [target.uuid]);
   // 4. Create the Embed Phase (The standard way)
   // We use 'plugins' as the folder because MABS handles the .appex placement
   // based on the 'app_extension' type automatically in most versions.
   pbxProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetKey, 'app_extension');
   // 5. Update Build Settings
   const configurations = pbxProject.pbxXCBuildConfigurationSection();
   for (const key in configurations) {
       const config = configurations[key];
       if (config.buildSettings && (config.buildSettings.PRODUCT_NAME === `"${targetName}"` || config.buildSettings.PRODUCT_NAME === targetName)) {
           config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleID;
           config.buildSettings.CODE_SIGN_STYLE = 'Manual';
           config.buildSettings.DEVELOPMENT_TEAM = 'T57RH2WT3W';
           config.buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${bundleID}"`;
           config.buildSettings.INFOPLIST_FILE = `"${targetName}/WNonUI-Info.plist"`;
           config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/WNonUIExt.entitlements"`;
           config.buildSettings.SWIFT_VERSION = '5.0';
           config.buildSettings.SKIP_INSTALL = 'YES';
       }
   }
   fs.writeFileSync(pbxprojPath, pbxProject.writeSync());
   console.log(`✅ CreateNONUIExtension: Completed successfully.`);
};
