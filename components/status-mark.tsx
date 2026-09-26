export function StatusMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="13" fill="#174b86" />
      <path d="M14.7 22.4C18.3 15.6 24.7 11.5 32 11.5s13.7 4.1 17.3 10.9H14.7Z" fill="#fff" />
      <rect x="12.5" y="27.2" width="39" height="9.6" rx="1.7" fill="#fff" />
      <path d="M14.7 41.6h34.6C45.7 48.4 39.3 52.5 32 52.5s-13.7-4.1-17.3-10.9Z" fill="#fff" />
      <path d="M19 32h8l2.5-2.5 4.1 5 2.6-2.5H45" fill="none" stroke="#174b86" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
