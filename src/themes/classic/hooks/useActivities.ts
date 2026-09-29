import { useMemo } from 'react';
import type { Activity } from '../utils/utils';
import { locationForRun, titleForRun } from '../utils/utils';
import { countryFromCoordinates } from '../utils/countryFromCoordinates';
import { pathForRun } from '../utils/geoUtils';
import activitiesUrl from '@/static/activities.json?url';
import { COUNTRY_STANDARDIZATION } from '../static/city';

interface ProcessedActivities {
  activities: Activity[];
  years: string[];
  countries: string[];
  provinces: string[];
  cities: Record<string, number>;
  runPeriod: Record<string, number>;
  thisYear: string;
}

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }
  return country;
};

let activityDataCache: Activity[] | null = null;
let activityDataError: unknown = null;
let activityDataPromise: Promise<Activity[]> | null = null;

const loadActivityData = () => {
  activityDataPromise ??= fetch(activitiesUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load activities: ${response.status}`);
      }
      return response.json() as Promise<Activity[]>;
    })
    .then((activityData) => {
      activityDataCache = activityData;
      return activityData;
    })
    .catch((error: unknown) => {
      activityDataError = error;
      throw error;
    });

  return activityDataPromise;
};

const getActivityData = () => {
  if (activityDataError) throw activityDataError;
  if (activityDataCache) return activityDataCache;
  throw loadActivityData();
};

const processActivities = (activityData: Activity[]): ProcessedActivities => {
  console.log('PROCESS ACTIVITIES EJECUTADO', activityData.length);
  alert(`CLASSIC useActivities: ${activityData.length} actividades`);

  const cities: Record<string, number> = {};
  const runPeriod: Record<string, number> = {};
  const provinces: Set<string> = new Set();
  const countries: Set<string> = new Set();
  const years: Set<string> = new Set();

  activityData.forEach((run) => {
    const location = locationForRun(run);

    const periodName = titleForRun(run);
    if (periodName) {
      runPeriod[periodName] = runPeriod[periodName]
        ? runPeriod[periodName] + 1
        : 1;
    }

    const { city, province, country } = location;
    let detectedCountry = country;

    if (!detectedCountry && run.summary_polyline) {
      const path = pathForRun(run);

      if (path.length > 0) {
        detectedCountry = countryFromCoordinates(path[0]);

        if (detectedCountry) {
          console.log(
            'PAÍS POR GPS:',
            run.run_id,
            run.name,
            path[0],
            detectedCountry
          );
        } else {
          console.log('GPS SIN PAÍS:', run.run_id, run.name, path[0]);
        }
      }
    }
    // drop only one char city
    if (city.length > 1) {
      cities[city] = cities[city] ? cities[city] + run.distance : run.distance;
    }

    if (province) provinces.add(province);

    if (detectedCountry) {
      countries.add(standardizeCountryName(detectedCountry));
    }

    const year = run.start_date_local.slice(0, 4);
    years.add(year);
  });

  const yearsArray = [...years].sort().reverse();
  const thisYear = yearsArray[0] || '';

  return {
    activities: activityData,
    years: yearsArray,
    countries: [...countries],
    provinces: [...provinces],
    cities,
    runPeriod,
    thisYear,
  };
};

let processedActivitiesCache: {
  activityData: Activity[];
  processedActivities: ProcessedActivities;
} | null = null;

const getProcessedActivities = (activityData: Activity[]) => {
  if (processedActivitiesCache?.activityData === activityData) {
    return processedActivitiesCache.processedActivities;
  }

  const processedActivities = processActivities(activityData);
  processedActivitiesCache = { activityData, processedActivities };
  return processedActivities;
};

const useActivities = () => {
  const activityData = getActivityData();
  return useMemo(() => getProcessedActivities(activityData), [activityData]);
};

export default useActivities;
