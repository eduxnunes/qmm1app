const LINKS_KEY = 'isir_links';

export interface AppLink {
  id: string;
  label: string;
  category: 'network' | 'web' | 'template';
  url: string;
  description: string;
}

const DEFAULT_LINKS: AppLink[] = [
  // Network folder paths
  { id: 'isir-folder', label: 'ISIR Main Folder', category: 'network', url: '\\\\server\\share\\ISIR\\', description: 'Root ISIR network folder' },
  { id: 'isir-reports', label: 'ISIR Reports', category: 'network', url: '\\\\server\\share\\ISIR\\Reports\\', description: 'Reports output folder' },
  { id: 'isir-templates', label: 'ISIR Templates', category: 'network', url: '\\\\server\\share\\ISIR\\Templates\\', description: 'Audit templates folder' },
  { id: 'isir-archive', label: 'ISIR Archive', category: 'network', url: '\\\\server\\share\\ISIR\\Archive\\', description: 'Archived audits folder' },
  // Web URLs (SoftExpert, ECR, MDGM)
  { id: 'softexpert', label: 'SoftExpert', category: 'web', url: 'https://softexpert.company.com/se/record?id={softExpert}', description: 'SoftExpert record — use {softExpert} as placeholder' },
  { id: 'ecr', label: 'ECR System', category: 'web', url: 'https://ecr.company.com/ecr/{ecr}', description: 'ECR record — use {ecr} as placeholder' },
  { id: 'mdgm', label: 'MDGM System', category: 'web', url: 'https://mdgm.company.com/view/{mdgm}', description: 'MDGM record — use {mdgm} as placeholder' },
  { id: 'problem-solving', label: 'Problem Solving', category: 'web', url: 'https://ps.company.com/case/{problemSolving}', description: 'Problem Solving record — use {problemSolving} as placeholder' },
];

export function getLinks(): AppLink[] {
  const data = localStorage.getItem(LINKS_KEY);
  if (!data) {
    localStorage.setItem(LINKS_KEY, JSON.stringify(DEFAULT_LINKS));
    return DEFAULT_LINKS;
  }
  return JSON.parse(data);
}

export function saveLinks(links: AppLink[]): void {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

/** Resolve a URL template with sample values */
export function resolveLink(urlTemplate: string, sample: Record<string, string>): string {
  return urlTemplate.replace(/\{(\w+)\}/g, (_, key) => sample[key] || '');
}
