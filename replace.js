const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/app', function(filePath) {
  if (filePath.endsWith('page.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (content.includes('TransactionCard') && !content.includes('import TransactionList')) {
      content = content.replace(/import TransactionCard from "@\/components\/TransactionCard";/, 'import TransactionList from "@/components/TransactionList";\nimport TransactionCard from "@/components/TransactionCard";');
      
      const regex = /<div className="space-y-4">[\s\S]*?(?:<TransactionCard[\s\S]*?href=\{`([^`$]+)\$[\s\S]*?\/>)[\s\S]*?<\/div>\s*\)\}\s*<\/div>/;
      
      if (regex.test(content)) {
        content = content.replace(regex, (match, p1) => {
          // p1 is the base path like /outcome/shop-without-receipt
          return `<TransactionList transactions={transactions as any[]} baseHref="${p1}" />`;
        });
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      } else {
        console.log(`Regex failed for ${filePath}`);
      }
    }
  }
});
