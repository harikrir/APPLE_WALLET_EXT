const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const Q = require('q');
module.exports = function(context) {
   const deferral = Q.defer();
   const projectRoot = context.opts.projectRoot;
   const pluginID = context.opts.plugin.id;
   const platformPath = path.join(projectRoot, 'platforms', 'ios');
   // 1. Helper: Clone Files
   function cloneFile(source, target) {
       let targetFile = target;
       if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
           targetFile = path.join(target, path.basename(source));
       }
       fs.writeFileSync(targetFile, fs.readFileSync(source));
   }
   // 2. Helper: Copy Folders
   function copyExtensionFolders(source, target) {
       const targetFolder = path.join(target, path.basename(source));
       if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
       const files = fs.readdirSync(source);
       files.forEach(file => {
           const curSource = path.join(source, file);
           if (fs.lstatSync(curSource).isDirectory()) {
               copyExtensionFolders(curSource, targetFolder);
           } else {
               cloneFile(curSource, targetFolder);
           }
       });
   }
   // 3. Find Xcode Project
   const xcodeProjFiles = fs.readdirSync(platformPath).filter(f => f.endsWith('.xcodeproj'));
   if (xcodeProjFiles.length === 0) {
       throw new Error("Could not find .xcodeproj");
   }
   const xcodeProjPath = xcodeProjFiles[0];
   const projectName = path.basename(xcodeProjPath, '.xcodeproj');
   const projectPath = path.join(platformPath, xcodeProjPath, 'project.pbxproj');
   // 4. Move Folders into Platform (Your Logic)
   const uiSrc = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'WUIExt');
   const nonUiSrc = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'WNonUIExt');
   const profilesSrc = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles');
   [uiSrc, nonUiSrc].forEach(src => {
       if (fs.existsSync(src)) {
           copyExtensionFolders(src, platformPath);
           console.log(`✅ Folders moved to platforms/ios for: ${path.basename(src)}`);
       }
   });
   // 5. Xcode Project Manipulation (The logic MABS needs)
   const proj = xcode.project(projectPath);
   proj.parseSync();
   const mainTargetKey = proj.findTargetKey(projectName);
   const teamID = "T57RH2WT3W";
   const extensions = [
       { name: 'WNonUIExt', id: 'com.aub.mobilebanking.uat.bh.WNonUI', profile: 'com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision' },
       { name: 'WUIExt', id: 'com.aub.mobilebanking.uat.bh.WUI', profile: 'com.aub.mobilebanking.uat.bh.WUI.mobileprovision' }
   ];
   // Create Embed Phase (Forcing PlugIns folder)
   const embedPhaseUuid = proj.generateUuid();
   const embedPhase = {
       isa: 'PBXCopyFilesBuildPhase',
       buildActionMask: 2147483647,
       dstSubfolderSpec: 13, // 13 = PlugIns
       dstPath: '""',
       name: '"Embed App Extensions"',
       files: [],
       runOnlyForDeploymentPostprocessing: 0
   };
   proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid] = embedPhase;
   proj.hash.project.objects['PBXNativeTarget'][mainTargetKey].buildPhases.push({ value: embedPhaseUuid, comment: 'Embed App Extensions' });
   extensions.forEach(ext => {
       const target = proj.addTarget(ext.name, 'app_extension', ext.name);
       proj.addTargetDependency(mainTargetKey, [target.uuid]);
       // Build Settings
       const configurations = proj.pbxXCBuildConfigurationSection();
       for (const key in configurations) {
           const config = configurations[key];
           if (config.buildSettings && config.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {
               const s = config.buildSettings;
               s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.id;
               s['DEVELOPMENT_TEAM'] = teamID;
               s['SKIP_INSTALL'] = 'YES';
               s['SWIFT_VERSION'] = '5.0';
               s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0';
           }
       }
       // Manually link .appex
       const appexName = `${ext.name}.appex`;
       const fileRefUuid = proj.generateUuid();
       const buildFileUuid = proj.generateUuid();
       proj.hash.project.objects['PBXFileReference'][fileRefUuid] = { isa: 'PBXFileReference', explicitFileType: '"wrapper.app-extension"', includeInIndex: 0, path: `"${appexName}"`, sourceTree: 'BUILT_PRODUCTS_DIR' };
       proj.hash.project.objects['PBXBuildFile'][buildFileUuid] = { isa: 'PBXBuildFile', fileRef: fileRefUuid, settings: { ATTRIBUTES: ['CodeSignOnCopy'] } };
       embedPhase.files.push({ value: buildFileUuid, comment: `${appexName} in Embed App Extensions` });
       // Copy Profile and rename to embedded.mobileprovision
       const srcProfile = path.join(profilesSrc, ext.profile);
       const destFolder = path.join(platformPath, ext.name);
       if (fs.existsSync(srcProfile)) {
           if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
           fs.copyFileSync(srcProfile, path.join(destFolder, 'embedded.mobileprovision'));
       }
   });
   fs.writeFileSync(projectPath, proj.writeSync());
   console.log('✅ Extension Folders Moved and Project Configured.');
   deferral.resolve();
   return deferral.promise;
};
