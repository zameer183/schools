import LoginPageLayout from '../_layout';

export default function TeacherLoginPage() {
  return (
    <LoginPageLayout config={{
      theme: {
        accent: '#FB923C',
        accentAlpha: 'rgba(251,146,60,0.18)',
        btnBg: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        btnShadow: 'rgba(49,46,129,0.42)',
      },
      bg: '#1E1B4B',
      accent: '#FB923C',
      portalLabel: 'Teacher Portal',
      headingLines: ['Inspire', 'Every', 'Mind'],
      description: 'Manage your classes, track attendance, assign work, and review results — effortlessly.',
      stats: [
        { label: 'Classes Today', value: '8' },
        { label: 'My Students',   value: '240+' },
        { label: 'Assignments',   value: '36' },
      ],
      pattern: 'grid',
    }} />
  );
}
