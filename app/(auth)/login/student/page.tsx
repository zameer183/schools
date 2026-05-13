import LoginPageLayout from '../_layout';

export default function StudentLoginPage() {
  return (
    <LoginPageLayout config={{
      theme: {
        accent: '#E9B384',
        accentAlpha: 'rgba(233,179,132,0.18)',
        btnBg: 'linear-gradient(135deg, #2E1065 0%, #4C1D95 100%)',
        btnShadow: 'rgba(76,29,149,0.40)',
      },
      bg: '#2E1065',
      accent: '#E9B384',
      portalLabel: 'Student Portal',
      headingLines: ['Begin', 'Your', 'Journey'],
      description: 'Track your attendance, fees, results, and assignments — stay ahead every day.',
      stats: [
        { label: 'Attendance',  value: '94%' },
        { label: 'Subjects',    value: '8' },
        { label: 'Results',     value: 'Online' },
      ],
      pattern: 'dots',
    }} />
  );
}
