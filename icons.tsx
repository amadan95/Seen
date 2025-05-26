import React from 'react';

interface IconProps {
  className?: string;
  title?: string; 
}

export const PlusIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'plusIconTitle' : undefined}>
    {title && <title id="plusIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'eyeIconTitle' : undefined}>
    {title && <title id="eyeIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'starIconTitle' : undefined}>
    {title && <title id="starIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.82.61l-4.725-2.885a.563.563 0 00-.652 0l-4.725 2.885a.562.562 0 01-.82-.61l1.285-5.385a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

export const XMarkIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'xMarkIconTitle' : undefined}>
    {title && <title id="xMarkIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'checkIconTitle' : undefined}>
    {title && <title id="checkIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'homeIconTitle' : undefined}>
    {title && <title id="homeIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

export const ListBulletIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'listBulletIconTitle' : undefined}>
    {title && <title id="listBulletIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

export const UserGroupIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'userGroupIconTitle' : undefined}>
    {title && <title id="userGroupIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.249-3.03c-.014-.005-.028-.009-.042-.014M10.23 19.032a3.75 3.75 0 01-4.682-2.72M15 11.25a3 3 0 11-6 0 3 3 0 016 0zm6 2.25a8.955 8.955 0 01-1.372 4.957m0 0a3 3 0 01-3.41-2.197M12 12.75a3.75 3.75 0 00-2.065 7.032M3 15.75a3 3 0 01-2.197-3.41M3.75 11.25a8.955 8.955 0 014.957-1.372M4.5 6.75a3 3 0 012.197 3.41M17.25 11.25a3.75 3.75 0 007.032-2.065M12 3.75a3.75 3.75 0 012.065 7.032M12 3a8.955 8.955 0 014.628 1.372M5.25 6.75a3 3 0 00-3.41 2.197M12 3.75a8.955 8.955 0 00-4.628 1.372m0 0L7.5 9.75M18.75 9.75L16.5 5.25m0 0L12 3.75" />
  </svg>
);

export const QuestionMarkCircleIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'qMarkIconTitle' : undefined}>
    {title && <title id="qMarkIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chevronLeftIconTitle' : undefined}>
    {title && <title id="chevronLeftIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chevronRightIconTitle' : undefined}>
    {title && <title id="chevronRightIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'sparklesIconTitle' : undefined}>
    {title && <title id="sparklesIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 14.25l-1.25-2.25L13.5 11l2.25-1.25L17 7.5l1.25 2.25L20.5 11l-2.25 1.25z"/>
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'userIconTitle' : undefined}>
    {title && <title id="userIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

export const ChevronDoubleLeftIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chDblLeftIconTitle' : undefined}>
    {title && <title id="chDblLeftIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
  </svg>
);

export const ChevronDoubleRightIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chDblRightIconTitle' : undefined}>
    {title && <title id="chDblRightIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
  </svg>
);

export const ChatBubbleLeftEllipsisIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chatIconTitle' : undefined}>
    {title && <title id="chatIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.861 8.25-8.625 8.25S3.75 16.556 3.75 12 7.611 3.75 12.375 3.75 21 7.444 21 12z" />
  </svg>
);

export const InformationCircleIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'infoIconTitle' : undefined}>
    {title && <title id="infoIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'arrowUpTitle' : undefined}>
    {title && <title id="arrowUpTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
  </svg>
);

export const ArrowDownIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'arrowDownTitle' : undefined}>
    {title && <title id="arrowDownTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
  </svg>
);

export const HeartIcon: React.FC<IconProps & {_fill?: boolean}> = ({ className = "w-5 h-5", title, _fill=false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={_fill ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'heartTitle' : undefined}>
    {title && <title id="heartTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

export const ChatBubbleOvalLeftEllipsisIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'chatBubbleTitle' : undefined}>
    {title && <title id="chatBubbleTitle">{title}</title>}
  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.68-3.091a4.501 4.501 0 00-1.293-.394c-.438-.074-.864-.15-1.282-.227M13.5 9.511V6.75c0-1.136-.847-2.1-1.98-2.193-.34-.027-.68-.052-1.02-.072V3.75L5.82 6.841a4.501 4.501 0 00-1.293.393C4.091 7.308 3.75 7.366 3.75 7.366c-1.136 0-2.1.847-2.1 1.98v4.286c0 .837.418 1.58 1.096 1.987.372.217.785.372 1.208.477V19.5l3.68-3.091a4.501 4.501 0 001.293-.394c.438-.074.864-.15 1.282-.227m0 0a4.501 4.501 0 001.293.394m0 0c.438.074.864.15 1.282.227m0 0a4.501 4.501 0 001.293.394m0 0l3.68 3.091m0 0V15.56a4.501 4.501 0 00-1.293-.394m0 0c-.438-.074-.864-.15-1.282-.227m0 0c.418.076.812.168 1.182.282m0 0M12 12h.008v.008H12V12zm0 0h.008v.008H12V12zm0 0h.008v.008H12V12zm0 0h.008v.008H12V12z" />
</svg>
);

export const PlusCircleIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'plusCircleTitle' : undefined}>
    {title && <title id="plusCircleTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const PencilIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'pencilTitle' : undefined}>
    {title && <title id="pencilTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'trashTitle' : undefined}>
    {title && <title id="trashTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.111 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const FilmIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'filmTitle' : undefined}>
    {title && <title id="filmTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m3.75-3.75v3.75M3 13.5V21a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 21v-7.5M3 7.5V3.75A2.25 2.25 0 015.25 1.5h13.5A2.25 2.25 0 0121 3.75v3.75m-18 0h18M12 1.5v21" />
  </svg>
);

export const TvIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'tvTitle' : undefined}>
    {title && <title id="tvTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m3.75-3.75v3.75M3 13.5V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v6M3 7.5V3.75A2.25 2.25 0 015.25 1.5h13.5A2.25 2.25 0 0121 3.75v3.75m-18 0h18M12 1.5v21" />
  </svg>
);

export const RectangleStackIcon: React.FC<IconProps> = ({ className = "w-5 h-5", title }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'rectStackTitle' : undefined}>
    {title && <title id="rectStackTitle">{title}</title>}
  <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 12l4.179 2.25M6.429 15.75l5.571 3 5.571-3M6.429 15.75L2.25 18l4.179 2.25m0-4.5l5.571 3 5.571-3m0-4.5l5.571 3-5.571 3M12 3v3.75m0 13.5V21m0-9H2.25m19.5 0H12M12 3L2.25 7.5M12 3L21.75 7.5M12 21L2.25 16.5M12 21L21.75 16.5" />
</svg>
);

export const BookmarkIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'bookmarkIconTitle' : undefined}>
    {title && <title id="bookmarkIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

export const BookmarkSquareIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-labelledby={title ? 'bookmarkSquareIconTitle' : undefined}>
    {title && <title id="bookmarkSquareIconTitle">{title}</title>}
    <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
  </svg>
);

// Icons for Profile Page
export const CheckCircleIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'checkCircleIconTitle' : undefined}>
    {title && <title id="checkCircleIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const ArrowUpOnSquareIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => ( // For Share
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'arrowUpSquareIconTitle' : undefined}>
    {title && <title id="arrowUpSquareIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 15V4.5m0 0l-3.75 3.75M12 4.5l3.75 3.75" />
  </svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'trophyIconTitle' : undefined}>
    {title && <title id="trophyIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0012.75 9.75H11.25A3.375 3.375 0 007.5 13.5v4.5m3.75-6.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5zm3-3.75A3.375 3.375 0 0112 3.375V1.5A2.25 2.25 0 009.75 3.75v1.125M14.25 6.75A3.375 3.375 0 0012 10.125v1.125A2.25 2.25 0 019.75 9V7.875" />
  </svg>
);

export const FireIcon: React.FC<IconProps> = ({ className = "w-6 h-6", title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-labelledby={title ? 'fireIconTitle' : undefined}>
    {title && <title id="fireIconTitle">{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
  </svg>
);
