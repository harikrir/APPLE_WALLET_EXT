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
   // 1. Manually create the Copy Files Build Phase for "PlugIns"
   const embedPhaseUuid = proj.generateUuid();
   const embedPhase = {
       isa: 'PBXCopyFilesBuildPhase',
       buildActionMask: 2147483647,
       dstSubfolderSpec: 13, // 13 is the magic code for "App Extensions" / PlugIns folder
       dstPath: '""',
       name: '"Embed App Extensions"',
       files: [],
       runOnlyForDeploymentPostprocessing: 0
   };
   proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid] = embedPhase;
   proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid + '_comment'] = 'Embed App Extensions';
   // Link the phase to the Main App Target
   const nativeTargets = proj.hash.project.objects['PBXNativeTarget'];
   if (nativeTargets[mainTargetKey]) {
       nativeTargets[mainTargetKey].buildPhases.push({
           value: embedPhaseUuid,
           comment: 'Embed App Extensions'
       });
   }
   extensions.forEach(ext => {
       console.log(`🚀 Forcing Full Integration for: ${ext.name}`);
       // 2. Create the Extension Target
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // 3. ADD TARGET DEPENDENCY (Crucial for MABS Archive)
       proj.addTargetDependency(mainTargetKey, [target.uuid]);
       // 4. Add Source Files
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
               s['SKIP_INSTALL'] = 'YES';
               s['INFOPLIST_FILE'] = `"${path.join(pluginSrcPath, ext.plist)}"`;
               s['CODE_SIGN_ENTITLEMENTS'] = `"${path.join(pluginSrcPath, ext.entitlements)}"`;
               s['SWIFT_VERSION'] = '5.0';
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
               s['MARKETING_VERSION'] = '1.0';
               s['GENERATE_INFOPLIST_FILE'] = 'YES';
           }
       }
       // 6. Inject .appex into the Build Phase
       const appexName = `${ext.name}.appex`;
       const fileRefUuid = proj.generateUuid();
       const buildFileUuid = proj.generateUuid();
       proj.hash.project.objects['PBXFileReference'][fileRefUuid] = {
           isa: 'PBXFileReference',
           explicitFileType: '"wrapper.app-extension"',
           includeInIndex: 0,
           path: `"${appexName}"`,
           sourceTree: 'BUILT_PRODUCTS_DIR'
       };
       proj.hash.project.objects['PBXBuildFile'][buildFileUuid] = {
           isa: 'PBXBuildFile',
           fileRef: fileRefUuid,
           settings: { ATTRIBUTES: ['CodeSignOnCopy'] }
       };
       embedPhase.files.push({
           value: buildFileUuid,
           comment: `${appexName} in Embed App Extensions`
       });
       // 7. Profile Handling (Rename to embedded.mobileprovision)
       const srcProfile = path.join(profilesSrcPath, ext.profile);
       const destFolder = path.join(platformPath, ext.name);
       if (fs.existsSync(srcProfile)) {
           if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
           const destProfile = path.join(destFolder, 'embedded.mobileprovision');
           fs.copyFileSync(srcProfile, destProfile);
           console.log(`✅ Profile Linked: ${ext.name}`);
       } else {
           console.error(`❌ PROFILE NOT FOUND: ${srcProfile}`);
       }
       proj.addFramework('PassKit.framework', { target: target.uuid });
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ COMPLETE: PlugIns, Dependencies, and Profiles configured.');
};
