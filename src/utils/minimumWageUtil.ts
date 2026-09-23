import { MinimumWage, WageComplianceResult } from '../types';

// Initial Fallback Reference Data for UMP / UMK Indonesia (Focusing on Mining & Major Hubs)
export const DEFAULT_MINIMUM_WAGES: MinimumWage[] = [
  {
    id: 'umk-sultra-konawe-utara-2026',
    province: 'Sulawesi Tenggara',
    cityDistrict: 'Kab. Konawe Utara',
    type: 'UMK',
    year: 2026,
    amount: 3250000,
    regulationRef: 'SK Gubernur Sultra No. 721/2025 (PP 49/2025 α=0.75)',
    notes: 'Kawasan Industri Pertambangan Nikel Konawe Utara - Penyesuaian PP 49/2025 (Alfa 0,75)',
    createdAt: new Date('2025-12-01').toISOString()
  },
  {
    id: 'umk-sultra-kendari-2026',
    province: 'Sulawesi Tenggara',
    cityDistrict: 'Kota Kendari',
    type: 'UMK',
    year: 2026,
    amount: 3180000,
    regulationRef: 'SK Gubernur Sultra No. 720/2025',
    notes: 'Ibukota Provinsi Sulawesi Tenggara',
    createdAt: new Date('2025-12-01').toISOString()
  },
  {
    id: 'ump-sultra-2026',
    province: 'Sulawesi Tenggara',
    cityDistrict: 'Seluruh Wilayah Sultra',
    type: 'UMP',
    year: 2026,
    amount: 2985000,
    regulationRef: 'SK Gubernur Sultra No. 715/2025',
    notes: 'Upah Minimum Provinsi Sulawesi Tenggara',
    createdAt: new Date('2025-11-21').toISOString()
  },
  {
    id: 'umk-sulteng-morowali-2026',
    province: 'Sulawesi Tengah',
    cityDistrict: 'Kab. Morowali',
    type: 'UMK',
    year: 2026,
    amount: 3650000,
    regulationRef: 'SK Gubernur Sulteng No. 580/2025',
    notes: 'Kawasan Industri Smelter IMIP Morowali',
    createdAt: new Date('2025-12-01').toISOString()
  },
  {
    id: 'ump-dki-2026',
    province: 'DKI Jakarta',
    cityDistrict: 'DKI Jakarta',
    type: 'UMP',
    year: 2026,
    amount: 5395000,
    regulationRef: 'Kepgub DKI Jakarta No. 1150/2025',
    notes: 'Upah Minimum Provinsi DKI Jakarta',
    createdAt: new Date('2025-11-21').toISOString()
  },
  {
    id: 'umk-kaltim-kukar-2026',
    province: 'Kalimantan Timur',
    cityDistrict: 'Kab. Kutai Kartanegara',
    type: 'UMK',
    year: 2026,
    amount: 3720000,
    regulationRef: 'SK Gubernur Kaltim No. 430/2025',
    notes: 'Sektor Batubara & Penyangga IKN',
    createdAt: new Date('2025-12-01').toISOString()
  },
  {
    id: 'ump-jabar-2026',
    province: 'Jawa Barat',
    cityDistrict: 'Seluruh Wilayah Jabar',
    type: 'UMP',
    year: 2026,
    amount: 2150000,
    regulationRef: 'Kepgub Jabar No. 561/2025',
    notes: 'Upah Minimum Provinsi Jawa Barat',
    createdAt: new Date('2025-11-21').toISOString()
  }
];

/**
 * Utility Function: Checks if an employee salary complies with regional minimum wage (UMP / UMK)
 * Can be imported by Payroll (Gaji & PPh), Severance (PHK), Remuneration, or Contract modules.
 * 
 * @param employeeWage Gross basic wage or salary to test
 * @param province Region province (e.g., 'Sulawesi Tenggara')
 * @param cityDistrict Optional city or district (e.g., 'Kab. Konawe Utara')
 * @param year Target reference year (defaults to 2026)
 * @param customList Optional array of MinimumWage records
 */
