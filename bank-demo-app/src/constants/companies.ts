export const COMPANIES = [
    { id: 'acme-corp', name: 'Acme Corporation' },
    { id: 'tech-startup', name: 'Tech Startup Inc.' },
    { id: 'global-finance', name: 'Global Finance Ltd.' },
    { id: 'digital-solutions', name: 'Digital Solutions Co.' },
    { id: 'enterprise-group', name: 'Enterprise Group' },
    { id: 'innovate-labs', name: 'Innovate Labs' },
    { id: 'mega-corp', name: 'Mega Corporation' },
    { id: 'startup-ventures', name: 'Startup Ventures' },
] as const;

export type CompanyId = typeof COMPANIES[number]['id'];

