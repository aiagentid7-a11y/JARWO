import { LaborRegulation, MinimumWage, WageComplianceResult } from '../src/types';
import { DEFAULT_MINIMUM_WAGES, checkSalaryMinimumWageCompliance } from '../src/utils/minimumWageUtil';

// In-memory initial data for Regulations
export let laborRegulations: LaborRegulation[] = [
  {
    id: 'reg-pp35-2021',
    title: 'PP No. 35 Tahun 2021',
    category: 'PHK',
    summary: 'Penyelenggaraan Perjanjian Kerja Waktu Tertentu (PKWT), Alih Daya (Outsourcing), Waktu Kerja dan Waktu Istirahat, serta Pemutusan Hubungan Kerja (PHK). Mengatur rumus Pesangon (UP), UPMK, dan UPH.',
    effectiveDate: '2021-02-02',
    status: 'aktif',
    documentNumber: 'PP 35/2021',
    issuingAuthority: 'Pemerintah RI / Presiden',
    downloadUrl: 'https://jdih.kemnaker.go.id/kategori/peraturan-pemerintah',
    createdAt: new Date('2021-02-02').toISOString()
  },
  {
    id: 'reg-pp49-2025',
    title: 'PP No. 49 Tahun 2025 tentang Pengupahan',
    category: 'pengupahan',
    summary: 'Peraturan Pemerintah Nomor 49 Tahun 2025 tentang Pengupahan. Formula penyesuaian UMP & UMK berbasis Inflasi + (Pertumbuhan Ekonomi × α), dengan nilai alfa (α) ditetapkan sebesar 0,75. Pengusaha dilarang membayar upah di bawah UMP/UMK untuk pekerja dengan masa kerja ≥ 1 tahun.',
    effectiveDate: '2025-11-20',
    status: 'aktif',
    documentNumber: 'PP 49/2025',
    issuingAuthority: 'Pemerintah RI / Presiden',
    downloadUrl: 'https://jdih.kemnaker.go.id',
    createdAt: new Date('2025-11-20').toISOString()
  },
  {
    id: 'reg-pp51-2023',
    title: 'PP No. 51 Tahun 2023 (Perubahan PP 36/2021)',
    category: 'pengupahan',
    summary: 'Perubahan atas PP No. 36/2021 tentang Pengupahan. Regulasi pendahulu sebelum penetapan penyesuaian regulasi baru PP No. 49/2025.',
    effectiveDate: '2023-11-10',
    status: 'direvisi',
    documentNumber: 'PP 51/2023',
    issuingAuthority: 'Kementerian Ketenagakerjaan RI',
    downloadUrl: 'https://jdih.kemnaker.go.id',
    createdAt: new Date('2023-11-10').toISOString()
  },
  {
    id: 'reg-uu6-2023',
    title: 'UU No. 6 Tahun 2023 (UU Cipta Kerja)',
    category: 'ketenagakerjaan',
    summary: 'Penetapan Perpu No. 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang. Mengubah Klaster Ketenagakerjaan UU No. 13/2003.',
    effectiveDate: '2023-03-31',
    status: 'aktif',
    documentNumber: 'UU 6/2023',
    issuingAuthority: 'DPR RI / Presiden',
    downloadUrl: 'https://peraturan.go.id',
    createdAt: new Date('2023-03-31').toISOString()
  },
  {
    id: 'reg-pmk168-2023',
    title: 'PMK No. 168 Tahun 2023 (TER PPh 21)',
    category: 'pajak',
    summary: 'Petunjuk Pelaksanaan Pemotongan Pajak atas Penghasilan Sehubungan dengan Pekerjaan dengan Tarif Efektif Rata-Rata (TER) Kategori A, B, dan C.',
    effectiveDate: '2024-01-01',
    status: 'aktif',
    documentNumber: 'PMK 168/2023',
    issuingAuthority: 'Kementerian Keuangan RI',
    downloadUrl: 'https://jdih.kemenkeu.go.id',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'reg-perpres-bpjs',
    title: 'Perpres No. 59 Tahun 2024 (BPJS Kesehatan & KRIS)',
    category: 'BPJS',
    summary: 'Jaminan Kesehatan Nasional dan Penerapan Kelas Rawat Inap Standar (KRIS). Batas atas upah BPJS Kesehatan sebesar Rp 12.000.000.',
    effectiveDate: '2024-05-08',
    status: 'aktif',
    documentNumber: 'Perpres 59/2024',
    issuingAuthority: 'Presiden RI',
    downloadUrl: 'https://bpjs-kesehatan.go.id',
    createdAt: new Date('2024-05-08').toISOString()
  },
  {
    id: 'reg-permenaker5-2018',
    title: 'Permenaker No. 5 Tahun 2018 (K3 Lingkungan Kerja)',
    category: 'k3',
    summary: 'Keselamatan dan Kesehatan Kerja (K3) Lingkungan Kerja, Pengukuran Faktor Fisika, Kimia, Biologi, Ergonomi, dan Psikologi di Site Tambang/Pabrik.',
    effectiveDate: '2018-04-27',
    status: 'aktif',
    documentNumber: 'Permenaker 5/2018',
    issuingAuthority: 'Kementerian Ketenagakerjaan RI',
    downloadUrl: 'https://jdih.kemnaker.go.id',
    createdAt: new Date('2018-04-27').toISOString()
  }
];

