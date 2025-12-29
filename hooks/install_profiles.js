const fs = require('fs');

const path = require('path');

module.exports = function(context) {

    const xcode = require('xcode');

    const projectRoot = context.opts.projectRoot;

    const platformIosPath = path.join(projectRoot, 'platforms', 'ios');

    const pluginId = context.opts.plugin.id;

    const pluginProfilesPath = path.join(projectRoot, 'plugins', pluginId, 'src/ios/profiles');

    const files = fs.readdirSync(platformIosPath);

    const xcodeProjName = files.find(f => f.endsWith('.xcodeproj'));

    const pbxPath = path.join(platformIosPath, xcodeProjName, 'project.pbxproj');

    const proj = xcode.project(pbxPath);

    proj.parseSync();

    const extensionTargets = [

        { name: "WNonUI", id: "com.aub.mobilebanking.uat.bh.WNonUI", file: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },

        { name: "WUI", id: "com.aub.mobilebanking.uat.bh.WUI", file: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }

    ];

    // 1. FORCE CREATE THE PLUGINS DIRECTORY

    const pluginsPath = path.join(platformIosPath, 'PlugIns');

    if (!fs.existsSync(pluginsPath)) {

        fs.mkdirSync(pluginsPath, { recursive: true });

        console.log("KFH_HOOK: Created missing PlugIns directory.");

    }

    extensionTargets.forEach(target => {

        // 2. FORCE CREATE THE .APPEX DIRECTORY

        const appexFolder = path.join(pluginsPath, `${target.name}.appex`);

        if (!fs.existsSync(appexFolder)) {

            fs.mkdirSync(appexFolder, { recursive: true });

        }

        // 3. COPY PROFILE & RENAME TO 'embedded'

        const sourceFile = path.join(pluginProfilesPath, target.file);

        const targetFile = path.join(appexFolder, 'embedded.mobileprovision');

        if (fs.existsSync(sourceFile)) {

            fs.copyFileSync(sourceFile, targetFile);

            console.log(`KFH_HOOK: Installed profile into ${target.name}.appex`);

        }

        // 4. UPDATE XCODE TO TARGET THIS NEW STRUCTURE

        const configurations = proj.pbxXCBuildConfigurationSection();

        for (const key in configurations) {

            const config = configurations[key];

            if (typeof config === 'object' && config.buildSettings && 

                config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${target.id}"`) {

                config.buildSettings['CODE_SIGN_STYLE'] = 'Manual';

                config.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] = `"${target.id}"`;

                config.buildSettings['DEVELOPMENT_TEAM'] = '"T57RH2WT3W"';

                config.buildSettings['PRODUCT_NAME'] = `"${target.name}"`;

                // Tells Xcode where the info.plist is for this sub-target

                config.buildSettings['INFOPLIST_FILE'] = `"${target.name}/${target.name}-Info.plist"`;

            }

        }

    });

    fs.writeFileSync(pbxPath, proj.writeSync());

    console.log("KFH_HOOK: Finished rebuilding extension structure.");

};
 
