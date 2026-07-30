const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

async function syncInventory() {
  const results = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      const p = page.properties;

      const getTitle = (prop) => p[prop]?.title?.[0]?.plain_text || '';
      const getText  = (prop) => p[prop]?.rich_text?.[0]?.plain_text || '';
      const getSelect= (prop) => p[prop]?.select?.name || '';
      const getNumber= (prop) => p[prop]?.number || 0;
      const getFiles = (prop) => {
        const files = p[prop]?.files || [];
        // Return all image URLs (external or Notion-hosted)
        return files.map(f => f.external?.url || f.file?.url).filter(Boolean);
      };

      results.push({
        name: getTitle('Name'),
        desc: getText('Description'),
        price: getNumber('Price'),
        qty: getNumber('Stock'),
        size: getText('SKU'),      // maps Notion SKU → your current "size" field
        family: getSelect('Category'),
        images: getFiles('Image'),
      });
    }

    cursor = response.next_cursor;
  } while (cursor);

  fs.writeFileSync('inventory.json', JSON.stringify(results, null, 2));
  console.log(`Synced ${results.length} products to inventory.json`);
}

syncInventory().catch(err => {
  console.error(err);
  process.exit(1);
});
