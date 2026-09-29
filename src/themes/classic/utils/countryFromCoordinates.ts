import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { RPGeometry } from '../static/run_countries';
import worldGeoJson from '../static/world.zh.json';

type CountryGeometry = Polygon | MultiPolygon;

type CountryFeature = {
  type: 'Feature';
  properties: {
    name?: string;
  } | null;
  geometry: CountryGeometry;
};

type CountryGeoJSON = FeatureCollection<CountryGeometry>;

const pointInRing = (point: [number, number], ring: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInPolygon = (
  point: [number, number],
  polygon: number[][][]
): boolean => {
  if (!pointInRing(point, polygon[0])) {
    return false;
  }

  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) {
      return false;
    }
  }

  return true;
};

const pointInGeometry = (
  point: [number, number],
  geometry: CountryGeometry
): boolean => {
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates);
  }

  return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
};

export const countryFromCoordinates = (
  point: [number, number]
): string | null => {
  for (const feature of worldGeoJson.features as CountryFeature[]) {
    if (
      feature.geometry &&
      pointInGeometry(point, feature.geometry) &&
      feature.properties?.name
    ) {
      return feature.properties.name;
    }
  }

  return null;
};
