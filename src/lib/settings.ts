const SETTINGS_KEY = 'isir_settings';

export interface AppSettings {
  auditTypes: string[];
  sections: string[];
  valueStreams: string[];
  statusOptions: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  auditTypes: [
    '0-Series (Appliance)', '0-Series (Components)', '0-Series (Make Ready)', '0-Series (Manuals)',
    "BC's ODU", 'C-Sample (Components)', 'C-Samples (Appliance)', 'Components',
    'Delta ISIR (Metrology)', 'Dimensional Analysis', 'ISIR Audit', 'ISIR SP',
    'Kits S854', 'Kits S881', 'Metrology ISIR',
  ],
  sections: [
    '851-Aut. Gás - CPT2', '851-Aut. Gás - CPT3', '851-Manifolds FP', '852-Aut. Água - CAE3',
    '853-Maquinação/ SERI + SERI P', '853-Queimadores C2 + KHANY', '856-Prep. Gas - CPT1 + TA (DZ5L)',
    '857-Aut. Água - CAE2 + Prep.agua (classicos)', '858-C7 (HE for CDI+Trendline)', '859-Chaminés',
    '860-Manifolds C4', '860-Queimadores C4', '861-Spares Taboeira', "869/870-BC's / CKD's",
    '871-C1', '871-C3', '872-L8', '873-Linha 13 (Proline)', '875-Linha 7 (CDI)',
    '877-Linha 10 (C4000+C2000)', '879-C6 (HE for C2000 & C4000)', '880-Prettl / Teclas',
    '881-Spares Cacia', '883-Linha 14 (C1000 + HO)', '884-Linha 12 (Trendline)',
    '886-U01 (HB for C1000 + C1000DZ)', '890-U02 (HB for CDI + C4000)', 'S822-Prensas',
    'S831 Pintura-Pintura', 'S831-Estampagem', 'S832 Pintura-Pintura', 'S842-Camaras de combustão',
    'S843-Tubos', 'S851 - Taboeira-CAE', 'S854 manuais-kits / Manuais', 'S855 preparações-Preparações',
    'S865-EWI Preparações', 'S866-EWI', 'S867-Linha 5', 'S874-Linha 6', 'S876-Linha 9',
    'S878-Refbox ODU2', 'S882-Linha 11', "S885 BC's-BC's ODU", 'S886-Linha 2 & Linha 4',
    'S887-Linha 15', 'S888-Linha 16', 'S891-Refbox ODU3', 'S893-Linha 17 - Prep.', 'S894-Linha 17',
  ],
  valueStreams: ['CS', 'ES', 'MFE-C'],
  statusOptions: ['OK', 'NOK', 'Cancelled', 'Under Analysis'],
};

export function getSettings(): AppSettings {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return JSON.parse(data);
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
