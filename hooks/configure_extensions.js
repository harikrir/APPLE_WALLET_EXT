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
   // === ROBUST TARGET LOOKUP ===
   const nativeTargets = proj.hash.project.objects['PBXNativeTarget'];
   // Instead of findTargetKey, we look for the actual "Application" product type
   const mainTargetKey = Object.keys(nativeTargets).find(key => {
       return nativeTargets[key].productType === '"com.apple.product-type.application"';
   });
   if (!mainTargetKey) {
       console.error("❌ Could not find Main Application Target");
       deferral.reject("Could not find Main Application Target");
       return deferral.promise;
   }
   console.log(`✅ Found Main Target: ${nativeTargets[mainTargetKey].name}`);
   const settings = {
       teamID: "T57RH2WT3W",
       appGroup: "group.com.aub.mobilebanking",
       extensions: [
           { name: "WNonUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WNonUI", profile: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },
           { name: "WUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WUI", profile: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }
       ]
   };
   // === 1. MANUALLY ENSURE SECTION EXISTENCE ===
   if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) {
       proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
   }
   // === 2. CREATE OR FIND EMBED PHASE ===
   let embedPhaseKey = Object.keys(proj.hash.project.objects['PBXCopyFilesBuildPhase']).find(key => {
       return proj.hash.project.objects['PBXCopyFilesBuildPhase'][key].name === '"Embed App Extensions"';
   });
   if (!embedPhaseKey) {
       embedPhaseKey = proj.generateUuid();
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey] = {
           isa: 'PBXCopyFilesBuildPhase',
           buildActionMask: 2147483647,
           dstSubfolderSpec: 13, // 13 = PlugIns
           dstPath: '""',
           name: '"Embed App Extensions"',
           files: [],
           runOnlyForDeploymentPostprocessing: 0
       };
       // Safely push to buildPhases
       nativeTargets[mainTargetKey].buildPhases.push({
           value: embedPhaseKey,
           comment: 'Embed App Extensions'
       });
   }
   // === 3. PROCESS EXTENSIONS ===
   settings.extensions.forEach(ext => {
       console.log(`🚀 Adding Target: ${ext.name}`);
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // Dependency is critical for MABS
       proj.addTargetDependency(mainTargetKey, [target.uuid]);
       // Add Files Recursively (Simplified)
       const extPath = path.join(iosPath, ext.name);
       if (fs.existsSync(extPath)) {
           fs.readdirSync(extPath).forEach(f => {
               const full = path.join(extPath, f);
               const rel = path.relative(iosPath, full);
               if (f.endsWith('.swift')) proj.addSourceFile(rel, { target: target.uuid });
               else if (f.endsWith('.plist') || f.endsWith('.entitlements')) proj.addResourceFile(rel, { target: target.uuid });
           });
       }
       // Embed .appex manually to be safe
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
               cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${ext.name}/${ext.name}.entitlements"`;
               cfg.buildSettings.INFOPLIST_FILE = `"${ext.name}/${ext.name}-Info.plist"`;
               cfg.buildSettings.SKIP_INSTALL = 'YES';
           }
       });
   });
   fs.writeFileSync(pbxprojPath, proj.writeSync());
   console.log('🎉 Success: All targets wired correctly.');
   deferral.resolve();
   return deferral.promise;
};
