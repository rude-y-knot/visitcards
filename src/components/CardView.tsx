import React, { useState, useRef } from 'react';
import { Employee } from '../types';
import { 
  Phone, Mail, Globe, MapPin, ExternalLink, Download, Copy, Check, Send, 
  MessageSquare, ShieldCheck, QrCode, Palette, Megaphone, Wrench, Award, 
  TrendingUp, Users, Coins, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';

const getDepartmentIcon = (dept: string) => {
  const d = dept ? dept.trim().toLowerCase() : '';
  if (d.includes('дизайн')) return <Palette size={38} className="text-bronze" />;
  if (d.includes('маркетинг')) return <Megaphone size={38} className="text-bronze" />;
  if (d.includes('производство')) return <Wrench size={38} className="text-bronze" />;
  if (d.includes('управление') || d.includes('руководство')) return <Award size={38} className="text-bronze" />;
  if (d.includes('продажи')) return <TrendingUp size={38} className="text-bronze" />;
  if (d.includes('кадры') || d.includes('персонал')) return <Users size={38} className="text-bronze" />;
  if (d.includes('финансы') || d.includes('бухгалтерия')) return <Coins size={38} className="text-bronze" />;
  return <Briefcase size={38} className="text-bronze" />;
};

interface CardViewProps {
  employee: Employee;
  onDownloadVCF: (emp: Employee) => void;
  onCopyLink: (emp: Employee) => void;
  standalone?: boolean;
}

export default function CardView({ employee, onDownloadVCF, onCopyLink, standalone = true }: CardViewProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    onCopyLink(employee);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardUrl = `${window.location.origin}${window.location.pathname}?card=${employee.id}`;

  const downloadSVG = () => {
    const container = qrContainerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${employee.lastName}_${employee.firstName}_qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Premium Business Card Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#2A2520] rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}
      >
        {/* Elite design lines & marble gloss texture simulations */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-bronze to-transparent"></div>
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-bronze/10 rounded-full blur-[90px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gray-800/10 rounded-full blur-[90px] pointer-events-none"></div>
        
        {/* Content Box */}
        <div className="p-6.5 sm:p-8 relative z-10 flex flex-col justify-between min-h-[610px]">
          
          <div>
            {/* Top Logo Mark */}
            <div className="flex flex-col items-center mb-7">
              <div className="h-6.5 flex items-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 142 12548.52 4854.06" 
                  className="h-5.5 w-auto" 
                  style={{ shapeRendering: 'geometricprecision', textRendering: 'geometricprecision', fillRule: 'evenodd', clipRule: 'evenodd' }}
                >
                  <g>
                    <path fill="white" d="M152.37 4699.27c-47.62,-25.8 -84.84,-61.64 -111.85,-107.35 -27.01,-45.53 -40.52,-97.13 -40.52,-154.44 0,-57.31 13.68,-108.73 40.86,-154.44 27.19,-45.71 64.58,-81.38 112.2,-107.35 47.61,-25.97 100.94,-38.79 159.81,-38.79 47.79,0 91.59,8.31 131.07,24.94 39.47,16.79 72.89,40.86 100.07,72.54l-70.12 65.97c-42.24,-45.71 -94.36,-68.39 -156.17,-68.39 -40,0 -76.01,8.83 -107.7,26.32 -31.68,17.48 -56.44,41.9 -74.28,73.06 -17.83,31.17 -26.66,66.49 -26.66,105.97 0,39.47 8.83,74.79 26.66,105.96 17.84,31.17 42.6,55.58 74.28,73.07 31.69,17.48 67.53,26.31 107.7,26.31 61.81,0 113.75,-23.02 156.17,-69.25l70.12 66.83c-27.18,31.69 -60.77,55.93 -100.59,72.55 -39.82,16.79 -83.63,25.1 -131.42,25.1 -58.69,0.18 -112.02,-12.81 -159.63,-38.61z"></path>
                    <path fill="white" d="M1008.38 4616.51c31.17,-17.49 55.58,-41.9 73.42,-73.41 17.83,-31.52 26.83,-66.66 26.83,-105.62 0,-38.96 -9,-74.11 -26.83,-105.62 -17.84,-31.51 -42.25,-55.92 -73.42,-73.41 -31.16,-17.49 -66.14,-26.32 -105.27,-26.32 -38.95,0 -73.93,8.83 -105.27,26.32 -31.16,17.49 -55.58,42.07 -73.41,73.41 -17.83,31.51 -26.84,66.66 -26.84,105.62 0,38.96 8.83,74.1 26.84,105.62 17.83,31.51 42.25,55.92 73.41,73.41 31.17,17.49 66.14,26.32 105.27,26.32 39.13,0 74.11,-8.66 105.27,-26.32zm-266.29 82.76c-47.79,-25.8 -85.36,-61.81 -112.72,-107.69 -27.18,-45.89 -40.86,-97.31 -40.86,-153.93 0,-56.79 13.68,-108.04 40.86,-153.92 27.19,-45.88 64.93,-81.72 112.72,-107.7 47.79,-25.97 101.46,-38.78 161.02,-38.78 59.56,0 113.24,12.99 161.03,38.78 47.78,25.98 85.36,61.64 112.71,107.35 27.19,45.71 40.86,97.14 40.86,154.45 0,57.31 -13.67,108.73 -40.86,154.44 -27.18,45.71 -64.93,81.55 -112.71,107.35 -47.79,25.97 -101.47,38.78 -161.03,38.78 -59.39,-0.34 -113.06,-13.33 -161.02,-39.13z"></path>
                    <path fill="white" d="M1727.79 4559.37c0,-56.79 -38.44,-85.18 -115.14,-85.18l-166.91 0 0 171.93 166.91 0c76.88,0 115.14,-28.92 115.14,-86.75zm-282.05 -164.31l145.27 0c34.97,0 61.81,-6.93 80.16,-20.95 18.36,-13.85 27.53,-34.46 27.53,-61.81 0,-27.19 -9.17,-47.96 -27.53,-62.16 -18.35,-14.2 -45.01,-21.3 -80.16,-21.3l-145.27 0 0 166.22zm362.22 82.07c19.39,24.24 29.26,54.37 29.26,90.55 0,51.25 -18.87,91.08 -56.79,119.3 -37.92,28.39 -92.63,42.59 -164.49,42.59l-277.2 0 0 -584.36 261.27 0c65.62,0 116.87,13.16 153.58,39.31 36.71,26.14 55.06,63.2 55.06,110.98 0,30.65 -7.45,57.14 -22.16,79.3 -14.72,22.16 -36.02,39.13 -63.89,50.91 37.4,10.21 65.97,27.35 85.36,51.42z"></path>
                    <polygon fill="white" points="2398.89,4638.67 2398.89,4729.57 1960.67,4729.57 1960.67,4145.39 2387.12,4145.39 2387.12,4236.29 2069.23,4236.29 2069.23,4388.31 2351.28,4388.31 2351.28,4477.65 2069.23,4477.65 2069.23,4638.67 "></polygon>
                    <path fill="white" d="M2862.92 4439.21c24.41,-20.08 36.7,-48.65 36.7,-86.05 0,-37.4 -12.29,-65.97 -36.7,-86.05 -24.42,-19.91 -60.43,-29.96 -107.7,-29.96l-126.91 0 0 232.01 126.91 0c47.44,0 83.28,-9.86 107.7,-29.95zm29.6 -268.72c37.58,16.8 66.32,40.69 86.4,71.86 20.09,31.16 30.13,68.04 30.13,110.98 0,42.25 -10.04,79.13 -30.13,110.64 -20.08,31.51 -48.82,55.58 -86.4,72.2 -37.57,16.8 -81.72,25.11 -132.28,25.11l-131.93 0 0 168.64 -108.56 0 0 -584.36 240.32 0c50.9,-0.17 95.05,8.14 132.45,24.93z"></path>
                    <polygon fill="white" points="3862.99,4145.39 3862.99,4729.57 3112.59,4729.57 3112.59,4145.39 3219.42,4145.39 3219.42,4637.81 3434.81,4637.81 3434.81,4145.39 3541.64,4145.39 3541.64,4637.81 3756.16,4637.81 3756.16,4145.39 "></polygon>
                    <polygon fill="white" points="4465.53,4638.67 4465.53,4729.57 4027.3,4729.57 4027.3,4145.39 4453.93,4145.39 4453.93,4236.29 4135.86,4236.29 4135.86,4388.31 4417.91,4388.31 4417.91,4477.65 4135.86,4477.65 4135.86,4638.67 "></polygon>
                    <polygon fill="white" points="5105.81,4145.39 5105.81,4729.57 4997.25,4729.57 4997.25,4479.21 4695.11,4479.21 4695.11,4729.57 4586.55,4729.57 4586.55,4145.39 4695.11,4145.39 4695.11,4386.58 4997.25,4386.58 4997.25,4145.39 "></polygon>
                    <polygon fill="white" points="5788.51,4145.39 5788.51,4729.57 5679.95,4729.57 5679.95,4479.21 5377.81,4479.21 5377.81,4729.57 5269.25,4729.57 5269.25,4145.39 5377.81,4145.39 5377.81,4386.58 5679.95,4386.58 5679.95,4145.39 "></polygon>
                    <path fill="white" d="M6523.85 4145.39l106.83 0 0 584.35 -106.83 0 0 -584.35zm-226.99 471.64c22.85,-19.39 34.28,-47.79 34.28,-85.19 0,-70.64 -43.98,-105.96 -131.94,-105.96l-139.38 0 0 220.41 139.38 0c42.25,-0.17 74.8,-9.87 97.66,-29.26zm86.39 -226.65c37.58,31.52 56.28,78.09 56.28,139.73 0,64.58 -20.61,113.93 -61.82,148.21 -41.2,34.28 -99.03,51.42 -173.66,51.42l-251.23 0 0 -584.35 106.83 0 0 197.9 161.89 0c70.3,0 124.14,15.58 161.71,47.09z"></path>
                    <path fill="white" d="M6986.81 4070.3c-25.44,-20.74 -38.51,-50.89 -39.03,-90.79l76.49 0c0.53,20.74 7.15,36.77 20.22,47.92 12.89,11.15 31.71,16.73 56.28,16.73 24.05,0 43.04,-5.58 56.8,-16.73 13.77,-11.15 20.91,-27.18 21.44,-47.92l75.62 0c-0.52,39.21 -13.94,69.35 -39.9,90.26 -26.14,20.91 -63.95,31.54 -113.79,31.54 -50.7,0.18 -88.69,-10.28 -114.13,-31.01zm-147.41 70.57l107.51 0 0 417.49 315.91 -417.49 101.59 0 0 588.08 -107.51 0 0 -416.62 -315.92 416.62 -101.58 0 0 -588.08z"></path>
                    <path fill="white" d="M7848.39 4529.76c-9.52,50.39 -24.41,86.4 -45.02,108.05l296.25 0 0 -400.66 -228.72 0 -4.16 103.54c-2.59,75.67 -8.83,138.69 -18.35,189.07zm442.55 108.05l0 216.25 -100.07 0 0 -124.32 -448.27 0 0 124.32 -100.94 0 0.86 -216.25 25.11 0c36.7,-1.56 62.5,-28.75 77.22,-81.38 14.72,-52.64 23.72,-127.78 27.18,-225.78l6.76 -185.26 428.18 0 0 492.42 83.97 0z"></path>
                    <path fill="white" d="M8964.47 4145.39l106.83 0 0 584.35 -106.83 0 0 -584.35zm-226.99 471.64c22.85,-19.39 34.28,-47.79 34.28,-85.19 0,-70.64 -43.98,-105.96 -131.94,-105.96l-139.38 0 0 220.41 139.38 0c42.25,-0.17 74.8,-9.87 97.66,-29.26zm86.4 -226.65c37.57,31.52 56.27,78.09 56.27,139.73 0,64.58 -20.61,113.93 -61.81,148.21 -41.21,34.28 -99.04,51.42 -173.67,51.42l-251.23 0 0 -584.35 106.83 0 0 197.9 161.89 0c70.3,0 124.14,15.58 161.72,47.09z"></path>
                    <polygon fill="white" points="9772.35,4729.57 9771.66,4342.42 9579.64,4662.91 9531.16,4662.91 9339.32,4347.45 9339.32,4729.57 9236.65,4729.57 9236.65,4145.39 9325.82,4145.39 9557.14,4531.84 9785.86,4145.39 9874.33,4145.39 9875.89,4729.57 "></polygon>
                    <path fill="white" d="M10415.06 4616.51c31.16,-17.49 55.58,-41.9 73.41,-73.41 17.83,-31.52 26.66,-66.66 26.66,-105.62 0,-38.96 -8.83,-74.11 -26.66,-105.62 -17.83,-31.51 -42.25,-55.92 -73.41,-73.41 -31.17,-17.49 -66.14,-26.32 -105.1,-26.32 -38.96,0 -74.11,8.83 -105.27,26.32 -31.17,17.49 -55.58,42.07 -73.41,73.41 -17.84,31.51 -26.67,66.66 -26.67,105.62 0,38.96 8.83,74.1 26.67,105.62 17.83,31.51 42.24,55.92 73.41,73.41 31.16,17.49 66.14,26.32 105.27,26.32 38.96,0 73.93,-8.83 105.1,-26.32zm-266.12 82.59c-47.96,-25.8 -85.36,-61.81 -112.72,-107.7 -27.18,-45.88 -40.86,-97.3 -40.86,-153.92 0,-56.79 13.68,-108.04 40.86,-153.92 27.18,-45.89 64.76,-81.73 112.72,-107.7 47.78,-25.97 101.46,-38.78 161.19,-38.78 59.56,0 113.24,12.81 161.03,38.78 47.96,25.97 85.36,61.64 112.71,107.35 27.19,45.71 40.86,97.13 40.86,154.44 0,57.31 -13.67,108.74 -40.86,154.45 -27.18,45.71 -64.75,81.55 -112.71,107.34 -47.96,25.98 -101.47,38.79 -161.03,38.79 -59.73,-0.17 -113.41,-13.16 -161.19,-39.13z"></path>
                    <polygon fill="white" points="10791.64,4145.39 10929.29,4340.69 11066.94,4145.39 11193.85,4145.39 10997.68,4425.88 11209.78,4729.57 11081.14,4729.57 10929.29,4516.78 10778.14,4729.57 10652.96,4729.57 10864.19,4430.03 10666.29,4145.39 "></polygon>
                    <path fill="white" d="M11656.32 4616.51c31.16,-17.49 55.58,-41.9 73.41,-73.41 17.83,-31.52 26.66,-66.66 26.66,-105.62 0,-38.96 -8.83,-74.11 -26.66,-105.62 -17.83,-31.51 -42.25,-55.92 -73.41,-73.41 -31.17,-17.49 -66.14,-26.32 -105.1,-26.32 -38.96,0 -74.1,8.83 -105.27,26.32 -31.17,17.49 -55.58,42.07 -73.41,73.41 -17.84,31.51 -26.67,66.66 -26.67,105.62 0,38.96 8.83,74.1 26.67,105.62 17.83,31.51 42.24,55.92 73.41,73.41 31.16,17.49 66.14,26.32 105.27,26.32 38.78,0 73.93,-8.83 105.1,-26.32zm-266.3 82.59c-47.96,-25.8 -85.35,-61.81 -112.71,-107.7 -27.18,-45.88 -40.86,-97.3 -40.86,-153.92 0,-56.79 13.68,-108.04 40.86,-153.92 27.18,-45.89 64.75,-81.73 112.71,-107.7 47.79,-25.97 101.47,-38.78 161.2,-38.78 59.56,0 113.24,12.98 161.02,38.78 47.96,25.97 85.36,61.64 112.72,107.35 27.18,45.71 40.86,97.13 40.86,154.44 0,57.31 -13.68,108.74 -40.86,154.45 -27.18,45.71 -64.76,81.55 -112.72,107.34 -47.96,25.98 -101.46,38.79 -161.02,38.79 -59.73,-0.17 -113.41,-13.16 -161.2,-39.13z"></path>
                    <path fill="white" d="M12106.14 4529.76c-9.52,50.39 -24.41,86.4 -45.01,108.05l296.24 0 0 -400.66 -228.72 0 -4.15 103.54c-2.77,75.67 -8.83,138.69 -18.36,189.07zm442.38 108.05l0 216.25 -100.07 0 0 -124.32 -448.27 0 0 124.32 -100.94 0 0.86 -216.25 25.11 0c36.71,-1.56 62.5,-28.75 77.22,-81.38 14.72,-52.64 23.72,-127.78 27.18,-225.78l6.76 -185.26 428.18 0 0 492.42 83.97 0z"></path>
                    <path fill="white" d="M3706.41 3004.71l625.05 0 -317 -598.72 -308.05 598.72zm-8.78 -968.38l636.16 0 875.96 1593.43 -543.56 0 -151.88 -281.72 -990.4 0 -143.1 281.72 -545.89 0 862.71 -1593.43z"></path>
                    <path fill="white" d="M11045.18 3004.71l625.04 0 -317 -598.72 -308.04 598.72zm-8.78 -968.56l636.15 0 875.97 1593.61 -543.74 0 -151.88 -281.72 -990.4 0 -143.1 281.72 -545.89 0 862.89 -1593.61z"></path>
                    <path fill="#D12421" d="M2126.24 648.69l-1043.6 1043.42c-93.49,93.49 -93.49,244.82 0,338.13l169.07 169.07 169.07 169.07 0 -236.95c0,-64.83 25.79,-126.98 71.63,-173.01l1043.42 -1043.41c93.49,-93.49 93.49,-244.83 0,-338.14l-169.07 -169.07 -169.06 -169.06 0 236.94c0,64.83 -25.61,126.98 -71.46,173.01z"></path>
                    <path fill="#D12421" d="M1350.75 409.77l-1043.42 1043.42c-93.49,93.49 -93.49,244.83 0,338.14l169.07 169.06 169.07 168.18 0 -236.95c0,-63.94 25.79,-126.08 71.63,-171.93l1043.42 -1043.42c93.49,-93.49 93.49,-244.83 0,-338.14l-169.07 -169.06 -169.06 -169.07 0 236.95c0,64.83 -25.79,126.97 -71.64,172.82z"></path>
                    <polygon fill="white" points="7338.77,2036.33 8089.18,2036.33 8641.7,3061.84 9194.03,2036.33 9944.63,2036.15 9944.63,3629.76 9469.12,3629.76 9469.12,2485.33 9464.83,2485.33 8824.38,3629.76 8459.02,3629.76 7818.57,2485.33 7814.09,2485.33 7814.09,3629.76 7338.59,3629.76 7338.59,2036.33 "></polygon>
                    <polygon fill="#D12421" points="1303.11,3395.14 714.42,3132.94 714.42,3629.76 1891.44,3629.76 1891.44,3132.94 "></polygon>
                    <polygon fill="white" points="1303.11,2584.62 -0,2006.68 -0,3629.76 475.5,3629.76 475.5,2734.17 1303.11,3106.69 2130.54,2734.17 2130.54,3629.76 2606.04,3629.76 2606.04,2006.5 "></polygon>
                    <polygon fill="white" points="5438.63,3629.76 5914.13,3629.76 5914.13,2419.59 7112.48,2419.46 7109.71,2036.21 5438.63,2036.21 "></polygon>
                  </g>
                </svg>
              </div>
              <div className="h-[2px] w-8 bg-bronze mt-2 rounded-full"></div>
            </div>

            {/* Avatar & Verification Indicator */}
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-bronze via-white/10 to-white/5 p-1 shadow-2xl mb-4 relative">
                <div className="w-full h-full rounded-full bg-black/35 flex items-center justify-center text-white border border-white/5">
                  {getDepartmentIcon(employee.department)}
                </div>
                <div className="absolute bottom-0.5 right-0.5 bg-bronze text-white p-1 rounded-full border-2 border-[#2A2520] shadow-lg flex items-center justify-center">
                  <ShieldCheck size={14} />
                </div>
              </div>

              {/* Name & Title */}
              <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-bronze text-xs font-semibold tracking-widest uppercase mt-2 bg-bronze/10 px-3 py-1 rounded-full border border-bronze/20 inline-block">
                {employee.title}
              </p>
              
              <div className="mt-3 text-xs text-gray-400 font-medium">
                <span>{employee.department} • Magma Home</span>
              </div>
            </div>

            {/* Actions & Connections */}
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`tel:${employee.phone}`}
                  className="flex items-center justify-center space-x-2 py-3 bg-black/20 hover:bg-white/5 text-gray-200 hover:text-white rounded-xl border border-white/5 transition-all text-sm font-medium shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                >
                  <Phone size={16} className="text-gray-400" />
                  <span>Позвонить</span>
                </a>
                <a 
                  href={`mailto:${employee.email}`}
                  className="flex items-center justify-center space-x-2 py-3 bg-black/20 hover:bg-white/5 text-gray-200 hover:text-white rounded-xl border border-white/5 transition-all text-sm font-medium shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                >
                  <Mail size={16} className="text-gray-400" />
                  <span>Написать</span>
                </a>
              </div>

              {/* Chat Platforms */}
              <div className="space-y-2">
                {employee.telegram && (
                  <a 
                    href={`https://t.me/${employee.telegram}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-white/5 rounded-xl border border-sky-900/20 text-sky-400 hover:text-sky-300 transition-all text-xs"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Send size={14} className="transform rotate-[-30deg]" />
                      <span className="font-medium">Telegram</span>
                    </span>
                    <span className="text-xs text-sky-500/80 font-mono">@{employee.telegram}</span>
                  </a>
                )}

                {employee.whatsapp && (
                  <a 
                    href={`https://wa.me/${employee.whatsapp}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-white/5 rounded-xl border border-green-900/20 text-green-400 hover:text-green-300 transition-all text-xs"
                  >
                    <span className="flex items-center space-x-2.5">
                      <MessageSquare size={14} />
                      <span className="font-medium">WhatsApp</span>
                    </span>
                    <span className="text-xs text-green-500/80 font-mono">+{employee.whatsapp}</span>
                  </a>
                )}

                {employee.phone && employee.maxMessenger !== false && (
                  <div className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-xl border border-white/5 text-amber-400 text-xs select-none">
                    <span className="flex items-center space-x-2.5">
                      <MessageSquare size={14} className="text-amber-400" />
                      <span className="font-medium text-gray-300">Мессенджер Макс</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                      есть на этом номере
                    </span>
                  </div>
                )}
              </div>

              {/* Physical Details / Company Coordinates */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs space-y-3 shadow-inner">
                {employee.website && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                      <Globe size={13} />
                      Сайт:
                    </span>
                    <a 
                      href={`https://${employee.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-bronze hover:underline font-medium flex items-center gap-1 truncate"
                    >
                      {employee.website}
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  </div>
                )}
                {employee.address && (
                  <div className="text-gray-300">
                    <span className="text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <MapPin size={13} />
                      Адрес производства:
                    </span>
                    <a 
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(employee.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-white flex items-start space-x-1.5 group/link"
                    >
                      <span className="underline decoration-dotted decoration-gray-600 group-hover/link:decoration-white transition-all text-[11px] leading-relaxed">
                        {employee.address}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => onDownloadVCF(employee)}
              className="w-full bg-bronze hover:bg-bronze/90 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-bronze/20 hover:shadow-bronze/30 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <Download size={16} />
              <span>Сохранить контакт (VCF)</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-300 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    <span className="text-green-400">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Поделиться</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowQr(!showQr)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-300 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <QrCode size={14} />
                <span>QR-код</span>
              </button>
            </div>

            <AnimatePresence>
              {showQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col items-center space-y-4 shadow-inner overflow-hidden"
                >
                  <div ref={qrContainerRef} className="p-3 bg-white rounded-lg inline-block shadow-lg">
                    <QRCode
                      value={cardUrl}
                      size={140}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <button
                    onClick={downloadSVG}
                    className="flex items-center gap-1.5 text-xs text-bronze hover:text-bronze/80 transition-colors font-medium border border-bronze/30 px-3 py-1.5 rounded-lg bg-bronze/5 hover:bg-bronze/10"
                  >
                    <Download size={13} />
                    <span>Скачать QR-код (SVG)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center text-[9px] text-gray-600 font-mono pt-2">
              MAGMA HOME © {new Date().getFullYear()} • DIGITAL BUSINESS CARD
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 text-center max-w-xs text-xs text-gray-500 leading-relaxed px-4">
        Электронная визитка полностью совместима с Apple Wallet и стандартными телефонными книгами.
      </div>
    </div>
  );
}
