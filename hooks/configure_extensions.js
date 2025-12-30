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
   // Path to where your .mobileprovision files are stored in the plugin
   const profilesSrcPath = path.join(context.opts.projectRoot, 'plugins', pluginId, 'src', 'ios', 'profiles');
   const projectName = xcodeProjPath.split('.')[0];
   const mainTargetKey = proj.findTargetKey(projectName);
   const extensions = [
       {
           name: 'WNonUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WNonUI',
           files: ['WNonUIExtHandler.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WNonUI-Info.plist',
           entitlements: 'WNonUIExt.entitlements',
           profile: 'com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision'
       },
       {
           name: 'WUIExt',
           id: 'com.aub.mobilebanking.uat.bh.WUI',
           files: ['WUIExtHandler.swift', 'WUIExtView.swift', 'AUBLog.swift', 'SharedModels.swift'],
           plist: 'WUI-Info.plist',
           entitlements: 'WUIExt.entitlements',
           profile: 'com.aub.mobilebanking.uat.bh.WUI.mobileprovision'
       }
   ];
   // 1. Create the Embed Phase - we don't use the return value to avoid the 'undefined' error
   const embedPhaseName = 'Embed App Extensions';
   proj.addBuildPhase([], 'PBXCopyFilesBuildPhase', embedPhaseName, mainTargetKey, 'app_extension');
   // 2. Locate the phase in the internal hash and set the destination to 13 (PlugIns)
   const copyPhases = proj.hash.project.objects['PBXCopyFilesBuildPhase'];
   let embedPhaseUuid;
   for (const key in copyPhases) {
       if (copyPhases[key].name === `"${embedPhaseName}"`) {
           copyPhases[key].dstSubfolderSpec = 13; // 13 = App Extensions (PlugIns folder)
           copyPhases[key].dstPath = "";
           embedPhaseUuid = key;
       }
   }
   extensions.forEach(ext => {
       console.log(`🚀 Processing Extension: ${ext.name}`);
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // 3. Source Files
       ext.files.forEach(fileName => {
           const filePath = path.join(pluginSrcPath, fileName);
           proj.addSourceFile(filePath, { target: target.uuid }, proj.findPBXGroupKey({ name: 'Plugins' }));
       });
       // 4. Build Settings
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (config.buildSettings && config.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               const s = config.buildSettings;
               s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.id;
               s['DEVELOPMENT_TEAM'] = teamID;
               s['SKIP_INSTALL'] = 'YES';
               s['INFOPLIST_FILE'] = `"${path.join(pluginSrcPath, ext.plist)}"`;
               s['CODE_SIGN_ENTITLEMENTS'] = `"${path.join(pluginSrcPath, ext.entitlements)}"`;
               s['SWIFT_VERSION'] = '5.0';
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
           }
       }
       // 5. Add .appex to the Embed Phase manually
       const appexFile = proj.addFile(`${ext.name}.appex`, 'Plugins', { target: target.uuid });
       appexFile.target = target.uuid;
       const pbxFile = {
           fileRef: appexFile.fileRef,
           uuid: proj.generateUuid(),
           settings: { ATTRIBUTES: ['CodeSignOnCopy'] },
           comment: `${ext.name}.appex in Embed App Extensions`
       };
       proj.addToPbxBuildPhase(pbxFile, embedPhaseUuid);
       // 6. Copy & Rename Provisioning Profile to 'embedded.mobileprovision'
       const srcProfile = path.join(profilesSrcPath, ext.profile);
       const destFolder = path.join(platformPath, ext.name); // Destination: platforms/ios/[ExtName]/
       if (fs.existsSync(srcProfile)) {
           if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
           const destProfile = path.join(destFolder, 'embedded.mobileprovision');
           fs.copyFileSync(srcProfile, destProfile);
           console.log(`✅ Provisioning profile embedded for ${ext.name}`);
       } else {
           console.error(`❌ Profile NOT FOUND at: ${srcProfile}`);
       }
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Success: PlugIns configured with embedded.mobileprovision');
};
