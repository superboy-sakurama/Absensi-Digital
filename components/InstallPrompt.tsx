import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosPrompt, setIsIosPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect if running as a standalone PWA
    const isStandalone = () => {
      // @ts-ignore
      return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
    };

    if (isStandalone()) {
      return; // Already installed, do not show prompt
    }

    if (isIos()) {
      // Show iOS prompt, but maybe not every time to avoid annoyance.
      // E.g., we check if we already dismissed it recently
      const dismissed = localStorage.getItem('iosInstallPromptDismissed');
      if (!dismissed) {
        setIsIosPrompt(true);
        setIsVisible(true);
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIosPrompt) {
      // Just close it, the instructions are on the screen
      setIsVisible(false);
      localStorage.setItem('iosInstallPromptDismissed', 'true');
      return;
    }

    if (!deferredPrompt) {
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (isIosPrompt) {
      localStorage.setItem('iosInstallPromptDismissed', 'true');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
      <Card className="bg-teal-600 border-teal-500 shadow-lg text-white">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Install Aplikasi</h3>
              {isIosPrompt ? (
                <p className="text-teal-50 text-xs">
                  Tap icon <Share className="inline w-3 h-3 mx-0.5" /> Share bawah, lalu pilih <strong>Add to Home Screen</strong>.
                </p>
              ) : (
                <p className="text-teal-50 text-xs">Akses lebih cepat & praktis langsung dari layar utamamu!</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isIosPrompt && (
              <Button size="sm" onClick={handleInstallClick} className="bg-white text-teal-600 hover:bg-teal-50 font-semibold shadow-sm">
                Install
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={handleDismiss} className="text-teal-50 hover:text-white hover:bg-teal-500/50">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {isIosPrompt && (
        <div className="mt-2 text-center text-xs text-slate-500 bg-white/90 p-2 rounded shadow border border-slate-200">
          ⚠️ <strong>Penting untuk pengguna iOS:</strong><br />
          Install ke Home Screen <u>sebelum login</u> agar device tidak dianggap berbeda.
        </div>
      )}
    </div>
  );
}
