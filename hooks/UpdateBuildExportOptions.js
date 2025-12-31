const fs = require('fs');

const path = require('path');

const plist = require('plist');

module.exports = function (context) {

    const projectRoot = context.opts.projectRoot;

    // MABS can store this in the root of 'ios' or inside the project subfolder

    const potentialPaths = [

        path.join(projectRoot, 'platforms', 'ios', 'exportOptions.plist'),

        path.join(projectRoot, 'platforms', 'ios', 'Test JV Mobile', 'exportOptions.plist')

    ];

    const provisioningProfiles = {

        "com.aub.mobilebanking.uat.bh": "1935f949-c72a-49f3-bc93-53d7df814805",

        "com.aub.mobilebanking.uat.bh.WNonUI": "2458aa6f-941b-43c4-b787-b1d304a7b73c",

        "com.aub.mobilebanking.uat.bh.WUI": "ef234420-f58f-41e4-871a-86527fe5acfd"

    };

    let found = false;

    potentialPaths.forEach(plistPath => {

        if (fs.existsSync(plistPath)) {

            console.log(`🚀 UpdateBuildExportOptions: Found file at ${plistPath}. Patching...`);

            const fileContent = fs.readFileSync(plistPath, 'utf8');

            let obj = plist.parse(fileContent);

            // Force manual signing and inject profiles

            obj.provisioningProfiles = provisioningProfiles;

            obj.signingStyle = 'manual';

            obj.teamID = 'T57RH2WT3W';

            // Ensure method matches your profile type (usually 'ad-hoc' or 'enterprise' for UAT)

            obj.method = obj.method || 'ad-hoc'; 

            fs.writeFileSync(plistPath, plist.build(obj), 'utf8');

            console.log(`✅ UpdateBuildExportOptions: Successfully patched ${plistPath}`);

            found = true;

        }

    });

    if (!found) {

        console.error("❌ UpdateBuildExportOptions: Could not find exportOptions.plist to patch. The build may fail signing.");

    }

};
 
