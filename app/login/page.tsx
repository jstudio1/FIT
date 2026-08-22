import { Dumbbell } from "lucide-react";
import { getSiteSettings } from "@/lib/settings";
import { LoginForm } from "@/components/login-form";
import { LoginPhoneMockup } from "@/components/login-phone-mockup";

export const dynamic = "force-dynamic";

function LoginBrand({ siteName, tagline }: { siteName: string; tagline: string }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 animate-login-icon-pulse">
        <Dumbbell className="size-7" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{siteName}</h1>
      <p className="text-sm text-muted-foreground mt-1 text-center">{tagline}</p>
    </div>
  );
}

function LoginFooter() {
  return (
    <p className="text-center text-xs text-muted-foreground mt-6">
      ไม่สามารถสมัครเองได้ — บัญชีถูกสร้างโดยเทรนเนอร์หรือผู้ดูแลระบบ
    </p>
  );
}

// บลอบไล่เฉดสีลอยเบาๆ ด้านหลัง — ใช้ร่วมกันหลายธีม
function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-login-blob absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="animate-login-blob-slow absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
    </div>
  );
}

export default async function LoginPage() {
  const settings = await getSiteSettings();
  const brand = <LoginBrand siteName={settings.siteName} tagline={settings.metaDescription} />;

  if (settings.loginTheme === "split") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <BackgroundBlobs />
        <div className="relative w-full max-w-4xl grid lg:grid-cols-2 gap-10 items-center">
          <div className="hidden lg:flex flex-col items-center justify-center gap-6 animate-login-fade-in">
            <div className="text-center max-w-xs">
              <h1 className="text-3xl font-bold tracking-tight">{settings.siteName}</h1>
              <p className="text-sm text-muted-foreground mt-2">{settings.metaDescription}</p>
            </div>
            <div className="rotate-[-4deg]">
              <LoginPhoneMockup />
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto animate-login-fade-in">
            <div className="flex lg:hidden flex-col items-center mb-8">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <Dumbbell className="size-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">{settings.siteName}</h1>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {settings.metaDescription}
              </p>
            </div>
            <LoginForm />
            <LoginFooter />
          </div>
        </div>
      </div>
    );
  }

  if (settings.loginTheme === "frame") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <BackgroundBlobs />
        <div className="hidden lg:block absolute right-[8%] top-1/2 -translate-y-1/2 rotate-[8deg] opacity-90">
          <LoginPhoneMockup />
        </div>
        <div className="relative w-full max-w-sm animate-login-fade-in">
          {brand}
          <LoginForm />
          <LoginFooter />
        </div>
      </div>
    );
  }

  // simple (ค่าเริ่มต้น)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundBlobs />
      <div className="relative w-full max-w-sm animate-login-fade-in">
        {brand}
        <LoginForm />
        <LoginFooter />
      </div>
    </div>
  );
}
