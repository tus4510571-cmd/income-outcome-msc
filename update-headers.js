const fs = require('fs');

const files = [
  'src/app/(dashboard)/income/payment-link/page.tsx',
  'src/app/(dashboard)/income/chat-direct/page.tsx',
  'src/app/(dashboard)/income/branch-transfer/page.tsx',
  'src/app/(dashboard)/outcome/shop-with-receipt/page.tsx',
  'src/app/(dashboard)/outcome/shop-without-receipt/page.tsx',
  'src/app/(dashboard)/outcome/employee-labor/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Regex to capture:
  // 1. The title (inside <h1...>)
  // 2. The subtitle (inside <p className="text-slate-500...">)
  // 3. The link for the "new" button
  // Note: Some have "mt-1", some don't.
  
  const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const subtitleMatch = content.match(/<p className="text-slate-500[^>]*>([^<]+)<\/p>/);
  const newLinkMatch = content.match(/<Link href="([^"]+\/new)"[^>]*>/);

  if (titleMatch && newLinkMatch) {
    const title = titleMatch[1];
    const subtitle = subtitleMatch ? subtitleMatch[1] : '';
    const newLink = newLinkMatch[1];

    const pTag = subtitle ? `<p className="text-sm text-slate-500 mt-1">${subtitle}</p>` : '';
    const newHeader = `<div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">${title}</h1>
            ${pTag}
          </div>
          <Link href="${newLink}">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95">
              + สร้างรายการใหม่
            </button>
          </Link>
        </div>`;

    // Replace the old header and button blocks
    // Replace everything from <div className="mb-8"> up to before <TransactionList
    const blockRegex = /<div className="mb-8">[\s\S]*?(?=<TransactionList|<div className="space-y-4">)/;
    content = content.replace(blockRegex, newHeader + '\n\n        ');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Failed to match required parts in ${file}`);
  }
}
