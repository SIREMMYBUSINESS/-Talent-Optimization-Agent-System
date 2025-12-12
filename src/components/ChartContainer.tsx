interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  footer?: React.ReactNode;
}

export function ChartContainer({
  title,
  children,
  isLoading = false,
  error,
  footer,
}: ChartContainerProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="h-80 flex items-center justify-center">
            {children}
          </div>
          {footer && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  );
}
