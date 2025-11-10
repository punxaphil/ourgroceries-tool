import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const SVG_BASE_PROPS: IconProps = {
  'fill': 'none',
  'xmlns': 'http://www.w3.org/2000/svg',
  'aria-hidden': 'true',
};

export const HomeIcon = (props: IconProps) => (
  <svg {...SVG_BASE_PROPS} width="20" height="20" viewBox="0 0 20 20" {...props}>
    <path
      d="M3 10L10 3L17 10M4 9V17H8V13H12V17H16V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...SVG_BASE_PROPS} width="14" height="16" viewBox="0 0 14 16" {...props}>
    <path
      d="M2.75 4.75h8.5l-.57 8.05a1.5 1.5 0 0 1-1.49 1.38H4.81a1.5 1.5 0 0 1-1.49-1.38L2.75 4.75Zm2.5-2.5h3.5l.5 1.5h-4.5l.5-1.5Zm-3 1.5h10"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 7v4.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8 7v4.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const PenIcon = (props: IconProps) => (
  <svg {...SVG_BASE_PROPS} width="16" height="16" viewBox="0 0 16 16" {...props}>
    <path
      d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Z"
      fill="currentColor"
    />
    <path d="M11.5 4.5 13.25 6.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const FilterIcon = (props: IconProps) => (
  <svg {...SVG_BASE_PROPS} width="16" height="16" viewBox="0 0 16 16" {...props}>
    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DragHandleIcon = (props: IconProps) => (
  <svg {...SVG_BASE_PROPS} width="16" height="16" viewBox="0 0 16 16" {...props}>
    <circle cx="5" cy="4" r="1" fill="currentColor" />
    <circle cx="5" cy="8" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="11" cy="4" r="1" fill="currentColor" />
    <circle cx="11" cy="8" r="1" fill="currentColor" />
    <circle cx="11" cy="12" r="1" fill="currentColor" />
  </svg>
);
