/**
 * 카카오 Geocoding API로 주소 → 정확한 좌표 일괄 변환
 * 실행: node scripts/updateCoordinates.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH  = path.join(__dirname, '..', 'data', 'logisticsCenters.json');
const REST_KEY   = '1ab91ea28722431bec0299aab21d589c'; // 카카오 REST API 키

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 주소 검색 ── */
async function searchByAddress(query) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
  const res  = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_KEY}` } });
  const data = await res.json();
  if (data.documents?.length > 0) {
    const { x, y } = data.documents[0];
    return { latitude: parseFloat(y), longitude: parseFloat(x) };
  }
  return null;
}

/* ── 키워드 검색 (주소 검색 실패 시 fallback) ── */
async function searchByKeyword(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res  = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_KEY}` } });
  const data = await res.json();
  if (data.documents?.length > 0) {
    const { x, y } = data.documents[0];
    return { latitude: parseFloat(y), longitude: parseFloat(x) };
  }
  return null;
}

/* ── 좌표 조회 (3단계 시도) ── */
async function getCoords(name, address) {
  // 1차: 전체 주소
  let result = await searchByAddress(address);
  if (result) return { result, method: '주소검색' };

  await sleep(100);

  // 2차: 센터명 + 주소
  result = await searchByKeyword(`${name} ${address}`);
  if (result) return { result, method: '키워드(명+주소)' };

  await sleep(100);

  // 3차: 주소만 키워드 검색
  result = await searchByKeyword(address);
  if (result) return { result, method: '키워드(주소)' };

  return { result: null, method: '실패' };
}

/* ── 메인 ── */
async function main() {
  console.log('📍 카카오 Geocoding 좌표 보정 시작\n');

  const centers = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const updated = [];
  let successCount = 0;
  let failCount    = 0;

  for (const center of centers) {
    const address = center.address
      ?? `${center.province ?? ''} ${center.city ?? ''} ${center.district ?? ''}`.trim();

    const { result, method } = await getCoords(center.name, address);

    if (result) {
      const latDiff = Math.abs(result.latitude  - center.latitude).toFixed(4);
      const lngDiff = Math.abs(result.longitude - center.longitude).toFixed(4);

      console.log(`✅ ${center.name}`);
      console.log(`   방법: ${method}`);
      console.log(`   이전: ${center.latitude}, ${center.longitude}`);
      console.log(`   이후: ${result.latitude}, ${result.longitude}`);
      console.log(`   오차: lat ${latDiff} / lng ${lngDiff}\n`);

      updated.push({ ...center, latitude: result.latitude, longitude: result.longitude });
      successCount++;
    } else {
      console.log(`⚠️  ${center.name} — 좌표 못 찾음, 기존값 유지\n`);
      updated.push(center);
      failCount++;
    }

    await sleep(300); // API Rate limit 방지
  }

  // 결과 저장
  fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2), 'utf-8');

  console.log('─'.repeat(50));
  console.log(`✅ 성공: ${successCount}개 / ⚠️ 실패: ${failCount}개`);
  console.log('📁 data/logisticsCenters.json 업데이트 완료!');
  console.log('\n💡 Google Sheets 좌표도 업데이트 하시려면');
  console.log('   updated_coords.csv 를 참고하세요.');

  // CSV로도 저장 (Google Sheets 붙여넣기용)
  const csvHeader = 'id,name,latitude,longitude';
  const csvRows   = updated.map(c => `${c.id},${c.name},${c.latitude},${c.longitude}`);
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'updated_coords.csv'),
    [csvHeader, ...csvRows].join('\n'),
    'utf-8',
  );
  console.log('📄 data/updated_coords.csv 저장 완료! (Sheets 붙여넣기용)');
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});