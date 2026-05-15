import './styles/landing.css';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import Comparison from './sections/Comparison';
import SupportedDocs from './sections/SupportedDocs';
import Pricing from './sections/Pricing';
import Footer from './sections/Footer';

export default function LandingPage() {
    return (
        <div className="min-h-[100dvh] bg-[#f8f9fc] text-slate-800 font-body">
            <style dangerouslySetInnerHTML={{ __html: `
        .font-display { font-family: var(--font-dm-serif-display), 'DM Serif Display', Georgia, serif; }
        .font-body { font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif; }

        @property --glass-angle-1 { syntax: "<angle>"; inherits: true; initial-value: -75deg; }
        @property --glass-angle-2 { syntax: "<angle>"; inherits: true; initial-value: -45deg; }
        
        .glass-btn-wrap {
          --anim--hover-time: 400ms;
          --anim--hover-ease: cubic-bezier(0.25, 1, 0.5, 1);
          position: relative;
          z-index: 2;
          border-radius: 999vw;
          background: transparent;
          pointer-events: none;
          transition: transform var(--anim--hover-time) var(--anim--hover-ease);
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .glass-btn-shadow {
          --shadow-cuttoff-fix: 2em;
          position: absolute;
          width: calc(100% + var(--shadow-cuttoff-fix));
          height: calc(100% + var(--shadow-cuttoff-fix));
          top: calc(0% - var(--shadow-cuttoff-fix) / 2);
          left: calc(0% - var(--shadow-cuttoff-fix) / 2);
          filter: blur(clamp(2px, 0.125em, 12px));
          -webkit-filter: blur(clamp(2px, 0.125em, 12px));
          overflow: visible;
          pointer-events: none;
        }
        
        .glass-btn-shadow::after {
          content: "";
          position: absolute;
          z-index: 0;
          inset: 0;
          border-radius: 999vw;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
          width: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          height: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          left: calc(var(--shadow-cuttoff-fix) - 0.875em);
          padding: 0.125em;
          box-sizing: border-box;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          transition: top var(--anim--hover-time) var(--anim--hover-ease), opacity var(--anim--hover-time) var(--anim--hover-ease);
          opacity: 1;
        }
        
        .glass-btn {
          --border-width: clamp(1px, 0.0625em, 4px);
          all: unset;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          pointer-events: auto;
          z-index: 3;
          background: linear-gradient(-75deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
          border-radius: 999vw;
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.25em 0.125em -0.125em rgba(0, 0, 0, 0.2), 0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2), 0 0 0 0 rgba(255, 255, 255, 1);
          backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          -webkit-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          transition: transform var(--anim--hover-time) var(--anim--hover-ease),
                      box-shadow var(--anim--hover-time) var(--anim--hover-ease),
                      backdrop-filter var(--anim--hover-time) var(--anim--hover-ease);
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, box-shadow, backdrop-filter;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        

        .solid-btn {
          background: #4f46e5;
          color: white !important;
          border-radius: 999vw;
          padding: 0.7em 1.8em;
          font-weight: 600;
          font-family: 'DM Serif Display', Georgia, serif;
          border: 1px solid #4338ca;
          box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4), inset 0 1px 1px rgba(255,255,255,0.2);
          transition: background-color 300ms cubic-bezier(0.23, 1, 0.32, 1), transform 300ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 300ms cubic-bezier(0.23, 1, 0.32, 1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }
        .solid-btn:hover {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5), inset 0 1px 1px rgba(255,255,255,0.3);
        }
        .solid-btn:active {
          transform: translateY(0);
        }
        
        .glass-btn:hover {
          transform: scale(0.975);
          backdrop-filter: blur(0.01em);
          -webkit-backdrop-filter: blur(0.01em);
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.15em 0.05em -0.1em rgba(0, 0, 0, 0.25), 0 0 0.05em 0.1em inset rgba(255, 255, 255, 0.5), 0 0 0 0 rgba(255, 255, 255, 1);
        }
        
        .glass-btn span {
          position: relative;
          display: block;
          user-select: none;
          font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
          letter-spacing: -0.05em;
          font-weight: 500;
          font-size: 1em;
          color: rgba(50, 50, 50, 1);
          text-shadow: 0em 0.25em 0.05em rgba(0, 0, 0, 0.1);
          transition: text-shadow var(--anim--hover-time) var(--anim--hover-ease);
          padding-inline: 1.5em;
          padding-block: 0.875em;
        }
        
        .glass-btn:hover span {
          text-shadow: 0.025em 0.025em 0.025em rgba(0, 0, 0, 0.12);
        }
        
        .glass-btn span::after {
          content: "";
          display: block;
          position: absolute;
          z-index: 1;
          width: calc(100% - var(--border-width));
          height: calc(100% - var(--border-width));
          top: calc(0% + var(--border-width) / 2);
          left: calc(0% + var(--border-width) / 2);
          box-sizing: border-box;
          border-radius: 999vw;
          overflow: clip;
          background: linear-gradient(var(--glass-angle-2), rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.5) 40% 50%, rgba(255, 255, 255, 0) 55%);
          z-index: 3;
          mix-blend-mode: screen;
          pointer-events: none;
          background-size: 200% 200%;
          background-position: 0% 50%;
          background-repeat: no-repeat;
          transition: background-position calc(var(--anim--hover-time) * 1.25) var(--anim--hover-ease), --glass-angle-2 calc(var(--anim--hover-time) * 1.25) var(--anim--hover-ease);
        }
        
        .glass-btn:hover span::after { background-position: 25% 50%; }
        .glass-btn:active span::after { background-position: 50% 15%; --glass-angle-2: -15deg; }
        
        .glass-btn::after {
          content: "";
          position: absolute;
          z-index: 1;
          inset: 0;
          border-radius: 999vw;
          width: calc(100% + var(--border-width));
          height: calc(100% + var(--border-width));
          top: calc(0% - var(--border-width) / 2);
          left: calc(0% - var(--border-width) / 2);
          padding: var(--border-width);
          box-sizing: border-box;
          background: conic-gradient(from var(--glass-angle-1) at 50% 50%, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0) 5% 40%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0) 60% 95%, rgba(0, 0, 0, 0.5)), linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5));
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          transition: all var(--anim--hover-time) var(--anim--hover-ease), --glass-angle-1 500ms ease;
          box-shadow: inset 0 0 0 calc(var(--border-width) / 2) rgba(255, 255, 255, 0.5);
        }
        
        .glass-btn:hover::after { --glass-angle-1: -125deg; }
        .glass-btn:active::after { --glass-angle-1: -75deg; }
        
        .glass-btn-wrap:has(.glass-btn:hover) .glass-btn-shadow {
          filter: blur(clamp(2px, 0.0625em, 6px));
          -webkit-filter: blur(clamp(2px, 0.0625em, 6px));
          transition: filter var(--anim--hover-time) var(--anim--hover-ease);
        }
        .glass-btn-wrap:has(.glass-btn:hover) .glass-btn-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.875em);
          opacity: 1;
        }
        
        .glass-btn-wrap:has(.glass-btn:active) { transform: rotate3d(1, 0, 0, 25deg); }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn {
          box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05), inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5), 0 0.125em 0.125em -0.125em rgba(0, 0, 0, 0.2), 0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2), 0 0.225em 0.05em 0 rgba(0, 0, 0, 0.05), 0 0.25em 0 0 rgba(255, 255, 255, 0.75), inset 0 0.25em 0.05em 0 rgba(0, 0, 0, 0.15);
        }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn-shadow {
          filter: blur(clamp(2px, 0.125em, 12px));
          -webkit-filter: blur(clamp(2px, 0.125em, 12px));
        }
        .glass-btn-wrap:has(.glass-btn:active) .glass-btn-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          opacity: 0.75;
        }
        .glass-btn-wrap:has(.glass-btn:active) span {
          text-shadow: 0.025em 0.25em 0.05em rgba(0, 0, 0, 0.12);
        }
      ` }} />
            <Navbar />
            <Hero />
            <Features />
            <HowItWorks />
            <Comparison />
            <SupportedDocs />
            <Pricing />
            <Footer />
        </div>
    );
}
