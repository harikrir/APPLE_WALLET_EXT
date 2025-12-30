const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
module.exports = function(context) {
   const platformPath = path.join(context.opts.projectRoot, 'platforms', 'ios');
   const xcodeProjFiles = fs.readdirSync(platformPath).filter(f => f.endsWith('.xcodeproj'));
   if (xcodeProjFiles.length === 0) return;
   const xcodeProjPath = xcodeProjFiles[0];
   const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
   const proj = xcode.project(projectPath);
   proj.parseSync();
   const teamID = "T57RH2WT3W";
   const pluginId = context.opts.plugin.id;
   const pluginSrcPath = path.join('Plugins', pluginId);
   const projectName = xcodeProjPath.split('.')[0];
   const mainTargetKey = proj.findTargetKey(projectName);
   const extensions = [
       { name: 'WNonUIExt', id: 'com.aub.mobilebanking.uat.bh.WNonUI', files: ['WNonUIExtHandler.swift', 'AUBLog.swift', 'SharedModels.swift'], plist: 'WNonUI-Info.plist', entitlements: 'WNonUIExt.entitlements' },
       { name: 'WUIExt', id: 'com.aub.mobilebanking.uat.bh.WUI', files: ['WUIExtHandler.swift', 'WUIExtView.swift', 'AUBLog.swift', 'SharedModels.swift'], plist: 'WUI-Info.plist', entitlements: 'WUIExt.entitlements' }
   ];
   // 1. Create the Embed Phase manually
   const embedPhaseName = 'Embed App Extensions';
   const embedPhase = proj.addBuildPhase([], 'PBXCopyFilesBuildPhase', embedPhaseName, mainTargetKey, 'app_extension');
   // 2. CRITICAL: Force the folder destination to 'PlugIns' (Code 13)
   embedPhase.spec.dstSubfolderSpec = 13;
   embedPhase.spec.dstPath = "";
   extensions.forEach(ext => {
       console.log(`🚀 Processing Extension: ${ext.name}`);
       // 3. Create Target
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // 4. Source Files
       ext.files.forEach(fileName => {
           const filePath = path.join(pluginSrcPath, fileName);
           proj.addSourceFile(filePath, { target: target.uuid }, proj.findPBXGroupKey({ name: 'Plugins' }));
       });
       // 5. Build Settings
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (config.buildSettings && config.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               const s = config.buildSettings;
               s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.id;
               s['DEVELOPMENT_TEAM'] = teamID;
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
               s['SKIP_INSTALL'] = 'YES';
               s['INFOPLIST_FILE'] = `"${path.join(pluginSrcPath, ext.plist)}"`;
               s['CODE_SIGN_ENTITLEMENTS'] = `"${path.join(pluginSrcPath, ext.entitlements)}"`;
               s['SWIFT_VERSION'] = '5.0';
           }
       }
       // 6. Add .appex to the Build Phase manually
       const appexFile = proj.addFile(`${ext.name}.appex`, 'Plugins', { target: target.uuid });
       appexFile.target = target.uuid;
       // This is the manual way to do "addToPbxCopyFilesBuildPhase"
       const pbxFile = {
           fileRef: appexFile.fileRef,
           uuid: proj.generateUuid(),
           settings: { ATTRIBUTES: ['CodeSignOnCopy'] },
           comment: `${ext.name}.appex in Embed App Extensions`
       };
       proj.addToPbxBuildPhase(pbxFile, embedPhase.uuid);
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   // 7. FINAL HASH FIX: Some library versions ignore the dstSubfolderSpec above
   const copyPhases = proj.hash.project.objects['PBXCopyFilesBuildPhase'];
   for (const key in copyPhases) {
       if (copyPhases[key].name === `"${embedPhaseName}"`) {
           copyPhases[key].dstSubfolderSpec = 13;
       }
   }
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Success: App Extensions configured with destination 13 (PlugIns).');
};
