const fs = require('fs');

const path = require('path');

module.exports = function(context) {

    // Standard require for modern MABS/Cordova

    const xcode = require('xcode');

    const projectRoot = context.opts.projectRoot;

    // 1. Define Paths

    const platformIosPath = path.join(projectRoot, 'platforms', 'ios');

    const pluginId = context.opts.plugin.id;

    const pluginProfilesPath = path.join(projectRoot, 'plugins', pluginId, 'src/ios/profiles');

    // 2. Find the .xcodeproj file dynamically

    const files = fs.readdirSync(platformIosPath);

    const xcodeProjName = files.find(f => f.endsWith('.xcodeproj'));

    if (!xcodeProjName) {

        console.error("KFH_HOOK: ERROR - Could not find .xcodeproj folder in " + platformIosPath);

        return;

    }

    const pbxPath = path.join(platformIosPath, xcodeProjName, 'project.pbxproj');

    const proj = xcode.project(pbxPath);

    proj.parseSync();

    const extensionTargets = [

        { name: "WNonUI", id: "com.aub.mobilebanking.uat.bh.WNonUI", file: "com.aub.mobilebanking.uat.bh.WNonUI.mobileprovision" },

        { name: "WUI", id: "com.aub.mobilebanking.uat.bh.WUI", file: "com.aub.mobilebanking.uat.bh.WUI.mobileprovision" }

    ];

    extensionTargets.forEach(target => {

        console.log(`KFH_HOOK: Processing target ${target.name}...`);

        // --- STEP A: Physical Copy of Provisioning Profile ---

        const sourceFile = path.join(pluginProfilesPath, target.file);

        // The destination is the actual target folder inside the iOS platform

        const targetDir = path.join(platformIosPath, target.name); 

        const targetFile = path.join(targetDir, 'embedded.mobileprovision');

        if (fs.existsSync(sourceFile)) {

            if (!fs.existsSync(targetDir)) {

                fs.mkdirSync(targetDir, { recursive: true });

            }

            fs.copyFileSync(sourceFile, targetFile);

            console.log(`KFH_HOOK: Copied ${target.file} to ${targetFile}`);

        } else {

            console.error(`KFH_HOOK: Source profile MISSING at ${sourceFile}`);

        }

        // --- STEP B: Update Xcode Build Settings for Manual Signing ---

        const configurations = proj.pbxXCBuildConfigurationSection();

        for (const key in configurations) {

            const config = configurations[key];

            if (typeof config === 'object' && config.buildSettings && 

                config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${target.id}"`) {

                config.buildSettings['CODE_SIGN_STYLE'] = 'Manual';

                config.buildSettings['PROVISIONING_PROFILE_SPECIFIER'] = `"${target.id}"`;

                // Ensure this Team ID matches your Apple Developer Account

                config.buildSettings['DEVELOPMENT_TEAM'] = '"T57RH2WT3W"';

                console.log(`KFH_HOOK: Updated Build Settings for bundle: ${target.id}`);

            }

        }

    });

    // 3. Write changes back to the project file

    fs.writeFileSync(pbxPath, proj.writeSync());

    console.log("KFH_HOOK: Project successfully updated and signed.");

};
 
