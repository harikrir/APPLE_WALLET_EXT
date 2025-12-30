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
   // MABS locations for plugin source files
   const pluginSrcPath = path.join('Plugins', pluginId);
   const extensions = [
       {
           name: 'WNonUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WNonUI',
           dir: 'WNonUIExt',
           files: [
               path.join(pluginSrcPath, 'WNonUIExtHandler.swift'),
               path.join(pluginSrcPath, 'AUBLog.swift'),
               path.join(pluginSrcPath, 'SharedModels.swift')
           ]
       },
       {
           name: 'WUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WUI',
           dir: 'WUIExt',
           files: [
               path.join(pluginSrcPath, 'WUIExtHandler.swift'),
               path.join(pluginSrcPath, 'WUIExtView.swift'),
               path.join(pluginSrcPath, 'AUBLog.swift'),
               path.join(pluginSrcPath, 'SharedModels.swift')
           ]
       }
   ];
   extensions.forEach(ext => {
       const target = proj.addTarget(ext.name, 'app_extension', ext.dir);
       ext.files.forEach(filePath => {
           proj.addSourceFile(filePath, { target: target.uuid }, target.uuid);
       });
       proj.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', ext.id, null, ext.name);
       proj.addBuildProperty('DEVELOPMENT_TEAM', teamID, null, ext.name);
       // These match the target-dir in plugin.xml
       proj.addBuildProperty('INFOPLIST_FILE', `"${ext.name}/Info.plist"`, null, ext.name);
       proj.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `"${ext.name}/${ext.name}.entitlements"`, null, ext.name);
       proj.addBuildProperty('SWIFT_VERSION', '5.0', null, ext.name);
       proj.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '14.0', null, ext.name);
       proj.addFramework('PassKit.framework', { target: target.uuid });
       proj.addBuildProperty('LD_RUNPATH_SEARCH_PATHS', '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"', null, ext.name);
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Apple Wallet Extension Targets successfully linked.');
};
