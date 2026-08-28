import { useLocation } from 'react-router-dom';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await api.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-7xl font-light text-slate-300">404</h1>
        <h2 className="text-2xl font-medium text-slate-800">Page Not Found</h2>
        <p className="text-slate-600">
          The page <span className="font-medium text-slate-700">"{pageName}"</span> could not be found.
        </p>
        {isFetched && authData?.user?.role === 'owner' && (
          <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-left text-sm text-slate-600">
            This page may not have been implemented yet.
          </div>
        )}
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
