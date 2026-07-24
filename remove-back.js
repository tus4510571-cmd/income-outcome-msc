const fs = require('fs');
const glob = require('glob');

const files = [
  'src/app/(dashboard)/income/summary/page.tsx',
  'src/app/(dashboard)/outcome/summary/page.tsx',
  'src/app/(dashboard)/settings/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove the back links
    const regex = /<Link href="\/[^"]*" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">\s*←[^<]*<\/Link>\s*/g;
    
    if (regex.test(content)) {
      content = content.replace(regex, '');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      // maybe check for slightly different classname
      const backupRegex = /<Link href="[^"]*"[^>]*>\s*←[^<]*<\/Link>\s*/g;
      if (backupRegex.test(content)) {
        content = content.replace(backupRegex, '');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file} (backup regex)`);
      }
    }
  }
}
