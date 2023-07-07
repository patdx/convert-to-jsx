import { Metadata } from 'next';
import 'tailwindcss/tailwind.css';

export const metadata: Metadata = {
  title: 'Convert to JSX',
  description: 'Convert Angular, Handlebars and Pug to JSX',
};

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
