export default function LoadingSpinner({ size = 16, className = '' }) {
  return (
    <i
      className={`ti ti-loader ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        fontSize: size,
        animation: 'spin 0.6s linear infinite',
      }}
    />
  );
}
