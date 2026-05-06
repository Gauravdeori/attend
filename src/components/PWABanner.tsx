import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';

export function PWABanner() {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner after 2 seconds if not installed and we're on mobile/tablet or it's installable
    const timer = setTimeout(() => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isInstalled && (isInstallable || isIOS || isMobile)) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-primary/10 border-b border-primary/10 overflow-hidden"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex p-2 bg-primary/20 rounded-xl">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Install PresentIQ on your phone</p>
              <p className="text-[11px] text-muted-foreground">Get quick access from your home screen and use it offline.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isIOS ? (
              <div className="flex items-center gap-2 text-[10px] bg-background/50 px-3 py-1.5 rounded-lg border border-primary/10">
                <span>Tap</span>
                <Share className="w-3 h-3 text-primary" />
                <span>then</span>
                <PlusSquare className="w-3 h-3 text-primary" />
                <span className="font-bold">Add to Home Screen</span>
              </div>
            ) : isInstallable ? (
              <Button size="sm" onClick={installApp} className="h-8 gap-2 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                <Download className="w-3.5 h-3.5" />
                Install Now
              </Button>
            ) : null}
            
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-primary/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
