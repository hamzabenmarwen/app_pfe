import { type ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

function Card({ children, className, hover = false, glass = false, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl shadow-none overflow-hidden transition-all duration-300',
        glass
          ? 'bg-white/70 backdrop-blur-xl border border-gray-200'
          : 'bg-white/90 backdrop-blur-sm border border-gray-100/80',
        hover && 'hover:shadow-none hover:shadow-primary-500/10 hover:border-primary-500/20/60 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

function CardBody({ children, className }: CardBodyProps) {
  return <div className={clsx('px-6 py-4', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('px-6 py-4 bg-transparent/60 border-t border-gray-200', className)}>
      {children}
    </div>
  );
}

// Attach sub-components to Card
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
export { CardHeader, CardBody, CardFooter };
