'use client';

import { useMemo, useState } from 'react';
import { TransactionType } from '@prisma/client';

type QuickFeePaymentOption = {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  classId: string | null;
  classLabel: string;
  remaining: number;
};

type QuickStudentOption = {
  id: string;
  fullName: string;
  classId: string | null;
};

type QuickClassOption = {
  id: string;
  label: string;
};

type QuickFeePaymentFormProps = {
  fees: QuickFeePaymentOption[];
  classes: QuickClassOption[];
  students: QuickStudentOption[];
  action: (formData: FormData) => Promise<void>;
};

export function QuickFeePaymentForm({ fees, classes, students, action }: QuickFeePaymentFormProps) {
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [feeId, setFeeId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  const classOptions = useMemo(() => {
    return [...classes].sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const studentOptions = useMemo(() => {
    const filtered = students.filter((item) => !classId || item.classId === classId);
    return filtered
      .map((item) => ({ id: item.id, name: item.fullName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, classId]);

  const feeOptions = useMemo(
    () =>
      fees
        .filter((item) => (!classId || item.classId === classId) && (!studentId || item.studentId === studentId))
        .sort((a, b) => a.studentName.localeCompare(b.studentName)),
    [fees, classId, studentId]
  );

  const selectedFee = feeOptions.find((item) => item.id === feeId) ?? null;

  return (
    <form action={action} className="mt-4 grid gap-3 rounded-xl bg-[#f3f4f5] p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</label>
        <select
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setStudentId('');
            setFeeId('');
            setAmountPaid('');
          }}
          className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20"
        >
          <option value="">All Classes</option>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</label>
        <select
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value);
            setFeeId('');
            setAmountPaid('');
          }}
          className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20"
        >
          <option value="">Select Student</option>
          {studentOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Fee</label>
        <select
          name="feeId"
          value={feeId}
          onChange={(event) => {
            const nextFeeId = event.target.value;
            setFeeId(nextFeeId);
            const fee = feeOptions.find((item) => item.id === nextFeeId);
            setAmountPaid(fee ? fee.remaining.toFixed(2) : '');
          }}
          className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20"
          required
        >
          <option value="">Select Fee</option>
          {feeOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.studentName} - {item.title}
            </option>
          ))}
        </select>
        {feeOptions.length === 0 ? <p className="text-[10px] text-[#ba1a1a]">No unpaid fee found for selected class/student.</p> : null}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</label>
        <input
          name="amountPaid"
          type="number"
          min={1}
          step="0.01"
          value={amountPaid}
          onChange={(event) => setAmountPaid(event.target.value)}
          max={selectedFee?.remaining ?? undefined}
          className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20"
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
        <select name="method" defaultValue={TransactionType.CASH} className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20">
          <option value={TransactionType.CASH}>Cash</option>
          <option value={TransactionType.BANK_TRANSFER}>Bank Transfer</option>
          <option value={TransactionType.CARD}>Card</option>
          <option value={TransactionType.ONLINE}>Online</option>
        </select>
        <button type="submit" disabled={!feeId} className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          Mark Paid
        </button>
      </div>
    </form>
  );
}
