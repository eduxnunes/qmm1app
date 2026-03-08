import { AuditSample, AuditTarget } from './types';

const SAMPLES_KEY = 'isir_samples';
const TARGETS_KEY = 'isir_targets';

const DEFAULT_TARGETS: AuditTarget[] = [
  { auditType: '0-Series (Components)', target: 4 },
  { auditType: '0-Series (Manuals)', target: 4 },
  { auditType: "BC's ODU", target: 4 },
  { auditType: 'C-Samples (Appliance)', target: 5 },
  { auditType: 'Components', target: 15 },
  { auditType: 'Kits S854', target: 12 },
  { auditType: 'Kits S881', target: 28 },
  { auditType: 'Delta ISIR (Metrology)', target: 5 },
  { auditType: 'ISIR Audit', target: 4 },
  { auditType: 'Metrology ISIR', target: 4 },
  { auditType: '0-Series (Appliance)', target: 4 },
];

const DEMO_SAMPLE: AuditSample = {
  id: '2026-00001',
  day: 6,
  month: 1,
  year: 2026,
  auditType: '0-Series (Components)',
  section: '881-Spares Cacia',
  valueStream: 'ES',
  ttnr: '8738215975',
  description: 'Manifold U30-30 Grundfos',
  comments: '',
  status: '',
  dueDate: '2026-01-06',
  decisionDate: '2026-01-06',
  mdgm: '000002681',
  ecr: '',
  softExpert: '001982',
  problemSolving: '',
  date: '2026-01-06',
  user: 'admin',
};

export function getSamples(): AuditSample[] {
  const data = localStorage.getItem(SAMPLES_KEY);
  if (!data) {
    localStorage.setItem(SAMPLES_KEY, JSON.stringify([DEMO_SAMPLE]));
    return [DEMO_SAMPLE];
  }
  return JSON.parse(data);
}

export function saveSample(sample: AuditSample): void {
  const samples = getSamples();
  const idx = samples.findIndex((s) => s.id === sample.id);
  if (idx >= 0) {
    samples[idx] = sample;
  } else {
    samples.push(sample);
  }
  localStorage.setItem(SAMPLES_KEY, JSON.stringify(samples));
}

export function deleteSample(id: string): void {
  const samples = getSamples().filter((s) => s.id !== id);
  localStorage.setItem(SAMPLES_KEY, JSON.stringify(samples));
}

export function getNextId(year: number): string {
  const samples = getSamples();
  const yearSamples = samples.filter((s) => s.year === year);
  const maxNum = yearSamples.reduce((max, s) => {
    const num = parseInt(s.id.split('-')[1], 10);
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(5, '0')}`;
}

export function getTargets(): AuditTarget[] {
  const data = localStorage.getItem(TARGETS_KEY);
  if (!data) {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(DEFAULT_TARGETS));
    return DEFAULT_TARGETS;
  }
  return JSON.parse(data);
}

export function saveTargets(targets: AuditTarget[]): void {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}
