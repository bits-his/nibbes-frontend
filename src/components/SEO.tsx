import { Helmet } from 'react-helmet-async';
import { useLocation } from 'wouter';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  type?: string;
}

export function SEO({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage = 'https://nibbleskitchen.com/pwa-icons/icon-512x512.png',
  ogUrl,
  canonicalUrl,
  type = 'website',
}: SEOProps) {
  const [location] = useLocation();
  const fullTitle = `${title} | Nibbles Kitchen`;
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  
  // Build canonical URL - use current path if not provided or if it's just the root
  const baseUrl = 'https://nibblesfastfood.com';
  const finalCanonicalUrl = canonicalUrl || ogUrl || `${baseUrl}${location === '/' ? '' : location}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Canonical URL - Page-specific */}
      <link rel="canonical" href={finalCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Nibbles Kitchen" />
      {ogUrl && <meta property="og:url" content={ogUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
