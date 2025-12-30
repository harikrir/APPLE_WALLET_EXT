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
   // 1. Create the Embed Phase manually
   const embedPhaseName = 'Embed App Extensions';
   proj.addBuildPhase([], 'PBXCopyFilesBuildPhase', embedPhaseName, mainTargetKey, 'app_extension');
   // 2. Set the destination to PlugIns (Code 13)
   const copyPhases = proj.hash.project.objects['PBXCopyFilesBuildPhase'];
   let embedPhaseUuid;
   for (const key in copyPhases) {
       if (copyPhases[key].name === `"${embedPhaseName}"`) {
           copyPhases[key].dstSubfolderSpec = 13;
           copyPhases[key].dstPath = "";
           embedPhaseUuid = key;
       }
   }
   extensions.forEach(ext => {
       console.log(`🚀 Processing Extension: ${ext.name}`);
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // 3. Add Source Files
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
       // 5. MANUALLY add .appex file reference to avoid 'null' error
       const appexName = `${ext.name}.appex`;
       const fileRefUuid = proj.generateUuid();
       const fileProxyUuid = proj.generateUuid();
       // Add file to PBXFileReference section
       proj.hash.project.objects['PBXFileReference'][fileRefUuid] = {
           isa: 'PBXFileReference',
           explicitFileType: '"wrapper.app-extension"',
           includeInIndex: 0,
           path: `"${appexName}"`,
           sourceTree: 'BUILT_PRODUCTS_DIR'
       };
       // Add file to the Embed Build Phase
       const buildFileUuid = proj.generateUuid();
       proj.hash.project.objects['PBXBuildFile'][buildFileUuid] = {
           isa: 'PBXBuildFile',
           fileRef: fileRefUuid,
           settings: { ATTRIBUTES: ['CodeSignOnCopy'] }
       };
       // Push to the phase's files array
       copyPhases[embedPhaseUuid].files.push({
           value: buildFileUuid,
           comment: `${appexName} in ${embedPhaseName}`
       });
       // 6. Profile Copying Logic
       const srcProfile = path.join(profilesSrcPath, ext.profile);
       const destFolder = path.join(platformPath, ext.name);
       if (fs.existsSync(srcProfile)) {
           if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
           const destProfile = path.join(destFolder, 'embedded.mobileprovision');
           fs.copyFileSync(srcProfile, destProfile);
           console.log(`✅ Embedded profile: ${ext.name}`);
       }
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Extension targets and PlugIns folder configured successfully.');
};
