const fs = require('fs');

const files = [
  'src/app/income/summary/page.tsx',
  'src/app/outcome/summary/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import TransactionList')) {
    content = content.replace(
      /import \{ formatDate \} from "@\/lib\/utils";/,
      'import { formatDate } from "@/lib/utils";\nimport TransactionList from "@/components/TransactionList";'
    );
  }

  const regex = /<div className="space-y-3">[\s\S]*?<\/div>\s*\)\}\s*<\/div>/;
  
  if (regex.test(content)) {
    content = content.replace(regex, '<TransactionList transactions={filtered as any[]} showFiles={true} />\n        )}');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
