const fs = require('fs');

const html = fs.readFileSync('docs/cleave-landing.html', 'utf8');

// Extract hero SVG between <svg viewBox="0 0 1440 940" and </svg>
const match = html.match(/<svg viewBox="0 0 1440 940"[\s\S]*?<\/svg>/);
if (!match) {
  console.error("Hero SVG not found");
  process.exit(1);
}

let svg = match[0];

// Convert HTML SVG attributes and inline styles to JSX
svg = svg.replace(/role="img"/g, 'role="img"');
svg = svg.replace(/clip-path=/g, 'clipPath=');
svg = svg.replace(/stroke-width=/g, 'strokeWidth=');
svg = svg.replace(/stroke-dasharray=/g, 'strokeDasharray=');
svg = svg.replace(/stroke-linecap=/g, 'strokeLinecap=');
svg = svg.replace(/text-anchor=/g, 'textAnchor=');
svg = svg.replace(/stop-color=/g, 'stopColor=');
svg = svg.replace(/stop-opacity=/g, 'stopOpacity=');
svg = svg.replace(/class=/g, 'className=');

// Convert style="..." strings inside elements to JSX style={{ ... }}
svg = svg.replace(/style="([^"]*)"/g, (m, styleStr) => {
  const rules = styleStr.split(';').map(s => s.trim()).filter(Boolean);
  const styleObj = {};
  for (const rule of rules) {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) continue;
    let prop = rule.slice(0, colonIdx).trim();
    let val = rule.slice(colonIdx + 1).trim();
    
    // convert kebab-case prop to camelCase
    prop = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styleObj[prop] = val;
  }
  return `style={${JSON.stringify(styleObj)}}`;
});

// React self-closing tags
svg = svg.replace(/<stop([^>]*)><\/stop>/g, '<stop$1 />');
svg = svg.replace(/<circle([^>]*)><\/circle>/g, '<circle$1 />');
svg = svg.replace(/<ellipse([^>]*)><\/ellipse>/g, '<ellipse$1 />');
svg = svg.replace(/<rect([^>]*)><\/rect>/g, '<rect$1 />');
svg = svg.replace(/<line([^>]*)><\/line>/g, '<line$1 />');
svg = svg.replace(/<path([^>]*)><\/path>/g, '<path$1 />');

const componentContent = `"use client";

import React from "react";

export function HeroVisual() {
  return (
    ${svg}
  );
}
`;

fs.mkdirSync('components/landing', { recursive: true });
fs.writeFileSync('components/landing/HeroVisual.tsx', componentContent);
console.log("Successfully created components/landing/HeroVisual.tsx!");
