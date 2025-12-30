const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const Q = require('q');
module.exports = function (context) {
   const deferral = Q.defer();
   const projectRoot = context.opts.projectRoot;
   const pluginID = context.opts.plugin.id;
   const iosPath = path.join(projectRoot, 'platforms', 'ios');
   const xcodeProj = fs.readdirSync(iosPath).find(f => f.endsWith('.xcodeproj'));
   const pbxprojPath = path.join(iosPath, xcodeProj, 'project.pbxproj');
   const proj = xcode.project(pbxprojPath);
   proj.parseSync();
   // 1. FIND MAIN TARGET
   const nativeTargetSection = proj.hash.project.objects['PBXNativeTarget'];
   const mainTargetKey = Object.keys(nativeTargetSection).find(key => {
       return nativeTargetSection[key].productType === '"com.apple.product-type.application"';
   });
   if (!mainTargetKey) {
       deferral.reject("❌ Could not find Main Application Target");
       return deferral.promise;
   }
   const settings = {
       teamID: "T57RH2WT3W",
       appGroup: "group.com.aub.mobilebanking.uat.bh",
       extensions: [
           { name: "WNonUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WNonUI", profile: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },
           { name: "WUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WUI", profile: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }
       ]
   };
   // 2. SETUP EMBED PHASE WITH CLEANING (Prevents "Duplicate Tasks" Error)
   if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) {
       proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
   }
   let embedPhaseKey = Object.keys(proj.hash.project.objects['PBXCopyFilesBuildPhase']).find(key => {
       return proj.hash.project.objects['PBXCopyFilesBuildPhase'][key].name === '"Embed App Extensions"';
   });
   if (!embedPhaseKey) {
       embedPhaseKey = proj.generateUuid();
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey] = {
           isa: 'PBXCopyFilesBuildPhase',
           buildActionMask: 2147483647,
           dstSubfolderSpec: 13,
           dstPath: '""',
           name: '"Embed App Extensions"',
           files: [],
           runOnlyForDeploymentPostprocessing: 0
       };
       nativeTargetSection[mainTargetKey].buildPhases.push({ value: embedPhaseKey, comment: 'Embed App Extensions' });
   } else {
       // CLEANUP: Remove any existing entries for our extensions to avoid duplicates
       const phase = proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey];
       phase.files = phase.files.filter(fileObj => {
           return !fileObj.comment.includes('WUIExt') && !fileObj.comment.includes('WNonUIExt');
       });
   }
   // 3. ADD EXTENSION TARGETS
   settings.extensions.forEach(ext => {
       // Add Target (or get existing)
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // Ensure Target Dependency is unique
       const deps = nativeTargetSection[mainTargetKey].dependencies || [];
       const depExists = deps.some(d => proj.hash.project.objects['PBXTargetDependency'][d.value] &&
                                        proj.hash.project.objects['PBXTargetDependency'][d.value].target === target.uuid);
       if(!depExists) {
           proj.addTargetDependency(mainTargetKey, [target.uuid]);
       }
       const extPath = path.join(iosPath, ext.name);
       // Recursive adding for Models/AUBLog.swift etc.
       function addFilesRecursively(dir) {
           fs.readdirSync(dir).forEach(file => {
               const fullPath = path.join(dir, file);
               const relPath = path.relative(iosPath, fullPath);
               if (fs.statSync(fullPath).isDirectory()) {
                   addFilesRecursively(fullPath);
               } else {
                   if (file.endsWith('.swift')) proj.addSourceFile(relPath, { target: target.uuid });
                   else if (file.endsWith('.plist') || file.endsWith('.entitlements')) proj.addResourceFile(relPath, { target: target.uuid });
               }
           });
       }
       if (fs.existsSync(extPath)) addFilesRecursively(extPath);
       // Add .appex to Embed Phase
       const appexName = `${ext.name}.appex`;
       const fileRef = proj.generateUuid();
       const buildFile = proj.generateUuid();
       proj.hash.project.objects['PBXFileReference'][fileRef] = {
           isa: 'PBXFileReference',
           explicitFileType: '"wrapper.app-extension"',
           path: `"${appexName}"`,
           sourceTree: 'BUILT_PRODUCTS_DIR'
       };
       proj.hash.project.objects['PBXBuildFile'][buildFile] = {
           isa: 'PBXBuildFile',
           fileRef: fileRef,
           settings: { ATTRIBUTES: ['CodeSignOnCopy'] }
       };
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files.push({
           value: buildFile,
           comment: appexName
       });
       // Update Build Settings
       const configs = proj.pbxXCBuildConfigurationSection();
       Object.keys(configs).forEach(key => {
           const cfg = configs[key];
           if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = ext.bundleId;
               cfg.buildSettings.DEVELOPMENT_TEAM = settings.teamID;
               cfg.buildSettings.SKIP_INSTALL = 'YES';
               cfg.buildSettings['WRAPPER_EXTENSION'] = 'appex';
               cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] = `"${ext.name}/${ext.name}.entitlements"`;
               cfg.buildSettings['INFOPLIST_FILE'] = `"${ext.name}/${ext.name}-Info.plist"`;
               cfg.buildSettings['SWIFT_VERSION'] = '5.0';
           }
       });
       // Provisioning Profile copy
       const profSrc = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles', ext.profile);
       if (fs.existsSync(profSrc)) {
           fs.copyFileSync(profSrc, path.join(extPath, 'embedded.mobileprovision'));
       }
   });
   fs.writeFileSync(pbxprojPath, proj.writeSync());
   console.log('🎉 Project configured successfully without duplicates.');
   deferral.resolve();
   return deferral.promise;
};
