const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function(context) {
   // 1. Identify the iOS Platform and Project Path
   const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
   // MABS can rename the project, so we dynamically find the .xcodeproj file
   const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjPath) {
       console.error('❌ Wallet Hook: Could not find Xcode project.');
       return;
   }
   const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
   const proj = xcode.project(projectPath);
   proj.parseSync();
   // 2. Constants
   const teamID = "T57RH2WT3W";
   const pluginId = context.opts.plugin.id;
   const pluginSrcPath = path.join('Plugins', pluginId);
   // 3. Extension Definitions
   // Note: The plist names here match the unique names we gave them in plugin.xml
   const extensions = [
       {
           name: 'WNonUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WNonUI',
           files: ['WNonUIExtHandler.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WNonUI-Info.plist',
           entitlements: 'WNonUIExt.entitlements'
       },
       {
           name: 'WUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WUI',
           files: ['WUIExtHandler.swift', 'WUIExtView.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WUI-Info.plist',
           entitlements: 'WUIExt.entitlements'
       }
   ];
   extensions.forEach(ext => {
       console.log(`🚀 Configuring Target: ${ext.name}`);
       // A. Create the Target
       // We use the extension name as the folder name.
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // B. Add Source Files to the specific Target
       ext.files.forEach(fileName => {
           const filePath = path.join(pluginSrcPath, fileName);
           proj.addSourceFile(filePath, { target: target.uuid }, target.uuid);
       });
       // C. Manual Signing & Build Settings configuration
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           // Only modify configurations belonging to our new extension target
           if (config.buildSettings && config.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               const s = config.buildSettings;
               s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.id;
               s['DEVELOPMENT_TEAM'] = teamID;
               s['CODE_SIGN_STYLE'] = 'Manual';
               s['SWIFT_VERSION'] = '5.0';
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
               s['SKIP_INSTALL'] = 'YES';
               // Point to our side-loaded Info.plist and Entitlements
               s['INFOPLIST_FILE'] = `"${path.join(pluginSrcPath, ext.plist)}"`;
               s['CODE_SIGN_ENTITLEMENTS'] = `"${path.join(pluginSrcPath, ext.entitlements)}"`;
               // Handle Signing Identity for Debug vs Release
               if (config.name === 'Release') {
                   s['CODE_SIGN_IDENTITY'] = '"iPhone Distribution"';
               } else {
                   s['CODE_SIGN_IDENTITY'] = '"iPhone Developer"';
               }
           }
       }
       // D. Link required frameworks to the target
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   // 4. Save the modified Project file
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Apple Wallet Extensions successfully injected into Xcode project.');
};
