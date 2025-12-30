
var fs = require('fs');
var path = require('path');

module.exports = function (context) {
    var projectRoot = context.opts.projectRoot;
    var buildJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'build.js');

    const mainAppID = "com.aub.mobilebanking.uat.bh";
    const nonUiExtID = "com.aub.mobilebanking.uat.bh.WNonUI";
    const uiExtID = "com.aub.mobilebanking.uat.bh.WUI";

    // UPDATED WITH YOUR PROVIDED UUIDs
    const profiles = {
        [mainAppID]: "YOUR_MAIN_APP_UUID_HERE", 
        [nonUiExtID]: "2458aa6f-941b-43c4-b787-b1d304a7b73c",
        [uiExtID]: "ef234420-f58f-41e4-871a-86527fe5acfd"
    };

    if (fs.existsSync(buildJsPath)) {
        var content = fs.readFileSync(buildJsPath, 'utf8');
        var newBlock = `exportOptions.provisioningProfiles = ${JSON.stringify(profiles)}; exportOptions.signingStyle = 'manual';`;
        
        // Regex to find the standard Cordova signing block
        var oldBlock = /if \(buildOpts\.provisioningProfile && bundleIdentifier\) \{[\s\S]*?exportOptions\.signingStyle = 'manual';\s*\}/;
        
        content = content.replace(oldBlock, newBlock);
        fs.writeFileSync(buildJsPath, content, 'utf8');
        console.log("✅ Build.js hacked with UAT Extension UUIDs");
    }
};
