// GPS 지오펜싱: 사무실 반경 안에 있는지 판별한다.

// 기본값: 서울시 중구 명동길 73 부근(명동성당 인근) 추정 좌표.
// 실제 운영 시 .env의 OFFICE_LATITUDE/LONGITUDE로 정확히 보정하세요.
const OFFICE_LAT = parseFloat(process.env.OFFICE_LATITUDE ?? "37.5636");
const OFFICE_LNG = parseFloat(process.env.OFFICE_LONGITUDE ?? "126.9868");
const OFFICE_RADIUS_M = parseFloat(process.env.OFFICE_RADIUS_METERS ?? "150");

/** 두 좌표 사이의 거리(미터). Haversine 공식. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // 지구 반지름(m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function officeConfig() {
  return { lat: OFFICE_LAT, lng: OFFICE_LNG, radius: OFFICE_RADIUS_M };
}

/** 주어진 좌표가 사무실 허용 반경 안에 있는지 검사한다. */
export function isWithinOffice(lat: number, lng: number) {
  const dist = distanceMeters(lat, lng, OFFICE_LAT, OFFICE_LNG);
  return { ok: dist <= OFFICE_RADIUS_M, distance: Math.round(dist) };
}
