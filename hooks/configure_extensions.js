const fs = require('fs');

const path = require('path');

const xcode = require('xcode');

const Q = require('q');

module.exports = function (context) {

    const deferral = Q.defer();

    const projectRoot = context.opts.projectRoot;

    const pluginID = context.opts.plugin.id;

    const iosPath = path.join(projectRoot, 'platforms', 'ios');

    // 1. FIND XCODE PROJECT

    const xcodeProj = fs.readdirSync(iosPath).find(f => f.endsWith('.xcodeproj'));

    const pbxprojPath = path.join(iosPath, xcodeProj, 'project.pbxproj');

    const proj = xcode.project(pbxprojPath);

    proj.parseSync();

    const nativeTargetSection = proj.hash.project.objects['PBXNativeTarget'];

    const mainTargetKey = Object.keys(nativeTargetSection).find(key => {

        return nativeTargetSection[key].productType === '"com.apple.product-type.application"';

    });

    // 2. CONFIGURATION DATA (Update UUIDs from your profile files)

    const settings = {

        [span_0](start_span)teamID: "96TXWQ4R6A", // Your Team ID[span_0](end_span)

        extensions: [

            { 

                name: "WNonUIExt", 

                [span_1](start_span)bundleId: "com.aub.mobilebanking.phone.eg.NonExt", //[span_1](end_span)

                profileName: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision",

                [span_2](start_span)uuid: "b791a518-f133-46e9-86ae-799b54368345" //[span_2](end_span)

            },

            { 

                name: "WUIExt", 

                [span_3](start_span)bundleId: "com.aub.mobilebanking.phone.eg.UIExt", //[span_3](end_span)

                profileName: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision",

                [span_4](start_span)uuid: "94c8d471-940b-42b7-8d64-f071402c8b61" //[span_4](end_span)

            }

        ]

    };

    // 3. SETUP & CLEAN EMBED PHASE (Prevents "Duplicate Tasks")

    if (!proj.hash.project.objects['PBXCopyFilesBuildPhase']) proj.hash.project.objects['PBXCopyFilesBuildPhase'] = {};

    let embedPhaseKey = Object.keys(proj.hash.project.objects['PBXCopyFilesBuildPhase']).find(k => {

        return proj.hash.project.objects['PBXCopyFilesBuildPhase'][k].name === '"Embed App Extensions"';

    });

    if (!embedPhaseKey) {

        embedPhaseKey = proj.generateUuid();

        proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey] = {

            isa: 'PBXCopyFilesBuildPhase', buildActionMask: 2147483647, dstSubfolderSpec: 13, 

            dstPath: '""', name: '"Embed App Extensions"', files: [], runOnlyForDeploymentPostprocessing: 0

        };

        nativeTargetSection[mainTargetKey].buildPhases.push({ value: embedPhaseKey, comment: 'Embed App Extensions' });

    }

    // NUKE: Clear existing build file references and phase entries

    const buildFiles = proj.hash.project.objects['PBXBuildFile'];

    Object.keys(buildFiles).forEach(key => {

        if (buildFiles[key].comment && (buildFiles[key].comment.includes('WUIExt') || buildFiles[key].comment.includes('WNonUIExt'))) {

            delete buildFiles[key];

        }

    });

    proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files = [];

    // 4. PROCESS EXTENSIONS

    settings.extensions.forEach(ext => {

        // Physical Move of Folder

        const sourceDir = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', ext.name);

        const destDir = path.join(iosPath, ext.name);

        if (fs.existsSync(sourceDir)) {

            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

            copyFolderRecursiveSync(sourceDir, destDir);

        }

        // Physical Move of Provisioning Profile

        const profSource = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles', ext.profileName);

        const profDest = path.join(destDir, 'embedded.mobileprovision');

        if (fs.existsSync(profSource)) {

            fs.copyFileSync(profSource, profDest);

        }

        // Create Target

        const target = proj.addTarget(ext.name, 'app_extension', ext.name);

        proj.addTargetDependency(mainTargetKey, [target.uuid]);

        // Add Files Recursively (Handles Models/AUBLog.swift)

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

        addFilesRecursively(destDir);

        // Add to Embed Phase

        const appexName = `${ext.name}.appex`;

        const fileRef = proj.generateUuid(), buildFile = proj.generateUuid();

        proj.hash.project.objects['PBXFileReference'][fileRef] = { isa: 'PBXFileReference', explicitFileType: '"wrapper.app-extension"', path: `"${appexName}"`, sourceTree: 'BUILT_PRODUCTS_DIR' };

        proj.hash.project.objects['PBXBuildFile'][buildFile] = { isa: 'PBXBuildFile', fileRef: fileRef, settings: { ATTRIBUTES: ['CodeSignOnCopy'] } };

        proj.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseKey].files.push({ value: buildFile, comment: appexName });

        [span_5](start_span)// Apply Build Settings & Provisioning[span_5](end_span)

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

                cfg.buildSettings['CODE_SIGN_ENTITLEMENTS'] = `"${ext.name}/${ext.name}.entitlements"`;

                cfg.buildSettings['INFOPLIST_FILE'] = `"${ext.name}/${ext.name}-Info.plist"`;

            }

        });

    });

    function copyFolderRecursiveSync(source, target) {

        fs.readdirSync(source).forEach(file => {

            const curSource = path.join(source, file), curTarget = path.join(target, file);

            if (fs.lstatSync(curSource).isDirectory()) {

                if (!fs.existsSync(curTarget)) fs.mkdirSync(curTarget);

                copyFolderRecursiveSync(curSource, curTarget);

            } else { fs.copyFileSync(curSource, curTarget); }

        });

    }

    fs.writeFileSync(pbxprojPath, proj.writeSync());

    console.log('✅ Final Configuration Success: Profiles Moved & Project Cleaned.');

    deferral.resolve();

    return deferral.promise;

};
 
