import fs from 'fs';

function convertToTree(obj, move = 'start') {
  const children = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const child = convertToTree(obj[key], key);
      children.push(child);
    }
  }

  const node = { move };
  if (children.length) node.children = children;
  return node;
}

// Read your current file
const original = JSON.parse(
  fs.readFileSync('./src/chessOpenings.json', 'utf-8')
);

// Convert to D3 hierarchy format
const converted = convertToTree(original['Start'], 'start');

// Save it
fs.writeFileSync('./src/openings.json', JSON.stringify(converted, null, 2));
