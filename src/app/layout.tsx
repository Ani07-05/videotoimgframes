import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video to Image Frames | POC Documentation Tool",
  description: "Convert large videos into image sequences with AI-powered POC screenshot detection for pentest documentation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
