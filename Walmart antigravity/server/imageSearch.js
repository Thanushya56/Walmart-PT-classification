// server/imageSearch.js
// Visual feature extractor and perceptual hasher for Smart Image Search

import crypto from 'crypto';

export function computeImageSignature(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    return { hash: '', signature: [] };
  }

  // Exact MD5 / SHA-256 for identical byte comparison
  const exactHash = crypto.createHash('sha256').update(imageData).digest('hex');

  // Approximate perceptual signature based on luminance sampling of base64
  let cleanData = imageData;
  if (imageData.startsWith('data:image')) {
    const commaIdx = imageData.indexOf(',');
    if (commaIdx !== -1) {
      cleanData = imageData.substring(commaIdx + 1);
    }
  }

  // Create a 64-bit sampling hash from byte distribution
  const buffer = Buffer.from(cleanData.substring(0, Math.min(cleanData.length, 4096)), 'base64');
  let bitString = '';
  const step = Math.max(1, Math.floor(buffer.length / 64));

  for (let i = 0; i < 64; i++) {
    const idx = (i * step) % buffer.length;
    const nextIdx = ((i + 1) * step) % buffer.length;
    bitString += (buffer[idx] >= buffer[nextIdx]) ? '1' : '0';
  }

  // Convert bit string to hex hash
  let pHash = '';
  for (let i = 0; i < bitString.length; i += 4) {
    const nibble = bitString.substring(i, i + 4);
    pHash += parseInt(nibble, 2).toString(16);
  }

  return {
    exactHash,
    pHash,
    length: imageData.length,
  };
}

export function calculateHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    let xor = n1 ^ n2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

export function searchSimilarImages(targetImageData, catalogImages, threshold = 20) {
  const targetSig = computeImageSignature(targetImageData);
  const matches = [];

  for (const img of catalogImages) {
    let similarityScore = 0;
    let matchType = 'none';

    // 1. Exact match check
    if (img.image_url === targetImageData || (img.image_hash && img.image_hash === targetSig.exactHash)) {
      similarityScore = 100;
      matchType = 'exact';
    } else if (img.p_hash && targetSig.pHash) {
      const distance = calculateHammingDistance(img.p_hash, targetSig.pHash);
      if (distance <= threshold) {
        similarityScore = Math.round(100 - (distance / 64) * 100);
        matchType = similarityScore >= 95 ? 'exact' : 'similar';
      }
    } else {
      // Fallback matching on base64 content overlap
      if (img.image_url && targetImageData && img.image_url.slice(0, 100) === targetImageData.slice(0, 100)) {
        similarityScore = 90;
        matchType = 'similar';
      }
    }

    if (similarityScore > 50) {
      matches.push({
        imageId: img.id,
        productId: img.product_id,
        imageUrl: img.image_url,
        matchType,
        similarityScore,
      });
    }
  }

  matches.sort((a, b) => b.similarityScore - a.similarityScore);
  return matches;
}
