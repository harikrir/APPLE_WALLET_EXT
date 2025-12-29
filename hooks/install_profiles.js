const fs = require('fs');
const path = require('path');
module.exports = function(context) {
   const xcode = context.requireCordovaModule('xcode');
   const projectRoot = context.opts.projectRoot;
   // 1. Paths
   const platformIosPath = path.join(projectRoot, 'platforms', 'ios');
   const pluginProfilesPath = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src/ios/profiles');
   // Find the pbxproj file
   const projectFiles = fs.readdirSync(platformIosPath);
   const xcodeProjName = projectFiles.find(f => f.endsWith('.xcodeproj'));
   const pbxPath = path.join(platformIosPath, xcodeProjName, 'project.pbxproj');
   const proj = xcode.project(pbxPath);
   proj.parseSync();
   const extensionTargets = [
       { name: "WNonUI", id: "com.aub.mobilebanking.uat.bh.WNonUI", file: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },
       { name: "WUI", id: "com.aub.mobilebanking.uat.bh.WUI", file: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }
   ];
   extensionTargets.forEach(target => {
       // --- STEP A: Copy the Provisioning Profile ---
       const sourceFile = path.join(pluginProfilesPath, target.file);
       // MABS builds extensions into the 'PlugIns' folder inside the app bundle
       // We target the build directory for the extension
       const targetDir = path.join(platformIosPath, target.name);
       const targetFile = path.join(targetDir, 'embedded.mobileprovision');
       if (fs.existsSync(sourceFile)) {
           if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
           fs.copyFileSync(sourceFile, targetFile);
           console.log(`KFH_HOOK: Copied ${target.file} to ${target.name} target.`);
       } else {
           console.error(`KFH_HOOK: Source profile NOT FOUND at ${sourceFile}`);
       }
       // --- STEP B: Update Xcode Build Settings ---
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (typeof config === 'object' && config.buildSettings &&
               config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${target.id}"`) {
               config.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
               config.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] = `"${target.id}"`;
               config.buildSettings['DEVELOPMENT_TEAM'] = '"T57RH2WT3W"';
               console.log(`KFH_HOOK: Linked Build Settings for ${target.id}`);
           }
       }
   });
   fs.writeFileSync(pbxPath, proj.writeSync());
   console.log("KFH_HOOK: Extension profiles installed and project updated.");
};
