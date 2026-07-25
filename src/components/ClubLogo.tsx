import React from 'react';

interface ClubLogoProps {
  className?: string; // styling for container (e.g. "h-10 w-10")
  showText?: boolean;  // whether to include the text block underneath
  textColor?: string;  // color class for text block
  logoUrl?: string | null; // custom logo image URL
}

export default function ClubLogo({ 
  className = "h-12 w-12", 
  showText = false,
  textColor = "text-slate-900",
  logoUrl = null
}: ClubLogoProps) {
  return (
    <div className="flex flex-col items-center select-none logo-lift cursor-pointer" id="club-logo-wrapper">
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt="Club Logo" 
          className={`${className} object-contain`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg 
          id="iiserk-athletics-logo-svg"
          viewBox="0 0 500 500" 
          className={`${className}`}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
        <defs>
          {/* Metallic golden shine gradient for the majestic S track ribbon */}
          <linearGradient id="goldTrackGradient" x1="150" y1="100" x2="350" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C5A029" />
            <stop offset="30%" stopColor="#FFDF00" />
            <stop offset="50%" stopColor="#F5D033" />
            <stop offset="70%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#9E7815" />
          </linearGradient>

          {/* Golden fire/torch gradient */}
          <linearGradient id="fireGradient" x1="330" y1="200" x2="355" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EF4444" /> {/* red-500 */}
            <stop offset="50%" stopColor="#F59E0B" /> {/* amber-500 */}
            <stop offset="100%" stopColor="#FCD34D" /> {/* amber-300 */}
          </linearGradient>
          
          {/* Track shading to match aesthetic depth */}
          <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* --- TRACK / FOUNDATION LINES (A-Legs & Running Lanes) --- */}
        {/* Slanted track lines forming the left leg of "A" and lanes */}
        <g stroke="#1E293B" strokeWidth="6" strokeLinecap="round" opacity="0.95">
          <line x1="120" y1="430" x2="210" y2="230" />
          <line x1="150" y1="430" x2="230" y2="250" />
          <line x1="180" y1="430" x2="250" y2="275" />
          {/* Crossbars / track lanes of A */}
          <line x1="125" y1="410" x2="415" y2="410" strokeWidth="4" />
          <line x1="135" y1="390" x2="400" y2="390" strokeWidth="3" />
          <line x1="145" y1="370" x2="385" y2="370" strokeWidth="2.5" />
          <line x1="155" y1="350" x2="370" y2="350" strokeWidth="1.5" />
        </g>

        {/* --- THE LETTER "A" LEFT ARM STRUT --- */}
        <path 
          d="M 120 430 L 120 225 L 140 225 L 140 430 Z" 
          fill="#0F172A" 
          stroke="#0F172A" 
          strokeWidth="2" 
        />
        <path 
          d="M 120 230 C 120 230, 150 260, 190 320 L 175 330 C 135 270, 120 230, 120 230 Z" 
          fill="#0F172A" 
        />

        {/* --- THE LETTER "C" BASE CURVE --- */}
        <path 
          d="M 270 320 C 230 320, 190 350, 190 395 C 190 440, 240 445, 275 440 C 310 435, 335 410, 335 390 L 315 385 C 315 397, 295 422, 270 422 C 245 422, 215 415, 215 390 C 215 365, 245 340, 275 340 Z" 
          fill="#0F172A" 
          filter="url(#subtleShadow)"
        />

        {/* --- GOLDEN "S" TRACK RIBBON (Centered) --- */}
        {/* A majestic vector path drawing the wavy gold track ribbon wrapping the athlete */}
        <path 
          d="M 305 75 
             C 335 95, 305 150, 270 170 
             C 215 200, 180 230, 180 290 
             C 180 350, 235 400, 300 310 
             C 340 255, 310 200, 275 220 
             C 240 240, 210 270, 210 300
             C 210 320, 230 340, 260 320
             C 290 300, 295 240, 250 200
             C 215 170, 215 125, 255 100
             C 285 80, 295 72, 305 75 Z" 
          fill="url(#goldTrackGradient)"
          stroke="#9E7815"
          strokeWidth="3"
          strokeLinejoin="round"
          filter="url(#subtleShadow)"
        />

        {/* --- JAVELIN THROWER ATHLETE SILHOUETTE --- */}
        {/* Thrower's Core Torso, Leg, and Arms */}
        <g fill="#0F172A">
          {/* Left leg (anchored and extended) */}
          <path d="M 195 342 L 140 425 L 160 430 L 210 350 Z" />
          
          {/* Right leg (raised/running motion) */}
          <path d="M 210 330 C 210 330, 235 365, 255 365 C 270 365, 274 340, 260 330 L 225 310 Z" />

          {/* Torso */}
          <path d="M 180 210 Q 210 245 220 310 L 190 320 Q 175 245 180 210 Z" />

          {/* Chest & Shoulder Muscles */}
          <path d="M 165 200 Q 185 190 220 215 L 210 235 Q 180 215 165 200 Z" />

          {/* Athlete's Head */}
          <circle cx="180" cy="183" r="14" />

          {/* Left Arm (holding javelin backward) */}
          <path d="M 175 198 L 120 260 L 132 268 L 182 208 Z" />

          {/* Right Arm (pointing forward-upwards) */}
          <path d="M 215 210 L 280 185 L 285 195 L 220 222 Z" />
        </g>

        {/* --- THE JAVELIN SPEAR --- */}
        {/* A majestic javelin crossing the body and S ribbon */}
        <g stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round">
          <line x1="90" y1="285" x2="390" y2="115" />
        </g>
        {/* Javelin Point Highlight */}
        <polygon points="385,117 395,112 391,121" fill="#D4AF37" stroke="#0F172A" strokeWidth="1" />

        {/* --- ATHLETICS TORCH (Right of center S) --- */}
        {/* Cauldron base */}
        <path 
          d="M 315 220 
             L 360 220 
             L 350 310 
             L 340 310 
             L 342 320 
             L 342 425 
             L 332 425 
             L 332 320 
             L 334 310 
             L 325 310 Z" 
          fill="#0F172A" 
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        {/* Detailed concentric ring decorative base for torch */}
        <circle cx="337" cy="318" r="6" fill="#D4AF37" stroke="#0F172A" strokeWidth="1.5" />

        {/* Glowing Fire Flame on the Cauldron */}
        <path 
          d="M 315 210
             C 305 180, 315 150, 335 130
             C 340 120, 345 140, 345 150
             C 345 125, 360 110, 355 145
             C 355 120, 375 130, 360 180
             C 355 195, 345 212, 337 212
             C 325 212, 320 218, 315 210 Z" 
          fill="url(#fireGradient)"
          stroke="#B91C1C"
          strokeWidth="1.5"
          filter="url(#subtleShadow)"
        />

        {/* --- THE LETTER "K" (Extreme Right) --- */}
        {/* Traditional high-serif style "K" */}
        <path 
          d="M 390 422 L 390 225 L 412 225 L 412 422 Z 
             M 405 320 L 460 225 L 485 225 L 420 330 L 495 422 L 465 422 L 405 340 Z" 
          fill="#0F172A" 
          filter="url(#subtleShadow)"
        />
      </svg>
      )}

      {/* Optional Beautiful Serif Text Block Below */}
      {showText && (
        <div className="mt-4 text-center select-none" id="club-logo-brand-text">
          <h2 className={`font-serif text-lg font-bold tracking-[0.18em] uppercase leading-tight ${textColor}`}>
            Pratap
          </h2>
          <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-amber-500 to-transparent my-1.5 mx-auto" />
          <p className="font-serif text-[11px] font-extrabold tracking-[0.25em] text-amber-600 uppercase">
            IISER KOLKATA
          </p>
        </div>
      )}
    </div>
  );
}
