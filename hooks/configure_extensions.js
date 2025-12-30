const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function(context) {
   const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
   const xcodeProjPath = fs.readdirSync(platformPath).find(f => f.endsWith('.xcodeproj'));
   if (!xcodeProjPath) return;
   const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
   const proj = xcode.project(projectPath);
   proj.parseSync();
   const teamID = "T57RH2WT3W";
   const pluginId = context.opts.plugin.id;
   const pluginSrcPath = path.join('Plugins', pluginId);
   const extensions = [
       {
           name: 'WNonUIExt', id: 'com.aub.mobilebanking.uat.bh.WNonUI',
           files: ['WNonUIExtHandler.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WNonUIExt/Info.plist',
           entitlements: 'WNonUIExt/WNonUIExt.entitlements'
       },
       {
           name: 'WUIExt', id: 'com.aub.mobilebanking.uat.bh.WUI',
           files: ['WUIExtHandler.swift', 'WUIExtView.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WUIExt/Info.plist',
           entitlements: 'WUIExt/WUIExt.entitlements'
       }
   ];
   extensions.forEach(ext => {
       // Create the target (folder name is ext.name)
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // Map files to target
       ext.files.forEach(f => {
           const fPath = path.join(pluginSrcPath, f);
           proj.addSourceFile(fPath, { target: target.uuid }, target.uuid);
       });
       // Set properties (Finding Plist/Entitlements inside the Plugins folder)
       proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
       proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
       proj.addBuildProperty('INFOPLIST_FILE', `"${path.join(pluginSrcPath, ext.plist)}"`, null, ext.name);
       proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `"${path.join(pluginSrcPath, ext.entitlements)}"`, null, ext.name);
       proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
       proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Apple Wallet Targets configured successfully.');
};
