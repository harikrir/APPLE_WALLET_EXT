const fs = require('fs-extra'); // Use fs-extra if available, or fs if not
const path = require('path');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   // Source: Where the files live in your plugin folder
   const pluginSrc = path.join(projectRoot, 'plugins', context.opts.plugin.id, 'src', 'ios');
   // Destination: The native iOS platform folder
   const platformIos = path.join(projectRoot, 'platforms', 'ios');
   // 1. Check if iOS platform exists
   if (!fs.existsSync(platformIos)) {
       console.error("❌ MoveExtensionsFolders: iOS platform not found at " + platformIos);
       return;
   }
   // 2. Define folders/files to move
   const itemsToMove = [
       'WUIExt',
       'WNonUIExt',
       'AppGroupManager.swift',
       'kfh_card_art.png'
   ];
   console.log("🚀 Starting file migration to platforms/ios...");
   itemsToMove.forEach(item => {
       const srcPath = path.join(pluginSrc, item);
       const destPath = path.join(platformIos, item);
       try {
           if (fs.existsSync(srcPath)) {
               // If it's a directory, ensure destination exists or copy entire dir
               if (fs.lstatSync(srcPath).isDirectory()) {
                   // Use recursive copy
                   copyFolderRecursiveSync(srcPath, platformIos);
                   console.log(`✅ Moved directory: ${item}`);
               } else {
                   // It's a single file
                   fs.copyFileSync(srcPath, destPath);
                   console.log(`✅ Moved file: ${item}`);
               }
           } else {
               console.warn(`⚠️ Warning: Source ${item} not found in ${pluginSrc}`);
           }
       } catch (err) {
           console.error(`❌ Error moving ${item}: ${err}`);
       }
   });
};
/**
* Helper function to copy a folder recursively
*/
function copyFolderRecursiveSync(source, target) {
   let files = [];
   const targetFolder = path.join(target, path.basename(source));
   if (!fs.existsSync(targetFolder)) {
       fs.mkdirSync(targetFolder, { recursive: true });
   }
   if (fs.lstatSync(source).isDirectory()) {
       files = fs.readdirSync(source);
       files.forEach(function (file) {
           const curSource = path.join(source, file);
           if (fs.lstatSync(curSource).isDirectory()) {
               copyFolderRecursiveSync(curSource, targetFolder);
           } else {
               fs.copyFileSync(curSource, path.join(targetFolder, file));
           }
       });
   }
}
