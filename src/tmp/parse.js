const fs = require('fs');

function checkTags(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const divOpens = (content.match(/<div(\s|>)/g) || []).length;
  const divCloses = (content.match(/<\/div>/g) || []).length;
  
  console.log(`${filePath}: <div opens: ${divOpens}, </div> closes: ${divCloses}`);
  
  // also let's look for any other mismatched tags using a simple regex-based stack parser
  const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
  const stack = [];
  let match;
  
  // Strip comments and self-closing tags first for a basic check
  const noComments = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<\w+[^>]*\/>/g, '');
  
  tagRegex.lastIndex = 0;
  while ((match = tagRegex.exec(noComments)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    
    // Ignore obviously self-closing or void elements just in case
    if (fullTag.endsWith('/>') || ['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tagName.toLowerCase())) continue;
    
    if (fullTag.startsWith('</')) {
      if (stack.length === 0) {
        console.log(`Unmatched closing tag at index ${match.index}: ${fullTag}`);
      } else {
        const top = stack.pop();
        if (top.tagName !== tagName) {
          console.log(`Mismatch: found ${fullTag} but expected </${top.tagName}> at index ${match.index}`);
          stack.push(top); // put it back, it's just a simple heuristic
        }
      }
    } else {
      stack.push({ tagName, fullTag, index: match.index });
    }
  }
  
  console.log(`Unclosed tags at EOF: ${stack.map(s => s.tagName).join(', ')}`);
}

checkTags('./components/Bids.tsx');
checkTags('./components/ContactDetail.tsx');
