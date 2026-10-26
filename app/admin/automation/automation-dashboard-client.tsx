'use client';

import React, { useState, useTransition } from 'react';
import { Card, Button } from '@/components/ui';
import {
  AlertCircle,
  Zap,
  MessageSquare,
  Send,
  Calendar,
  Search,
  Copy,
  Check,
  RefreshCw,
  Users,
  DollarSign,
  Smartphone,
  Play,
  CheckCircle2,
  Clock,
  Filter,
  ExternalLink,
} from 'lucide-react';
import type { AutomationDashboardData, AbsentStudentData } from './actions';
import {
  createFeeReminderCampaignAction,
  markCampaignItemSentAction,
  runManualFeeAutomationAction,
  getAbsentStudentsByDateAction,
} from './actions';
import {
  openWhatsAppDirect,
  getStoredWhatsAppClientType,
  setStoredWhatsAppClientType,
  type WhatsAppClientType,
} from '@/lib/whatsapp-client';
import type { FeeReminderStudent } from '@/lib/fee-automation';

type Props = {
  initialData: AutomationDashboardData;
};

export default function AutomationDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<AutomationDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<'fees' | 'absentee' | 'billing' | 'history'>('fees');

  // WhatsApp client preference (standard vs business)
  const [waClientType, setWaClientType] = useState<WhatsAppClientType>(() => getStoredWhatsAppClientType());

  const handleClientTypeChange = (type: WhatsAppClientType) => {
    setWaClientType(type);
    setStoredWhatsAppClientType(type);
  };

  // State for Fee Reminders
  const [feeSearch, setFeeSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<'all' | 'with-wa' | 'without-wa'>('all');
  const [sentStudentIds, setSentStudentIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingCampaign, startCreateCampaign] = useTransition();
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);

  // State for Absentee Broadcast
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudentData[]>(initialData.todayAbsents);
  const [isLoadingAbsents, startLoadingAbsents] = useTransition();
  const [absentMessageTemplate, setAbsentMessageTemplate] = useState(
    'Assalam-o-Alaikum,\nDear Parent/Guardian of {studentName} ({className}),\nThis is to notify you that your child was marked ABSENT today ({date}) at Manarah Institute.\nIf this absence was unplanned or due to illness, please inform the school office.\nThank you.\n- School Administration'
  );
  const [sentAbsentIds, setSentAbsentIds] = useState<Record<string, boolean>>({});
  const [copiedAbsentId, setCopiedAbsentId] = useState<string | null>(null);

  // State for Auto-Fee Generation
  const [isRunningBilling, startRunningBilling] = useTransition();
  const [billingResult, setBillingResult] = useState<{
    feesCreated: number;
    overdueMarked: number;
    feesSkipped: number;
  } | null>(null);

  // Fee Reminder candidate filter
  const filteredFeeCandidates = data.feeCandidates.filter((candidate) => {
    const matchesSearch =
      candidate.studentName.toLowerCase().includes(feeSearch.toLowerCase()) ||
      (candidate.className && candidate.className.toLowerCase().includes(feeSearch.toLowerCase())) ||
      (candidate.whatsApp && candidate.whatsApp.includes(feeSearch));

    if (!matchesSearch) return false;
    if (feeFilter === 'with-wa') return candidate.hasWhatsApp;
    if (feeFilter === 'without-wa') return !candidate.hasWhatsApp;
    return true;
  });

  // Calculate total pending for a candidate
  const getCandidateTotalDue = (candidate: FeeReminderStudent) => {
    return candidate.reminders.reduce((sum, r) => sum + Number(r.amountDue), 0);
  };

  // Build fee reminder text
  const buildFeeMessage = (candidate: FeeReminderStudent) => {
    const totalDue = getCandidateTotalDue(candidate);
    const earliestDueDate = candidate.reminders.length > 0 ? candidate.reminders[0].dueDate : '';
    const dueDateFormatted = earliestDueDate
      ? new Date(earliestDueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Due Immediately';

    return [
      `*Assalam-o-Alaikum / Dear Guardian*`,
      `Fee reminder for *${candidate.studentName}* (${candidate.className || 'Student'}):`,
      ``,
      `• *Pending Dues:* PKR ${totalDue.toLocaleString()}`,
      `• *Due Date:* ${dueDateFormatted}`,
      `• *Pending Invoices:* ${candidate.reminders.length}`,
      ``,
      `Kindly arrange the payment at your earliest convenience. If you have already paid, please disregard this message.`,
      ``,
      `_Thank you, Accounts Office_`,
      `*Manarah Institute*`,
    ].join('\n');
  };

  // Send WhatsApp for fee candidate
  const handleSendFeeWhatsApp = (candidate: FeeReminderStudent) => {
    if (!candidate.whatsApp) return;
    const msg = buildFeeMessage(candidate);
    openWhatsAppDirect({
      phone: candidate.whatsApp,
      message: msg,
      clientType: waClientType,
    });
    setSentStudentIds((prev) => ({ ...prev, [candidate.studentId]: true }));
  };

  // Copy fee text
  const handleCopyFeeMessage = (candidate: FeeReminderStudent) => {
    const msg = buildFeeMessage(candidate);
    navigator.clipboard.writeText(msg);
    setCopiedId(candidate.studentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Create Campaign Action
  const handleCreateCampaign = () => {
    startCreateCampaign(async () => {
      try {
        const res = await createFeeReminderCampaignAction();
        setCampaignMessage(
          `Campaign created successfully! ${res.totalWithWhatsApp} recipients with active WhatsApp numbers queued.`
        );
      } catch (err: unknown) {
        setCampaignMessage(err instanceof Error ? err.message : 'Failed to launch campaign.');
      }
    });
  };

  // Absentee Date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    startLoadingAbsents(async () => {
      const res = await getAbsentStudentsByDateAction(newDate);
      setAbsentStudents(res);
    });
  };

  // Build absentee message
  const buildAbsenteeMessage = (student: AbsentStudentData) => {
    const dateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return absentMessageTemplate
      .replace(/{studentName}/g, student.studentName)
      .replace(/{className}/g, `${student.className} - ${student.section}`)
      .replace(/{date}/g, dateFormatted);
  };

  // Send absentee WhatsApp
  const handleSendAbsenteeWhatsApp = (student: AbsentStudentData) => {
    if (!student.guardianPhone) return;
    const msg = buildAbsenteeMessage(student);
    openWhatsAppDirect({
      phone: student.guardianPhone,
      message: msg,
      clientType: waClientType,
    });
    setSentAbsentIds((prev) => ({ ...prev, [student.studentId]: true }));
  };

  // Copy absentee text
  const handleCopyAbsenteeMessage = (student: AbsentStudentData) => {
    const msg = buildAbsenteeMessage(student);
    navigator.clipboard.writeText(msg);
    setCopiedAbsentId(student.studentId);
    setTimeout(() => setCopiedAbsentId(null), 2000);
  };

  // Run Monthly Billing
  const handleRunBilling = () => {
    startRunningBilling(async () => {
      try {
        const res = await runManualFeeAutomationAction();
        setBillingResult(res);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error running billing automation');
      }
    });
  };

  const stats = data.stats;
  const waReachability =
    stats.studentsWithUnpaidFees > 0
      ? Math.round((stats.studentsWithWhatsApp / stats.studentsWithUnpaidFees) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="p-6 bg-white border border-[#e2e8f0] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#15803d]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                Active Automation Engine
              </span>
              <span className="text-xs text-[#64748b]">Option 1: Direct 1-Click WhatsApp</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Institutional Automation &amp; Communication Engine
            </h1>
            <p className="mt-1 text-sm text-[#64748b] max-w-3xl">
              1-Click Direct WhatsApp fee reminders, daily absentee broadcasts to guardians, and automated monthly tuition generation with zero monthly API fees.
            </p>
          </div>

          {/* WhatsApp Client Preference Selector */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-xl flex flex-col gap-1.5 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-[#1F5A5C]" />
                WhatsApp Mode
              </span>
              <span className="text-[10px] text-[#16a34a] font-medium">Ready</span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-[#e2e8f0]/60 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => handleClientTypeChange('regular')}
                className={`py-1.5 px-2 rounded-md transition text-center ${
                  waClientType === 'regular'
                    ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleClientTypeChange('business')}
                className={`py-1.5 px-2 rounded-md transition text-center ${
                  waClientType === 'business'
                    ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Business
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Dues */}
        <Card className="p-5 border border-[#e2e8f0] bg-white hover:border-[#1F5A5C]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Pending Dues</span>
            <div className="w-9 h-9 rounded-xl bg-[#fef3c7] flex items-center justify-center text-[#92400e]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">PKR {stats.totalPendingAmount.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-semibold text-[#b45309]">{stats.pendingFeeCount} invoices</span>
            <span>across {stats.studentsWithUnpaidFees} students</span>
          </div>
        </Card>

        {/* Card 2: WhatsApp Reachability */}
        <Card className="p-5 border border-[#e2e8f0] bg-white hover:border-[#1F5A5C]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">WhatsApp Reach</span>
            <div className="w-9 h-9 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#16a34a]">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{waReachability}%</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-semibold text-[#15803d]">
              {stats.studentsWithWhatsApp} of {stats.studentsWithUnpaidFees}
            </span>
            <span>have verified phone</span>
          </div>
        </Card>

        {/* Card 3: Today's Absentees */}
        <Card className="p-5 border border-[#e2e8f0] bg-white hover:border-[#1F5A5C]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Today's Absentees</span>
            <div className="w-9 h-9 rounded-xl bg-[#fee2e2] flex items-center justify-center text-[#dc2626]">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0f172a]">{stats.todayAbsentCount} Absent</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#64748b]">
            <span>1-Click guardian notices ready</span>
          </div>
        </Card>

        {/* Card 4: Billing Schedule */}
        <Card className="p-5 border border-[#e2e8f0] bg-[#1F5A5C] text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">Auto-Billing</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Zap className="w-5 h-5 text-[#d69e3f]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">1st of Month</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
            <span>Automated tuition fee generation</span>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#e2e8f0] flex items-center gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'fees'
              ? 'border-[#1F5A5C] text-[#1F5A5C]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Fee Reminders Campaign
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-[#fef3c7] text-[#92400e] font-bold">
            {data.feeCandidates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('absentee')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'absentee'
              ? 'border-[#1F5A5C] text-[#1F5A5C]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Users className="w-4 h-4" />
          Daily Absentee Broadcasts
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-[#fee2e2] text-[#dc2626] font-bold">
            {absentStudents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-[#1F5A5C] text-[#1F5A5C]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Zap className="w-4 h-4" />
          Monthly Auto-Fee Billing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-[#1F5A5C] text-[#1F5A5C]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Campaign History &amp; Logs
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#64748b] font-medium">
            {data.recentCampaigns.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FEE REMINDERS CAMPAIGN */}
      {/* ============================================================== */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          {/* Action Header Card */}
          <Card className="p-5 bg-white border border-[#e2e8f0]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f172a]">1-Click WhatsApp Fee Reminders</h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Clicking "Send WhatsApp" directly opens WhatsApp Web or your WhatsApp app with a pre-filled, professional fee invoice reminder.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleCreateCampaign}
                  disabled={isCreatingCampaign}
                  className="bg-[#1F5A5C] hover:bg-[#18484a] text-white flex items-center gap-2"
                >
                  {isCreatingCampaign ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Save New Campaign Queue
                </Button>
              </div>
            </div>

            {campaignMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-sm text-[#166534] flex items-center justify-between">
                <span>{campaignMessage}</span>
                <button
                  type="button"
                  onClick={() => setCampaignMessage(null)}
                  className="text-xs font-bold text-[#166534] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter Bar */}
            <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search student, class, or WhatsApp number..."
                  value={feeSearch}
                  onChange={(e) => setFeeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#cbd5e1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1F5A5C]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#64748b] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filter:
                </span>
                <div className="flex items-center bg-[#f1f5f9] p-1 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setFeeFilter('all')}
                    className={`px-3 py-1 rounded-md transition ${
                      feeFilter === 'all'
                        ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                        : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}
                  >
                    All ({data.feeCandidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeFilter('with-wa')}
                    className={`px-3 py-1 rounded-md transition ${
                      feeFilter === 'with-wa'
                        ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                        : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}
                  >
                    WhatsApp Ready ({data.stats.studentsWithWhatsApp})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeFilter('without-wa')}
                    className={`px-3 py-1 rounded-md transition ${
                      feeFilter === 'without-wa'
                        ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                        : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}
                  >
                    Missing Phone ({data.feeCandidates.length - data.stats.studentsWithWhatsApp})
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Student Candidates Table / List */}
          <Card className="overflow-hidden border border-[#e2e8f0] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Pending Dues</th>
                    <th className="py-3 px-4">Invoices</th>
                    <th className="py-3 px-4">Guardian WhatsApp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredFeeCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#64748b]">
                        No student fee records found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredFeeCandidates.map((candidate) => {
                      const totalDue = getCandidateTotalDue(candidate);
                      const isSent = sentStudentIds[candidate.studentId];
                      const isCopied = copiedId === candidate.studentId;

                      return (
                        <tr
                          key={candidate.studentId}
                          className="hover:bg-[#f8fafc] transition group"
                        >
                          <td className="py-3.5 px-4 font-semibold text-[#0f172a]">
                            <div className="flex items-center gap-2">
                              <span>{candidate.studentName}</span>
                              {isSent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
                                  <CheckCircle2 className="w-3 h-3" /> Sent
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#475569]">
                            {candidate.className
                              ? `${candidate.className}${candidate.classSection ? ` - ${candidate.classSection}` : ''}`
                              : 'Unassigned'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#b45309]">
                            PKR {totalDue.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#f1f5f9] text-[#475569]">
                              {candidate.reminders.length} pending
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {candidate.hasWhatsApp && candidate.whatsApp ? (
                              <span className="font-mono text-xs text-[#0f172a] bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">
                                {candidate.whatsApp}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-[#dc2626] font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                title="Copy message text"
                                onClick={() => handleCopyFeeMessage(candidate)}
                                className="p-1.5 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9] transition"
                              >
                                {isCopied ? (
                                  <Check className="w-4 h-4 text-[#16a34a]" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={!candidate.hasWhatsApp}
                                onClick={() => handleSendFeeWhatsApp(candidate)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                  !candidate.hasWhatsApp
                                    ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                                    : isSent
                                    ? 'bg-[#15803d] text-white hover:bg-[#166534]'
                                    : 'bg-[#25D366] text-white hover:bg-[#1ebc59] shadow-xs'
                                }`}
                              >
                                <Send className="w-3.5 h-3.5" />
                                {isSent ? 'Resend' : 'Send WhatsApp'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DAILY ABSENTEE BROADCASTS */}
      {/* ============================================================== */}
      {activeTab === 'absentee' && (
        <div className="space-y-4">
          {/* Header & Date Selector Card */}
          <Card className="p-5 bg-white border border-[#e2e8f0]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f172a]">Daily Absentee Guardian Notices</h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Send instant 1-Click WhatsApp notifications to guardians of students marked absent on any given date.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#64748b] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Attendance Date:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[#cbd5e1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1F5A5C]"
                />
              </div>
            </div>

            {/* Template Editor Box */}
            <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Notice Template (Supports variables)
                </label>
                <span className="text-xs text-[#64748b]">
                  Variables: <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[#1F5A5C]">{'{studentName}'}</code>,{' '}
                  <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[#1F5A5C]">{'{className}'}</code>,{' '}
                  <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[#1F5A5C]">{'{date}'}</code>
                </span>
              </div>
              <textarea
                rows={3}
                value={absentMessageTemplate}
                onChange={(e) => setAbsentMessageTemplate(e.target.value)}
                className="w-full text-xs font-mono p-3 border border-[#cbd5e1] rounded-lg bg-[#f8fafc] focus:outline-hidden focus:ring-2 focus:ring-[#1F5A5C]"
              />
            </div>
          </Card>

          {/* Absent Students List */}
          <Card className="overflow-hidden border border-[#e2e8f0] bg-white">
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0f172a]">
                  Absent Students for {selectedDate}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#fee2e2] text-[#dc2626]">
                  {absentStudents.length} Absent
                </span>
              </div>
              {isLoadingAbsents && (
                <span className="text-xs text-[#64748b] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading attendance...
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Guardian Name</th>
                    <th className="py-3 px-4">Guardian WhatsApp</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {absentStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#64748b]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-[#16a34a]" />
                          <p className="font-semibold text-[#0f172a]">No absentees recorded for this date</p>
                          <p className="text-xs text-[#64748b]">
                            All students were marked present or attendance has not been registered yet.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    absentStudents.map((student) => {
                      const isSent = sentAbsentIds[student.studentId];
                      const isCopied = copiedAbsentId === student.studentId;

                      return (
                        <tr
                          key={student.studentId}
                          className="hover:bg-[#f8fafc] transition group"
                        >
                          <td className="py-3.5 px-4 font-semibold text-[#0f172a]">
                            <div className="flex items-center gap-2">
                              <span>{student.studentName}</span>
                              {isSent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
                                  <CheckCircle2 className="w-3 h-3" /> Notified
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#475569]">
                            {student.className} - {student.section}
                          </td>
                          <td className="py-3.5 px-4 text-[#475569]">
                            {student.guardianName || 'Guardian'}
                          </td>
                          <td className="py-3.5 px-4">
                            {student.hasWhatsApp && student.guardianPhone ? (
                              <span className="font-mono text-xs text-[#0f172a] bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">
                                {student.guardianPhone}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-[#dc2626] font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Missing Phone
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#64748b]">
                            {student.remarks || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                title="Copy notice text"
                                onClick={() => handleCopyAbsenteeMessage(student)}
                                className="p-1.5 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9] transition"
                              >
                                {isCopied ? (
                                  <Check className="w-4 h-4 text-[#16a34a]" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={!student.hasWhatsApp}
                                onClick={() => handleSendAbsenteeWhatsApp(student)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                  !student.hasWhatsApp
                                    ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                                    : isSent
                                    ? 'bg-[#15803d] text-white hover:bg-[#166534]'
                                    : 'bg-[#25D366] text-white hover:bg-[#1ebc59] shadow-xs'
                                }`}
                              >
                                <Send className="w-3.5 h-3.5" />
                                {isSent ? 'Resend' : 'Send WhatsApp'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MONTHLY AUTO-FEE BILLING ENGINE */}
      {/* ============================================================== */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <Card className="p-6 bg-white border border-[#e2e8f0]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e0e7ff] flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-[#4338ca]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-[#0f172a]">Monthly Fee Generation Engine</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#dcfce7] text-[#15803d]">
                    AUTOMATED
                  </span>
                </div>
                <p className="text-sm text-[#475569] max-w-2xl leading-relaxed">
                  The automated billing worker creates monthly tuition fees for all active enrolled students on the 1st of each month. It reads each student's customized tuition fee, applies personal discounts, and auto-marks past unpaid dues as <strong className="text-[#dc2626]">OVERDUE</strong>.
                </p>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Schedule</span>
                    <p className="text-sm font-bold text-[#0f172a] mt-1">1st of Every Month (00:00 UTC)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Active Enrolled Students</span>
                    <p className="text-sm font-bold text-[#0f172a] mt-1">{stats.totalActiveStudents} Students</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Overdue Transition</span>
                    <p className="text-sm font-bold text-[#0f172a] mt-1">Automatic for Unpaid Fees</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button
                    onClick={handleRunBilling}
                    disabled={isRunningBilling}
                    className="bg-[#1F5A5C] hover:bg-[#18484a] text-white flex items-center gap-2 px-5 py-2.5"
                  >
                    {isRunningBilling ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run Fee Generation Now
                  </Button>
                  <span className="text-xs text-[#64748b]">
                    Safe to run anytime: checks for existing monthly fee invoices before generating.
                  </span>
                </div>

                {billingResult && (
                  <div className="mt-5 p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                    <h4 className="text-sm font-bold text-[#166534] flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4" /> Billing Automation Completed
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-[#bbf7d0]">
                        <span className="text-[#64748b]">New Fees Created</span>
                        <p className="text-base font-bold text-[#166534]">{billingResult.feesCreated}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#bbf7d0]">
                        <span className="text-[#64748b]">Overdue Statuses Marked</span>
                        <p className="text-base font-bold text-[#b45309]">{billingResult.overdueMarked}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#bbf7d0]">
                        <span className="text-[#64748b]">Already Up to Date (Skipped)</span>
                        <p className="text-base font-bold text-[#475569]">{billingResult.feesSkipped}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CAMPAIGN HISTORY & LOGS */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden border border-[#e2e8f0] bg-white">
          <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="font-bold text-[#0f172a]">Recent Automation Campaigns &amp; Batches</h3>
            <span className="text-xs text-[#64748b]">{data.recentCampaigns.length} Recorded Campaigns</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                <tr>
                  <th className="py-3 px-4">Campaign ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">WhatsApp Valid</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {data.recentCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748b]">
                      No previous campaigns found. Launch a new fee campaign from the Fee Reminders tab.
                    </td>
                  </tr>
                ) : (
                  data.recentCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-[#f8fafc] transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-[#475569]">
                        {camp.id.slice(0, 12)}...
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0f172a]">
                        {camp.type}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            camp.status === 'APPROVED' || camp.status === 'SENT'
                              ? 'bg-[#dcfce7] text-[#15803d]'
                              : 'bg-[#fef3c7] text-[#92400e]'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0f172a]">
                        {camp.totalStudents}
                      </td>
                      <td className="py-3.5 px-4 text-[#16a34a] font-semibold">
                        {camp.totalWithWhatsApp} ({camp.totalSkipped} skipped)
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64748b]">
                        {new Date(camp.createdAt).toLocaleString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
