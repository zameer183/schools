'use client';

import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Download,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart,
  Trash2,
  Plus,
  RotateCcw,
  Filter,
  Share2,
  Printer,
  Check,
  Loader,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Calendar,
  X,
} from 'lucide-react';

/* ==================== TYPES ==================== */

interface ReportData {
  id: string;
  name: string;
  type: string;
  date: string;
  filters: string;
  status: 'ready' | 'processing' | 'completed';
}

interface StudentRecord {
  id: string;
  name: string;
  class: string;
  attendance: number;
  gpa: number;
  status: 'active' | 'inactive';
}

interface FilterState {
  reportType: string;
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  grade: string;
  section: string;
  searchStudent: string;
  status: string;
  exportFormat: string;
}

interface UserPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canGenerate: boolean;
  role: 'admin' | 'teacher' | 'staff' | 'parent';
}

type SortField = 'name' | 'class' | 'attendance' | 'gpa';
type SortOrder = 'asc' | 'desc';

/* ==================== CONFIG ==================== */

const STAT_CARDS_CONFIG = [
  {
    id: 'students',
    title: 'Total Students',
    value: '1,245',
    change: '+12%',
    icon: 'TrendingUp',
    color: 'teal',
  },
  {
    id: 'attendance',
    title: 'Avg Attendance',
    value: '91.2%',
    change: '+2.1%',
    icon: 'BarChart3',
    color: 'blue',
  },
  {
    id: 'gpa',
    title: 'Avg GPA',
    value: '3.7',
    change: '+0.3',
    icon: 'TrendingUp',
    color: 'green',
  },
  {
    id: 'reports',
    title: 'Reports Generated',
    value: '28',
    change: 'This month',
    icon: 'FileText',
    color: 'purple',
  },
];

