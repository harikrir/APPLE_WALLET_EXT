const fs = require('fs');
const path = require('path');
const plist = require('plist');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   // MABS 10+ can store the plist in the platform root or the project subfolder
   // We search both to be 100% sure we catch the one Xcode uses.
   const potentialPaths = [
       path.join(projectRoot, 'platforms', 'ios', 'exportOptions.plist'),
       path.join(projectRoot, 'platforms', 'ios', 'Test JV Mobile', 'exportOptions.plist')
   ];
   // These UUIDs match the filenames you renamed in your ZIP
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
           let obj;
           try {
               obj = plist.parse(fileContent);
           } catch (e) {
               console.error(`❌ UpdateBuildExportOptions: Failed to parse plist at ${plistPath}`);
               return;
           }
           // 1. Inject the multi-target profiles mapping
           obj.provisioningProfiles = provisioningProfiles;
           // 2. Force Manual Signing (Critical for MABS)
           obj.signingStyle = 'manual';
           // 3. Set your Team ID
           obj.teamID = 'T57RH2WT3W';
           // 4. Force method to 'ad-hoc' for UAT profiles
           obj.method = 'ad-hoc';
           // 5. Some MABS versions require bitcode to be disabled for extensions
           obj.compileBitcode = false;
           fs.writeFileSync(plistPath, plist.build(obj), 'utf8');
           console.log(`✅ UpdateBuildExportOptions: Successfully updated ${plistPath}`);
           found = true;
       }
   });
   if (!found) {
       // If MABS hasn't created the file yet, we create a seed file in the root
       console.log("⚠️ UpdateBuildExportOptions: No existing plist found. Creating new base exportOptions.plist...");
       const seedPath = potentialPaths[0];
       const seedData = {
           method: 'ad-hoc',
           signingStyle: 'manual',
           teamID: 'T57RH2WT3W',
           provisioningProfiles: provisioningProfiles,
           compileBitcode: false
       };
       fs.writeFileSync(seedPath, plist.build(seedData), 'utf8');
       console.log(`✅ UpdateBuildExportOptions: Created seed file at ${seedPath}`);
   }
};
