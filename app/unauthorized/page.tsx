export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to access this section. Please contact your administrator.
        </p>
      </div>
    </div>
  );
}
