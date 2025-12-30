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
       appGroup: "group.com.aub.mobilebanking.uat.bh",
       extensions: [
           {
               name: "WNonUIExt",
               bundleId: "com.aub.mobilebanking.uat.bh.WNonUI",
               profile: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision",
               uuid: "YOUR-NONUI-PROFILE-UUID-HERE" // IMPORTANT: Replace with actual UUID
           },
           {
               name: "WUIExt",
               bundleId: "com.aub.mobilebanking.uat.bh.WUI",
               profile: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision",
               uuid: "YOUR-WUI-PROFILE-UUID-HERE" // IMPORTANT: Replace with actual UUID
           }
       ]
   };
   // === 1. FIND OR CREATE EMBED PHASE ===
   if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
   let embedPhaseKey = Object.keys(proj.hash.project.objects['PBXCopyFilesBuildPhase']).find(k => {
       return proj.hash.project.objects['PBXCopyFilesBuildPhase'][k].name === '"Embed App Extensions"';
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
   }
   // === 2. DEDUPLICATION: CLEAN EXISTING ENTRIES ===
   const buildFiles = proj.hash.project.objects['PBXBuildFile'];
   Object.keys(buildFiles).forEach(key => {
       if (buildFiles[key].comment && (buildFiles[key].comment.includes('WUIExt.appex') || buildFiles[key].comment.includes('WNonUIExt.appex'))) {
           delete buildFiles[key];
       }
   });
   const phase = proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey];
   phase.files = phase.files.filter(f => !f.comment.includes('WUIExt') && !f.comment.includes('WNonUIExt'));
   // === 3. ADD EXTENSIONS ===
   settings.extensions.forEach(ext => {
       // --- PHYSICAL MOVE OF PROVISIONING PROFILE ---
       const profSource = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles', ext.profile);
       const extDir = path.join(iosPath, ext.name);
       const profDest = path.join(extDir, 'embedded.mobileprovision');
       if (fs.existsSync(profSource)) {
           if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });
           fs.copyFileSync(profSource, profDest);
           console.log(`✅ Moved profile for ${ext.name}`);
       }
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       const deps = nativeTargetSection[mainTargetKey].dependencies || [];
       const hasDep = deps.some(d => proj.hash.project.objects['PBXTargetDependency'][d.value] && proj.hash.project.objects['PBXTargetDependency'][d.value].target === target.uuid);
       if (!hasDep) proj.addTargetDependency(mainTargetKey, [target.uuid]);
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
       if (fs.existsSync(extDir)) addFilesRecursively(extDir);
       // Add to Embed Phase
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
       phase.files.push({ value: buildFile, comment: appexName });
       // Build Settings
       const configs = proj.pbxXCBuildConfigurationSection();
       Object.keys(configs).forEach(key => {
           const cfg = configs[key];
           if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = ext.bundleId;
               cfg.buildSettings.DEVELOPMENT_TEAM = settings.teamID;
               cfg.buildSettings['PROVISIONING_PROFILE'] = ext.uuid; // Manual UUID
               cfg.buildSettings['CODE_SIGN_STYLE'] = 'Manual';      // Force Manual
               cfg.buildSettings['WRAPPER_EXTENSION'] = 'appex';
               cfg.buildSettings['SKIP_INSTALL'] = 'YES';
               cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] = `"${ext.name}/${ext.name}.entitlements"`;
               cfg.buildSettings['INFOPLIST_FILE'] = `"${ext.name}/${ext.name}-Info.plist"`;
               cfg.buildSettings['SWIFT_VERSION'] = '5.0';
           }
       });
   });
   fs.writeFileSync(pbxprojPath, proj.writeSync());
   console.log('✅ Success: Project cleaned and extensions added with provisioning.');
   deferral.resolve();
   return deferral.promise;
};
