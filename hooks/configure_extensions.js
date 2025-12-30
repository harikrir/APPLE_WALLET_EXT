const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function(context) {
   const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
   const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjPath) {
       console.error('❌ Wallet Hook: Could not find Xcode project.');
       return;
   }
   const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
   const proj = xcode.project(projectPath);
   proj.parseSync();
   const teamID = "T57RH2WT3W";
   const pluginId = context.opts.plugin.id;
   const pluginSrcPath = path.join('Plugins', pluginId);
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
   // Find the 'CustomTemplate' or 'Plugins' group key
   let mainGroupKey = proj.findPBXGroupKey({ name: 'Plugins' });
   if (!mainGroupKey) {
       mainGroupKey = proj.findPBXGroupKey({ name: 'CustomTemplate' });
   }
   extensions.forEach(ext => {
       console.log(`🚀 Configuring Target: ${ext.name}`);
       // 1. Create Target
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // 2. Create Group and add to main project tree
       const extGroup = proj.pbxCreateGroup(ext.name, ext.name);
       if (mainGroupKey) {
           proj.addToPbxGroup(extGroup, mainGroupKey);
       }
       // 3. Add Source Files (Passing extGroup fixes the TypeError)
       ext.files.forEach(fileName => {
           const filePath = path.join(pluginSrcPath, fileName);
           proj.addSourceFile(filePath, { target: target.uuid }, extGroup);
       });
       // 4. Configure Build Settings
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (config.buildSettings && config.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               const s = config.buildSettings;
               s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.id;
               s['DEVELOPMENT_TEAM'] = teamID;
               s['CODE_SIGN_STYLE'] = 'Manual';
               s['SWIFT_VERSION'] = '5.0';
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
               s['INFOPLIST_FILE'] = `"${path.join(pluginSrcPath, ext.plist)}"`;
               s['CODE_SIGN_ENTITLEMENTS'] = `"${path.join(pluginSrcPath, ext.entitlements)}"`;
               if (config.name === 'Release') {
                   s['CODE_SIGN_IDENTITY'] = '"iPhone Distribution"';
               } else {
                   s['CODE_SIGN_IDENTITY'] = '"iPhone Developer"';
               }
           }
       }
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Extension targets and groups configured successfully.');
};
