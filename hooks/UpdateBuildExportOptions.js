const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    // Path to the internal Cordova build script on the MABS server
    const buildJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'build.js');

    // YOUR UAT IDENTIFIERS
    const mainAppID = "com.aub.mobilebanking.uat.bh";
    const nonUiExtID = "com.aub.mobilebanking.uat.bh.WNonUI";
    const uiExtID = "com.aub.mobilebanking.uat.bh.WUI";

    // YOUR PROVIDED UUIDs
    const profiles = {
        [mainAppID]: "1935f949-c72a-49f3-bc93-53d7df814805", // Ensure you add your Main App UAT UUID here
        [nonUiExtID]: "2458aa6f-941b-43c4-b787-b1d304a7b73c",
        [uiExtID]: "ef234420-f58f-41e4-871a-86527fe5acfd"
    };

    if (fs.existsSync(buildJsPath)) {
        console.log("🚀 UpdateBuildExportOptions: Patching Cordova build.js for Multi-Target Signing...");
        
        let content = fs.readFileSync(buildJsPath, 'utf8');

        // This replaces the standard Cordova provisioning logic with our multi-profile mapping
        const newProvisioningBlock = `exportOptions.provisioningProfiles = ${JSON.stringify(profiles)}; exportOptions.signingStyle = 'manual';`;
        
        // Regex to find the area where Cordova sets the export options
        const oldProvisioningBlock = /if \(buildOpts\.provisioningProfile && bundleIdentifier\) \{[\s\S]*?exportOptions\.signingStyle = 'manual';\s*\}/;
        
        if (content.match(oldProvisioningBlock)) {
            content = content.replace(oldProvisioningBlock, newProvisioningBlock);
            fs.writeFileSync(buildJsPath, content, 'utf8');
            console.log("✅ UpdateBuildExportOptions: Successfully injected UAT profiles into the build engine.");
        } else {
            console.error("❌ UpdateBuildExportOptions: Could not find the signing block in build.js. MABS version might have changed.");
        }
    } else {
        console.error("❌ UpdateBuildExportOptions: build.js not found at " + buildJsPath);
    }
};
