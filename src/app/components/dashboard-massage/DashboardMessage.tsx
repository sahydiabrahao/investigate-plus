import './DashboardMessage.scss';

export function DashboardMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className='dashboard'>
      <p className={className}>{children}</p>
    </div>
  );
}
