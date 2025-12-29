const fs = require('fs');
const path = require('path');
module.exports = function(context) {
   const xcode = require('xcode');
   const projectRoot = context.opts.projectRoot;
   const platformIosPath = path.join(projectRoot, 'platforms', 'ios');
   const pluginId = context.opts.plugin.id;
   const pluginProfilesPath = path.join(projectRoot, 'plugins', pluginId, 'src/ios/profiles');
   const files = fs.readdirSync(platformIosPath);
   const xcodeProjName = files.find(f => f.endsWith('.xcodeproj'));
   const pbxPath = path.join(platformIosPath, xcodeProjName, 'project.pbxproj');
   const proj = xcode.project(pbxPath);
   proj.parseSync();
   const extensionTargets = [
       { name: "WNonUI", id: "com.aub.mobilebanking.uat.bh.WNonUI", file: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },
       { name: "WUI", id: "com.aub.mobilebanking.uat.bh.WUI", file: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }
   ];
   // THE CRITICAL FIX: Ensure the PlugIns directory exists
   const pluginsPath = path.join(platformIosPath, 'PlugIns');
   if (!fs.existsSync(pluginsPath)) {
       fs.mkdirSync(pluginsPath, { recursive: true });
   }
   extensionTargets.forEach(target => {
       // Create the individual .appex folder inside PlugIns
       const appexFolder = path.join(pluginsPath, `${target.name}.appex`);
       if (!fs.existsSync(appexFolder)) {
           fs.mkdirSync(appexFolder, { recursive: true });
       }
       // Copy profile and rename to 'embedded' inside the .appex folder
       const sourceFile = path.join(pluginProfilesPath, target.file);
       const targetFile = path.join(appexFolder, 'embedded.mobileprovision');
       if (fs.existsSync(sourceFile)) {
           fs.copyFileSync(sourceFile, targetFile);
           console.log(`KFH_HOOK: Successfully embedded profile in ${target.name}.appex`);
       }
       // Update Xcode Build Settings
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (typeof config === 'object' && config.buildSettings &&
               config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${target.id}"`) {
               config.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
               config.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] = `"${target.id}"`;
               config.buildSettings['DEVELOPMENT_TEAM'] = '"T57RH2WT3W"';
               config.buildSettings['PRODUCT_NAME'] = `"${target.name}"`;
           }
       }
   });
   fs.writeFileSync(pbxPath, proj.writeSync());
   console.log("KFH_HOOK: Bundle structure and signing updated.");
};