export function checkSalaryMinimumWageCompliance(
  employeeWage: number,
  province: string,
  cityDistrict?: string,
  year: number = 2026,
  customList?: MinimumWage[]
): WageComplianceResult {
  const wageList = customList && customList.length > 0 ? customList : DEFAULT_MINIMUM_WAGES;

  // 1. Try to find specific UMK match first (City/District & Year)
  let matchedWage = wageList.find(w => {
    const matchYear = w.year === year;
    const matchProv = w.province.toLowerCase().includes(province.toLowerCase());
    const matchCity = cityDistrict && w.cityDistrict
      ? w.cityDistrict.toLowerCase().includes(cityDistrict.toLowerCase()) || cityDistrict.toLowerCase().includes(w.cityDistrict.toLowerCase())
      : false;
    return matchYear && matchProv && matchCity;
  });

  // 2. If no UMK match, fallback to UMP match
  if (!matchedWage) {
    matchedWage = wageList.find(w => {
      const matchYear = w.year === year;
      const matchProv = w.province.toLowerCase().includes(province.toLowerCase());
      return matchYear && matchProv && w.type === 'UMP';
    });
  }

  // 3. Fallback to generic UMP if province matching fails
  if (!matchedWage) {
    matchedWage = wageList.find(w => w.province === 'Sulawesi Tenggara' && w.year === year) || DEFAULT_MINIMUM_WAGES[0];
  }

  const minWageAmount = matchedWage ? matchedWage.amount : 3000000;
  const difference = employeeWage - minWageAmount;
  const percentageDiff = minWageAmount > 0 ? Math.round((difference / minWageAmount) * 100 * 10) / 10 : 0;
  const isCompliant = employeeWage >= minWageAmount;

  let complianceStatus: 'Lulus UMK' | 'Di Bawah UMK' | 'Sesuai Pas UMK' = 'Lulus UMK';
  if (employeeWage < minWageAmount) {
    complianceStatus = 'Di Bawah UMK';
  } else if (Math.abs(difference) < 1000) {
    complianceStatus = 'Sesuai Pas UMK';
  }

  const regionName = matchedWage 
    ? `${matchedWage.province}${matchedWage.cityDistrict ? ' - ' + matchedWage.cityDistrict : ''}`
    : `${province}${cityDistrict ? ' - ' + cityDistrict : ''}`;

  return {
    isCompliant,
    employeeWage,
    minimumWageAmount: minWageAmount,
    region: regionName,
    type: matchedWage ? matchedWage.type : 'UMP',
    year: matchedWage ? matchedWage.year : year,
    difference,
    percentageDiff,
    complianceStatus,
    regulationRef: matchedWage ? matchedWage.regulationRef : 'SK Gubernur Terkait (PP 49/2025)'
  };
}

/**
 * Formula Penyesuaian Upah Minimum berdasarkan Peraturan Pemerintah (PP) Nomor 49 Tahun 2025:
 * Penyesuaian UM = UM_lama * [ Inflasi + (Pertumbuhan Ekonomi * Alpha) ]
 * @param baseWage Upah Minimum tahun sebelumnya (UM_t-1)
 * @param inflationPercent Tingkat inflasi provinsi (%)
 * @param growthPercent Pertumbuhan ekonomi provinsi / kab-kota (%)
 * @param alpha Indeks kontribusi tenaga kerja (default 0.75 sesuai PP No. 49 Tahun 2025)
 */
export function calculatePP49MinimumWage(
  baseWage: number,
  inflationPercent: number,
  growthPercent: number,
  alpha: number = 0.75
): {
  baseWage: number;
  inflationPercent: number;
  growthPercent: number;
  alpha: number;
  adjustmentPercentage: number;
  adjustmentAmount: number;
  newMinimumWage: number;
} {
  // Formula: Adjustment % = Inflasi + (PE * Alpha)
  const adjustmentPercentage = inflationPercent + (growthPercent * alpha);
  const adjustmentAmount = Math.round(baseWage * (adjustmentPercentage / 100));
  const newMinimumWage = baseWage + adjustmentAmount;

  return {
    baseWage,
    inflationPercent,
    growthPercent,
    alpha,
    adjustmentPercentage: Math.round(adjustmentPercentage * 100) / 100,
    adjustmentAmount,
    newMinimumWage
  };
}

