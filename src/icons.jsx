// Stroke-based icons. Each: 20x20 viewBox, strokeWidth 1.6, currentColor.
import React from 'react';

const Ic = ({ d, c, s = 1.6, fill = "none", size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} stroke="currentColor"
       strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    {d ? <path d={d} /> : c}
  </svg>
);

export const I = {
  Logo: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="pl-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="oklch(0.74 0.16 35)"/>
          <stop offset="1" stop-color="oklch(0.58 0.20 18)"/>
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#pl-grad)"/>
      <g transform="translate(24 24) scale(3)" color="white">
        <path d="M3 7 C3 5.34315 4.34315 4 6 4 H9.5 L11 5.6 H18 C19.6569 5.6 21 6.94315 21 8.6 V9.5 H3 Z"
              fill="currentColor" opacity="0.78"/>
        <path d="M3 8.6 C3 6.94315 4.34315 5.6 6 5.6 H18 C19.6569 5.6 21 6.94315 21 8.6 V18 C21 19.6569 19.6569 21 18 21 H6 C4.34315 21 3 19.6569 3 18 Z"
              fill="currentColor"/>
        <rect x="6.4" y="9.4" width="11.2" height="9.2" rx="1.6" fill="white" opacity="0.94"/>
        <g transform="translate(12 14)" stroke="oklch(0.58 0.20 18)" stroke-width="1.5" stroke-linecap="round">
          <line x1="0" y1="-3" x2="0" y2="3"/>
          <line x1="-3" y1="0" x2="3" y2="0"/>
          <line x1="-2.1" y1="-2.1" x2="2.1" y2="2.1" opacity="0.55"/>
          <line x1="-2.1" y1="2.1" x2="2.1" y2="-2.1" opacity="0.55"/>
          <circle cx="0" cy="0" r="0.9" fill="oklch(0.58 0.20 18)" stroke="none"/>
        </g>
      </g>
    </svg>
  ),
  Search:    <Ic c={<><circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/></>} />,
  Plus:      <Ic d="M10 4v12M4 10h12" />,
  Folder:    <Ic d="M3 7a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  FolderOpen:<Ic d="M3 7a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v0H3zM3 9h14l-1.4 6a2 2 0 0 1-2 1.5H4.4A1.5 1.5 0 0 1 3 15z" />,
  Chat:      <Ic d="M4 5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-3 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  ChatPlus:  <Ic c={<><path d="M4 5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-3 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M10 8v4M8 10h4"/></>} />,
  File:      <Ic d="M6 3h6l3 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 3v3h3" />,
  FilePdf:   <Ic c={<><path d="M6 3h6l3 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 3v3h3"/><path d="M7 11h6M7 13h4M7 15h5" strokeWidth="1.4"/></>} />,
  Upload:    <Ic d="M10 13V4M6 8l4-4 4 4M4 14v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />,
  Send:      <Ic c={<path d="M3.5 10 16.5 4l-3 13-3.5-5z" fill="currentColor" stroke="currentColor"/>} />,
  Stop:      <Ic c={<rect x="5" y="5" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>} />,
  Sun:       <Ic c={<><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/></>} />,
  Moon:      <Ic d="M16 12.5A6.5 6.5 0 0 1 7.5 4 6.5 6.5 0 1 0 16 12.5z" />,
  Settings:  <Ic c={<><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5 6 6M14 14l1.5 1.5M4.5 15.5 6 14M14 6l1.5-1.5"/></>} />,
  More:      <Ic c={<><circle cx="5" cy="10" r="1.2" fill="currentColor"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/></>} />,
  ChevDown:  <Ic d="m5 8 5 5 5-5" />,
  ChevRight: <Ic d="m8 5 5 5-5 5" />,
  ChevLeft:  <Ic d="m12 5-5 5 5 5" />,
  Close:     <Ic d="m5 5 10 10M15 5 5 15" />,
  Check:     <Ic d="m4 10 4 4 8-9" />,
  Sparkle:   <Ic c={<><path d="M10 3v4M10 13v4M3 10h4M13 10h4"/><path d="M5 5l2 2M13 13l2 2M15 5l-2 2M5 15l2-2"/></>} />,
  Book:      <Ic d="M5 4h8a2 2 0 0 1 2 2v10H7a2 2 0 0 0-2 2zM5 4v14M15 16H7" />,
  Pin:       <Ic d="M10 3l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" />,
  Edit:      <Ic d="M4 14v2h2l8-8-2-2-8 8zM12 4l2 2" />,
  Trash:     <Ic c={<><path d="M4 6h12M8 6V4h4v2M6 6l1 10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-10"/></>} />,
  Download:  <Ic d="M10 4v9M6 9l4 4 4-4M4 16h12" />,
  Eye:       <Ic c={<><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/><circle cx="10" cy="10" r="2"/></>} />,
  Globe:     <Ic c={<><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a10 10 0 0 1 0 14M10 3a10 10 0 0 0 0 14"/></>} />,
  Code:      <Ic d="m6 6-4 4 4 4M14 6l4 4-4 4M11 4 9 16" />,
  Image:     <Ic c={<><rect x="3" y="4" width="14" height="12" rx="1.5"/><circle cx="7.5" cy="8.5" r="1.2"/><path d="m3 14 4-4 3 3 3-4 4 4"/></>} />,
  Spreadsheet: <Ic c={<><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 8h14M3 12h14M9 4v12"/></>} />,
  Loader:    <Ic c={<circle cx="10" cy="10" r="6" strokeDasharray="9 30" />} />,
  Attach:    <Ic d="M14 7 8 13a3 3 0 1 0 4 4l7-7a4.5 4.5 0 0 0-6.4-6.4L5.5 11" />,
  Mic:       <Ic c={<><rect x="8" y="3" width="4" height="9" rx="2"/><path d="M5 9a5 5 0 0 0 10 0M10 14v3"/></>} />,
  ArrowUp:   <Ic d="M10 16V4M5 9l5-5 5 5" />,
  Copy:      <Ic c={<><rect x="6" y="6" width="10" height="10" rx="1.5"/><path d="M14 6V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2"/></>} />,
  Refresh:   <Ic d="M4 9a6 6 0 0 1 11-3l1 2M16 4v3h-3M16 11a6 6 0 0 1-11 3l-1-2M4 16v-3h3" />,
  Thumb:     <Ic d="M5 9h2v8H5zM7 9l3-6c1.5 0 2 1 2 2v3h3a2 2 0 0 1 2 2.3l-1 5A2 2 0 0 1 14 17H7" />,
  Share:     <Ic c={<><circle cx="6" cy="10" r="2.5" fill="none"/><circle cx="14" cy="5" r="2.5" fill="none"/><circle cx="14" cy="15" r="2.5" fill="none"/><path d="m8.5 11.5 3.5 2M8.5 8.5l3.5-2"/></>} />,
  Menu:      <Ic d="M3 5h14M3 10h14M3 15h14" />,
  Users:     <Ic c={<><circle cx="8" cy="7" r="3" fill="none"/><path d="M2 17c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="14" cy="9" r="2" fill="none"/><path d="M18 17c0-2.2-1.5-4-3.5-4.5"/></>} />,
  Logout:    <Ic c={<><path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><path d="M13 13l4-4-4-4"/><path d="M8 10h9"/></>} />,
  Play:      <Ic c={<polygon points="5,3 17,10 5,17" fill="currentColor" stroke="none"/>} />,
};
