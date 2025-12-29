const fs = require('fs');
const path = require('path');
module.exports = function(context) {
   const xcode = require('xcode');
   const projectRoot = context.opts.projectRoot;
   // 1. Setup Paths
   const platformIosPath = path.join(projectRoot, 'platforms', 'ios');
   const pluginId = context.opts.plugin.id;
   const pluginProfilesPath = path.join(projectRoot, 'plugins', pluginId, 'src/ios/profiles');
   // 2. Locate Project File
   const files = fs.readdirSync(platformIosPath);
   const xcodeProjName = files.find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjName) {
       console.error("KFH_HOOK: [ERROR] Could not find .xcodeproj folder.");
       return;
   }
   const pbxPath = path.join(platformIosPath, xcodeProjName, 'project.pbxproj');
   const proj = xcode.project(pbxPath);
   proj.parseSync();
   const extensionTargets = [
       {
           name: "WNonUI",
           id: "com.aub.mobilebanking.uat.bh.WNonUI",
           file: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision"
       },
       {
           name: "WUI",
           id: "com.aub.mobilebanking.uat.bh.WUI",
           file: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision"
       }
   ];
   extensionTargets.forEach(target => {
       console.log(`KFH_HOOK: Configuring signing for ${target.name}...`);
       // --- STEP A: Create the PlugIns structure ---
       // This ensures the .appex and profile end up in the right place
       const targetDir = path.join(platformIosPath, target.name);
       if (!fs.existsSync(targetDir)) {
           fs.mkdirSync(targetDir, { recursive: true });
           console.log(`KFH_HOOK: Created target folder at ${targetDir}`);
       }
       // --- STEP B: Copy Profile and Rename to 'embedded' ---
       const sourceFile = path.join(pluginProfilesPath, target.file);
       const targetFile = path.join(targetDir, 'embedded.mobileprovision');
       if (fs.existsSync(sourceFile)) {
           fs.copyFileSync(sourceFile, targetFile);
           console.log(`KFH_HOOK: Embedded profile successfully: ${target.file}`);
       } else {
           console.error(`KFH_HOOK: [CRITICAL] Source profile missing: ${sourceFile}`);
       }
       // --- STEP C: Link to Xcode Build Settings ---
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (typeof config === 'object' && config.buildSettings &&
               config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${target.id}"`) {
               // Set Manual Signing
               config.buildSettings['CODE_SIGN_STYLE'] = 'Manual';
               config.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] = `"${target.id}"`;
               // Your specific Application Identifier Prefix
               config.buildSettings['DEVELOPMENT_TEAM'] = '"T57RH2WT3W"';
               // Critical: Set the product name so the linker creates WNonUI.appex
               config.buildSettings['PRODUCT_NAME'] = `"${target.name}"`;
               console.log(`KFH_HOOK: Linked Build Settings for ${target.id}`);
           }
       }
   });
   // 3. Save Project
   fs.writeFileSync(pbxPath, proj.writeSync());
   console.log("KFH_HOOK: All extension targets signed and prepared.");
};
