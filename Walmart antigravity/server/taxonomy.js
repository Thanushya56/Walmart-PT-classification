// server/taxonomy.js
// High-performance parser and search index for Walmart Product Type Taxonomy

import fs from 'fs';
import path from 'path';

let taxonomyIndex = [];
let categoriesList = [];

export function loadTaxonomy() {
  const filePath = 'D:\\Walmart files\\Taxonomy csv.csv';
  if (!fs.existsSync(filePath)) {
    console.warn(`Taxonomy file not found at ${filePath}. Using fallback seed data.`);
    taxonomyIndex = getFallbackTaxonomy();
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const records = [];
    const categoriesSet = new Set();

    // CSV parser handling quoted strings with commas and newlines
    let currentRecord = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            currentField += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRecord.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }

      if (!inQuotes) {
        currentRecord.push(currentField.trim());
        currentField = '';

        if (currentRecord.length >= 6) {
          const ptName = currentRecord[0];
          const ptKey = currentRecord[1];
          const ptPath = currentRecord[2];
          const description = currentRecord[3];
          const category = currentRecord[4];
          const family = currentRecord[5];

          if (ptName && ptKey) {
            records.push({
              name: ptName,
              key: ptKey.toLowerCase(),
              path: ptPath,
              description,
              category,
              family,
            });
            if (category) categoriesSet.add(category);
          }
        }
        currentRecord = [];
      } else {
        currentField += '\n';
      }
    }

    taxonomyIndex = records;
    categoriesList = Array.from(categoriesSet).sort();
    console.log(`Loaded ${taxonomyIndex.length} Walmart Product Types and ${categoriesList.length} categories.`);
  } catch (err) {
    console.error('Error loading taxonomy:', err);
    taxonomyIndex = getFallbackTaxonomy();
  }
}

export function searchTaxonomy(query = '', category = '', limit = 30) {
  if (!taxonomyIndex.length) loadTaxonomy();
  const q = query.toLowerCase().trim();

  let results = taxonomyIndex;

  if (category) {
    results = results.filter(pt => pt.category && pt.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    // Scoring: exact match = 100, starts with = 50, contains in name = 30, contains in description = 10
    const scored = [];
    for (const pt of results) {
      let score = 0;
      const lowerName = pt.name.toLowerCase();
      if (lowerName === q) score += 100;
      else if (lowerName.startsWith(q)) score += 50;
      else if (lowerName.includes(q)) score += 30;
      else if (pt.key.includes(q)) score += 20;
      else if (pt.description && pt.description.toLowerCase().includes(q)) score += 10;

      if (score > 0) {
        scored.push({ ...pt, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  return results.slice(0, limit);
}

export function getCategories() {
  if (!categoriesList.length) loadTaxonomy();
  return categoriesList;
}

export function findPTByName(name) {
  if (!taxonomyIndex.length) loadTaxonomy();
  if (!name) return null;
  const target = name.toLowerCase().trim();
  return taxonomyIndex.find(pt => pt.name.toLowerCase() === target || pt.key === target) || null;
}

function getFallbackTaxonomy() {
  return [
    { name: "3D Glasses", key: "3d glasses", path: "Electronics>TV & Video>3D Glasses", description: "Glasses worn to enable people to view content in 3D.", category: "Electronics", family: "TV & Video" },
    { name: "Adhesive Bandages", key: "adhesive bandages", path: "Health & Beauty>Bandages>Adhesive Bandages", description: "Small medical dressing used for minor injuries.", category: "Health & Beauty", family: "Bandages" },
    { name: "Air Fresheners", key: "air fresheners", path: "Home & Garden>Home Fragrance>Air Fresheners", description: "Designed to mask or remove unpleasant odors.", category: "Home & Garden", family: "Home Fragrance" },
    { name: "Animal Dental Care Tools", key: "animal dental care tools", path: "Pet Supplies>Pet Health>Dental Tools", description: "Tools and sprays used to care for animal teeth and gums.", category: "Pet Supplies", family: "Pet Health Supplies" },
    { name: "Art Paint Mediums", key: "art paint mediums", path: "Crafts>Art Supplies>Art Paint Mediums", description: "Substance added to paint to change its properties.", category: "Crafts", family: "Art Supplies" },
  ];
}
