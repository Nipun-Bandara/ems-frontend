'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Login from './Login';
import Register from './Register';
import { Button } from '@/app/components/ui/Button';

export default function AuthContainer() {
  const [isSignup, setIsSignup] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950 flex flex-col lg:flex-row relative">
      <Link
        href="/"
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 transition-colors bg-white/50 rounded-lg hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-white dark:bg-black/50 dark:hover:bg-black/80 backdrop-blur-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      {/* Form Container - Scrolls with page */}
      <div
        className={`w-full lg:w-1/2 flex-1 flex items-center justify-center px-8 pt-20 pb-8 lg:p-16 bg-white dark:bg-neutral-950 transition-transform duration-700 ease-in-out z-10 ${isSignup ? 'lg:translate-x-full' : 'lg:translate-x-0'
          }`}
      >
        <div className="w-full max-w-md my-auto">
          {/* We use opacity/display to swap forms smoothly */}
          <div className={`${isSignup ? 'block animate-fadeIn' : 'hidden'}`}>
            <Register onSwitchToLogin={() => setIsSignup(false)} />
          </div>
          <div className={`${!isSignup ? 'block animate-fadeIn' : 'hidden'}`}>
            <Login onSwitchToSignup={() => setIsSignup(true)} />
          </div>
        </div>
      </div>

      {/* /Overlay Container - Sticky */}
      <div
        className={`hidden lg:flex w-1/2 sticky top-0 h-screen bg-slate-50 dark:bg-neutral-900 items-center justify-center overflow-hidden flex-col transition-transform duration-700 ease-in-out z-20 ${isSignup ? 'lg:-translate-x-full' : 'lg:translate-x-0'
          }`}
      >
        {/* Background Grid/Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 text-center mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isSignup ? "Already one of us?" : "New here?"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-sm px-8">
            {isSignup
              ? "If you already have a Shiftly account, sign in to continue managing your workday."
              : "Create your Shiftly account to access dashboards, timesheets, leave, claims, and team updates."}
          </p>
          <Button
            onClick={() => setIsSignup(!isSignup)}
            className="border-2 rounded-lg"
          >
            {isSignup ? "Sign In" : "Register"}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
