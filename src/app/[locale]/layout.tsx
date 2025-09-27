import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Await params to handle Next.js 15 async params
  const { locale } = await params;
  
  // Handle case where locale might be undefined
  const currentLocale = locale || 'en';
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(currentLocale as any)) {
    console.error(`Invalid locale in layout: ${locale}, redirecting to en`);
    notFound();
  }
  
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({locale: currentLocale});

  return (
    <NextIntlClientProvider locale={currentLocale} messages={messages}>
      <ThemeProvider defaultTheme="dark" storageKey="tjoef-tjaf-theme">
        <SessionProvider>
          <div className="relative min-h-screen">
            {children}
            <ToastProvider />
          </div>
        </SessionProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}