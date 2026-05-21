import sharp from "sharp";
import { writeFileSync } from "fs";

// Purple #6d28d9 = rgb(109, 40, 217)
const R = 109, G = 40, B = 217;

async function generateIcon(size, outputPath) {
  const radius = Math.round(size * 0.22);

  // SVG icon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#6d28d9"/>
  <!-- Chat bubble -->
  <rect x="${size*0.22}" y="${size*0.25}" width="${size*0.56}" height="${size*0.38}" rx="${size*0.07}" fill="white" fill-opacity="0.92"/>
  <!-- Tail -->
  <polygon points="${size*0.28},${size*0.63} ${size*0.36},${size*0.73} ${size*0.44},${size*0.63}" fill="white" fill-opacity="0.92"/>
  <!-- Dots -->
  <circle cx="${size*0.38}" cy="${size*0.44}" r="${size*0.036}" fill="#6d28d9"/>
  <circle cx="${size*0.50}" cy="${size*0.44}" r="${size*0.036}" fill="#6d28d9"/>
  <circle cx="${size*0.62}" cy="${size*0.44}" r="${size*0.036}" fill="#6d28d9"/>
</svg>`;

  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(outputPath);

  console.log(`Generated ${outputPath}`);
}

await generateIcon(192, "public/icons/icon-192.png");
await generateIcon(512, "public/icons/icon-512.png");
console.log("All icons generated!");
