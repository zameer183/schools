'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;

const SEMESTERS = ['Fall 2024', 'Spring 2025', 'Summer 2025'];

export default function EnrollStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [enrolledId, setEnrolledId] = useState('');
  const [error, setError] = useState('');

  const [form1, setForm1] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    guardianName: '',
    phone: '',
    email: '',
  });

  const [form2, setForm2] = useState({
    classPlacement: '',
    semester: 'Fall 2024',
    hostel: false,
    transport: false,
    notes: '',
  });

  const handleEnroll = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form1, ...form2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');
      setEnrolledId(data.admissionNo || 'SCH-' + Date.now().toString().slice(-6));
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-0 mb-8">
      {([1, 2, 3] as Step[]).map((s, i) => (
        <div key={s} className="flex items-center gap-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            step > s ? 'bg-[#004649] text-white' : step === s ? 'bg-[#004649] text-white ring-4 ring-[#004649]/20' : 'bg-[#e2e8e8] text-[#6f7979]'
          }`}>
            {step > s ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : s}
          </div>
          <div className="text-center ml-2 mr-4">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${step === s ? 'text-[#004649]' : 'text-[#6f7979]'}`}>
              {s === 1 ? 'Personal' : s === 2 ? 'Academic' : 'Review'}
            </p>
          </div>
          {i < 2 && <div className={`w-12 h-0.5 mr-4 ${step > s ? 'bg-[#004649]' : 'bg-[#e2e8e8]'}`} />}
        </div>
      ))}
    </div>
  );

  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-8 text-center">
          <StepIndicator />
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#004649] flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-[#1a1c1c]">Success!</h2>
            <p className="text-[#6f7979]">Student Successfully Enrolled</p>
            <div className="border-2 border-dashed border-[#e2e8e8] rounded-xl px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1">Generated Student ID</p>
              <p className="text-2xl font-bold text-[#1a1c1c] font-mono">{enrolledId}</p>
            </div>
            <div className="space-y-2 mt-4">
              <button className="w-full rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition">
                Download Admission Letter
              </button>
              <button
                onClick={() => router.push('/admin/students')}
                className="w-full rounded-xl border border-[#e2e8e8] py-3 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <button onClick={() => router.push('/admin/students')} className="flex items-center gap-1.5 text-sm text-[#6f7979] hover:text-[#1a1c1c] mb-4 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Students
        </button>
        <StepIndicator />

        {step === 1 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300] mb-1">Step 1 of 3</p>
            <h2 className="text-3xl font-bold text-[#1a1c1c] mb-1">Personal Details</h2>
            <p className="text-sm text-[#6f7979] mb-6">Please provide the student&apos;s legal identification details and primary guardian contact information to begin the enrollment process.</p>

            <div className="space-y-5">
              <div className="rounded-xl border border-[#e2e8e8] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-4 w-4 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <h3 className="font-semibold text-[#1a1c1c]">Student Identity</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Full Name</label>
                    <input
                      value={form1.fullName}
                      onChange={(e) => setForm1({ ...form1, fullName: e.target.value })}
                      placeholder="e.g. Julian Montgomery"
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={form1.dateOfBirth}
                      onChange={(e) => setForm1({ ...form1, dateOfBirth: e.target.value })}
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] outline-none ring-[#004649]/20 transition focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Gender</label>
                    <select
                      value={form1.gender}
                      onChange={(e) => setForm1({ ...form1, gender: e.target.value })}
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] outline-none ring-[#004649]/20 transition focus:ring-2 appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#e2e8e8] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-4 w-4 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                  <h3 className="font-semibold text-[#1a1c1c]">Guardian Contact</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Guardian Full Name</label>
                    <input
                      value={form1.guardianName}
                      onChange={(e) => setForm1({ ...form1, guardianName: e.target.value })}
                      placeholder="Parent or legal guardian"
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Phone Number</label>
                    <input
                      value={form1.phone}
                      onChange={(e) => setForm1({ ...form1, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Email Address</label>
                    <input
                      value={form1.email}
                      onChange={(e) => setForm1({ ...form1, email: e.target.value })}
                      placeholder="guardian@example.com"
                      type="email"
                      className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={!form1.fullName || !form1.email}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
              >
                Continue to Enrollment
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-[#6f7979] cursor-pointer hover:underline">Save for Later</p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300] mb-1">Step 2 of 3</p>
            <h2 className="text-3xl font-bold text-[#1a1c1c] mb-1">Academic Assignment</h2>
            <p className="text-sm text-[#6f7979] mb-6">Map the student to their designated faculty and campus services.</p>

            <div className="space-y-5">
              <div className="rounded-xl border border-[#e2e8e8] p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Department &amp; Class</label>
                  <input
                    value={form2.classPlacement}
                    onChange={(e) => setForm2({ ...form2, classPlacement: e.target.value })}
                    placeholder="Select Class Placement"
                    className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Academic Semester</label>
                  <div className="flex flex-wrap gap-2">
                    {SEMESTERS.map((sem) => (
                      <button
                        key={sem}
                        onClick={() => setForm2({ ...form2, semester: sem })}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${form2.semester === sem ? 'bg-[#004649] text-white' : 'border border-[#e2e8e8] text-[#1a1c1c] hover:bg-[#f5f7f5]'}`}
                      >
                        {sem}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Campus Logistics</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'hostel', label: 'Hostel', desc: 'On-campus housing', icon: '🏢' },
                    { key: 'transport', label: 'Transport', desc: 'Daily shuttle service', icon: '🚌' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setForm2({ ...form2, [opt.key]: !form2[opt.key as keyof typeof form2] })}
                      className={`rounded-xl border-2 p-4 text-left transition ${form2[opt.key as keyof typeof form2] ? 'border-[#004649] bg-[#e8f5e9]' : 'border-[#e2e8e8] bg-[#f5f7f5]'}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-2xl">{opt.icon}</span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form2[opt.key as keyof typeof form2] ? 'bg-[#004649] border-[#004649]' : 'border-[#d4dede]'}`}>
                          {form2[opt.key as keyof typeof form2] && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 font-semibold text-[#1a1c1c]">{opt.label}</p>
                      <p className="text-xs text-[#6f7979]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Academic Advisory Notes</label>
                <textarea
                  value={form2.notes}
                  onChange={(e) => setForm2({ ...form2, notes: e.target.value })}
                  placeholder="Enter specific enrollment requirements or counselor remarks..."
                  rows={3}
                  className="w-full rounded-xl bg-[#f5f7f5] px-4 py-3 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2 resize-none"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-[#ba1a1a]">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-[#e2e8e8] py-3 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition"
              >
                Save Draft
              </button>
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition"
              >
                {loading ? 'Enrolling...' : 'Continue Enrollment'}
                {!loading && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