const FILTER_OPTIONS = {
  reportType: [
    { value: 'academic', label: 'Academic Performance' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'finance', label: 'Finance' },
    { value: 'summary', label: 'Student Summary' },
  ],
  dateRange: [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ],
  grade: [
    { value: 'all', label: 'All Grades' },
    { value: '9', label: 'Grade 9' },
    { value: '10', label: 'Grade 10' },
    { value: '11', label: 'Grade 11' },
    { value: '12', label: 'Grade 12' },
  ],
  section: [
    { value: 'all', label: 'All Sections' },
    { value: 'a', label: 'Section A' },
    { value: 'b', label: 'Section B' },
    { value: 'c', label: 'Section C' },
  ],
  status: [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  exportFormat: [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
  ],
};

const PERMISSIONS: Record<string, UserPermissions> = {
  admin: { canEdit: true, canDelete: true, canExport: true, canGenerate: true, role: 'admin' },
  teacher: { canEdit: false, canDelete: false, canExport: true, canGenerate: false, role: 'teacher' },
  staff: { canEdit: false, canDelete: false, canExport: false, canGenerate: false, role: 'staff' },
  parent: { canEdit: false, canDelete: false, canExport: false, canGenerate: false, role: 'parent' },
};

const ITEMS_PER_PAGE = 5;

/* ==================== MAIN COMPONENT ==================== */

const ReportsPage: React.FC = () => {
  // User permissions (mock - replace with real auth context)
  const userPermissions = PERMISSIONS.admin;

  const [filters, setFilters] = useState<FilterState>({
    reportType: 'academic',
    dateRange: 'month',
    grade: 'all',
    section: 'all',
    searchStudent: '',
    status: 'all',
    exportFormat: 'pdf',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Table sorting and pagination
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchReports, setSearchReports] = useState('');

  // Mock data
  const [studentData] = useState<StudentRecord[]>([
    {
      id: '1',
      name: 'Ahmed Ali',
      class: '10-A',
      attendance: 95,
      gpa: 3.8,
      status: 'active',
    },
    {
      id: '2',
      name: 'Fatima Khan',
      class: '10-A',
      attendance: 92,
      gpa: 3.9,
      status: 'active',
    },
    {
      id: '3',
      name: 'Hassan Mohammad',
      class: '10-B',
      attendance: 88,
      gpa: 3.5,
      status: 'active',
    },
    {
      id: '4',
      name: 'Zainab Ahmed',
      class: '10-B',
      attendance: 96,
      gpa: 4.0,
      status: 'active',
    },
    {
      id: '5',
      name: 'Omar Saeed',
      class: '10-C',
      attendance: 85,
      gpa: 3.2,
      status: 'inactive',
    },
  ]);

  const [recentReports] = useState<ReportData[]>([
    {
      id: 'r1',
      name: 'Monthly Attendance Report',
      type: 'Attendance',
      date: '2024-12-15',
      filters: 'Grade 10, December 2024',
      status: 'completed',
    },
    {
      id: 'r2',
      name: 'Final Exam Result Report',
      type: 'Academic',
      date: '2024-12-10',
      filters: 'All Classes, Q4 2024',
      status: 'completed',
    },
    {
      id: 'r3',
      name: 'Fee Summary Report',
      type: 'Finance',
      date: '2024-12-08',
      filters: 'All Students, December 2024',
      status: 'completed',
    },
    {
      id: 'r4',
      name: 'Grade 9 Performance Analysis',
      type: 'Academic',
      date: '2024-12-05',
      filters: 'Grade 9 Only',
      status: 'completed',
    },
  ]);

  // Toast effect
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Memoized sorted and paginated student data
  const sortedStudentData = useMemo(() => {
    const sorted = [...studentData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [studentData, sortField, sortOrder]);

  // Memoized paginated student data
  const paginatedStudentData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedStudentData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [sortedStudentData, currentPage]);

  const totalStudentPages = Math.ceil(sortedStudentData.length / ITEMS_PER_PAGE);

  // Memoized filtered recent reports
  const filteredReports = useMemo(() => {
    return recentReports.filter((report) =>
      report.name.toLowerCase().includes(searchReports.toLowerCase())
    );
  }, [recentReports, searchReports]);

  const paginatedReports = useMemo(() => {
    const startIdx = 0;
    return filteredReports.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredReports]);

  // Handlers with useCallback
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (!userPermissions.canGenerate) {
      showToast('No permission to generate reports', 'error');
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setIsLoading(false);
    showToast('Report generated successfully', 'success');
  }, [userPermissions.canGenerate, showToast]);

  const handleExport = useCallback(
    (format: string) => {
      if (!userPermissions.canExport) {
        showToast('No permission to export reports', 'error');
        return;
      }
      showToast(`Exported as ${format.toUpperCase()}`, 'success');
    },
    [userPermissions.canExport, showToast]
  );

  const handleReset = useCallback(() => {
    setFilters({
      reportType: 'academic',
      dateRange: 'month',
      grade: 'all',
      section: 'all',
      searchStudent: '',
      status: 'all',
      exportFormat: 'pdf',
    });
    setSortField('name');
    setSortOrder('asc');
    setCurrentPage(1);
    setSearchReports('');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-900'
              : 'bg-red-50 text-red-900'
          } animate-in fade-in slide-in-from-top-4`}
        >
          {toast.type === 'success' ? (
            <Check size={18} className="flex-shrink-0" />
          ) : null}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              Generate and export academic, attendance, and finance reports
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {userPermissions.canExport && (
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 active:bg-gray-300 sm:flex-none">
                <FileText size={16} />
                History
              </button>
            )}
            {userPermissions.canGenerate && (
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:bg-teal-800 sm:flex-none">
                <Plus size={16} />
                New Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Filter Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <Filter size={18} />
                Filters
              </h2>

              <div className="space-y-4">
                {/* Report Type */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Report Type
                  </label>
                  <select
                    value={filters.reportType}
                    onChange={(e) =>
                      handleFilterChange('reportType', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {FILTER_OPTIONS.reportType.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Date Range
                  </label>
                  <div className="relative mt-1.5">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 flex items-center justify-between"
                    >
                      <span>
                        {FILTER_OPTIONS.dateRange.find((opt) => opt.value === filters.dateRange)?.label}
                      </span>
                      <Calendar size={16} className="text-gray-400" />
                    </button>

                    {showDatePicker && (
                      <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg z-10">
                        <div className="space-y-2">
                          {FILTER_OPTIONS.dateRange.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                handleFilterChange('dateRange', opt.value);
                                setShowDatePicker(false);
                              }}
                              className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {filters.dateRange === 'custom' && (
                          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                            <input
                              type="date"
                              value={filters.startDate || ''}
                              onChange={(e) =>
                                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              placeholder="Start date"
                            />
                            <input
                              type="date"
                              value={filters.endDate || ''}
                              onChange={(e) =>
                                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              placeholder="End date"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Grade/Class
                  </label>
                  <select
                    value={filters.grade}
                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {FILTER_OPTIONS.grade.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Section
                  </label>
                  <select
                    value={filters.section}
                    onChange={(e) =>
                      handleFilterChange('section', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {FILTER_OPTIONS.section.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Search */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Search Student
                  </label>
                  <input
                    type="text"
                    placeholder="Student name..."
                    value={filters.searchStudent}
                    onChange={(e) =>
                      handleFilterChange('searchStudent', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange('status', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {FILTER_OPTIONS.status.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Export Format */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Export Format
                  </label>
                  <select
                    value={filters.exportFormat}
                    onChange={(e) =>
                      handleFilterChange('exportFormat', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {FILTER_OPTIONS.exportFormat.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Note */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  Report analyzes selected records based on filter criteria.
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isLoading || !userPermissions.canGenerate}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition disabled:opacity-70 hover:bg-teal-700 active:bg-teal-800"
                  >
                    {isLoading ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Report'
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Report Preview */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAT_CARDS_CONFIG.map((card) => (
                <StatCard
                  key={card.id}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  icon={getIconComponent(card.icon, card.color)}
                />
              ))}
            </div>

            {/* Report Preview Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Monthly Academic Performance Report
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Generated Dec 15, 2024
                  </p>
                </div>
                <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  Ready
                </span>
              </div>

              {/* Filters Summary */}
              <div className="mb-4 rounded-lg bg-gray-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Applied Filters:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <FilterTag label="Grade 10" />
                  <FilterTag label="Section A & B" />
                  <FilterTag label="Dec 2024" />
                  <FilterTag label="Active" />
                  <FilterTag label="PDF" />
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <MiniChartCard
                  title="Attendance Trend"
                  icon={<TrendingUp size={18} className="text-teal-600" />}
                  type="line"
                />
                <MiniChartCard
                  title="GPA Distribution"
                  icon={<BarChart3 size={18} className="text-blue-600" />}
                  type="bar"
                />
                <MiniChartCard
                  title="Fee Collection"
                  icon={<PieChart size={18} className="text-green-600" />}
                  type="pie"
                  fullwidth
                />
              </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3">
                          <SortableHeader
                            label="Student Name"
                            field="name"
                            currentField={sortField}
                            currentOrder={sortOrder}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-5 py-3">
                          <SortableHeader
                            label="Class"
                            field="class"
                            currentField={sortField}
                            currentOrder={sortOrder}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-5 py-3">
                          <SortableHeader
                            label="Attendance"
                            field="attendance"
                            currentField={sortField}
                            currentOrder={sortOrder}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-5 py-3">
                          <SortableHeader
                            label="GPA"
                            field="gpa"
                            currentField={sortField}
                            currentOrder={sortOrder}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedStudentData.length > 0 ? (
                        paginatedStudentData.map((student) => (
                          <tr
                            key={student.id}
                            className="transition duration-150 hover:bg-gray-50"
                          >
                            <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                              {student.name}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">
                              {student.class}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-600">
                              {student.attendance}%
                            </td>
                            <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                              {student.gpa}
                            </td>
                            <td className="px-5 py-3.5 text-sm">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  student.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {student.status.charAt(0).toUpperCase() +
                                  student.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center">
                            <EmptyState />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalStudentPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 bg-gray-50 text-xs text-gray-600">
                    <span>
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, sortedStudentData.length)} of{' '}
                      {sortedStudentData.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg p-1.5 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="flex items-center px-3">
                        Page {currentPage} of {totalStudentPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalStudentPages, currentPage + 1))
                        }
                        disabled={currentPage === totalStudentPages}
                        className="rounded-lg p-1.5 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export Actions */}
            {userPermissions.canExport && (
              <div className="relative flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition duration-150 hover:bg-teal-700 active:bg-teal-800">
                  <Download size={16} />
                  PDF
                </button>

                {/* Download Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <Download size={16} />
                    Format
                    <ChevronDown size={14} />
                  </button>

                  {showDownloadMenu && (
                    <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                      {['PDF', 'Excel', 'CSV'].map((format) => (
                        <button
                          key={format}
                          onClick={() => {
                            handleExport(format);
                            setShowDownloadMenu(false);
                          }}
                          className="block w-full rounded-lg px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                        >
                          Export as {format}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50 active:bg-gray-100">
                  <Printer size={16} />
                  Print
                </button>

                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50 active:bg-gray-100">
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports Section */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Recent Reports
              </h2>
              <p className="mt-0.5 text-sm text-gray-600">Last generated reports</p>
            </div>
            {userPermissions.canExport && (
              <div className="relative">
                <div className="relative flex items-center rounded-lg border border-gray-300 px-3 py-2">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchReports}
                    onChange={(e) => setSearchReports(e.target.value)}
                    className="ml-2 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                  {searchReports && (
                    <button
                      onClick={() => setSearchReports('')}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Report
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Date
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 md:table-cell">
                      Filters
                    </th>
                    {userPermissions.canDelete && (
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReports.length > 0 ? (
                    paginatedReports.map((report) => (
                      <tr key={report.id} className="transition duration-150 hover:bg-gray-50">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                          {report.name}
                        </td>
                        <td className="px-5 py-3.5 text-sm">
                          <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                            {report.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {new Date(report.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="hidden px-5 py-3.5 text-sm text-gray-600 md:table-cell">
                          <span className="truncate text-xs">{report.filters}</span>
                        </td>
                        {userPermissions.canDelete && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {userPermissions.canExport && (
                                <button
                                  onClick={() => handleExport('PDF')}
                                  className="rounded-lg p-2 text-teal-600 transition duration-150 hover:bg-teal-50 active:bg-teal-100"
                                  title="Download"
                                >
                                  <Download size={16} />
                                </button>
                              )}
                              <button className="rounded-lg p-2 text-red-600 transition duration-150 hover:bg-red-50 active:bg-red-100" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={userPermissions.canDelete ? 5 : 4} className="px-5 py-12 text-center">
                        <EmptyState />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== HELPER COMPONENTS ==================== */

const getIconComponent = (iconName: string, color: string): ReactNode => {
  const colorClasses = {
    teal: 'text-teal-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  const iconProps = { size: 20, className: colorClasses[color as keyof typeof colorClasses] };

  const icons: Record<string, ReactNode> = {
    TrendingUp: <TrendingUp {...iconProps} />,
    BarChart3: <BarChart3 {...iconProps} />,
    FileText: <FileText {...iconProps} />,
  };

  return icons[iconName] || <TrendingUp {...iconProps} />;
};

const StatCard = React.memo<{
  title: string;
  value: string;
  change?: string;
  icon: ReactNode;
}>(({ title, value, change, icon }) => (
  <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-md">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className="mt-1 text-xs text-green-700 font-medium">{change}</p>
        )}
      </div>
      <div className="rounded-lg bg-gray-50 p-2.5 group-hover:bg-gray-100 transition">
        {icon}
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const FilterTag = React.memo<{ label: string }>(({ label }) => (
  <span className="inline-block rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
    {label}
  </span>
));

FilterTag.displayName = 'FilterTag';

const SortableHeader = React.memo<{
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
}>(({ label, field, currentField, currentOrder, onSort }) => (
  <button
    onClick={() => onSort(field)}
    className="flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 hover:text-gray-900"
  >
    {label}
    {currentField === field && (
      <ArrowUpDown
        size={14}
        className={`transition ${currentOrder === 'desc' ? 'rotate-180' : ''}`}
      />
    )}
  </button>
));

SortableHeader.displayName = 'SortableHeader';

const MiniChartCard = React.memo<{
  title: string;
  icon: ReactNode;
  type: 'line' | 'bar' | 'pie';
  fullwidth?: boolean;
}>(({ title, icon, type, fullwidth }) => (
  <div className={fullwidth ? 'md:col-span-2' : ''}>
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="flex items-end justify-center gap-1 py-8">
        {type === 'line' && (
          <>
            <div className="h-6 w-1 rounded-full bg-teal-200" />
            <div className="h-8 w-1 rounded-full bg-teal-400" />
            <div className="h-7 w-1 rounded-full bg-teal-300" />
            <div className="h-10 w-1 rounded-full bg-teal-500" />
            <div className="h-9 w-1 rounded-full bg-teal-400" />
            <div className="h-11 w-1 rounded-full bg-teal-600" />
            <div className="h-8 w-1 rounded-full bg-teal-400" />
          </>
        )}
        {type === 'bar' && (
          <>
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-2 rounded-t bg-blue-400" />
              <span className="text-xs text-gray-600">A</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-12 w-2 rounded-t bg-blue-500" />
              <span className="text-xs text-gray-600">B</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-2 rounded-t bg-blue-400" />
              <span className="text-xs text-gray-600">C</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-11 w-2 rounded-t bg-blue-600" />
              <span className="text-xs text-gray-600">D</span>
            </div>
          </>
        )}
        {type === 'pie' && (
          <div className="relative h-16 w-16">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="25" strokeDasharray="62.8 314" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="25" strokeDasharray="78.5 314" transform="rotate(72 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="25" strokeDasharray="173 314" transform="rotate(163 50 50)" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-500">
        {type === 'pie' ? 'Paid • Pending • Overdue' : 'Sample visualization'}
      </p>
    </div>
  </div>
));

MiniChartCard.displayName = 'MiniChartCard';

const EmptyState = React.memo(() => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="rounded-full bg-gray-100 p-3 mb-3">
      <FileText size={24} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900">No data available</p>
    <p className="text-xs text-gray-500 mt-0.5">
      Adjust filters or generate a new report
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

const TableSkeleton = React.memo(() => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="border-b border-gray-200 px-5 py-3.5 flex gap-4"
        >
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

export default ReportsPage;
