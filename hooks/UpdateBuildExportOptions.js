const fs = require('fs');
const path = require('path');
const plist = require('plist'); // Ensure 'plist' is in your InstallNPM.js
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   const platformIosPath = path.join(projectRoot, 'platforms', 'ios');
   // 1. Dynamic Search for the exportOptions.plist
   // MABS generates this during the prepare/build phase
   const exportOptionsPath = path.join(platformIosPath, 'exportOptions.plist');
   // YOUR UAT IDENTIFIERS
   const mainAppID = "com.aub.mobilebanking.uat.bh";
   const nonUiExtID = "com.aub.mobilebanking.uat.bh.WNonUI";
   const uiExtID = "com.aub.mobilebanking.uat.bh.WUI";
   // YOUR PROVIDED UUIDs (From your Apple_Pay_Test-34 and Extension Profiles)
   const provisioningProfiles = {
       [mainAppID]: "1935f949-c72a-49f3-bc93-53d7df814805",
       [nonUiExtID]: "2458aa6f-941b-43c4-b787-b1d304a7b73c",
       [uiExtID]: "ef234420-f58f-41e4-871a-86527fe5acfd"
   };
   if (fs.existsSync(exportOptionsPath)) {
       console.log("🚀 UpdateBuildExportOptions: Found exportOptions.plist. Injecting profiles...");
       let fileContent = fs.readFileSync(exportOptionsPath, 'utf8');
       let obj = plist.parse(fileContent);
       // Inject our multi-target profiles
       obj.provisioningProfiles = provisioningProfiles;
       obj.signingStyle = 'manual';
       obj.teamID = 'T57RH2WT3W';
       // MABS requires 'method' to be 'ad-hoc' or 'enterprise' for UAT
       if (!obj.method) {
           obj.method = 'ad-hoc';
       }
       fs.writeFileSync(exportOptionsPath, plist.build(obj), 'utf8');
       console.log("✅ UpdateBuildExportOptions: Successfully updated exportOptions.plist with Extension UUIDs.");
   } else {
       // Fallback: If MABS hasn't created the file yet, we create a base version
       console.log("⚠️ UpdateBuildExportOptions: exportOptions.plist not found, creating a new one...");
       const exportOptions = {
           method: 'ad-hoc',
           signingStyle: 'manual',
           teamID: 'T57RH2WT3W',
           provisioningProfiles: provisioningProfiles
       };
       fs.writeFileSync(exportOptionsPath, plist.build(exportOptions), 'utf8');
       console.log("✅ UpdateBuildExportOptions: Created new exportOptions.plist.");
   }
};
