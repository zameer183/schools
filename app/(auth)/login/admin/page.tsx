import LoginPageLayout from '../_layout';

export default function AdminLoginPage() {
  return (
    <LoginPageLayout config={{
      theme: {
        accent: '#D6A44C',
        accentAlpha: 'rgba(214,164,76,0.18)',
        btnBg: 'linear-gradient(135deg, #0A5C4A 0%, #0F7660 100%)',
        btnShadow: 'rgba(15,118,96,0.38)',
      },
      bg: '#0A5C4A',
      accent: '#D6A44C',
      portalLabel: 'Admin Portal',
      headingLines: ['Manage with', 'Clarity &', 'Purpose'],
      description: 'Full control over students, staff, fees, and academics — all in one place.',
      stats: [
        { label: 'Students Enrolled', value: '2,400+' },
        { label: 'Staff Members',     value: '120+' },
        { label: 'Active Classes',    value: '80+' },
      ],
      pattern: 'islamic',
    }} />
  );
}
