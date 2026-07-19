interface RetryButtonProps {
  onClick: () => void;
  message?: string;
}

export default function RetryButton({ onClick, message = 'تلاش مجدد' }: RetryButtonProps) {
  return (
    <button className="btn btn-outline" onClick={onClick}>
      <i className="ti ti-refresh" style={{ fontSize: '1.1rem' }}></i>
      {message}
    </button>
  );
}