// In-memory minimum wages store
export let minimumWagesStore: MinimumWage[] = [...DEFAULT_MINIMUM_WAGES];

// Helpers
export function getAllRegulations(category?: string, status?: string, search?: string): LaborRegulation[] {
  return laborRegulations.filter(r => {
    const matchCat = !category || category === 'all' || r.category === category;
    const matchStatus = !status || status === 'all' || r.status === status;
    const matchSearch = !search || 
      r.title.toLowerCase().includes(search.toLowerCase()) || 
      r.summary.toLowerCase().includes(search.toLowerCase()) ||
      (r.documentNumber && r.documentNumber.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchStatus && matchSearch;
  });
}

export function saveLaborRegulation(data: Partial<LaborRegulation>): LaborRegulation {
  const existingIdx = laborRegulations.findIndex(r => r.id === data.id);
  const updated: LaborRegulation = {
    id: data.id || `reg-${Date.now()}`,
    title: data.title || 'Peraturan Baru',
    category: data.category || 'ketenagakerjaan',
    summary: data.summary || '',
    effectiveDate: data.effectiveDate || new Date().toISOString().split('T')[0],
    status: data.status || 'aktif',
    documentNumber: data.documentNumber || '',
    issuingAuthority: data.issuingAuthority || 'Kemenaker',
    downloadUrl: data.downloadUrl || '',
    createdAt: data.createdAt || new Date().toISOString()
  };

  if (existingIdx !== -1) {
    laborRegulations[existingIdx] = updated;
  } else {
    laborRegulations.unshift(updated);
  }
  return updated;
}

export function deleteLaborRegulation(id: string): boolean {
  const len = laborRegulations.length;
  laborRegulations = laborRegulations.filter(r => r.id !== id);
  return laborRegulations.length < len;
}

export function getAllMinimumWages(province?: string, year?: number, search?: string): MinimumWage[] {
  return minimumWagesStore.filter(w => {
    const matchProv = !province || province === 'all' || w.province.toLowerCase().includes(province.toLowerCase());
    const matchYear = !year || w.year === year;
    const matchSearch = !search || 
      w.province.toLowerCase().includes(search.toLowerCase()) || 
      (w.cityDistrict && w.cityDistrict.toLowerCase().includes(search.toLowerCase())) ||
      (w.regulationRef && w.regulationRef.toLowerCase().includes(search.toLowerCase()));
    return matchProv && matchYear && matchSearch;
  });
}

export function saveMinimumWage(data: Partial<MinimumWage>): MinimumWage {
  const existingIdx = minimumWagesStore.findIndex(w => w.id === data.id);
  const updated: MinimumWage = {
    id: data.id || `umk-${Date.now()}`,
    province: data.province || 'Sulawesi Tenggara',
    cityDistrict: data.cityDistrict || '',
    type: data.type || (data.cityDistrict ? 'UMK' : 'UMP'),
    year: data.year || 2026,
    amount: Number(data.amount) || 3000000,
    regulationRef: data.regulationRef || 'SK Gubernur Terkait',
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString()
  };

  if (existingIdx !== -1) {
    minimumWagesStore[existingIdx] = updated;
  } else {
    minimumWagesStore.unshift(updated);
  }
  return updated;
}

export function deleteMinimumWage(id: string): boolean {
  const len = minimumWagesStore.length;
  minimumWagesStore = minimumWagesStore.filter(w => w.id !== id);
  return minimumWagesStore.length < len;
}

export function validateWageCompliance(wage: number, province: string, cityDistrict?: string, year: number = 2026): WageComplianceResult {
  return checkSalaryMinimumWageCompliance(wage, province, cityDistrict, year, minimumWagesStore);
}
