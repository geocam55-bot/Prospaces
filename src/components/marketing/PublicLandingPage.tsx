import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PageElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'button' | 'form' | 'product';
  content: string;
  styles?: {
    alignment?: 'left' | 'center' | 'right';
    size?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  }>;
  productData?: {
    id: string;
    name: string;
    sku?: string;
    price: number;
    image?: string;
    description?: string;
    additionalText?: string;
  };
}

interface PublicLandingPageProps {
  slug: string;
}

export function PublicLandingPage({ slug }: PublicLandingPageProps) {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Track page visit
  useEffect(() => {
    const trackVisit = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const campaignId = urlParams.get('campaign');
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');

      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/analytics/landing-page/visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug,
            campaignId,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer: document.referrer,
          }),
        });
        console.log('📊 Visit tracked successfully');
      } catch (err) {
        console.error('Failed to track visit:', err);
      }
    };

    if (slug && page) {
      trackVisit();
    }
  }, [slug, page]);

  // Track conversion
  const trackConversion = async (conversionType: string, conversionData?: any) => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('campaign');

    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/analytics/landing-page/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          campaignId,
          conversionType,
          conversionData,
        }),
      });
      console.log('🎯 Conversion tracked:', conversionType);
    } catch (err) {
      console.error('Failed to track conversion:', err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    await trackConversion('form_submission', { email });
    toast.success('Thank you for subscribing!');
    setEmail('');
  };

  const handleButtonClick = async (buttonText: string) => {
    await trackConversion('button_click', { buttonText });
  };

  const handleProductClick = async (productData: any) => {
    await trackConversion('product_click', { productId: productData.id, productName: productData.name });
    toast.success(`${productData.name} added to cart!`);
  };

  useEffect(() => {
    const fetchPage = async () => {
      try {
        // Get campaign parameter for tracking
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaign');
        
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/public/landing-page/${slug}`;
        console.log('[PublicLandingPage] Fetching from:', url);
        console.log('[PublicLandingPage] Slug:', slug);
        if (campaignId) {
          console.log('[PublicLandingPage] Campaign ID:', campaignId);
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        console.log('[PublicLandingPage] Response status:', response.status);
        console.log('[PublicLandingPage] Response ok:', response.ok);
        
        if (!response.ok) {
          const text = await response.text();
          console.error('[PublicLandingPage] Error response:', text);
          if (response.status === 404) throw new Error('Page not found');
          throw new Error('Failed to load page');
        }
        const data = await response.json();
        console.log('[PublicLandingPage] Data received:', data);
        setPage(data.page);
      } catch (err: any) {
        console.error('[PublicLandingPage] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      console.log('[PublicLandingPage] Starting fetch for slug:', slug);
      fetchPage();
    } else {
      console.log('[PublicLandingPage] No slug provided');
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "The landing page you're looking for doesn't exist."}</p>
          <a href="/" className="text-blue-600 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  const elements: PageElement[] = page.content?.elements || [];

  const renderElement = (element: PageElement) => {
    const alignment = element.styles?.alignment || 'center';
    
    const alignmentClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }[alignment];

    switch (element.type) {
      case 'heading':
        return (
          <div className={`${alignmentClass} py-4`}>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">{element.content}</h1>
          </div>
        );
      
      case 'paragraph':
        return (
          <div className={`${alignmentClass} py-4`}>
            <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">{element.content}</p>
          </div>
        );
      
      case 'image':
        return (
          <div className={`${alignmentClass} py-6`}>
            {element.content && (
              <img 
                src={element.content} 
                alt="Content" 
                className="w-full max-w-4xl mx-auto rounded-lg shadow-sm"
                loading="lazy"
              />
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className={`${alignmentClass} py-6`}>
            {element.content && (
              <iframe
                src={element.content}
                className="w-full max-w-4xl mx-auto aspect-video rounded-lg shadow-sm"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        );
      
      case 'button':
        return (
          <div className={`${alignmentClass} py-6`}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5" onClick={() => handleButtonClick(element.content)}>
              {element.content}
            </Button>
          </div>
        );
      
      case 'form':
        return (
          <div className={`${alignmentClass} py-8`}>
            <div className="max-w-md mx-auto space-y-4 p-8 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">{element.content}</h3>
              <div className="space-y-3">
                <Input placeholder="Enter your email" type="email" className="h-12 bg-white" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button className="w-full h-12 text-base font-medium" onClick={handleFormSubmit}>Submit</Button>
              </div>
              <p className="text-xs text-gray-500 text-center">We respect your privacy.</p>
            </div>
          </div>
        );

      case 'product':
        const products = element.products || (element.productData ? [element.productData] : []);
        if (!products || products.length === 0) return null;
        
        return (
          <div className={`${alignmentClass} py-12`}>
            <div className={`grid grid-cols-1 ${products.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-8 max-w-7xl mx-auto px-4`}>
              {products.map((productData, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 text-left hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                  {productData.image ? (
                    <div className="h-64 w-full bg-gray-50 relative flex items-center justify-center p-4">
                       <img className="max-h-full max-w-full object-contain mix-blend-multiply" src={productData.image} alt={productData.name} />
                    </div>
                  ) : (
                    <div className="h-64 w-full bg-gray-100 flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{productData.name}</h3>
                      {productData.sku && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono whitespace-nowrap">
                          {productData.sku}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                      {productData.description}
                    </p>
                    
                    {productData.additionalText && (
                      <div className="mb-6 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm font-medium">
                        {productData.additionalText}
                      </div>
                    )}
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Price</span>
                        <span className="text-2xl font-bold text-gray-900">${productData.price.toFixed(2)}</span>
                      </div>
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-sm px-6" onClick={() => handleProductClick(productData)}>
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Optional: Header/Nav could go here if configured in page settings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {elements.map((element) => (
          <div key={element.id}>
            {renderElement(element)}
          </div>
        ))}
      </div>
      {/* Footer could go here */}
      <div className="border-t mt-12 py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} {page.settings?.title || 'ProSpaces CRM'}. All rights reserved.
        </div>
      </div>
    </div>
  );
}