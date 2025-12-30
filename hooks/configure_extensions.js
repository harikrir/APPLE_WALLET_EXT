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
   const nativeTargetSection = proj.hash.project.objects['PBXNativeTarget'];
   const mainTargetKey = Object.keys(nativeTargetSection).find(key => {
       return nativeTargetSection[key].productType === '"com.apple.product-type.application"';
   });
   if (!mainTargetKey) {
       deferral.reject("Could not find Main Application Target");
       return deferral.promise;
   }
   const settings = {
       teamID: "T57RH2WT3W",
       appGroup: "group.com.aub.mobilebanking",
       extensions: [
           { name: "WNonUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WNonUI", profile: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },
           { name: "WUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WUI", profile: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }
       ]
   };
   // 1. Ensure the Embed Phase exists with code 13 (PlugIns)
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
           dstSubfolderSpec: 13, // This forces the "PlugIns" folder creation
           dstPath: '""',
           name: '"Embed App Extensions"',
           files: [],
           runOnlyForDeploymentPostprocessing: 0
       };
       nativeTargetSection[mainTargetKey].buildPhases.push({ value: embedPhaseKey, comment: 'Embed App Extensions' });
   }
   settings.extensions.forEach(ext => {
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // CRITICAL: Forces the main app to build this extension FIRST
       proj.addTargetDependency(mainTargetKey, [target.uuid]);
       // Add the .appex to the Embed Phase
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
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files.push({ value: buildFile, comment: appexName });
       // Build Settings Fix for Extension Types
       const configs = proj.pbxXCBuildConfigurationSection();
       Object.keys(configs).forEach(key => {
           const cfg = configs[key];
           if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = ext.bundleId;
               cfg.buildSettings.DEVELOPMENT_TEAM = settings.teamID;
               cfg.buildSettings.SKIP_INSTALL = 'YES';
               // THIS LINE ENSURES THE FOLDER IS TREATED AS AN EXTENSION (.appex)
               cfg.buildSettings['WRAPPER_EXTENSION'] = 'appex';
               cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] = `"${ext.name}/${ext.name}.entitlements"`;
               cfg.buildSettings['INFOPLIST_FILE'] = `"${ext.name}/${ext.name}-Info.plist"`;
           }
       });
   });
   fs.writeFileSync(pbxprojPath, proj.writeSync());
   console.log('✅ IPA folder structure forced with WRAPPER_EXTENSION=appex');
   deferral.resolve();
   return deferral.promise;
};
