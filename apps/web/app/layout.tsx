import './globals.css';
import Header from '../src/components/header';
import Footer from '../src/components/layout/Footer';
import PageContainer from '../src/components/layout/PageContainer';

export const metadata = {
  title: 'ASII Medical',
  description: 'Next.js app in a Turborepo monorepo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="site-body">
        <Header />
        <main className="site-main">
          <PageContainer>{children}</PageContainer>
        </main>
        <Footer />
      </body>
    </html>
  );
}
