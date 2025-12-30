const fs = require('fs');

const path = require('path');

const xcode = require('xcode');

const Q = require('q');

module.exports = function (context) {

    const deferral = Q.defer();

    const projectRoot = context.opts.projectRoot;

    const pluginID = context.opts.plugin.id;

    const iosPath = path.join(projectRoot, 'platforms', 'ios');

    const settings = {

        teamID: "T57RH2WT3W",

        appGroup: "group.com.aub.mobilebanking",

        extensions: [

            { name: "WNonUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WNonUI", profile: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },

            { name: "WUIExt", bundleId: "com.aub.mobilebanking.uat.bh.WUI", profile: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }

        ]

    };

    const xcodeProj = fs.readdirSync(iosPath).find(f => f.endsWith('.xcodeproj'));

    const projectName = path.basename(xcodeProj, '.xcodeproj');

    const pbxprojPath = path.join(iosPath, xcodeProj, 'project.pbxproj');

    const proj = xcode.project(pbxprojPath);

    proj.parseSync();

    const mainTargetKey = proj.findTargetKey(projectName);

    // 1. COPY FILES (Recursive with replacement)

    function copyRecursive(src, dest) {

        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        fs.readdirSync(src).forEach(file => {

            const s = path.join(src, file), d = path.join(dest, file);

            if (fs.statSync(s).isDirectory()) copyRecursive(s, d);

            else {

                let content = fs.readFileSync(s, 'utf8');

                content = content.replace(/__GROUP_IDENTIFIER__/g, settings.appGroup).replace(/__TEAM_ID__/g, settings.teamID);

                fs.writeFileSync(d, content);

            }

        });

    }

    settings.extensions.forEach(ext => {

        const src = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', ext.name);

        copyRecursive(src, path.join(iosPath, ext.name));

    });

    // 2. FORCE EMBED PHASE (Code 13 is the key for "PlugIns" folder)

    let embedPhase = proj.hash.project.objects.PBXCopyFilesBuildPhase;

    let embedPhaseKey = Object.keys(embedPhase || {}).find(k => embedPhase[k].name === '"Embed App Extensions"');

    if (!embedPhaseKey) {

        embedPhaseKey = proj.generateUuid();

        proj.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseKey] = {

            isa: 'PBXCopyFilesBuildPhase',

            buildActionMask: 2147483647,

            dstSubfolderSpec: 13, // 13 = PlugIns directory

            dstPath: '""',

            name: '"Embed App Extensions"',

            files: [],

            runOnlyForDeploymentPostprocessing: 0

        };

        proj.hash.project.objects.PBXNativeTarget[mainTargetKey].buildPhases.push({ value: embedPhaseKey, comment: 'Embed App Extensions' });

    }

    // 3. WIRE TARGETS

    settings.extensions.forEach(ext => {

        const target = proj.addTarget(ext.name, 'app_extension', ext.name);

        // CRITICAL: MABS needs this dependency to build the extension BEFORE the app

        proj.addTargetDependency(mainTargetKey, [target.uuid]);

        const extPath = path.join(iosPath, ext.name);

        // Add Files to Extension Target

        function addFiles(dir) {

            fs.readdirSync(dir).forEach(f => {

                const full = path.join(dir, f), rel = path.relative(iosPath, full);

                if (fs.statSync(full).isDirectory()) addFiles(full);

                else if (f.endsWith('.swift')) proj.addSourceFile(rel, { target: target.uuid });

                else if (f.endsWith('.plist') || f.endsWith('.entitlements')) proj.addResourceFile(rel, { target: target.uuid });

            });

        }

        addFiles(extPath);

        // Add .appex to the Embed Phase

        const appexName = `${ext.name}.appex`;

        const fileRef = proj.generateUuid(), buildFile = proj.generateUuid();

        proj.hash.project.objects.PBXFileReference[fileRef] = { isa: 'PBXFileReference', explicitFileType: '"wrapper.app-extension"', path: `"${appexName}"`, sourceTree: 'BUILT_PRODUCTS_DIR' };

        proj.hash.project.objects.PBXBuildFile[buildFile] = { isa: 'PBXBuildFile', fileRef: fileRef, settings: { ATTRIBUTES: ['CodeSignOnCopy'] } };

        proj.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseKey].files.push({ value: buildFile, comment: appexName });

        // Build Settings

        const configs = proj.pbxXCBuildConfigurationSection();

        Object.keys(configs).forEach(key => {

            const cfg = configs[key];

            if (cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME === `"${ext.name}"`) {

                cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = ext.bundleId;

                cfg.buildSettings.DEVELOPMENT_TEAM = settings.teamID;

                cfg.buildSettings.SKIP_INSTALL = 'YES';

                cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${ext.name}/${ext.name}.entitlements"`;

                cfg.buildSettings.INFOPLIST_FILE = `"${ext.name}/${ext.name}-Info.plist"`;

            }

        });

        // Provisioning Profile

        const profSrc = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', 'profiles', ext.profile);

        if (fs.existsSync(profSrc)) fs.copyFileSync(profSrc, path.join(extPath, 'embedded.mobileprovision'));

    });

    fs.writeFileSync(pbxprojPath, proj.writeSync());

    console.log('✅ IPA will now contain PlugIns folder.');

    deferral.resolve();

    return deferral.promise;

};
 
