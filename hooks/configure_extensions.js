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
   const settings = {
       teamID: "T57RH2WT3W",
       extensions: [
           { name: "WNonUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WNonUI", uuid: "2458aa6f-941b-43c4-b787-b1d304a7b73c" },
           { name: "WUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WUI", uuid: "ef234420-f58f-41e4-871a-86527fe5acfd" }
       ]
   };
   // 1. FORCE THE EMBED PHASE WITH SPEC 13 (PlugIns)
   if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
   let embedPhaseKey = Object.keys(proj.hash.project.objects['PBXCopyFilesBuildPhase']).find(k => {
       return proj.hash.project.objects['PBXCopyFilesBuildPhase'][k].name === '"Embed App Extensions"';
   });
   if (!embedPhaseKey) {
       embedPhaseKey = proj.generateUuid();
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey] = {
           isa: 'PBXCopyFilesBuildPhase',
           buildActionMask: 2147483647,
           dstSubfolderSpec: 13, // CRITICAL: This creates the PlugIns folder
           dstPath: '""',
           name: '"Embed App Extensions"',
           files: [],
           runOnlyForDeploymentPostprocessing: 0
       };
       nativeTargetSection[mainTargetKey].buildPhases.push({ value: embedPhaseKey, comment: 'Embed App Extensions' });
   }
   proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files = [];
   // 2. CONFIGURE TARGETS AND PHYSICAL PROFILES
   settings.extensions.forEach(ext => {
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       // Ensure Main App depends on this extension
       proj.addTargetDependency(mainTargetKey, [target.uuid]);
       const extPath = path.join(iosPath, ext.name);
       const profSource = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles', `${ext.bundleId}.mobileprovision`);
       const profDest = path.join(extPath, 'embedded.mobileprovision');
       if (fs.existsSync(profSource)) {
           if (!fs.existsSync(extPath)) fs.mkdirSync(extPath, { recursive: true });
           fs.copyFileSync(profSource, profDest);
       }
       // Add Extension files
       function addFilesRecursively(dir) {
           fs.readdirSync(dir).forEach(file => {
               const fullPath = path.join(dir, file);
               const relPath = path.relative(iosPath, fullPath);
               if (fs.statSync(fullPath).isDirectory()) addFilesRecursively(fullPath);
               else {
                   if (file.endsWith('.swift')) proj.addSourceFile(relPath, { target: target.uuid });
                   else if (file.endsWith('.plist') || file.endsWith('.entitlements')) proj.addResourceFile(relPath, { target: target.uuid });
               }
           });
       }
       if (fs.existsSync(extPath)) addFilesRecursively(extPath);
       // Add .appex to the Force-Created Embed Phase
       const appexName = `${ext.name}.appex`;
       const fileRef = proj.generateUuid(), buildFile = proj.generateUuid();
       proj.hash.project.objects['PBXFileReference'][fileRef] = { isa: 'PBXFileReference', explicitFileType: '"wrapper.app-extension"', path: `"${appexName}"`, sourceTree: 'BUILT_PRODUCTS_DIR' };
       proj.hash.project.objects['PBXBuildFile'][buildFile] = { isa: 'PBXBuildFile', fileRef: fileRef, settings: { ATTRIBUTES: ['CodeSignOnCopy'] } };
       proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files.push({ value: buildFile, comment: appexName });
       // Apply Mandatory MABS Build Settings
       const configs = proj.pbxXCBuildConfigurationSection();
       Object.keys(configs).forEach(key => {
           const cfg = configs[key];
           if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = ext.bundleId;
               cfg.buildSettings.DEVELOPMENT_TEAM = settings.teamID;
               cfg.buildSettings.PROVISIONING_PROFILE = ext.uuid;
               cfg.buildSettings.CODE_SIGN_STYLE = 'Manual';
               cfg.buildSettings.SKIP_INSTALL = 'YES';
               cfg.buildSettings['SWIFT_VERSION'] = '5.0';
           }
       });
   });
   fs.writeFileSync(pbxprojPath, proj.writeSync());
   console.log('✅ PlugIns folder configuration forced for MABS.');
   deferral.resolve();
   return deferral.promise;
};
